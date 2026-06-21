import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { generateMnemonic } from '../packages/core/node_modules/@scure/bip39/index.js'
import { wordlist } from '../packages/core/node_modules/@scure/bip39/wordlists/english.js'
import { CdpClient } from './cdp-client.mjs'
import {
  chromeArgs,
  closePage,
  delay,
  evalPage,
  fetchJson,
  findExtensionId,
  openPage,
  readDevToolsPort,
  waitForExit,
} from './extension-cdp-harness.mjs'
import { waitForTestnetUsdcBalance } from './extension-quickshield-funding.mjs'
import { fundTargetFromLocalUsdcFunder } from './testnet-usdc-funder.mjs'

const cftPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const retryDelayMs = 20_000
const quickShieldTimeoutMs = 240_000
const usdcFundingWaitMs = Number(process.env.ZKF_QUICKSHIELD_USDC_WAIT_MS ?? 24 * 60 * 1000)
const maxAccessAttempts = 3
const maxShieldAttempts = 3
const password = 'zkf-extension-quickshield-test'
const asset = process.env.ZKF_QUICKSHIELD_ASSET === 'USDC' ? 'USDC' : 'XLM'
const amountStroops = asset === 'USDC' ? '10000000' : '1000000'

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-quickshield-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir, extensionDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const pageUrl = `chrome-extension://${extensionId}/sidepanel.html`
    const recoveryPhrase = generateMnemonic(wordlist, 128)
    const imported = await runtimeMessage(cdp, pageUrl, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic: recoveryPhrase,
      password,
      network: 'testnet',
    })
    if (!imported?.publicKey) {
      throw new Error(`Extension vault import failed: ${JSON.stringify(imported)}`)
    }

    const friendbot = await fundWithFriendbot(imported.publicKey)
    const usdcReceive = asset === 'USDC' ? await prepareUsdcReceive(cdp, pageUrl) : undefined
    const usdcFunding = asset === 'USDC'
      ? await fundTargetFromLocalUsdcFunder(imported.publicKey, BigInt(amountStroops), {
          waitMs: usdcFundingWaitMs,
          log: console.error,
        })
      : undefined
    if (asset === 'USDC') {
      await waitForTestnetUsdcBalance(imported.publicKey, BigInt(amountStroops), {
        waitMs: usdcFundingWaitMs,
        log: console.error,
      })
    }
    await ensureVaultUnlocked(cdp, pageUrl, imported.publicKey)
    const access = await runAccessSetupWithRetries(cdp, pageUrl)
    if (!access?.report || access.report.status !== 'submitted') {
      throw new Error(`Shield access setup did not submit: ${JSON.stringify(redactReport(access))}`)
    }

    await ensureVaultUnlocked(cdp, pageUrl, imported.publicKey)
    const shield = await runQuickShieldWithRetries(cdp, pageUrl)
    if (shield.report.status !== 'submitted') {
      throw new Error(`QuickShield did not submit after retries: ${JSON.stringify(redactReport(shield))}`)
    }

    cdp.close()
    console.log(JSON.stringify({
      ok: true,
      extensionId,
      asset,
      userAddress: imported.publicKey,
      friendbot,
      usdcReceive: usdcReceive?.report ? summarizeUsdcReceive(usdcReceive.report) : undefined,
      usdcFunding,
      access: summarizeAsp(access.report),
      quickShield: summarizeShield(shield.report),
      attempts: shield.attempts,
    }, null, 2))
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

async function prepareUsdcReceive(cdp, pageUrl) {
  const response = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.quickShield.prepareUsdcReceive' })
  if (!response?.report || !['ready', 'created'].includes(response.report.status)) {
    throw new Error(`USDC receive preparation failed: ${JSON.stringify(redactReport(response))}`)
  }
  return response
}

async function ensureVaultUnlocked(cdp, pageUrl, publicKey) {
  const response = await runtimeMessage(cdp, pageUrl, {
    type: 'zkf.extension.dapp.unlock',
    password,
  })
  if (!response?.unlocked || response.publicKey !== publicKey) {
    throw new Error(`Extension vault unlock failed before shield action: ${JSON.stringify(response)}`)
  }
  return response
}

async function runAccessSetupWithRetries(cdp, pageUrl) {
  let latest
  for (let attempt = 1; attempt <= maxAccessAttempts; attempt += 1) {
    latest = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.quickShield.prepareAccess' })
    if (latest?.report?.status === 'submitted' || !shouldRetryAccess(latest?.report)) {
      return latest
    }
    await delay(retryDelayMs)
  }
  return latest
}

function shouldRetryAccess(report) {
  return report?.status === 'failed' &&
    report.blockers?.some((blocker) => /confirmation did not succeed|simulation|transaction/i.test(blocker))
}

async function runQuickShieldWithRetries(cdp, pageUrl) {
  let latest
  for (let attempt = 1; attempt <= maxShieldAttempts; attempt += 1) {
    latest = await runtimeMessage(cdp, pageUrl, {
      type: 'zkf.extension.quickShield',
      asset,
      amountStroops,
      timeoutMs: quickShieldTimeoutMs,
    })
    if (latest?.report?.status === 'submitted' || !shouldRetry(latest?.report)) {
      return { ...latest, attempts: attempt }
    }
    await delay(retryDelayMs)
  }
  return { ...latest, attempts: maxShieldAttempts }
}

function shouldRetry(report) {
  return report?.status === 'blocked' &&
    report.blockers?.some((blocker) => /ASP membership|indexer|sync|wait/i.test(blocker))
}

function summarizeUsdcReceive(report) {
  return {
    status: report.status,
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
    friendbotHash: report.friendbotHash,
  }
}

function summarizeAsp(report) {
  return {
    status: report.status,
    contractId: report.contractId,
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
  }
}

function summarizeShield(report) {
  return {
    status: report.status,
    poolContractId: report.poolContractId,
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
    proofGenerated: report.proofGenerated,
    submitReached: report.submitReached,
    transactionSubmitted: report.transactionSubmitted,
    signedAuthEntryCount: report.signedAuthEntryCount,
    durationMs: report.durationMs,
  }
}

function redactReport(value) {
  if (!value?.report) return value
  return { ...value, report: { ...value.report, statusEvents: value.report.statusEvents?.slice(-3) } }
}

async function runtimeMessage(cdp, pageUrl, message) {
  return evaluateOnPage(cdp, pageUrl, `chrome.runtime.sendMessage(${JSON.stringify(message)})`)
}

async function connect(profileDir) {
  const port = await readDevToolsPort(profileDir)
  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
  const cdp = new CdpClient(version.webSocketDebuggerUrl)
  await cdp.open()
  return cdp
}

async function evaluateOnPage(cdp, url, expression) {
  const page = await openPage(cdp, url)
  try {
    return await evalPage(cdp, page, expression)
  } finally {
    await closePage(cdp, page)
  }
}

async function fundWithFriendbot(address) {
  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`)
  const body = await response.json()
  if (!response.ok) throw new Error(`Friendbot failed: ${JSON.stringify(body)}`)
  return { hash: body.hash, successful: body.successful, ledger: body.ledger }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

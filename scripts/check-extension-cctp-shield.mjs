import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

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
import { waitForMainnetUsdcBalance } from './mainnet-quickshield-funding.mjs'

const cftPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const walletPath = process.env.ZKF_CCTP_DESTINATION_WALLET_PATH ??
  path.join(os.homedir(), '.config', 'zk-fighter', 'cctp-bridge-destination.json')
const password = 'zkf-cctp-arrival-shield'
const network = process.env.ZKF_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
const cctpAmountAtomic = BigInt(process.env.ZKF_CCTP_AMOUNT_ATOMIC ?? '1000000')
const amountStroops = String(cctpUsdcAtomicToStellarStroops(cctpAmountAtomic))
const quickShieldTimeoutMs = Number(process.env.ZKF_QUICKSHIELD_TIMEOUT_MS ?? 240_000)
const balanceWaitMs = Number(process.env.ZKF_CCTP_USDC_WAIT_MS ?? 24 * 60 * 1000)
const retryDelayMs = 20_000
const maxAccessAttempts = 3
const maxShieldAttempts = 3
const skipAspInsert = process.env.ZKF_SKIP_ASP_INSERT === '1'

async function main() {
  const recoveryPhrase = await readDestinationMnemonic()
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-cctp-shield-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir, extensionDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const pageUrl = `chrome-extension://${extensionId}/popup.html`
    const imported = await runtimeMessage(cdp, pageUrl, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic: recoveryPhrase,
      password,
      network,
    })
    if (!imported?.publicKey) {
      throw new Error(`Extension vault import failed: ${JSON.stringify(imported)}`)
    }

    const receive = await prepareUsdcReceive(cdp, pageUrl)
    const publicUsdc = await waitForUsdcBalance(imported.publicKey, BigInt(amountStroops))
    await ensureVaultUnlocked(cdp, pageUrl, imported.publicKey)
    const access = skipAspInsert ? { skipped: true } : await runAccessSetupWithRetries(cdp, pageUrl)
    if (!skipAspInsert && (!access?.report || access.report.status !== 'submitted')) {
      throw new Error(`ASP insert did not submit: ${JSON.stringify(redactReport(access))}`)
    }

    await ensureVaultUnlocked(cdp, pageUrl, imported.publicKey)
    const shield = await runQuickShieldWithRetries(cdp, pageUrl)
    if (shield.report.status !== 'submitted') {
      throw new Error(`CCTP arrival shield did not submit: ${JSON.stringify(redactReport(shield))}`)
    }

    cdp.close()
    console.log(JSON.stringify({
      ok: true,
      network,
      asset: 'USDC',
      userAddress: imported.publicKey,
      cctpAmountAtomic: cctpAmountAtomic.toString(),
      amountStroops,
      usdcReceive: summarizeUsdcReceive(receive.report),
      publicUsdc,
      access: skipAspInsert ? access : summarizeAsp(access.report),
      shield: summarizeShield(shield.report),
      attempts: shield.attempts,
    }, null, 2))
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

async function readDestinationMnemonic() {
  const stored = JSON.parse(await readFile(walletPath, 'utf8'))
  if (typeof stored.mnemonic !== 'string' || !stored.mnemonic.trim()) {
    throw new Error(`CCTP destination wallet file has no mnemonic: ${walletPath}`)
  }
  return stored.mnemonic
}

async function prepareUsdcReceive(cdp, pageUrl) {
  const response = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.quickShield.prepareUsdcReceive' })
  if (!response?.report || !['ready', 'created'].includes(response.report.status)) {
    throw new Error(`USDC receive preparation failed: ${JSON.stringify(redactReport(response))}`)
  }
  return response
}

async function waitForUsdcBalance(address, amount) {
  const options = { waitMs: balanceWaitMs, log: console.error }
  return network === 'mainnet'
    ? waitForMainnetUsdcBalance(address, amount, options)
    : waitForTestnetUsdcBalance(address, amount, options)
}

async function ensureVaultUnlocked(cdp, pageUrl, publicKey) {
  const response = await runtimeMessage(cdp, pageUrl, {
    type: 'zkf.extension.dapp.unlock',
    password,
  })
  if (!response?.unlocked || response.publicKey !== publicKey) {
    throw new Error(`Extension vault unlock failed: ${JSON.stringify(response)}`)
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
  if (report?.txHash) {
    return false
  }
  return report?.status === 'failed' &&
    report.blockers?.some((blocker) => /confirmation did not succeed|simulation|transaction/i.test(blocker))
}

async function runQuickShieldWithRetries(cdp, pageUrl) {
  let latest
  for (let attempt = 1; attempt <= maxShieldAttempts; attempt += 1) {
    latest = await runtimeMessage(cdp, pageUrl, {
      type: 'zkf.extension.quickShield',
      asset: 'USDC',
      amountStroops,
      timeoutMs: quickShieldTimeoutMs,
    })
    if (latest?.report?.status === 'submitted' || !shouldRetryShield(latest?.report)) {
      return { ...latest, attempts: attempt }
    }
    await delay(retryDelayMs)
  }
  return { ...latest, attempts: maxShieldAttempts }
}

function shouldRetryShield(report) {
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
  return {
    ...value,
    report: {
      ...value.report,
      leaf: value.report.leaf ? {
        notePublicKeyHex: value.report.leaf.notePublicKeyHex,
        encryptionPublicKeyHex: value.report.leaf.encryptionPublicKeyHex,
        membershipLeafDecimal: value.report.leaf.membershipLeafDecimal,
        membershipLeafHex: value.report.leaf.membershipLeafHex,
      } : undefined,
      statusEvents: value.report.statusEvents?.slice(-3),
    },
  }
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

function cctpUsdcAtomicToStellarStroops(amountAtomic) {
  const stellarStroopsPerCctpAtomicUsdc = 10n
  return amountAtomic * stellarStroopsPerCctpAtomicUsdc
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

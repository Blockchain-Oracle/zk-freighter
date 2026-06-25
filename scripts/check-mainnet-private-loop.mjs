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

const cftPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const walletPath =
  process.env.ZKF_MAINNET_SMOKE_WALLET_PATH ?? path.join(os.homedir(), '.config', 'zk-fighter', 'mainnet-quickshield-smoke.json')
const password = 'zkf-mainnet-private-loop-test'
const network = 'mainnet'
const asset = process.env.ZKF_PRIVATE_LOOP_ASSET === 'USDC' ? 'USDC' : 'XLM'
const transferAmountStroops =
  process.env.ZKF_PRIVATE_LOOP_TRANSFER_STROOPS ?? (asset === 'USDC' ? '50000' : '100000')
const withdrawAmountStroops =
  process.env.ZKF_PRIVATE_LOOP_WITHDRAW_STROOPS ?? (asset === 'USDC' ? '10000' : '50000')
const privateActionTimeoutMs = Number(process.env.ZKF_PRIVATE_LOOP_TIMEOUT_MS ?? 240_000)
const retryDelayMs = 20_000
const maxAttempts = 3

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-mainnet-private-loop-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir, extensionDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const mnemonic = await readRecoveryPhrase()
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const pageUrl = `chrome-extension://${extensionId}/sidepanel.html`
    const imported = await runtimeMessage(cdp, pageUrl, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic,
      password,
      network,
    })
    if (!imported?.publicKey) {
      throw new Error(`Extension vault import failed: ${JSON.stringify(imported)}`)
    }

    const transfer = await runPrivateActionWithRetries(cdp, pageUrl, {
      type: 'zkf.extension.privateTransfer',
      mnemonic,
      network,
      asset,
      amountStroops: transferAmountStroops,
      timeoutMs: privateActionTimeoutMs,
    })
    if (transfer.status !== 'submitted') {
      throw new Error(`Private transfer did not submit: ${JSON.stringify(redactReport(transfer))}`)
    }

    await delay(retryDelayMs)
    const withdraw = await runPrivateActionWithRetries(cdp, pageUrl, {
      type: 'zkf.extension.unshieldWithdrawal',
      mnemonic,
      network,
      asset,
      amountStroops: withdrawAmountStroops,
      recipientAddress: imported.publicKey,
      timeoutMs: privateActionTimeoutMs,
    })
    if (withdraw.status !== 'submitted') {
      throw new Error(`Unshield withdrawal did not submit: ${JSON.stringify(redactReport(withdraw))}`)
    }

    cdp.close()
    console.log(JSON.stringify({
      ok: true,
      extensionId,
      network,
      asset,
      userAddress: imported.publicKey,
      transfer: summarizeReport(transfer),
      withdraw: summarizeReport(withdraw),
    }, null, 2))
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

async function runPrivateActionWithRetries(cdp, pageUrl, message) {
  let latest
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    latest = await runtimeMessage(cdp, pageUrl, message)
    if (latest?.status === 'submitted' || !shouldRetry(latest)) {
      return latest
    }
    await delay(retryDelayMs)
  }
  return latest
}

function shouldRetry(report) {
  return ['blocked', 'failed'].includes(report?.status) &&
    report.blockers?.some((blocker) => /indexer|sync|wait|no executable|no unspent|notes/i.test(blocker))
}

function summarizeReport(report) {
  return {
    action: report.action,
    status: report.status,
    poolContractId: report.poolContractId,
    amountStroops: report.amountStroops,
    txHashes: report.txHashes,
    explorerUrls: report.explorerUrls,
    proofGenerated: report.proofGenerated,
    submitReached: report.submitReached,
    transactionSubmitted: report.transactionSubmitted,
    signedAuthEntryCount: report.signedAuthEntryCount,
    durationMs: report.durationMs,
  }
}

function redactReport(report) {
  return report ? { ...report, statusEvents: report.statusEvents?.slice(-3) } : report
}

async function readRecoveryPhrase() {
  const wallet = JSON.parse(await readFile(walletPath, 'utf8'))
  const phrase = typeof wallet.recoveryPhrase === 'string' ? wallet.recoveryPhrase : wallet.mnemonic
  if (typeof phrase !== 'string' || !phrase.trim()) {
    throw new Error(`No mainnet smoke recovery phrase found at ${walletPath}.`)
  }
  return phrase
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

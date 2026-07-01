// De-risk: does bb.js UltraHonk proving run inside the MV3 offscreen document?
// Loads the unpacked extension in Chrome-for-Testing, imports + funds a fresh
// testnet vault, then runs the confidential REGISTER op (which generates a real
// UltraHonk proof in the offscreen and submits it). Success here = the offscreen
// can prove; the full confidential panel is then safe to build.

import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
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

const cftPath = path.resolve('.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const password = 'zkf-extension-confidential-test'
const network = 'testnet'

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

async function runtimeMessage(cdp, pageUrl, message) {
  return evaluateOnPage(cdp, pageUrl, `chrome.runtime.sendMessage(${JSON.stringify(message)})`)
}

async function fundWithFriendbot(address) {
  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`)
  const body = await response.json()
  if (!response.ok) throw new Error(`Friendbot failed: ${JSON.stringify(body)}`)
  return { hash: body.hash, successful: body.successful }
}

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-confidential-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir, extensionDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const pageUrl = `chrome-extension://${extensionId}/popup.html`
    const recoveryPhrase = generateMnemonic(wordlist, 128)

    const imported = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.dapp.importVault', mnemonic: recoveryPhrase, password, network })
    if (!imported?.publicKey) throw new Error(`Vault import failed: ${JSON.stringify(imported)}`)

    const funding = await fundWithFriendbot(imported.publicKey)
    await delay(8000) // let funding propagate before the register tx

    const unlocked = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.dapp.unlock', password })
    if (!unlocked?.unlocked) throw new Error(`Unlock failed: ${JSON.stringify(unlocked)}`)

    console.error('[confidential-smoke] running register in the offscreen (bb.js proof + submit)…')
    // Secure path: the runtime injects the unlocked mnemonic — the panel never supplies it.
    const response = await runtimeMessage(cdp, pageUrl, { type: 'zkf.extension.confidential', op: 'register' })
    const report = response?.report

    cdp.close()
    const stages = (report?.statusEvents ?? []).map((event) => event.stage)
    const provedInOffscreen = stages.includes('simulate') || stages.includes('submit') || report?.status === 'submitted'
    const result = {
      ok: report?.status === 'submitted',
      provedInOffscreen,
      extensionId,
      userAddress: imported.publicKey,
      funding,
      registerStatus: report?.status,
      stages,
      blockers: report?.blockers,
      error: report?.error,
      rawReport: report,
    }
    writeFileSync('/tmp/confresult.json', JSON.stringify(result, null, 2))
    console.error('[confidential-smoke] result written to /tmp/confresult.json:', JSON.stringify({ ok: result.ok, provedInOffscreen, registerStatus: report?.status, stages }))
    if (!provedInOffscreen) process.exit(1)
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

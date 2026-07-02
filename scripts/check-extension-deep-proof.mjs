import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { CdpClient } from './cdp-client.mjs'

const cftPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const regularChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : regularChromePath)
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const localPageTimeoutMs = 5_000
const launchTimeoutMs = 10_000
const waitStepMs = 100

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-deep-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const popupUrl = `chrome-extension://${extensionId}/popup.html`
    const prepared = await evaluateOnPage(
      cdp,
      popupUrl,
      "chrome.runtime.sendMessage({ type: 'zkf.extension.prepareDeepProofIdentity' })",
    )
    if (!prepared?.ok || !prepared.userAddress) {
      throw new Error(`Could not prepare ephemeral identity: ${JSON.stringify(prepared)}`)
    }

    const friendbot = await fundWithFriendbot(prepared.userAddress)
    const deep = await evaluateOnPage(
      cdp,
      popupUrl,
      "chrome.runtime.sendMessage({ type: 'zkf.extension.aspInsertAndDryProof' })",
    )
    if (!deep?.ok) {
      throw new Error(`Deep proof attempt failed: ${JSON.stringify(deep)}`)
    }

    cdp.close()
    console.log(JSON.stringify({ ok: true, extensionId, friendbot, ...deep }, null, 2))
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

function chromeArgs(profileDir) {
  return [
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-extensions-with-background-pages',
    '--disable-sync',
    '--enable-extensions',
    '--window-size=1200,900',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    'about:blank',
  ]
}

async function connect(profileDir) {
  const port = await readDevToolsPort(profileDir)
  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
  const cdp = new CdpClient(version.webSocketDebuggerUrl)
  await cdp.open()
  return cdp
}

async function readDevToolsPort(profileDir) {
  const file = path.join(profileDir, 'DevToolsActivePort')
  const started = Date.now()
  while (Date.now() - started < launchTimeoutMs) {
    try {
      const [port] = (await readFile(file, 'utf8')).trim().split('\n')
      return port
    } catch {
      await delay(waitStepMs)
    }
  }
  throw new Error('Chrome did not expose DevToolsActivePort before timeout.')
}

async function findExtensionId(cdp, profileDir, stderr) {
  const started = Date.now()
  while (Date.now() - started < localPageTimeoutMs) {
    const { targetInfos } = await cdp.command('Target.getTargets')
    const target = targetInfos.find((item) => item.url?.endsWith('/background.js'))
    if (target) return new URL(target.url).hostname

    const profileId = await extensionIdFromProfile(profileDir)
    if (profileId) return profileId
    await delay(waitStepMs)
  }
  throw new Error(`No ZK Freighter extension appeared. Stderr: ${stderr.join('').slice(-2000)}`)
}

async function extensionIdFromProfile(profileDir) {
  try {
    const preferences = JSON.parse(await readFile(path.join(profileDir, 'Default', 'Preferences'), 'utf8'))
    for (const [id, setting] of Object.entries(preferences.extensions?.settings ?? {})) {
      if (setting?.manifest?.name === 'ZK Freighter') return id
    }
  } catch {
    return undefined
  }
  return undefined
}

async function evaluateOnPage(cdp, url, expression) {
  const { targetId } = await cdp.command('Target.createTarget', { url })
  const { sessionId } = await cdp.command('Target.attachToTarget', { targetId, flatten: true })
  await cdp.command('Runtime.enable', {}, sessionId)
  await waitForReadyState(cdp, sessionId)
  const { result } = await cdp.command('Runtime.evaluate', { awaitPromise: true, expression, returnByValue: true }, sessionId)
  await cdp.command('Target.closeTarget', { targetId })
  return result.value
}

async function waitForReadyState(cdp, sessionId) {
  const started = Date.now()
  while (Date.now() - started < localPageTimeoutMs) {
    const { result } = await cdp.command('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId)
    if (result.value === 'complete' || result.value === 'interactive') return
    await delay(waitStepMs)
  }
  throw new Error('Page did not reach an interactive readyState before timeout.')
}

async function fundWithFriendbot(address) {
  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`)
  const body = await response.json()
  if (!response.ok) {
    throw new Error(`Friendbot failed: ${JSON.stringify(body)}`)
  }
  return { hash: body.hash, successful: body.successful, ledger: body.ledger }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForExit(process) {
  if (process.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => process.once('exit', resolve))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

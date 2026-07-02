import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { generateMnemonic } from '../packages/core/node_modules/@scure/bip39/index.js'
import { wordlist } from '../packages/core/node_modules/@scure/bip39/wordlists/english.js'
import { CdpClient } from './cdp-client.mjs'

const cftPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(cftPath) ? cftPath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const launchTimeoutMs = 10_000
const pageTimeoutMs = 5_000
const waitStepMs = 100
const password = 'zkf-extension-bridge-test'

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-bridge-'))
  const chrome = spawn(chromePath, chromeArgs(profileDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const cdp = await connect(profileDir)
    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const extensionUrl = `chrome-extension://${extensionId}/popup.html`
    const recoveryPhrase = generateMnemonic(wordlist, 128)
    const imported = await runtimeMessage(cdp, extensionUrl, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic: recoveryPhrase,
      password,
      network: 'testnet',
    })
    if (!imported?.publicKey) {
      throw new Error(`Extension vault import failed: ${JSON.stringify(imported)}`)
    }

    const routeText = await pageText(cdp, `chrome-extension://${extensionId}/popup.html#/bridge`, 'Bridge then shield')
    if (!routeText.includes('Bridge then shield') || !routeText.includes('FUND THIS EVM ADDRESS') || !routeText.includes('RESUME BURN HASH')) {
      throw new Error(`Bridge route controls did not render: ${routeText.slice(0, 800)}`)
    }

    cdp.close()
    console.log(JSON.stringify({
      ok: true,
      extensionId,
      publicKey: imported.publicKey,
      popupRoute: 'bridge-rendered',
    }, null, 2))
  } finally {
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

async function runtimeMessage(cdp, extensionUrl, message) {
  return evaluateOnPage(cdp, extensionUrl, `new Promise((resolve) => chrome.runtime.sendMessage(${JSON.stringify(message)}, resolve))`)
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
  const started = Date.now()
  const file = path.join(profileDir, 'DevToolsActivePort')
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
  while (Date.now() - started < pageTimeoutMs) {
    const { targetInfos } = await cdp.command('Target.getTargets')
    const target = targetInfos.find((item) => item.url?.endsWith('/background.js'))
    if (target?.url?.startsWith('chrome-extension://')) return new URL(target.url).hostname

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

async function pageText(cdp, url, expected) {
  return evaluateOnPage(cdp, url, `new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const text = document.body?.innerText ?? '';
      if (text.includes(${JSON.stringify(expected)}) || Date.now() - started > ${pageTimeoutMs}) {
        resolve(text);
        return;
      }
      setTimeout(check, ${waitStepMs});
    };
    check();
  })`)
}

async function waitForReadyState(cdp, sessionId) {
  const started = Date.now()
  while (Date.now() - started < pageTimeoutMs) {
    const { result } = await cdp.command('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId)
    if (result.value === 'complete' || result.value === 'interactive') return
    await delay(waitStepMs)
  }
  throw new Error('Page did not reach an interactive readyState before timeout.')
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

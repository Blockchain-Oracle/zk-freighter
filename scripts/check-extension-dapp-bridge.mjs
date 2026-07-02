import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { CdpClient } from './cdp-client.mjs'

const chromeForTestingPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const regularChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(chromeForTestingPath) ? chromeForTestingPath : regularChromePath)
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const devToolsFile = 'DevToolsActivePort'
const waitStepMs = 100
const launchTimeoutMs = 10_000
const pageTimeoutMs = 5_000
const localPort = 43178
const testnetPassphrase = 'Test SDF Network ; September 2015'
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const password = 'zkf-runtime-test-password'
const storageKey = 'zkf.extension.dappWallet'

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-dapp-'))
  const server = await startTestServer()
  const chrome = spawn(chromePath, chromeArgs(profileDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => stderr.push(String(chunk)))

  try {
    const port = await readDevToolsPort(profileDir)
    const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
    const cdp = new CdpClient(version.webSocketDebuggerUrl)
    await cdp.open()

    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const extensionUrl = `chrome-extension://${extensionId}/popup.html`
    const pageUrl = `http://127.0.0.1:${localPort}/`
    const connection = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_CONNECTION_STATUS'))
    const network = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_NETWORK_DETAILS'))
    const publicKey = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_PUBLIC_KEY'))
    const access = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_ACCESS'))
    const signing = await evaluateOnPage(
      cdp,
      pageUrl,
      freighterProbe('SUBMIT_TRANSACTION', { transactionXdr: 'AAAA', networkPassphrase: testnetPassphrase }),
    )

    assertEqual(connection?.isConnected, true, 'Freighter-style connection status')
    assertEqual(network?.networkDetails?.network, 'TESTNET', 'Freighter-style network code')
    assertEqual(network?.networkDetails?.networkPassphrase, testnetPassphrase, 'Freighter-style network passphrase')
    assertEqual(publicKey?.publicKey, '', 'Freighter-style public key remains empty before access')
    assertIncludes(access?.apiError?.message, 'disabled', 'Freighter-style requestAccess fails closed')
    assertEqual(signing?.signedTransaction, '', 'Freighter-style signTransaction does not sign')
    assertIncludes(signing?.apiError?.message, 'disabled', 'Freighter-style signTransaction fails closed')

    const imported = await runtimeMessage(cdp, extensionUrl, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic,
      password,
      network: 'testnet',
    })
    if (!imported?.publicKey) {
      throw new Error(`Vault import did not return public key: ${JSON.stringify(imported)}`)
    }

    await seedStalePermission(cdp, extensionUrl, pageUrl, imported.publicKey)
    const afterImportPublicKey = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_PUBLIC_KEY'))
    const afterImportAccess = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_ACCESS'))
    const afterImportSigning = await evaluateOnPage(
      cdp,
      pageUrl,
      freighterProbe('SUBMIT_TRANSACTION', { transactionXdr: 'AAAA', networkPassphrase: testnetPassphrase }),
    )
    const afterImportAllowed = await evaluateOnPage(cdp, pageUrl, freighterProbe('REQUEST_ALLOWED_STATUS'))
    await runtimeMessage(cdp, extensionUrl, { type: 'zkf.extension.dapp.lock' })
    const lockedSigning = await evaluateOnPage(
      cdp,
      pageUrl,
      freighterProbe('SUBMIT_TRANSACTION', { transactionXdr: 'AAAA', networkPassphrase: testnetPassphrase }),
    )

    assertEqual(afterImportPublicKey.publicKey, '', 'unlocked extension still does not expose public key')
    assertEqual(afterImportAllowed.isAllowed, false, 'stale permission is ignored')
    assertIncludes(afterImportAccess.apiError?.message, 'disabled', 'unlocked requestAccess stays disabled')
    assertIncludes(afterImportSigning.apiError?.message, 'disabled', 'unlocked malformed XDR does not reach signing')
    assertIncludes(lockedSigning.apiError?.message, 'disabled', 'locked signing stays disabled')

    cdp.close()
    console.log(
      JSON.stringify(
        {
          ok: true,
          extensionId,
          chrome: version.Browser,
          dappBridge: {
            connection: 'ready',
            network: network.networkDetails,
            publicKey: 'empty-before-access',
            requestAccess: 'disabled-before-and-after-vault',
            signTransaction: 'disabled-locked-unlocked-and-stale-permission',
          },
        },
        null,
        2,
      ),
    )
  } finally {
    server.close()
    chrome.kill('SIGTERM')
    await waitForExit(chrome)
    await rm(profileDir, { force: true, recursive: true })
  }
}

async function runtimeMessage(cdp, extensionUrl, message) {
  return evaluateOnPage(cdp, extensionUrl, `chrome.runtime.sendMessage(${JSON.stringify(message)})`)
}

async function seedStalePermission(cdp, extensionUrl, pageUrl, publicKey) {
  const origin = new URL(pageUrl).origin
  const permission = {
    version: 1,
    origin,
    network: 'testnet',
    publicKey,
    canShareAddress: true,
    canRequestSignatures: true,
    approvedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  }
  await evaluateOnPage(
    cdp,
    extensionUrl,
    `chrome.storage.local.get(${JSON.stringify(storageKey)}).then((value) => {
      const state = value[${JSON.stringify(storageKey)}];
      return chrome.storage.local.set({ [${JSON.stringify(storageKey)}]: { ...state, permissions: [${JSON.stringify(permission)}] } });
    })`,
  )
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

async function readDevToolsPort(profileDir) {
  const started = Date.now()
  const file = path.join(profileDir, devToolsFile)
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
    if (target?.url?.startsWith('chrome-extension://')) {
      return new URL(target.url).hostname
    }

    const profileId = await extensionIdFromProfile(profileDir)
    if (profileId) {
      return profileId
    }

    await delay(waitStepMs)
  }
  throw new Error(`No ZK Freighter extension appeared. Stderr: ${stderr.join('').slice(-2000)}`)
}

async function extensionIdFromProfile(profileDir) {
  const preferencesFile = path.join(profileDir, 'Default', 'Preferences')
  try {
    const preferences = JSON.parse(await readFile(preferencesFile, 'utf8'))
    for (const [id, setting] of Object.entries(preferences.extensions?.settings ?? {})) {
      if (setting?.manifest?.name === 'ZK Freighter') {
        return id
      }
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
  while (Date.now() - started < pageTimeoutMs) {
    const { result } = await cdp.command('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId)
    if (result.value === 'complete' || result.value === 'interactive') {
      return
    }
    await delay(waitStepMs)
  }
  throw new Error('Page did not reach an interactive readyState before timeout.')
}

function freighterProbe(type, extra = {}) {
  const payload = JSON.stringify(extra)
  return `new Promise((resolve) => {
    const messageId = Date.now() + Math.random();
    const timer = setTimeout(() => resolve({ source: 'timeout' }), 3000);
    window.addEventListener('message', function handler(event) {
      if (event.source !== window) return;
      if (event.data?.source !== 'FREIGHTER_EXTERNAL_MSG_RESPONSE') return;
      if (event.data?.messagedId !== messageId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(event.data);
    });
    window.postMessage({
      source: 'FREIGHTER_EXTERNAL_MSG_REQUEST',
      messageId,
      type: '${type}',
      ...${payload},
    }, location.origin);
  })`
}

function startTestServer() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><title>ZK Freighter dApp bridge test</title><main>dApp bridge target</main>')
  })
  return new Promise((resolve) => server.listen(localPort, '127.0.0.1', () => resolve(server)))
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}; got ${JSON.stringify(actual)}`)
  }
}

function assertIncludes(value, expected, label) {
  if (!String(value).includes(expected)) {
    throw new Error(`${label} did not include ${expected}; got ${JSON.stringify(value)}`)
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForExit(process) {
  if (process.exitCode !== null) {
    return Promise.resolve()
  }
  return new Promise((resolve) => process.once('exit', resolve))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

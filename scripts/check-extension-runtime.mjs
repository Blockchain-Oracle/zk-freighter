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
const localPort = 43177

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-chrome-'))
  const server = await startTestServer()
  const chrome = spawn(chromePath, chromeArgs(profileDir), { stdio: ['ignore', 'ignore', 'pipe'] })
  const stderr = []
  chrome.stderr.on('data', (chunk) => {
    stderr.push(String(chunk))
  })

  try {
    const port = await readDevToolsPort(profileDir)
    const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
    const cdp = new CdpClient(version.webSocketDebuggerUrl)
    await cdp.open()

    const extensionId = await findExtensionId(cdp, profileDir, stderr)
    const popupText = await pageText(cdp, `chrome-extension://${extensionId}/popup.html`, 'Runtime checkpoint')
    assertIncludes(popupText, 'Shared wallet core', 'popup readiness rows render')
    assertIncludes(popupText, 'QuickShield', 'popup QuickShield surface renders')

    await pageText(cdp, `chrome-extension://${extensionId}/sidepanel.html`, 'Extension workspace')

    const offscreenStatus = await evaluateOnPage(
      cdp,
      `chrome-extension://${extensionId}/popup.html`,
      "chrome.runtime.sendMessage({ type: 'zkf.extension.offscreenStatus' })",
    )
    if (!offscreenStatus?.ok || offscreenStatus.proverRuntime !== 'not-generated') {
      throw new Error(`Unexpected offscreen status: ${JSON.stringify(offscreenStatus)}`)
    }

    const nethermindProbe = await evaluateOnPage(
      cdp,
      `chrome-extension://${extensionId}/popup.html`,
      "chrome.runtime.sendMessage({ type: 'zkf.extension.nethermindProbe' })",
    )
    if (!nethermindProbe?.ok || nethermindProbe.runtime !== 'nethermind-browser-wasm') {
      throw new Error(`Unexpected Nethermind probe: ${JSON.stringify(nethermindProbe)}`)
    }

    const dryProofAttempt = await evaluateOnPage(
      cdp,
      `chrome-extension://${extensionId}/popup.html`,
      "chrome.runtime.sendMessage({ type: 'zkf.extension.dryProofAttempt' })",
    )
    if (!dryProofAttempt?.ok || typeof dryProofAttempt.proofGenerated !== 'boolean') {
      throw new Error(`Unexpected dry proof attempt: ${JSON.stringify(dryProofAttempt)}`)
    }

    const contentStatus = await evaluateOnPage(cdp, `http://127.0.0.1:${localPort}/`, contentProbe('status'))
    if (!contentStatus?.ok || contentStatus.readiness?.status !== 'in-progress') {
      throw new Error(`Unexpected content-script status response: ${JSON.stringify(contentStatus)}`)
    }

    const rejectedMethod = await evaluateOnPage(cdp, `http://127.0.0.1:${localPort}/`, contentProbe('sign'))
    if (rejectedMethod?.ok !== false || !String(rejectedMethod.error).includes('disabled')) {
      throw new Error(`Unexpected content-script rejection: ${JSON.stringify(rejectedMethod)}`)
    }

    cdp.close()
    console.log(
      JSON.stringify(
        {
          ok: true,
          extensionId,
          chrome: version.Browser,
          popup: 'rendered',
          sidePanel: 'rendered',
          offscreen: offscreenStatus.proverRuntime,
          nethermindModule: {
            runtime: nethermindProbe.runtime,
            elapsedMs: nethermindProbe.elapsedMs,
            proofGenerated: nethermindProbe.proofGenerated,
          },
          dryProofAttempt: {
            status: dryProofAttempt.status,
            durationMs: dryProofAttempt.durationMs,
            proofGenerated: dryProofAttempt.proofGenerated,
            submitReached: dryProofAttempt.submitReached,
            blockerCount: dryProofAttempt.blockers?.length ?? 0,
            firstBlocker: dryProofAttempt.blockers?.[0],
            lastEvent: dryProofAttempt.statusEvents?.at(-1)?.message,
          },
          contentScript: 'status-ok-and-signing-rejected',
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
  let candidates = []
  while (Date.now() - started < pageTimeoutMs) {
    const { targetInfos } = await cdp.command('Target.getTargets')
    candidates = targetInfos.filter((item) => item.url?.startsWith('chrome-extension://'))
    const target = candidates.find((item) => item.url?.endsWith('/background.js'))
    if (target) {
      return new URL(target.url).hostname
    }

    const profileId = await extensionIdFromProfile(profileDir)
    if (profileId) {
      return profileId
    }

    await delay(waitStepMs)
  }
  throw new Error(
    `No ZK Fighter extension appeared in Chrome. Candidates: ${JSON.stringify(candidates)} Stderr: ${stderr.join('').slice(-2000)}`,
  )
}

async function extensionIdFromProfile(profileDir) {
  const preferencesFile = path.join(profileDir, 'Default', 'Preferences')
  try {
    const preferences = JSON.parse(await readFile(preferencesFile, 'utf8'))
    const settings = preferences.extensions?.settings ?? {}
    for (const [id, setting] of Object.entries(settings)) {
      if (setting?.manifest?.name === 'ZK Fighter') {
        return id
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

async function pageText(cdp, url, expected) {
  const expression = `new Promise((resolve) => {
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
  })`
  const text = await evaluateOnPage(cdp, url, expression)
  assertIncludes(text, expected, `${url} renders`)
  return text
}

async function evaluateOnPage(cdp, url, expression) {
  const { targetId } = await cdp.command('Target.createTarget', { url })
  const { sessionId } = await cdp.command('Target.attachToTarget', { targetId, flatten: true })
  await cdp.command('Runtime.enable', {}, sessionId)
  await waitForReadyState(cdp, sessionId)
  const { result } = await cdp.command(
    'Runtime.evaluate',
    {
      awaitPromise: true,
      expression,
      returnByValue: true,
    },
    sessionId,
  )
  await cdp.command('Target.closeTarget', { targetId })
  return result.value
}

async function waitForReadyState(cdp, sessionId) {
  const started = Date.now()
  while (Date.now() - started < pageTimeoutMs) {
    const { result } = await cdp.command(
      'Runtime.evaluate',
      { expression: 'document.readyState', returnByValue: true },
      sessionId,
    )
    if (result.value === 'complete' || result.value === 'interactive') {
      return
    }
    await delay(waitStepMs)
  }
  throw new Error('Page did not reach an interactive readyState before timeout.')
}

function contentProbe(method) {
  return `new Promise((resolve) => {
    const id = 'zkf-' + Date.now() + '-' + Math.random();
    const timer = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 3000);
    window.addEventListener('message', function handler(event) {
      if (event.data?.source !== 'ZKFIGHTER_EXTENSION_RESPONSE' || event.data?.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(event.data);
    });
    window.postMessage({ source: 'ZKFIGHTER_EXTENSION_REQUEST', id, method: '${method}' }, location.origin);
  })`
}

function startTestServer() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><title>ZK Fighter extension test</title><main>content script target</main>')
  })
  return new Promise((resolve) => {
    server.listen(localPort, '127.0.0.1', () => resolve(server))
  })
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

function assertIncludes(value, expected, label) {
  if (!String(value).includes(expected)) {
    throw new Error(`${label} did not include ${expected}. Actual: ${String(value).slice(0, 500)}`)
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForExit(process) {
  if (process.exitCode !== null) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    process.once('exit', resolve)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

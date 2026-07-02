import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
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
  pageTimeoutMs,
  readDevToolsPort,
  waitForExit,
  waitStepMs,
} from './extension-cdp-harness.mjs'

const chromeForTestingPath = path.resolve(
  '.cache/chrome-for-testing/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
)
const regularChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromePath = process.env.ZKF_CHROME_PATH ?? (existsSync(chromeForTestingPath) ? chromeForTestingPath : regularChromePath)
const extensionDir = path.resolve('apps/extension/.output/chrome-mv3')
const localPort = 43177
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const password = 'zkf-runtime-test-password'
const moreRouteChecks = [
  { action: 'more-settings', expected: 'Settings' },
  { action: 'more-discover', expected: 'Discover' },
  { action: 'more-disclosure', expected: 'Disclosure' },
  { action: 'more-confidential', expected: 'Confidential' },
  { action: 'more-evidence', expected: 'Extension readiness' },
]

async function main() {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'zkf-extension-chrome-'))
  const server = await startTestServer()
  const chrome = spawn(chromePath, chromeArgs(profileDir, extensionDir), { stdio: ['ignore', 'ignore', 'pipe'] })
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
    const popupText = await pageText(cdp, `chrome-extension://${extensionId}/popup.html`, 'Set up your wallet')
    assertIncludes(popupText, 'Import a recovery phrase', 'popup access card renders')
    assertIncludes(popupText, 'VAULT PASSWORD', 'popup vault password field renders')

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

    const extensionPage = `chrome-extension://${extensionId}/popup.html`
    const imported = await runtimeMessage(cdp, extensionPage, {
      type: 'zkf.extension.dapp.importVault',
      mnemonic,
      password,
      network: 'testnet',
    })
    if (!imported?.publicKey || !imported.privateReceiveCode) {
      throw new Error(`Vault import did not return wallet identity: ${JSON.stringify(imported)}`)
    }
    const missingBridgeAmount = await runtimeMessage(cdp, extensionPage, { type: 'zkf.extension.bridge.run', sourceChainKey: 'base' })
    if (missingBridgeAmount?.ok !== false || !String(missingBridgeAmount.error).includes('amount')) throw new Error(`Bridge without amount was not rejected: ${JSON.stringify(missingBridgeAmount)}`)
    const hexBridgeAmount = await runtimeMessage(cdp, extensionPage, { type: 'zkf.extension.bridge.run', sourceChainKey: 'base', amountAtomic: '0x10' })
    if (hexBridgeAmount?.ok !== false || !String(hexBridgeAmount.error).includes('positive decimal')) throw new Error(`Hex bridge amount was not rejected: ${JSON.stringify(hexBridgeAmount)}`)

    const popupPage = await openPage(cdp, extensionPage)
    try {
      await waitForTextOnPage(cdp, popupPage, 'SHIELDED BALANCE')

      await clickAction(cdp, popupPage, 'action-send')
      await waitForTextOnPage(cdp, popupPage, 'Send privately')
      await clickAction(cdp, popupPage, 'sheet-close')

      await clickAction(cdp, popupPage, 'action-receive')
      await waitForTextOnPage(cdp, popupPage, 'PRIVATE RECEIVE CODE')
      await clickAction(cdp, popupPage, 'receive-tab-public'); await waitForTextOnPage(cdp, popupPage, 'PUBLIC STELLAR ADDRESS')
      await clickAction(cdp, popupPage, 'tab-home')
      await waitForTextOnPage(cdp, popupPage, 'SHIELDED BALANCE')

      await clickAction(cdp, popupPage, 'action-shield')
      await waitForTextOnPage(cdp, popupPage, 'QuickShield'); await waitForTextOnPage(cdp, popupPage, 'AMOUNT')
      await setField(cdp, popupPage, 'shield-amount', '0.2'); await waitForTextOnPage(cdp, popupPage, 'Shield 0.2 XLM')
      await clickAction(cdp, popupPage, 'sheet-close')

      await clickAction(cdp, popupPage, 'action-bridge')
      await waitForTextOnPage(cdp, popupPage, 'Bridge then shield'); await waitForTextOnPage(cdp, popupPage, 'PUBLIC STELLAR USDC')
      await setField(cdp, popupPage, 'bridge-amount', '1.25'); await waitForTextOnPage(cdp, popupPage, '1.25 USDC')
      await clickAction(cdp, popupPage, 'route-back')

      await clickAction(cdp, popupPage, 'tab-activity')
      await waitForTextOnPage(cdp, popupPage, 'Activity')
      await clickAction(cdp, popupPage, 'tab-receive')
      await waitForTextOnPage(cdp, popupPage, 'PRIVATE RECEIVE CODE')

      for (const check of moreRouteChecks) {
        await clickAction(cdp, popupPage, 'tab-more')
        await waitForTextOnPage(cdp, popupPage, 'PROVE & DISCOVER')
        await clickAction(cdp, popupPage, check.action)
        await waitForTextOnPage(cdp, popupPage, check.expected)
        await clickAction(cdp, popupPage, 'route-back')
        await waitForTextOnPage(cdp, popupPage, 'SHIELDED BALANCE')
      }

      await clickAction(cdp, popupPage, 'tab-more')
      await waitForTextOnPage(cdp, popupPage, 'Move')
      await clickAction(cdp, popupPage, 'sheet-close')
      await waitForNoDialog(cdp, popupPage)
    } finally {
      await closePage(cdp, popupPage)
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
          popupClicks: ['home-actions', 'bottom-tabs', 'more-routes', 'sheet-close', 'route-back'],
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

async function waitForTextOnPage(cdp, page, expected) {
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
  const text = await evalPage(cdp, page, expression)
  assertIncludes(text, expected, `popup click flow renders ${expected}`)
  return text
}

async function clickAction(cdp, page, action) {
  const result = await evalPage(cdp, page, `(() => { const element = document.querySelector('[data-zkf-action="${action}"]'); if (!element) return { ok: false, text: document.body?.innerText ?? '' }; element.click(); return { ok: true }; })()`)
  if (!result?.ok) throw new Error(`Missing click target ${action}. Actual: ${String(result?.text ?? '').slice(0, 500)}`)
  await delay(80)
}

async function setField(cdp, page, action, value) {
  const result = await evalPage(cdp, page, `(() => { const element = document.querySelector('[data-zkf-action="${action}"]'); if (!element) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`)
  if (!result) throw new Error(`Missing field ${action}.`); await delay(80)
}

async function waitForNoDialog(cdp, page) {
  const expression = `new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const present = Boolean(document.querySelector('[role="dialog"]'));
      if (!present || Date.now() - started > ${pageTimeoutMs}) {
        resolve(!present);
        return;
      }
      setTimeout(check, ${waitStepMs});
    };
    check();
  })`
  const closed = await evalPage(cdp, page, expression)
  if (!closed) throw new Error('Sheet dialog did not close.')
}

async function evaluateOnPage(cdp, url, expression) {
  const page = await openPage(cdp, url)
  try { return await evalPage(cdp, page, expression) } finally { await closePage(cdp, page) }
}

async function runtimeMessage(cdp, url, message) {
  return evaluateOnPage(cdp, url, `chrome.runtime.sendMessage(${JSON.stringify(message)})`)
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
    response.end('<!doctype html><title>ZK Freighter extension test</title><main>content script target</main>')
  })
  return new Promise((resolve) => {
    server.listen(localPort, '127.0.0.1', () => resolve(server))
  })
}

function assertIncludes(value, expected, label) {
  if (!String(value).includes(expected)) {
    throw new Error(`${label} did not include ${expected}. Actual: ${String(value).slice(0, 500)}`)
  }
}

main().catch((error) => { console.error(error); process.exit(1) })

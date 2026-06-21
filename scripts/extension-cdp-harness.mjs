import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const waitStepMs = 100
export const launchTimeoutMs = 10_000
export const pageTimeoutMs = 5_000

export function chromeArgs(profileDir, extensionDir) {
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

export async function openPage(cdp, url) {
  const { targetId } = await cdp.command('Target.createTarget', { url })
  const { sessionId } = await cdp.command('Target.attachToTarget', { targetId, flatten: true })
  await cdp.command('Runtime.enable', {}, sessionId)
  await waitForReadyState(cdp, sessionId)
  return { targetId, sessionId }
}

export async function closePage(cdp, page) {
  await cdp.command('Target.closeTarget', { targetId: page.targetId })
}

export async function evalPage(cdp, page, expression) {
  const { result } = await cdp.command('Runtime.evaluate', { awaitPromise: true, expression, returnByValue: true }, page.sessionId)
  return result.value
}

export async function readDevToolsPort(profileDir) {
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

export async function findExtensionId(cdp, profileDir, stderr) {
  const started = Date.now()
  while (Date.now() - started < pageTimeoutMs) {
    const { targetInfos } = await cdp.command('Target.getTargets')
    const target = targetInfos.find((item) => item.url?.endsWith('/background.js'))
    if (target?.url?.startsWith('chrome-extension://')) {
      return new URL(target.url).hostname
    }

    const id = await extensionIdFromProfile(profileDir)
    if (id) {
      return id
    }
    await delay(waitStepMs)
  }
  throw new Error(`No ZK Fighter extension appeared. Stderr: ${stderr.join('').slice(-2000)}`)
}

async function extensionIdFromProfile(profileDir) {
  try {
    const preferences = JSON.parse(await readFile(path.join(profileDir, 'Default', 'Preferences'), 'utf8'))
    for (const [id, setting] of Object.entries(preferences.extensions?.settings ?? {})) {
      if (setting?.manifest?.name === 'ZK Fighter') {
        return id
      }
    }
  } catch {
    return undefined
  }
  return undefined
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

export async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function waitForExit(process) {
  if (process.exitCode !== null) {
    return Promise.resolve()
  }
  return new Promise((resolve) => process.once('exit', resolve))
}

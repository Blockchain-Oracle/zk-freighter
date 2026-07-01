import { getNetworkConfig, type NetworkKey } from './networks'
import {
  captureRuntimeWorkers,
  terminateRuntimeWorkers,
  waitForRuntimeWorkersToClose,
} from './runtime-worker-capture'
import type {
  NethermindMainThreadHandle,
  NethermindModuleImporter,
  NethermindWebClient,
  NethermindWebModule,
} from './nethermind-runtime-types'
import { installNethermindEventFetchRouter } from './nethermind-fetch-router'

export type {
  NethermindMainThreadHandle,
  NethermindModuleImporter,
  NethermindPreparedProverTx,
  NethermindWebClient,
  NethermindWebModule,
  PreparedSorobanTx,
} from './nethermind-runtime-types'

export const NETHERMIND_WEB_MODULE_PATH = '/js/web.js'

const defaultImporterKey = 'default'
const backgroundEventListenerEnabled = false
const pendingDisposeTimeoutMs = 1_000
const clientCache = new Map<string, RuntimeClientEntry>()
const moduleInitCache = new Map<string, Promise<NethermindWebModule>>()
const clientLocks = new Map<string, RuntimeLock>()
const importerIds = new WeakMap<NethermindModuleImporter, number>()
let nextImporterId = 1
let runtimeQueue: Promise<void> = Promise.resolve()
let runtimeReset: Promise<void> = Promise.resolve()

interface RuntimeLock {
  release(): void
}

type RuntimeClientEntry = { readonly network: NetworkKey; readonly client: Promise<NethermindWebClient>; readonly dispose: Promise<() => number> }
type LoadedRuntimeClient = { readonly client: NethermindWebClient; readonly dispose: () => number }

export async function importNethermindWebModule(): Promise<NethermindWebModule> {
  const moduleUrl =
    globalThis.location === undefined
      ? NETHERMIND_WEB_MODULE_PATH
      : new URL(NETHERMIND_WEB_MODULE_PATH, globalThis.location.origin).href
  return (await import(/* @vite-ignore */ moduleUrl)) as NethermindWebModule
}

export async function loadNethermindWebClient(
  network: NetworkKey,
  importer: NethermindModuleImporter = importNethermindWebModule,
): Promise<NethermindWebClient> {
  const key = cacheKeyForImporter(importer)
  const cached = clientCache.get(key)
  if (cached?.network === network) {
    return cached.client
  }
  if (cached) {
    await waitForRuntimeWorkersToClose(await disposeCachedClient(key, cached))
    clientCache.delete(key)
  }

  const loading = loadFreshNethermindWebClient(network, importer, key)
  const entry: RuntimeClientEntry = {
    network,
    client: loading.then((runtime) => runtime.client),
    dispose: loading.then((runtime) => runtime.dispose, () => () => 0),
  }
  clientCache.set(key, entry)
  try {
    return await entry.client
  } catch (error) {
    clientCache.delete(key)
    throw error
  }
}

export async function runWithNethermindWebClient<T>(
  network: NetworkKey,
  operation: (client: NethermindWebClient) => Promise<T>,
  importer: NethermindModuleImporter = importNethermindWebModule,
): Promise<T> {
  const run = async () => {
    await runtimeReset
    return operation(await loadNethermindWebClient(network, importer))
  }
  const next = runtimeQueue.catch(() => undefined).then(run)
  runtimeQueue = next.then(() => undefined, () => undefined)
  return next
}

export async function initializeNethermindWebModule(
  importer: NethermindModuleImporter = importNethermindWebModule,
): Promise<NethermindWebModule> {
  const key = cacheKeyForImporter(importer)
  const cached = moduleInitCache.get(key)
  if (cached) return cached

  const loading = importer().then(async (mod) => {
    await mod.default()
    return mod
  })
  moduleInitCache.set(key, loading)
  try {
    return await loading
  } catch (error) {
    moduleInitCache.delete(key)
    throw error
  }
}

async function loadFreshNethermindWebClient(
  network: NetworkKey,
  importer: NethermindModuleImporter,
  cacheKey: string,
): Promise<LoadedRuntimeClient> {
  const lock = await acquireRuntimeLock(cacheKey)
  clientLocks.set(cacheKey, lock)
  const mod = await initializeNethermindWebModule(importer)
  let handle: NethermindMainThreadHandle | undefined
  let restoreEventFetch: () => void = () => undefined
  try {
    const networkConfig = getNetworkConfig(network)
    restoreEventFetch = installNethermindEventFetchRouter({
      rpcUrl: networkConfig.rpcUrl,
      bootnodeUrl: networkConfig.bootnodeUrl,
    })
    const started = await captureRuntimeWorkers(() => suppressNethermindLoggerInitError(() => mod.mainThread(
      new mod.Config(networkConfig.rpcUrl, networkConfig.bootnodeUrl, backgroundEventListenerEnabled),
    )))
    handle = started.result
    const client = handle.webClient
    return {
      client,
      dispose: once(() => {
        const terminated = terminateRuntimeWorkers(started.workers)
        restoreEventFetch()
        lock.release()
        if (clientLocks.get(cacheKey) === lock) clientLocks.delete(cacheKey)
        return terminated
      }),
    }
  } catch (error) {
    restoreEventFetch()
    lock.release()
    clientLocks.delete(cacheKey)
    throw error
  }
}

function cacheKeyForImporter(importer: NethermindModuleImporter): string {
  if (importer === importNethermindWebModule) {
    return defaultImporterKey
  }

  const existing = importerIds.get(importer)
  if (existing !== undefined) {
    return String(existing)
  }

  const next = nextImporterId
  nextImporterId += 1
  importerIds.set(importer, next)
  return String(next)
}

export function clearNethermindWebClientCache(options: { readonly clearModule?: boolean } = {}): void {
  void disposeAllCachedClients(options)
}

export async function restartNethermindWebClientCache(options: { readonly clearModule?: boolean } = {}): Promise<void> {
  void runtimeQueue.catch(() => undefined)
  const restart = runtimeReset.catch(() => undefined).then(() => disposeAllCachedClients(options))
  runtimeReset = restart.then(() => undefined, () => undefined)
  runtimeQueue = runtimeReset
  await restart
}

async function disposeAllCachedClients(options: { readonly clearModule?: boolean } = {}): Promise<void> {
  const entries = Array.from(clientCache.entries())
  clientCache.clear()
  const terminated = await Promise.all(entries.map(([key, entry]) => disposeCachedClient(key, entry)))
  for (const lock of clientLocks.values()) lock.release()
  clientLocks.clear()
  if (options.clearModule) moduleInitCache.clear()
  await waitForRuntimeWorkersToClose(terminated.reduce((sum, count) => sum + count, 0))
}

async function disposeCachedClient(key: string, entry: RuntimeClientEntry): Promise<number> {
  const dispose = await settleWithin(entry.dispose.catch(() => undefined), pendingDisposeTimeoutMs)
  if (!dispose) {
    void entry.dispose
      .then((lateDispose) => waitForRuntimeWorkersToClose(lateDispose()))
      .catch((error) => console.warn('[nethermind-runtime] late dispose failed', error))
    if (clientCache.get(key) === entry) clientCache.delete(key)
    return 0
  }
  const terminated = dispose?.() ?? 0
  if (clientCache.get(key) === entry) clientCache.delete(key)
  return terminated
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function suppressNethermindLoggerInitError<T>(create: () => Promise<T>): Promise<T> {
  const original = console.error
  console.error = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ')
    if (/attempted to set a logger after the logging system was already initialized/i.test(message)) return
    original(...args)
  }
  try {
    return await create()
  } finally {
    console.error = original
  }
}

function once(fn: () => number): () => number {
  let called = false
  let value = 0
  return () => {
    if (called) return value
    called = true
    value = fn()
    return value
  }
}

async function acquireRuntimeLock(key: string): Promise<RuntimeLock> {
  const locks = globalThis.navigator?.locks
  if (!locks) return { release: () => undefined }

  let settled = false
  const acquired = new Promise<RuntimeLock | null>((resolve) => {
    void locks.request(`zkf-nethermind:${key}`, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        resolve(null)
        return
      }

      let releaseLock: (() => void) | undefined
      const hold = new Promise<void>((release) => { releaseLock = release })
      resolve({
        release: () => {
          if (settled) return
          settled = true
          releaseLock?.()
        },
      })
      await hold
    })
  })

  const lock = await acquired
  if (!lock) {
    throw new Error('ZKF_RUNTIME_BUSY: another ZK Fighter window is using the local private database.')
  }
  return lock
}

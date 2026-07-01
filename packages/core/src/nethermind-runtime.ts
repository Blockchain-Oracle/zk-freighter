import { getNetworkConfig, type NetworkKey } from './networks'

export const NETHERMIND_WEB_MODULE_PATH = '/js/web.js'

export interface NethermindWebModule {
  readonly default: () => Promise<unknown>
  readonly Config: new (rpcUrl: string, bootnodeUrl?: string, backgroundEvents?: boolean) => unknown
  readonly mainThread: (config: unknown) => Promise<NethermindMainThreadHandle>
}

export interface NethermindMainThreadHandle {
  readonly webClient: NethermindWebClient
  free?(): void
}

export interface PreparedSorobanTx {
  readonly txXdr: string
  readonly authEntries: readonly string[]
  readonly latestLedger: number
}

export interface NethermindPreparedProverTx {
  readonly proofUncompressed: readonly number[]
  readonly extData: unknown
  readonly prepared: unknown
  readonly sorobanTx: PreparedSorobanTx
}

export interface NethermindWebClient {
  free?(): void
  deriveAndSaveUserKeys(address: string, signature: Uint8Array): Promise<void>
  syncPoolEvents?(): Promise<void>
  getUserNotes?(address: string, limit: number): Promise<unknown>
  getUnspentUserNotes?(poolContractId: string, address: string): Promise<unknown>
  prepareRegisterPublicKeys?(
    poolContractId: string,
    userAddress: string,
    notePublicKeyHex: string,
    encryptionPublicKeyHex: string,
  ): Promise<PreparedSorobanTx>
  getRecentPublicKeys?(limit: number): Promise<unknown>
  generateSelectiveDisclosure?(
    poolContractId: string,
    userAddress: string,
    selectedCommitmentHex: string,
    authorityLabel: string,
    authorityIdentityPayloadHex: string,
    purpose: string,
    contextNonce: bigint,
    onStatus: (event: unknown) => void,
  ): Promise<unknown | null>
  verifySelectiveDisclosure?(receiptJson: string, expectedVkHash: string): Promise<unknown>
  executeDeposit?(
    poolContractId: string,
    userAddress: string,
    amount: bigint,
    outputAmounts: readonly bigint[],
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  executeTransfer?(
    poolContractId: string,
    userAddress: string,
    amount: bigint,
    recipientNoteKeyHex: string,
    recipientEncryptionKeyHex: string,
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  executeWithdraw?(
    poolContractId: string,
    userAddress: string,
    withdrawRecipient: string,
    amount: bigint,
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  aspState?(): Promise<unknown>
  deriveAspUserLeaf?(membershipBlinding: bigint, notePublicKeyHex: string): Promise<unknown>
  getASPSecret(address: string): Promise<unknown>
  getUserKeys(address: string): Promise<unknown>
}

export type NethermindModuleImporter = () => Promise<NethermindWebModule>

const defaultImporterKey = 'default'
const backgroundEventListenerEnabled = false
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

type RuntimeClientEntry = { readonly network: NetworkKey; readonly client: Promise<NethermindWebClient>; readonly dispose: Promise<() => void> }
type LoadedRuntimeClient = { readonly client: NethermindWebClient; readonly dispose: () => void }

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
    await disposeCachedClient(key, cached)
    clientCache.delete(key)
  }

  const loading = loadFreshNethermindWebClient(network, importer, key)
  const entry: RuntimeClientEntry = {
    network,
    client: loading.then((runtime) => runtime.client),
    dispose: loading.then((runtime) => runtime.dispose, () => () => undefined),
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
  try {
    const networkConfig = getNetworkConfig(network)
    handle = await mod.mainThread(
      new mod.Config(networkConfig.rpcUrl, networkConfig.bootnodeUrl, backgroundEventListenerEnabled),
    )
    const client = handle.webClient
    return {
      client,
      dispose: once(() => {
        disposeRuntimeObject(client)
        disposeRuntimeObject(handle)
        lock.release()
        if (clientLocks.get(cacheKey) === lock) clientLocks.delete(cacheKey)
      }),
    }
  } catch (error) {
    disposeRuntimeObject(handle)
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
  await Promise.all(entries.map(([key, entry]) => disposeCachedClient(key, entry)))
  for (const lock of clientLocks.values()) lock.release()
  clientLocks.clear()
  if (options.clearModule) moduleInitCache.clear()
}

async function disposeCachedClient(key: string, entry: RuntimeClientEntry): Promise<void> {
  const dispose = await entry.dispose.catch(() => undefined)
  dispose?.()
  if (clientCache.get(key) === entry) clientCache.delete(key)
}

function disposeRuntimeObject(value: { free?: () => void } | undefined): void {
  try {
    value?.free?.()
  } catch (error) {
    console.warn('[nethermind-runtime] dispose failed', error)
  }
}

function once(fn: () => void): () => void {
  let called = false
  return () => {
    if (called) return
    called = true
    fn()
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

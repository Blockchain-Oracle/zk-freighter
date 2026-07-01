import { getNetworkConfig, type NetworkKey } from './networks'

export const NETHERMIND_WEB_MODULE_PATH = '/js/web.js'

export interface NethermindWebModule {
  readonly default: () => Promise<unknown>
  readonly Config: new (rpcUrl: string, bootnodeUrl?: string, backgroundEvents?: boolean) => unknown
  readonly mainThread: (config: unknown) => Promise<NethermindMainThreadHandle>
}

export interface NethermindMainThreadHandle {
  readonly webClient: NethermindWebClient
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
const clientCache = new Map<string, { readonly network: NetworkKey; readonly client: Promise<NethermindWebClient> }>()
const moduleInitCache = new Map<string, Promise<NethermindWebModule>>()
const clientLocks = new Map<string, RuntimeLock>()
const importerIds = new WeakMap<NethermindModuleImporter, number>()
let nextImporterId = 1

interface RuntimeLock {
  release(): void
}

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
    await releaseRuntimeLock(key)
    clientCache.delete(key)
  }

  const loading = loadFreshNethermindWebClient(network, importer, key)
  clientCache.set(key, { network, client: loading })
  try {
    return await loading
  } catch (error) {
    clientCache.delete(key)
    throw error
  }
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
): Promise<NethermindWebClient> {
  const lock = await acquireRuntimeLock(cacheKey)
  clientLocks.set(cacheKey, lock)
  const mod = await initializeNethermindWebModule(importer)
  try {
    const networkConfig = getNetworkConfig(network)
    const handle = await mod.mainThread(
      new mod.Config(networkConfig.rpcUrl, networkConfig.bootnodeUrl, backgroundEventListenerEnabled),
    )
    return handle.webClient
  } catch (error) {
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

export function clearNethermindWebClientCache(): void {
  for (const lock of clientLocks.values()) lock.release()
  clientCache.clear()
  moduleInitCache.clear()
  clientLocks.clear()
}

async function releaseRuntimeLock(key: string): Promise<void> {
  clientLocks.get(key)?.release()
  clientLocks.delete(key)
  await new Promise((resolve) => setTimeout(resolve, 0))
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

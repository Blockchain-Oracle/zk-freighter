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
const bootnodeUrl = undefined
const backgroundEventListenerEnabled = false
const clientCache = new Map<string, Promise<NethermindWebClient>>()
const importerIds = new WeakMap<NethermindModuleImporter, number>()
let nextImporterId = 1

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
  const key = `${network}:${cacheKeyForImporter(importer)}`
  const cached = clientCache.get(key)
  if (cached) {
    return cached
  }

  const loading = loadFreshNethermindWebClient(network, importer)
  clientCache.set(key, loading)
  try {
    return await loading
  } catch (error) {
    clientCache.delete(key)
    throw error
  }
}

async function loadFreshNethermindWebClient(
  network: NetworkKey,
  importer: NethermindModuleImporter,
): Promise<NethermindWebClient> {
  const mod = await importer()
  await mod.default()
  const handle = await mod.mainThread(
    new mod.Config(getNetworkConfig(network).rpcUrl, bootnodeUrl, backgroundEventListenerEnabled),
  )
  return handle.webClient
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
  clientCache.clear()
}

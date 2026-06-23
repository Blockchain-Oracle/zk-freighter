import type { AssetCode } from './assets'
import { BYTE_LENGTH_32, assertByteLength, bytesToHex, hexToBytes } from './bytes'
import type { WalletIdentity } from './identity'
import { getNetworkConfig, isShieldedAssetEnabled, type NetworkKey } from './networks'
import { loadNethermindWebClient, type NethermindModuleImporter, type PreparedSorobanTx } from './nethermind-runtime'
import { encodeReceiveCode, RECEIVE_CODE_VERSION } from './receive-code'
import {
  submitPreparedSorobanTx,
  type SorobanSubmitResult,
  type SorobanSubmitStatus,
  type SubmitPreparedSorobanTxOptions,
} from './soroban-submit'

const publicKeyLookupLimit = 100
const hexPrefix = '0x'

export type PublicDiscoveryStatus = 'submitted' | 'partial' | 'blocked' | 'failed'
export type PublicDiscoveryLookupStatus = 'found' | 'not-found' | 'blocked' | 'failed'

export interface PublicDiscoveryPoolReport {
  readonly asset: AssetCode
  readonly poolContractId: string
  readonly status: 'submitted' | 'failed'
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly signedAuthEntryCount: number
  readonly statusEvents: readonly SorobanSubmitStatus[]
  readonly error?: string
}

export interface PublicDiscoveryPublishReport {
  readonly status: PublicDiscoveryStatus
  readonly network: NetworkKey
  readonly userAddress: string
  readonly notePublicKeyHex: string
  readonly encryptionPublicKeyHex: string
  readonly pools: readonly PublicDiscoveryPoolReport[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface PublicDiscoveryLookupReport {
  readonly status: PublicDiscoveryLookupStatus
  readonly network: NetworkKey
  readonly ownerAddress: string
  readonly receiveCode?: string
  readonly ledger?: number
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface PublicDiscoveryOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly importWebModule?: NethermindModuleImporter
  readonly submitPreparedTx?: (
    prepared: PreparedSorobanTx,
    options: SubmitPreparedSorobanTxOptions,
  ) => Promise<SorobanSubmitResult>
}

export interface PublicDiscoveryLookupOptions {
  readonly ownerAddress: string
  readonly network: NetworkKey
  readonly importWebModule?: NethermindModuleImporter
  readonly limit?: number
}

interface PublicKeyEntry {
  readonly address: string
  readonly encryptionKey: string
  readonly noteKey: string
  readonly ledger: number
}

function enabledPoolEntries(network: NetworkKey): readonly [AssetCode, string][] {
  const config = getNetworkConfig(network)
  return (Object.entries(config.assets) as [AssetCode, (typeof config.assets)[AssetCode]][])
    .filter(([asset, assetConfig]) => isShieldedAssetEnabled(network, asset) && Boolean(assetConfig.poolId))
    .map(([asset, assetConfig]) => [asset, assetConfig.poolId as string])
}

function keyHex(bytes: Uint8Array): string {
  assertByteLength(bytes, BYTE_LENGTH_32, 'public discovery key')
  return `${hexPrefix}${bytesToHex(bytes)}`
}

function explorerUrl(network: NetworkKey, hash: string): string {
  return `${getNetworkConfig(network).explorerTxUrl}/${hash}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePublicKeys(value: unknown): readonly PublicKeyEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const address = typeof item.address === 'string' ? item.address : undefined
    const encryptionKey = typeof item.encryptionKey === 'string' ? item.encryptionKey : undefined
    const noteKey = typeof item.noteKey === 'string' ? item.noteKey : undefined
    const ledger = typeof item.ledger === 'number' ? item.ledger : undefined

    return address && encryptionKey && noteKey && ledger !== undefined
      ? [{ address, encryptionKey, noteKey, ledger }]
      : []
  })
}

function receiveCodeFromEntry(entry: PublicKeyEntry, network: NetworkKey): string {
  const notePublicKey = hexToBytes(entry.noteKey)
  const encryptionPublicKey = hexToBytes(entry.encryptionKey)
  assertByteLength(notePublicKey, BYTE_LENGTH_32, 'published note public key')
  assertByteLength(encryptionPublicKey, BYTE_LENGTH_32, 'published encryption public key')

  return encodeReceiveCode({
    version: RECEIVE_CODE_VERSION,
    network,
    notePublicKey,
    encryptionPublicKey,
  })
}

export async function publishPrivateReceiveDiscovery(
  options: PublicDiscoveryOptions,
): Promise<PublicDiscoveryPublishReport> {
  const pools = enabledPoolEntries(options.network)
  const notePublicKeyHex = keyHex(options.identity.privateReceive.notePublicKey)
  const encryptionPublicKeyHex = keyHex(options.identity.privateReceive.encryptionPublicKey)

  if (pools.length === 0) {
    return {
      status: 'blocked',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      notePublicKeyHex,
      encryptionPublicKeyHex,
      pools: [],
      blockers: ['No shielded pools are enabled for public discovery on this network.'],
    }
  }

  try {
    const client = await loadNethermindWebClient(options.network, options.importWebModule)
    const submit = options.submitPreparedTx ?? submitPreparedSorobanTx

    if (!client.prepareRegisterPublicKeys) {
      throw new Error('Nethermind WebClient does not expose prepareRegisterPublicKeys')
    }

    const reports: PublicDiscoveryPoolReport[] = []

    for (const [asset, poolContractId] of pools) {
      const statusEvents: SorobanSubmitStatus[] = []
      try {
        const prepared = await client.prepareRegisterPublicKeys(
          poolContractId,
          options.identity.stellarPublicKey,
          notePublicKeyHex,
          encryptionPublicKeyHex,
        )
        const result = await submit(prepared, {
          identity: options.identity,
          network: options.network,
          onStatus: (event) => statusEvents.push(event),
        })

        reports.push({
          asset,
          poolContractId,
          status: 'submitted',
          txHash: result.hash,
          explorerUrl: explorerUrl(options.network, result.hash),
          signedAuthEntryCount: result.signedAuthEntryCount,
          statusEvents,
        })
      } catch (error) {
        reports.push({
          asset,
          poolContractId,
          status: 'failed',
          signedAuthEntryCount: 0,
          statusEvents,
          error: error instanceof Error ? error.message : 'public discovery publish failed',
        })
      }
    }

    const submittedCount = reports.filter((report) => report.status === 'submitted').length
    const blockers = reports.flatMap((report) => (report.error ? [`${report.asset}: ${report.error}`] : []))

    return {
      status: submittedCount === reports.length ? 'submitted' : submittedCount > 0 ? 'partial' : 'failed',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      notePublicKeyHex,
      encryptionPublicKeyHex,
      pools: reports,
      blockers,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'public discovery publish failed'
    return {
      status: 'failed',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      notePublicKeyHex,
      encryptionPublicKeyHex,
      pools: [],
      blockers: [message],
      error: message,
    }
  }
}

export async function lookupPublishedReceiveCode(
  options: PublicDiscoveryLookupOptions,
): Promise<PublicDiscoveryLookupReport> {
  try {
    const client = await loadNethermindWebClient(options.network, options.importWebModule)

    if (!client.getRecentPublicKeys) {
      return {
        status: 'blocked',
        network: options.network,
        ownerAddress: options.ownerAddress,
        blockers: ['Nethermind WebClient does not expose public discovery lookup.'],
      }
    }

    await client.syncPoolEvents?.()
    const entries = parsePublicKeys(await client.getRecentPublicKeys(options.limit ?? publicKeyLookupLimit))
    const match = entries.find((entry) => entry.address === options.ownerAddress)

    if (!match) {
      return {
        status: 'not-found',
        network: options.network,
        ownerAddress: options.ownerAddress,
        blockers: ['No published private receive code found for this public Stellar address.'],
      }
    }

    return {
      status: 'found',
      network: options.network,
      ownerAddress: options.ownerAddress,
      receiveCode: receiveCodeFromEntry(match, options.network),
      ledger: match.ledger,
      blockers: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'public discovery lookup failed'
    return {
      status: 'failed',
      network: options.network,
      ownerAddress: options.ownerAddress,
      blockers: [message],
      error: message,
    }
  }
}

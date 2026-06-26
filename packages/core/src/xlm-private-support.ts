import { bytesToHex } from './bytes'
import type { AssetCode } from './assets'
import type { WalletIdentity } from './identity'
import { getNetworkConfig, type NetworkKey } from './networks'
import { loadNethermindWebClient, type NethermindModuleImporter } from './nethermind-runtime'
import type { XlmPrivateProgressEvent, XlmShieldedNote } from './xlm-private-types'

export const defaultPrivateActionTimeoutMs = 30 * 60 * 1_000
export const defaultNoteLimit = 200

const hexPrefix = '0x'
const syncGapPattern = /sync ([0-9]+) ledger/

export function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value) || typeof value[field] !== 'string') {
    return undefined
  }

  return value[field]
}

function numberField(value: unknown, field: string): number | undefined {
  if (!isRecord(value) || typeof value[field] !== 'number') {
    return undefined
  }

  return value[field]
}

function booleanField(value: unknown, field: string): boolean | undefined {
  if (!isRecord(value) || typeof value[field] !== 'boolean') {
    return undefined
  }

  return value[field]
}

export function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Shielded private action timed out after ${ms} ms`)), ms)
  })
}

export function explorerUrl(network: NetworkKey, txHash: string): string {
  return `${getNetworkConfig(network).explorerTxUrl}/${txHash}`
}

export function poolIdForAsset(network: NetworkKey, asset: AssetCode): string | undefined {
  return getNetworkConfig(network).assets[asset].poolId
}

export function xlmPoolId(network: NetworkKey): string | undefined {
  return poolIdForAsset(network, 'XLM')
}

export function keyHex(bytes: Uint8Array): string {
  return `${hexPrefix}${bytesToHex(bytes)}`
}

function eventStep(event: unknown): string | undefined {
  return stringField(event, 'stage') ?? stringField(event, 'step')
}

/** Normalizes a raw Nethermind status payload into a typed progress event. */
export function buildNethermindEvent(event: unknown, elapsedMs: number): XlmPrivateProgressEvent {
  return {
    elapsedMs,
    source: 'nethermind',
    flow: stringField(event, 'flow'),
    message: stringField(event, 'message') ?? eventStep(event) ?? 'status',
    step: eventStep(event),
    current: numberField(event, 'current'),
    total: numberField(event, 'total'),
  }
}

export function appendNethermindEvent(
  events: XlmPrivateProgressEvent[],
  event: unknown,
  elapsedMs: number,
): void {
  events.push(buildNethermindEvent(event, elapsedMs))
}

export function proofWasGenerated(
  events: readonly XlmPrivateProgressEvent[],
  submitReached: boolean,
): boolean {
  return submitReached || events.some((event) => event.step === 'prepare_tx' || event.step === 'prove')
}

export function blockersForNullResult(
  events: readonly XlmPrivateProgressEvent[],
): readonly string[] {
  for (const event of [...events].reverse()) {
    const match = event.message.match(syncGapPattern)
    if (match) {
      return [
        `ASP membership/indexer precondition stopped before proving; latest observed sync gap was ${Number(match[1]).toLocaleString()} ledgers. Wait for indexing, then retry.`,
      ]
    }
  }

  const last = events.at(-1)?.message
  return [
    last
      ? `Nethermind returned no executable private transaction before submit. Last status: ${last}`
      : 'Nethermind returned no executable private transaction before submit.',
  ]
}

export function parseNote(value: unknown): XlmShieldedNote | undefined {
  const id = stringField(value, 'id')
  const amount = stringField(value, 'amount')
  const spent = booleanField(value, 'spent')
  const leafIndex = numberField(value, 'leafIndex')
  const createdAtLedger = numberField(value, 'createdAtLedger')

  if (!id || !amount || spent === undefined || leafIndex === undefined || createdAtLedger === undefined) {
    return undefined
  }

  return { id, amountStroops: amount, spent, leafIndex, createdAtLedger }
}

export async function prepareClient(options: {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly importWebModule?: NethermindModuleImporter
}) {
  const client = await loadNethermindWebClient(options.network, options.importWebModule)
  await client.deriveAndSaveUserKeys(
    options.identity.stellarPublicKey,
    options.identity.keyDerivationSignature,
  )
  return client
}

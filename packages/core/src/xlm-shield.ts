import type { WalletIdentity } from './identity'
import type { AssetCode } from './assets'
import { getNetworkConfig, type NetworkKey } from './networks'
import {
  loadNethermindWebClient,
  type NethermindModuleImporter,
  type NethermindPreparedProverTx,
} from './nethermind-runtime'
import {
  submitPreparedSorobanTx,
  type SorobanSubmitStatus,
  type SubmitPreparedSorobanTxOptions,
} from './soroban-submit'
import { defaultPrivateActionTimeoutMs } from './xlm-private-support'

const defaultShieldAmountStroops = 1_000_000n
const syncGapPattern = /sync ([0-9]+) ledger/

export type XlmShieldStatus = 'submitted' | 'blocked' | 'failed'

export interface XlmShieldProgressEvent {
  readonly source: 'nethermind' | 'soroban'
  readonly elapsedMs: number
  readonly flow?: string
  readonly step?: string
  readonly message: string
}

export interface XlmShieldSubmitReport {
  readonly status: XlmShieldStatus
  readonly asset: AssetCode
  readonly durationMs: number
  readonly network: NetworkKey
  readonly poolContractId?: string
  readonly userAddress: string
  readonly amountStroops: string
  readonly proofGenerated: boolean
  readonly submitReached: boolean
  readonly transactionSubmitted: boolean
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly signedAuthEntryCount: number
  readonly statusEvents: readonly XlmShieldProgressEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface SubmitXlmShieldDepositOptions {
  readonly asset?: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly amountStroops?: bigint
  readonly timeoutMs?: number
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
  readonly submitOptions?: Pick<
    SubmitPreparedSorobanTxOptions,
    'serverFactory' | 'sleep' | 'confirmationPolls' | 'pollIntervalMs'
  >
}

function defaultNow(): number {
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

function timeoutAfter(ms: number, asset: AssetCode): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${asset} shield submit timed out after ${ms} ms`)), ms)
  })
}

function explorerUrl(network: NetworkKey, txHash: string): string {
  return `${getNetworkConfig(network).explorerTxUrl}/${txHash}`
}

function proofWasGenerated(events: readonly XlmShieldProgressEvent[], submitReached: boolean): boolean {
  return submitReached || events.some((event) => event.step === 'prepare_tx' || event.message.includes('Simulating'))
}

function maxSyncGap(events: readonly XlmShieldProgressEvent[]): number | undefined {
  let max: number | undefined

  for (const event of events) {
    const match = event.message.match(syncGapPattern)
    if (!match) {
      continue
    }

    const value = Number(match[1])
    max = max === undefined ? value : Math.max(max, value)
  }

  return max
}

function blockersForNullResult(events: readonly XlmShieldProgressEvent[]): readonly string[] {
  const gap = maxSyncGap(events)
  if (gap !== undefined) {
    return [
      `ASP membership/indexer precondition stopped before proving; latest observed sync gap was ${gap.toLocaleString()} ledgers. If the ASP leaf was just inserted, wait a few ledgers and retry.`,
    ]
  }

  const last = events.at(-1)?.message
  return [
    last
      ? `Nethermind returned no executable shield transaction before submit. Last status: ${last}`
      : 'Nethermind returned no executable shield transaction before submit.',
  ]
}

export async function submitXlmShieldDeposit(
  options: SubmitXlmShieldDepositOptions,
): Promise<XlmShieldSubmitReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const network = getNetworkConfig(options.network)
  const asset = options.asset ?? 'XLM'
  const amount = options.amountStroops ?? defaultShieldAmountStroops
  const poolContractId = network.assets[asset].poolId
  const statusEvents: XlmShieldProgressEvent[] = []
  let submitReached = false
  let transactionSubmitted = false
  let signedAuthEntryCount = 0
  let txHash: string | undefined

  if (options.network !== 'testnet') {
    return blockedReport(`${asset} shield submit is enabled only on testnet in this phase.`)
  }

  if (!poolContractId) {
    return blockedReport(`${asset} pool is not configured for this network.`)
  }

  try {
    const client = await loadNethermindWebClient(options.network, options.importWebModule)

    if (!client.executeDeposit) {
      throw new Error('Nethermind WebClient does not expose executeDeposit')
    }

    await client.deriveAndSaveUserKeys(
      options.identity.stellarPublicKey,
      options.identity.keyDerivationSignature,
    )

    const attempt = client.executeDeposit(
      poolContractId,
      options.identity.stellarPublicKey,
      amount,
      [amount, 0n],
      async (prepared: NethermindPreparedProverTx) => {
        submitReached = true
        const result = await submitPreparedSorobanTx(prepared, {
          identity: options.identity,
          network: options.network,
          onStatus: (event: SorobanSubmitStatus) => {
            statusEvents.push({
              elapsedMs: Math.round(now() - started),
              source: 'soroban',
              message: event.message,
              step: event.stage,
            })
          },
          ...options.submitOptions,
        })
        txHash = result.hash
        transactionSubmitted = true
        signedAuthEntryCount = result.signedAuthEntryCount
        return result.hash
      },
      (event) => {
        statusEvents.push({
          elapsedMs: Math.round(now() - started),
          source: 'nethermind',
          flow: stringField(event, 'flow'),
          message: stringField(event, 'message') ?? stringField(event, 'step') ?? 'status',
          step: stringField(event, 'stage') ?? stringField(event, 'step'),
        })
      },
    )
    const hashes = await Promise.race([attempt, timeoutAfter(options.timeoutMs ?? defaultPrivateActionTimeoutMs, asset)])
    const finalHash = txHash ?? hashes?.[0]

    if (!finalHash) {
      return blockedReport(blockersForNullResult(statusEvents))
    }

    return {
      status: 'submitted',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: amount.toString(),
      proofGenerated: true,
      submitReached: true,
      transactionSubmitted: true,
      txHash: finalHash,
      explorerUrl: explorerUrl(options.network, finalHash),
      signedAuthEntryCount,
      statusEvents,
      blockers: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `unknown ${asset} shield error`
    return {
      status: 'failed',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: amount.toString(),
      proofGenerated: proofWasGenerated(statusEvents, submitReached),
      submitReached,
      transactionSubmitted,
      txHash,
      explorerUrl: txHash ? explorerUrl(options.network, txHash) : undefined,
      signedAuthEntryCount,
      statusEvents,
      blockers: [message],
      error: message,
    }
  }

  function blockedReport(blocker: string | readonly string[]): XlmShieldSubmitReport {
    return {
      status: 'blocked',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: amount.toString(),
      proofGenerated: false,
      submitReached: false,
      transactionSubmitted: false,
      signedAuthEntryCount,
      statusEvents,
      blockers: Array.isArray(blocker) ? blocker : [blocker],
    }
  }
}

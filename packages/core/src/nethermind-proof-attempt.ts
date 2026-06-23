import { getNetworkConfig, type NetworkKey } from './networks'
import type { WalletIdentity } from './identity'
import {
  loadNethermindWebClient,
  type NethermindModuleImporter,
} from './nethermind-runtime'

const defaultAmountStroops = 1_000_000n
const defaultTimeoutMs = 25_000
const syncGapPattern = /sync ([0-9]+) ledger/

export type DryDepositAttemptStatus = 'proof-generated' | 'blocked' | 'failed'

export interface NethermindStatusEvent {
  readonly flow?: string
  readonly step?: string
  readonly message?: string
  readonly elapsedMs: number
}

export interface DryDepositAttemptReport {
  readonly status: DryDepositAttemptStatus
  readonly durationMs: number
  readonly network: NetworkKey
  readonly poolContractId?: string
  readonly userAddress: string
  readonly userKeysStored: boolean
  readonly aspSecretStored: boolean
  readonly statusEvents: readonly NethermindStatusEvent[]
  readonly blockers: readonly string[]
  readonly proofGenerated: boolean
  readonly submitReached: boolean
  readonly error?: string
}

export interface DryDepositAttemptOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly amountStroops?: bigint
  readonly timeoutMs?: number
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
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

function statusMessage(events: readonly NethermindStatusEvent[]): string | undefined {
  return events.at(-1)?.message
}

function maxSyncGap(events: readonly NethermindStatusEvent[]): number | undefined {
  let max: number | undefined
  for (const event of events) {
    const match = event.message?.match(syncGapPattern)
    if (!match) {
      continue
    }
    const value = Number(match[1])
    max = max === undefined ? value : Math.max(max, value)
  }
  return max
}

function blockersForNullResult(events: readonly NethermindStatusEvent[]): readonly string[] {
  const gap = maxSyncGap(events)
  if (gap !== undefined) {
    return [
      `ASP membership/indexer precondition stopped before proving; latest observed sync gap was ${gap.toLocaleString()} ledgers.`,
    ]
  }

  return ['Nethermind WebClient returned no transaction; proof generation did not start.']
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`dry deposit proof attempt timed out after ${ms} ms`)), ms)
  })
}

function proofWasGenerated(events: readonly NethermindStatusEvent[], submitReached: boolean): boolean {
  return submitReached || events.some((event) => event.step === 'prepare_tx' || event.message?.includes('Simulating'))
}

export async function runNethermindDryDepositProofAttempt(
  options: DryDepositAttemptOptions,
): Promise<DryDepositAttemptReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const network = getNetworkConfig(options.network)
  const poolContractId = network.assets.XLM.poolId
  const statusEvents: NethermindStatusEvent[] = []
  let submitReached = false
  let userKeysStored = false
  let aspSecretStored = false

  if (!poolContractId) {
    return {
      status: 'blocked',
      durationMs: 0,
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      userKeysStored,
      aspSecretStored,
      statusEvents,
      blockers: ['XLM pool is not configured for this network.'],
      proofGenerated: false,
      submitReached,
    }
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
    userKeysStored = Boolean(await client.getUserKeys(options.identity.stellarPublicKey))
    aspSecretStored = Boolean(await client.getASPSecret(options.identity.stellarPublicKey))

    const amount = options.amountStroops ?? defaultAmountStroops
    const attempt = client.executeDeposit(
      poolContractId,
      options.identity.stellarPublicKey,
      amount,
      [amount, 0n],
      async (_prepared) => {
        submitReached = true
        throw new Error('dry-run submit disabled')
      },
      (event) => {
        statusEvents.push({
          elapsedMs: Math.round(now() - started),
          flow: stringField(event, 'flow'),
          message: stringField(event, 'message'),
          step: stringField(event, 'step'),
        })
      },
    )
    const result = await Promise.race([attempt, timeoutAfter(options.timeoutMs ?? defaultTimeoutMs)])
    const proofGenerated = proofWasGenerated(statusEvents, submitReached)

    if (result === null) {
      return {
        status: 'blocked',
        durationMs: Math.round(now() - started),
        network: options.network,
        poolContractId,
        userAddress: options.identity.stellarPublicKey,
        userKeysStored,
        aspSecretStored,
        statusEvents,
        blockers: blockersForNullResult(statusEvents),
        proofGenerated,
        submitReached,
      }
    }

    return {
      status: proofGenerated ? 'proof-generated' : 'blocked',
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      userKeysStored,
      aspSecretStored,
      statusEvents,
      blockers: proofGenerated ? [] : [`Proof stage was not observed. Last status: ${statusMessage(statusEvents)}`],
      proofGenerated,
      submitReached,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown proof attempt error'
    const proofGenerated = proofWasGenerated(statusEvents, submitReached)
    const dryRunStop = message.includes('dry-run submit disabled')

    return {
      status: proofGenerated || dryRunStop ? 'proof-generated' : 'failed',
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      userKeysStored,
      aspSecretStored,
      statusEvents,
      blockers: proofGenerated || dryRunStop ? [] : [message],
      proofGenerated: proofGenerated || dryRunStop,
      submitReached,
      error: dryRunStop ? undefined : message,
    }
  }
}

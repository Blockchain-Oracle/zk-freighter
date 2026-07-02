import type { AssetCode } from './assets'
import { checkAspAccessIndexed, type AspAccessIndexReport } from './asp-access-indexing'
import { deriveAspMembershipLeaf } from './asp-membership'
import { readAspAccessRecord, writeAspAccessRecord, type AspAccessRecord, type AspAccessStore } from './asp-access-state'
import { insertAspMembershipLeaf, type AspMembershipInsertReport } from './asp-membership-insert'
import { ensureStellarUsdcTrustline, type StellarUsdcTrustlineReport } from './cctp-stellar'
import type { WalletIdentity } from './identity'
import { getNetworkConfig, maxShieldDepositStroops, type NetworkKey } from './networks'
import { loadPublicStellarBalances, type PublicBalancesReport } from './stellar-balance'
import { submitXlmShieldDeposit, type SubmitXlmShieldDepositOptions, type XlmShieldSubmitReport } from './xlm-shield'

const defaultAspConfirmWaitMs = 90_000
const defaultAspPollIntervalMs = 6_000

export interface ShieldPrerequisiteEvent {
  readonly elapsedMs: number
  readonly stage: 'balance' | 'usdc' | 'asp' | 'shield'
  readonly message: string
}

export interface ShieldPrerequisiteReports {
  readonly publicBalances?: PublicBalancesReport
  readonly usdcTrustline?: StellarUsdcTrustlineReport
  readonly aspInsert?: AspMembershipInsertReport
  readonly aspAccess?: AspAccessRecord
  readonly aspIndex?: AspAccessIndexReport
  readonly events: readonly ShieldPrerequisiteEvent[]
}

export interface ShieldWithPrerequisitesReport extends XlmShieldSubmitReport {
  readonly prerequisites: ShieldPrerequisiteReports
}

export interface SubmitShieldWithPrerequisitesOptions extends SubmitXlmShieldDepositOptions {
  readonly asset: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly runAspSetup?: boolean
  readonly aspAccessStore?: AspAccessStore
  /** Total in-run budget for waiting on first-time shield access to index on-chain. */
  readonly aspAccessConfirmWaitMs?: number
  readonly aspAccessPollIntervalMs?: number
  readonly aspAccessNow?: () => number
  readonly aspAccessSleep?: (ms: number) => Promise<void>
  readonly onPrerequisiteStatus?: (event: ShieldPrerequisiteEvent) => void
}

export async function submitShieldWithPrerequisites(
  options: SubmitShieldWithPrerequisitesOptions,
): Promise<ShieldWithPrerequisitesReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const events: ShieldPrerequisiteEvent[] = []
  let publicBalances: PublicBalancesReport | undefined
  let usdcTrustline: StellarUsdcTrustlineReport | undefined
  let aspInsert: AspMembershipInsertReport | undefined
  let aspAccess: AspAccessRecord | undefined
  let aspIndex: AspAccessIndexReport | undefined
  const aspAccessNow = options.aspAccessNow ?? Date.now
  const aspLeaf = deriveAspMembershipLeaf(options.identity)
  const aspPoolContractId = getNetworkConfig(options.network).assets.XLM.poolId
  const aspAccessKey = {
    network: options.network,
    userAddress: options.identity.stellarPublicKey,
    poolContractId: aspPoolContractId,
    leafHex: aspLeaf.membershipLeafHex,
  }

  let lastStage: ShieldPrerequisiteEvent['stage'] = 'balance'
  const emit = (stage: ShieldPrerequisiteEvent['stage'], message: string) => {
    lastStage = stage
    const event = { elapsedMs: Math.round(now() - started), stage, message }
    events.push(event)
    options.onPrerequisiteStatus?.(event)
  }

  const pollBudgetMs = options.aspAccessConfirmWaitMs ?? defaultAspConfirmWaitMs
  const pollIntervalMs = options.aspAccessPollIntervalMs ?? defaultAspPollIntervalMs
  const sleep = options.aspAccessSleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))

  const awaitIndexedAccess = async (record: AspAccessRecord): Promise<boolean> => {
    const deadline = aspAccessNow() + pollBudgetMs
    const maxPolls = Math.max(1, Math.ceil(pollBudgetMs / Math.max(pollIntervalMs, 1)))
    for (let poll = 0; ; poll += 1) {
      emit('asp', 'Confirming shield access on-chain')
      aspIndex = await checkAspAccessIndexed({ record })
      if (aspIndex?.status === 'indexed') {
        aspAccess = {
          ...record,
          status: 'indexed',
          indexedLedger: aspIndex.ledger,
          leafIndex: aspIndex.leafIndex,
          root: aspIndex.root,
          indexedAt: aspAccessNow(),
          updatedAt: aspAccessNow(),
        }
        await writeAspAccessRecord(aspAccess, options.aspAccessStore)
        emit('asp', 'Shield access indexed')
        return true
      }
      if (aspIndex?.status === 'unavailable') {
        // Deterministic (config/environment) failure — polling can never resolve it.
        emit('asp', aspIndex.blocker ?? 'Shield access indexing is unavailable.')
        return false
      }
      if (poll + 1 >= maxPolls || aspAccessNow() >= deadline) {
        emit('asp', aspIndex?.blocker ?? confirmingShieldAccessBlocker(record))
        return false
      }
      emit('asp', aspIndex?.status === 'failed'
        ? `Could not reach the shield access index — retrying. ${aspIndex.blocker ?? ''}`.trim()
        : 'Shield access is still confirming — waiting for the next ledgers')
      await sleep(pollIntervalMs)
    }
  }

  try {
    emit('balance', 'Checking public Stellar balance')
    publicBalances = await loadPublicStellarBalances({ address: options.identity.stellarPublicKey, network: options.network })
    const amount = options.amountStroops ?? 0n
    const available = publicBalances.balances[options.asset] ?? 0n
    const maxDeposit = maxShieldDepositStroops(options.network, options.asset)
    if (publicBalances.status === 'failed') {
      return withPrerequisites(blockedReport(options, `Could not load public ${options.asset} balance before shielding.`))
    }
    if (amount > 0n && available < amount) {
      return withPrerequisites(blockedReport(options, `Public ${options.asset} balance is lower than the shield amount.`))
    }
    if (amount > 0n && maxDeposit !== null && amount > maxDeposit) {
      return withPrerequisites(blockedReport(options, `This ${options.asset} shielded pool accepts at most ${maxDeposit.toString()} raw units per deposit.`))
    }

    if (options.asset === 'USDC') {
      emit('usdc', 'Checking USDC receiving')
      usdcTrustline = await ensureStellarUsdcTrustline({ identity: options.identity, network: options.network })
    }

    if (options.runAspSetup !== false) {
      aspAccess = await readAspAccessRecord(aspAccessKey, options.aspAccessStore) ?? undefined
      if (aspAccess?.status === 'ready') {
        emit('asp', 'Shield access ready')
      } else if (aspAccess?.status === 'indexed') {
        emit('asp', 'Shield access indexed')
      } else if (aspAccess?.status === 'submitted') {
        emit('asp', 'Shield access is confirming')
        if (!(await awaitIndexedAccess(aspAccess))) {
          return withPrerequisites(blockedReport(options, aspIndex?.blocker ?? confirmingShieldAccessBlocker(aspAccess)))
        }
      } else {
        emit('asp', 'Preparing shield access')
        aspInsert = await insertAspMembershipLeaf({ identity: options.identity, network: options.network })
        if (aspInsert.status === 'submitted') {
          aspAccess = {
            ...aspAccessKey,
            status: 'submitted',
            txHash: aspInsert.txHash,
            explorerUrl: aspInsert.explorerUrl,
            submittedLedger: aspInsert.ledger,
            submittedAt: aspAccessNow(),
            updatedAt: aspAccessNow(),
          }
          await writeAspAccessRecord(aspAccess, options.aspAccessStore)
          emit('asp', 'Shield access submitted')
          if (!(await awaitIndexedAccess(aspAccess))) {
            return withPrerequisites(blockedReport(options, aspIndex?.blocker ?? confirmingShieldAccessBlocker(aspAccess)))
          }
        } else {
          return withPrerequisites(blockedReport(options, aspInsert.blockers[0] ?? 'Shield access could not be prepared.'))
        }
      }
    }

    emit('shield', 'Starting shield deposit')
    const report = await submitXlmShieldDeposit(options)
    if (options.runAspSetup !== false && report.status === 'submitted') {
      const readyRecord: AspAccessRecord = {
        ...(aspAccess ?? aspAccessKey),
        status: 'ready',
        txHash: aspAccess?.txHash,
        explorerUrl: aspAccess?.explorerUrl,
        submittedAt: aspAccess?.submittedAt ?? aspAccessNow(),
        updatedAt: aspAccessNow(),
      }
      aspAccess = readyRecord
      await writeAspAccessRecord(readyRecord, options.aspAccessStore)
    }
    return withPrerequisites(report)
  } catch (error) {
    console.error('[shield-orchestration] prerequisite flow failed', error)
    const detail = error instanceof Error ? error.message : 'Shield prerequisite flow failed.'
    return withPrerequisites(blockedReport(options, `Shield ${lastStage} step failed: ${detail}`))
  }

  function withPrerequisites(report: XlmShieldSubmitReport): ShieldWithPrerequisitesReport {
    return { ...report, prerequisites: { publicBalances, usdcTrustline, aspInsert, aspAccess, aspIndex, events } }
  }
}

function confirmingShieldAccessBlocker(record: AspAccessRecord): string {
  const suffix = record.txHash ? ` Setup transaction ${record.txHash} is submitted.` : ''
  return `Shield access is confirming on-chain and took longer than expected. Shield again to keep waiting; no deposit was submitted yet.${suffix}`
}

function blockedReport(options: SubmitShieldWithPrerequisitesOptions, blocker: string): XlmShieldSubmitReport {
  const asset = options.asset
  const amount = options.amountStroops ?? 0n
  return {
    status: 'blocked',
    asset,
    durationMs: 0,
    network: options.network,
    userAddress: options.identity.stellarPublicKey,
    amountStroops: amount.toString(),
    proofGenerated: false,
    submitReached: false,
    transactionSubmitted: false,
    signedAuthEntryCount: 0,
    statusEvents: [],
    blockers: [blocker],
  }
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

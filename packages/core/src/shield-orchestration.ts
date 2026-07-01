import type { AssetCode } from './assets'
import { insertAspMembershipLeaf, type AspMembershipInsertReport } from './asp-membership-insert'
import { ensureStellarUsdcTrustline, type StellarUsdcTrustlineReport } from './cctp-stellar'
import type { WalletIdentity } from './identity'
import type { NetworkKey } from './networks'
import { loadPublicStellarBalances, type PublicBalancesReport } from './stellar-balance'
import { submitXlmShieldDeposit, type SubmitXlmShieldDepositOptions, type XlmShieldSubmitReport } from './xlm-shield'

export interface ShieldPrerequisiteEvent {
  readonly elapsedMs: number
  readonly stage: 'balance' | 'usdc' | 'asp' | 'shield'
  readonly message: string
}

export interface ShieldPrerequisiteReports {
  readonly publicBalances?: PublicBalancesReport
  readonly usdcTrustline?: StellarUsdcTrustlineReport
  readonly aspInsert?: AspMembershipInsertReport
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

  const emit = (stage: ShieldPrerequisiteEvent['stage'], message: string) => {
    const event = { elapsedMs: Math.round(now() - started), stage, message }
    events.push(event)
    options.onPrerequisiteStatus?.(event)
  }

  try {
    emit('balance', 'Checking public Stellar balance')
    publicBalances = await loadPublicStellarBalances({ address: options.identity.stellarPublicKey, network: options.network })
    const amount = options.amountStroops ?? 0n
    const available = publicBalances.balances[options.asset] ?? 0n
    if (publicBalances.status === 'failed') {
      return withPrerequisites(blockedReport(options, `Could not load public ${options.asset} balance before shielding.`))
    }
    if (amount > 0n && available < amount) {
      return withPrerequisites(blockedReport(options, `Public ${options.asset} balance is lower than the shield amount.`))
    }

    if (options.asset === 'USDC') {
      emit('usdc', 'Checking USDC receiving')
      usdcTrustline = await ensureStellarUsdcTrustline({ identity: options.identity, network: options.network })
    }

    if (options.runAspSetup !== false) {
      emit('asp', 'Preparing shield access')
      aspInsert = await insertAspMembershipLeaf({ identity: options.identity, network: options.network })
      if (aspInsert.status === 'submitted') {
        emit('asp', 'Shield access submitted')
      } else {
        return withPrerequisites(blockedReport(options, aspInsert.blockers[0] ?? 'Shield access could not be prepared.'))
      }
    }

    emit('shield', 'Starting shield deposit')
    return withPrerequisites(await submitXlmShieldDeposit(options))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Shield prerequisite flow failed.'
    return withPrerequisites(blockedReport(options, message))
  }

  function withPrerequisites(report: XlmShieldSubmitReport): ShieldWithPrerequisitesReport {
    return { ...report, prerequisites: { publicBalances, usdcTrustline, aspInsert, events } }
  }
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

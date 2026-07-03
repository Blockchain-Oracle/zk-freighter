import type { AssetCode } from './assets'
import { planAutoShield, type AutoShieldReason } from './auto-shield-plan'
import { autoShieldFloorStroops, type AutoShieldSettings } from './auto-shield-settings'
import type { PublicBalancesReport } from './stellar-balance'

/** Per-asset cooldown between auto-shield attempts. */
export const AUTO_SHIELD_COOLDOWN_MS = 30_000
/** Successful auto-shield deposits allowed per asset per unlock session. */
export const AUTO_SHIELD_MAX_RUNS_PER_SESSION = 3

/** Structural subset of a shield submit report the runner needs. */
export interface AutoShieldSubmitReport {
  readonly status: 'submitted' | 'blocked' | 'failed'
  readonly amountStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly blockers?: readonly string[]
}

export type AutoShieldRunKind = 'shielded' | 'skipped' | 'blocked' | 'failed'

export type AutoShieldSkipReason =
  | AutoShieldReason
  | 'busy'
  | 'first-shield'
  | 'cooldown'
  | 'max-runs'
  | 'latched'
  | 'balance-unavailable'

export interface AutoShieldRunResult {
  readonly kind: AutoShieldRunKind
  readonly asset: AssetCode
  readonly amountStroops: bigint
  readonly reason: AutoShieldSkipReason
  readonly report?: AutoShieldSubmitReport
  readonly blocker?: string
}

export interface AutoShieldSubmitInput {
  readonly asset: AssetCode
  readonly amountStroops: bigint
}

export interface CreateAutoShieldRunnerOptions {
  readonly submit: (input: AutoShieldSubmitInput) => Promise<AutoShieldSubmitReport>
  readonly loadBalances: () => Promise<PublicBalancesReport>
  readonly getSettings: () => AutoShieldSettings | Promise<AutoShieldSettings>
  readonly hasShieldedBefore: () => boolean | Promise<boolean>
  readonly now?: () => number
}

export interface AutoShieldRunner {
  maybeRun(asset: AssetCode): Promise<AutoShieldRunResult>
}

interface AssetState {
  lastRunAt: number
  successRuns: number
  latched: boolean
}

/**
 * Creates a session-scoped auto-shield runner. One instance guards one unlock session:
 * a single in-flight job, a 30s per-asset cooldown, at most three successful deposits per
 * asset, and terminal latching so a blocked/failed asset makes exactly one attempt. The
 * first-ever shield stays manual — the runner skips until the wallet has shielded before.
 */
export function createAutoShieldRunner(options: CreateAutoShieldRunnerOptions): AutoShieldRunner {
  const now = options.now ?? Date.now
  const states = new Map<AssetCode, AssetState>()
  let busy = false

  const stateFor = (asset: AssetCode): AssetState => {
    let state = states.get(asset)
    if (!state) {
      state = { lastRunAt: Number.NEGATIVE_INFINITY, successRuns: 0, latched: false }
      states.set(asset, state)
    }
    return state
  }

  const skip = (asset: AssetCode, reason: AutoShieldSkipReason): AutoShieldRunResult => ({
    kind: 'skipped',
    asset,
    amountStroops: 0n,
    reason,
  })

  const maybeRun = async (asset: AssetCode): Promise<AutoShieldRunResult> => {
    // Claim the session synchronously so an interleaved call sees the busy flag before
    // any await yields control.
    if (busy) return skip(asset, 'busy')
    busy = true
    try {
      const settings = await options.getSettings()
      if (!settings.enabled) return skip(asset, 'disabled')

      const state = stateFor(asset)
      if (state.latched) return skip(asset, 'latched')
      if (state.successRuns >= AUTO_SHIELD_MAX_RUNS_PER_SESSION) return skip(asset, 'max-runs')
      if (now() - state.lastRunAt < AUTO_SHIELD_COOLDOWN_MS) return skip(asset, 'cooldown')

      if (!(await options.hasShieldedBefore())) return skip(asset, 'first-shield')

      state.lastRunAt = now()
      const balances = await options.loadBalances()
      if (balances.status === 'failed') {
        state.latched = true
        return { kind: 'failed', asset, amountStroops: 0n, reason: 'balance-unavailable', blocker: balances.error }
      }

      const plan = planAutoShield({
        asset,
        network: balances.network,
        publicBalanceStroops: balances.balances[asset] ?? 0n,
        floorStroops: autoShieldFloorStroops(settings, asset),
      })
      if (plan.action === 'skip') return skip(asset, plan.reason)

      const report = await options.submit({ asset, amountStroops: plan.amountStroops })
      if (report.status === 'submitted') {
        state.successRuns += 1
        return { kind: 'shielded', asset, amountStroops: plan.amountStroops, reason: 'ok', report }
      }

      state.latched = true
      const blocker = report.blockers?.[0]
      return {
        kind: report.status === 'blocked' ? 'blocked' : 'failed',
        asset,
        amountStroops: plan.amountStroops,
        reason: 'ok',
        report,
        blocker,
      }
    } finally {
      busy = false
    }
  }

  return { maybeRun }
}

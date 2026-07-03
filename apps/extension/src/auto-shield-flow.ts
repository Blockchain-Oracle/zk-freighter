import {
  createAutoShieldRunner,
  loadPublicStellarBalances,
  runExclusive,
  type AutoShieldRunResult,
  type AutoShieldRunner,
} from '@zk-freighter/core'
import { readActivity } from './activity-store'
import { readAutoShieldSettings } from './auto-shield-settings'
import type { AutoShieldTickResponse, AutoShieldTickResult } from './dappResponses'
import { quickShieldFlow } from './dappRuntime-flows'
import { identityForMnemonic, readStoredDappWallet, requireUnlockedDappWallet } from './dappRuntimeState'
import type { ExtensionShieldRunner } from './dappRuntime-types'

// One runner per unlock session, held for the service-worker lifetime. Re-opening the
// popup re-sends the tick, but the cooldown / max-runs / latch guards live here, so a
// rapid re-open is a no-op rather than a fresh attempt.
let session: { key: string; runner: AutoShieldRunner } | null = null

/**
 * Popup-open auto-shield tick. Runs USDC then XLM through the shared serialization gate
 * (the offscreen proving queue serializes across manual flows). `hasShieldedBefore` reads
 * persisted activity — a submitted shield exists only after the first manual deposit, so
 * the first shield stays manual and auto-shield takes over afterward.
 */
export async function autoShieldTickFlow(
  unlockedMnemonic: string | null,
  runShield: ExtensionShieldRunner | undefined,
): Promise<AutoShieldTickResponse> {
  const ready = await requireUnlockedDappWallet(unlockedMnemonic)
  if (!ready.ok) return { ok: false, error: ready.error }
  const identity = identityForMnemonic(ready.mnemonic, await readStoredDappWallet())
  if (!identity) return { ok: false, error: 'Unlock ZK Freighter to auto-shield.' }
  const address = identity.stellarPublicKey
  const key = `${ready.network}:${address}`

  if (session?.key !== key) {
    session = {
      key,
      runner: createAutoShieldRunner({
        submit: ({ asset, amountStroops }) =>
          runExclusive(async () => {
            const res = await quickShieldFlow(ready, runShield, asset, amountStroops.toString())
            if (res.ok && res.report) return res.report
            return { status: 'failed' as const, blockers: [res.error ?? 'Auto-shield deposit failed.'] }
          }),
        loadBalances: () => loadPublicStellarBalances({ address, network: ready.network }),
        getSettings: () => readAutoShieldSettings(),
        hasShieldedBefore: async () => {
          const records = await readActivity(ready.network)
          return records.some((record) => record.kind === 'shield' && record.status === 'submitted')
        },
      }),
    }
  }

  let salient: AutoShieldRunResult | null = null
  for (const asset of ['USDC', 'XLM'] as const) {
    salient = moreSalient(salient, await session.runner.maybeRun(asset))
  }
  return { ok: true, ...(salient && isBannerWorthy(salient) ? { result: serializeResult(salient) } : {}) }
}

// Failures outrank successes: "USDC failed, XLM shielded" must show the failure.
const SALIENCE: Record<AutoShieldRunResult['kind'], number> = { failed: 4, blocked: 3, shielded: 2, skipped: 1 }

function moreSalient(current: AutoShieldRunResult | null, next: AutoShieldRunResult): AutoShieldRunResult {
  if (!current) return next
  return SALIENCE[next.kind] > SALIENCE[current.kind] ? next : current
}

function isBannerWorthy(result: AutoShieldRunResult): boolean {
  return result.kind !== 'skipped' || result.reason === 'first-shield'
}

function serializeResult(result: AutoShieldRunResult): AutoShieldTickResult {
  return {
    kind: result.kind,
    asset: result.asset,
    amountStroops: result.amountStroops.toString(),
    reason: result.reason,
    ...(result.blocker ? { blocker: result.blocker } : {}),
  }
}

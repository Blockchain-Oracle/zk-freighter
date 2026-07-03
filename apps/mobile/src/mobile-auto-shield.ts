import { useEffect, useState } from 'react'
import {
  createAutoShieldRunner,
  loadPublicStellarBalances,
  type AutoShieldRunResult,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-freighter/core'
import { runMobileShield } from './mobile-runtime'
import { getStoredAutoShieldSettings, readMobileActivity } from './mobile-storage'

export interface MobileAutoShield {
  readonly result: AutoShieldRunResult | null
  readonly dismiss: () => void
}

/**
 * Post-unlock auto-shield trigger. Submits shield deposits through the existing mobile
 * private-job queue (`runMobileShield`), so no extra serialization gate is needed. Only
 * banner-worthy outcomes surface; `hasShieldedBefore` reads persisted activity so the
 * first shield stays a conscious manual action.
 */
export function useMobileAutoShield(
  identity: WalletIdentity | null,
  network: NetworkKey,
  onShielded: () => void,
): MobileAutoShield {
  const [result, setResult] = useState<AutoShieldRunResult | null>(null)

  useEffect(() => {
    if (!identity) return
    let cancelled = false
    const address = identity.stellarPublicKey
    const runner = createAutoShieldRunner({
      submit: ({ asset, amountStroops }) => runMobileShield({ asset, identity, network, amountStroops }),
      loadBalances: () => loadPublicStellarBalances({ address, network }),
      getSettings: () => getStoredAutoShieldSettings(),
      hasShieldedBefore: () =>
        readMobileActivity(network, address).some((record) => record.intent === 'shield' && record.status === 'submitted'),
    })

    // A later success must never mask an earlier failure banner.
    const publish = (outcome: AutoShieldRunResult) =>
      setResult((current) =>
        current && (current.kind === 'failed' || current.kind === 'blocked') && outcome.kind === 'shielded' ? current : outcome,
      )

    void (async () => {
      for (const asset of ['USDC', 'XLM'] as const) {
        try {
          const outcome = await runner.maybeRun(asset)
          if (cancelled) return
          if (outcome.kind !== 'skipped' || outcome.reason === 'first-shield') {
            publish(outcome)
            if (outcome.kind === 'shielded') onShielded()
          }
        } catch (cause) {
          // Unattended money flow: a rejection must surface, never vanish.
          if (cancelled) return
          console.error('[auto-shield] run rejected', cause)
          publish({ kind: 'failed', asset, amountStroops: 0n, reason: 'submit-rejected', blocker: cause instanceof Error ? cause.message : String(cause) })
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // onShielded is a stable refresh callback; re-running per identity/network is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.stellarPublicKey, network])

  return { result, dismiss: () => setResult(null) }
}

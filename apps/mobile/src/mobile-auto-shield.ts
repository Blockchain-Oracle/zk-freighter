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

    void (async () => {
      for (const asset of ['USDC', 'XLM'] as const) {
        const outcome = await runner.maybeRun(asset)
        if (cancelled) return
        if (outcome.kind !== 'skipped' || outcome.reason === 'first-shield') {
          setResult(outcome)
          if (outcome.kind === 'shielded') onShielded()
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

import { useEffect, useState } from 'react'
import {
  AUTO_SHIELD_STORAGE_KEY,
  createAutoShieldRunner,
  deriveAspMembershipLeaf,
  getNetworkConfig,
  loadPublicStellarBalances,
  parseAutoShieldSettings,
  readAspAccessRecord,
  runExclusive,
  submitShieldWithPrerequisites,
  type AutoShieldRunResult,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-freighter/core'

export interface UseAutoShieldResult {
  readonly result: AutoShieldRunResult | null
  readonly dismiss: () => void
}

/**
 * Post-unlock auto-shield trigger. One runner per unlock session (keyed by identity +
 * network — a network switch reloads the app, so this is per-session) runs USDC then XLM
 * through the shared serialization gate. Only outcomes worth showing surface as a banner;
 * routine skips (disabled/cooldown/below-floor) stay silent.
 *
 * `hasShieldedBefore` reads the ASP access record: it becomes `ready` only after a full
 * shield deposit, so the first shield stays a conscious manual action (it incurs the ~90s
 * ASP setup) while later deposits can auto-shield.
 */
export function useAutoShield(
  identity: WalletIdentity,
  network: NetworkKey,
  onShielded: () => void,
): UseAutoShieldResult {
  const [result, setResult] = useState<AutoShieldRunResult | null>(null)

  useEffect(() => {
    let cancelled = false
    const leaf = deriveAspMembershipLeaf(identity)
    const poolContractId = getNetworkConfig(network).assets.XLM.poolId

    const runner = createAutoShieldRunner({
      submit: ({ asset, amountStroops }) =>
        runExclusive(() => submitShieldWithPrerequisites({ asset, identity, network, amountStroops })),
      loadBalances: () => loadPublicStellarBalances({ address: identity.stellarPublicKey, network }),
      getSettings: () => parseAutoShieldSettings(window.localStorage.getItem(AUTO_SHIELD_STORAGE_KEY)),
      hasShieldedBefore: async () => {
        const record = await readAspAccessRecord({
          network,
          userAddress: identity.stellarPublicKey,
          poolContractId,
          leafHex: leaf.membershipLeafHex,
        })
        return record?.status === 'ready'
      },
    })

    void (async () => {
      for (const asset of ['USDC', 'XLM'] as const) {
        const outcome = await runner.maybeRun(asset)
        if (cancelled) return
        if (isBannerWorthy(outcome)) {
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
  }, [identity.stellarPublicKey, network])

  return { result, dismiss: () => setResult(null) }
}

function isBannerWorthy(outcome: AutoShieldRunResult): boolean {
  if (outcome.kind !== 'skipped') return true
  return outcome.reason === 'first-shield'
}

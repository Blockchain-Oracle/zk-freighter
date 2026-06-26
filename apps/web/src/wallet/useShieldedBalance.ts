import { useCallback, useEffect, useState } from 'react'
import {
  loadXlmShieldedNotes,
  type NetworkKey,
  type WalletIdentity,
  type XlmNotesReport,
} from '@zk-fighter/core'

export interface ShieldedBalanceState {
  /** True while the current load is in flight (or stale after an identity/network change). */
  loading: boolean
  xlm: XlmNotesReport | null
  usdc: XlmNotesReport | null
  /** Set only when the load itself unexpectedly rejects (vs. a returned blocked/failed report). */
  error: string | null
  /** Re-run the load (e.g. a manual "Refresh notes"). */
  refresh: () => void
}

interface LoadResult {
  readonly key: string
  readonly xlm: XlmNotesReport | null
  readonly usdc: XlmNotesReport | null
  readonly error: string | null
}

/**
 * Loads real shielded notes for XLM + USDC from the deployed pools via the
 * Nethermind WASM client. Each result is tagged with the request key, so a
 * pending reload or network switch reads as loading with NO stale/cross-network
 * data — and the screens render honest loaded/blocked/failed states, never a
 * fabricated balance. Lift this to the shell so the (expensive) prover load runs
 * once per identity/network.
 */
export function useShieldedBalance(identity: WalletIdentity, network: NetworkKey): ShieldedBalanceState {
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const requestKey = `${identity.stellarPublicKey}:${network}:${tick}`

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      loadXlmShieldedNotes({ identity, network, asset: 'XLM' }),
      loadXlmShieldedNotes({ identity, network, asset: 'USDC' }),
    ])
      .then(([xlm, usdc]) => {
        if (!cancelled) {
          setResult({ key: requestKey, xlm, usdc, error: null })
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          // loadXlmShieldedNotes returns failed/blocked reports rather than throwing,
          // so reaching here is a genuinely unexpected fault — surface it, never swallow.
          console.error('[useShieldedBalance] unexpected note-load rejection', cause)
          setResult({
            key: requestKey,
            xlm: null,
            usdc: null,
            error: cause instanceof Error ? cause.message : 'Unexpected error loading shielded notes.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [identity, network, requestKey])

  const data = result?.key === requestKey ? result : null
  return {
    loading: data === null,
    xlm: data?.xlm ?? null,
    usdc: data?.usdc ?? null,
    error: data?.error ?? null,
    refresh,
  }
}

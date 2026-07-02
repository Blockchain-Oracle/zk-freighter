import { useCallback, useEffect, useState } from 'react'
import {
  loadXlmShieldedNoteSet,
  type NetworkKey,
  type WalletIdentity,
  type XlmNotesReport,
} from '@zk-freighter/core'

export interface ShieldedBalanceState {
  /** True while the current load is in flight (or stale after an identity/network change). */
  loading: boolean
  xlm: XlmNotesReport | null
  usdc: XlmNotesReport | null
  /** Set only when the load itself unexpectedly rejects (vs. a returned blocked/failed report). */
  error: string | null
  /** Re-run the load. Pass syncBeforeRead only for explicit user sync or after a finished foreground flow. */
  refresh: (options?: ShieldedBalanceRefreshOptions) => void
}

interface ShieldedBalanceRefreshOptions {
  readonly syncBeforeRead?: boolean
}

interface LoadResult {
  readonly key: string
  readonly xlm: XlmNotesReport | null
  readonly usdc: XlmNotesReport | null
  readonly error: string | null
}

interface LoadRequest {
  readonly tick: number
  readonly syncBeforeRead: boolean
}

/**
 * Loads real shielded notes for XLM + USDC from the deployed pools via the
 * Nethermind WASM client. Each result is tagged with the request key, so a
 * pending reload or network switch reads as loading with NO stale/cross-network
 * data — and the screens render honest loaded/blocked/failed states, never a
 * fabricated balance. Lift this to the shell so the (expensive) prover load runs
 * once per identity/network.
 */
export function useShieldedBalance(identity: WalletIdentity, network: NetworkKey, enabled = true): ShieldedBalanceState {
  const [request, setRequest] = useState<LoadRequest>({ tick: 0, syncBeforeRead: false })
  const [result, setResult] = useState<LoadResult | null>(null)
  const requestKey = `${identity.stellarPublicKey}:${network}:${request.tick}:${request.syncBeforeRead ? 'sync' : 'read'}`

  const refresh = useCallback((options: ShieldedBalanceRefreshOptions = {}) => {
    setRequest((value) => ({
      tick: value.tick + 1,
      syncBeforeRead: options.syncBeforeRead ?? false,
    }))
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        const reports = await loadXlmShieldedNoteSet({
          identity,
          network,
          assets: ['XLM', 'USDC'],
          syncBeforeRead: request.syncBeforeRead,
        })
        if (!cancelled) {
          setResult({ key: requestKey, xlm: reports.XLM ?? null, usdc: reports.USDC ?? null, error: null })
        }
      } catch (cause: unknown) {
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
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, identity, network, request.syncBeforeRead, requestKey])

  const data = enabled && result?.key === requestKey ? result : null
  return {
    loading: !enabled || data === null,
    xlm: data?.xlm ?? null,
    usdc: data?.usdc ?? null,
    error: data?.error ?? null,
    refresh,
  }
}

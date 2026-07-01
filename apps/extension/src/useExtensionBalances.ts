import { useEffect, useState } from 'react'
import type { AssetCode } from '@zk-fighter/core'

import { dappMessageTypes, type DappBalances, type DappBalancesResponse } from './dappMessages'
import { formatStroops, stroopsToAmountInput } from './extension-format'

export interface ExtensionBalanceLoad {
  readonly balances: DappBalances | null
  readonly loading: boolean
  readonly error: string
  readonly refresh: () => void
}

export function useExtensionBalances(sendRuntimeMessage: (message: object) => Promise<unknown>): ExtensionBalanceLoad {
  const [tick, setTick] = useState(0)
  const [balances, setBalances] = useState<DappBalances | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const response = (await sendRuntimeMessage({ type: dappMessageTypes.balances })) as DappBalancesResponse
        if (cancelled) return
        if (response.ok && response.balances) {
          setBalances(response.balances)
          setError('')
        } else {
          setError(response.error ?? 'Could not load balances.')
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load balances.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage, tick])

  return { balances, loading, error, refresh: () => setTick((value) => value + 1) }
}

export function balanceStroops(
  balances: DappBalances | null,
  boundary: 'public' | 'shielded',
  asset: AssetCode,
): bigint | null {
  if (!balances) return null
  if (boundary === 'public') {
    if (!balances.publicOk) return null
    return BigInt(asset === 'XLM' ? balances.publicXlmStroops : balances.publicUsdcStroops)
  }
  if (!balances.shieldedOk) return null
  return BigInt(asset === 'XLM' ? balances.shieldedXlmStroops : balances.shieldedUsdcStroops)
}

export function balanceLabel(value: bigint | null, asset: AssetCode, loading: boolean): string {
  if (value === null) return loading ? 'Loading...' : 'Unavailable'
  return `${formatStroops(value, asset === 'XLM' ? 3 : 2)} ${asset}`
}

export function maxAmountInput(value: bigint | null): string {
  return value === null || value <= 0n ? '' : stroopsToAmountInput(value)
}

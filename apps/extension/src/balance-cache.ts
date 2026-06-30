import { browser } from 'wxt/browser'

import type { DappBalances } from './dappMessages'

// Durable balance cache (browser.storage.local) keyed by network + address, so a
// reopened popup shows the last REAL scan instantly and survives a full browser
// restart. Stale-while-revalidate: a cached read triggers a background refresh.

const cachePrefix = 'zkf.balances.'
const staleAfterMs = 20_000

export function balanceCacheKey(network: string, address: string): string {
  return `${cachePrefix}${network}.${address}`
}

export async function readBalanceCache(key: string): Promise<DappBalances | null> {
  const value = (await browser.storage.local.get(key))[key]
  return isBalances(value) ? value : null
}

export async function writeBalanceCache(key: string, balances: DappBalances): Promise<void> {
  await browser.storage.local.set({ [key]: balances })
}

/**
 * Wipe every cached balance. Called on lock + on vault import/replace so a locked
 * (or swapped) wallet never leaves shielded amounts readable at rest.
 */
export async function clearAllBalanceCache(): Promise<void> {
  const all = await browser.storage.local.get()
  const staleKeys = Object.keys(all).filter((key) => key.startsWith(cachePrefix))
  if (staleKeys.length > 0) {
    await browser.storage.local.remove(staleKeys)
  }
}

export function isBalanceStale(balances: DappBalances, now = Date.now()): boolean {
  const scannedAt = new Date(balances.scannedAt).getTime()
  return !Number.isFinite(scannedAt) || now - scannedAt > staleAfterMs
}

function isBalances(value: unknown): value is DappBalances {
  return (
    typeof value === 'object' &&
    value !== null &&
    'shieldedUsdcStroops' in value &&
    'publicUsdcStroops' in value &&
    'shieldedOk' in value &&
    'blockers' in value &&
    'scannedAt' in value
  )
}

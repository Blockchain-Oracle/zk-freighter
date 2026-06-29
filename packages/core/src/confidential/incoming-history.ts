// Persisted log of decrypted incoming confidential transfers, so the wallet can
// show a receive history without re-scanning. Light (localStorage only) — written
// by the heavy scan path (receive.ts) and read by the UI.

const HISTORY_PREFIX = 'zkf:confidential:incoming-history:v1'
const MAX_ENTRIES = 100

export interface IncomingHistoryEntry {
  /// Decrypted amount in underlying base units.
  readonly amount: string
  readonly ledger: number
  readonly txHash: string
  readonly eventId: string
}

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
function browserStore(): KeyValueStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}
const historyKey = (network: string, tokenId: string, account: string) => `${HISTORY_PREFIX}:${network}:${tokenId}:${account}`

export function loadIncomingHistory(
  network: string,
  tokenId: string,
  account: string,
  store: KeyValueStore | null = browserStore(),
): IncomingHistoryEntry[] {
  const raw = store?.getItem(historyKey(network, tokenId, account))
  if (!raw) return []
  try {
    return JSON.parse(raw) as IncomingHistoryEntry[]
  } catch {
    return []
  }
}

/** Append entries (dedup by eventId), newest first, capped. Returns the merged list. */
export function appendIncomingHistory(
  network: string,
  tokenId: string,
  account: string,
  entries: readonly IncomingHistoryEntry[],
  store: KeyValueStore | null = browserStore(),
): IncomingHistoryEntry[] {
  const existing = loadIncomingHistory(network, tokenId, account, store)
  const seen = new Set(existing.map((entry) => entry.eventId))
  const fresh = entries.filter((entry) => !seen.has(entry.eventId))
  const merged = [...fresh, ...existing].slice(0, MAX_ENTRIES)
  if (fresh.length > 0) store?.setItem(historyKey(network, tokenId, account), JSON.stringify(merged))
  return merged
}

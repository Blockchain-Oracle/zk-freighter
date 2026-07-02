import type { AssetCode, NetworkKey } from '@zk-freighter/core'

export type WebActivityIntent = 'fund' | 'shield' | 'send' | 'unshield' | 'bridge' | 'discover' | 'confidentialSetup'
export type WebActivityBoundary = 'public' | 'shielded'
export type WebActivityStatus = 'pending' | 'submitted' | 'blocked' | 'failed' | 'confirmed'

export interface WebActivityRecord {
  readonly id: string
  readonly network: NetworkKey
  readonly intent: WebActivityIntent
  readonly boundary: WebActivityBoundary
  readonly status: WebActivityStatus
  readonly asset?: AssetCode
  readonly amountStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly error?: string
  readonly ts: number
}

export interface WebActivityInput {
  readonly id?: string
  readonly network: NetworkKey
  readonly intent: WebActivityIntent
  readonly boundary: WebActivityBoundary
  readonly status: WebActivityStatus
  readonly asset?: AssetCode
  readonly amountStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly error?: string
  readonly ts?: number
}

const storageKey = 'zkf.web.activity.v1'
const maxRecords = 120
const activityEvent = 'zkf:web-activity'

export function makeWebActivityId(now = Date.now()): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `web-${now}-${random}`
}

export function readWebActivity(network: NetworkKey, storage = safeStorage()): readonly WebActivityRecord[] {
  return readAll(storage).filter((record) => record.network === network).sort((a, b) => b.ts - a.ts)
}

export function recordWebActivity(input: WebActivityInput, storage = safeStorage()): WebActivityRecord {
  const now = input.ts ?? Date.now()
  const id = input.id ?? makeWebActivityId(now)
  const existing = readAll(storage).find((record) => record.id === id)
  const record: WebActivityRecord = {
    ...input,
    id,
    ts: existing?.ts ?? now,
  }
  writeAll([record, ...readAll(storage).filter((item) => item.id !== id)].slice(0, maxRecords), storage)
  globalThis.dispatchEvent?.(new Event(activityEvent))
  return record
}

export function subscribeWebActivity(listener: () => void): () => void {
  globalThis.addEventListener?.(activityEvent, listener)
  globalThis.addEventListener?.('storage', listener)
  return () => {
    globalThis.removeEventListener?.(activityEvent, listener)
    globalThis.removeEventListener?.('storage', listener)
  }
}

function readAll(storage: Storage | null): readonly WebActivityRecord[] {
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch {
    return []
  }
}

function writeAll(records: readonly WebActivityRecord[], storage: Storage | null): void {
  if (!storage) return
  storage.setItem(storageKey, JSON.stringify(records))
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is WebActivityRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<WebActivityRecord>
  return typeof record.id === 'string'
    && (record.network === 'testnet' || record.network === 'mainnet')
    && typeof record.intent === 'string'
    && typeof record.boundary === 'string'
    && typeof record.status === 'string'
    && typeof record.ts === 'number'
}

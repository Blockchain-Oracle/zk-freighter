import { browser } from 'wxt/browser'

// F4 persistence: every op the runtime performs is appended here (browser.storage
// .local), so the Activity screen shows REAL history that survives popup close +
// browser restart. Records are written from the runtime with the op's actual
// terminal report (status + tx hash) — never fabricated.

export type ActivityKind = 'send' | 'unshield' | 'shield' | 'bridge' | 'confidential'
export type ActivityStatus = 'submitted' | 'failed' | 'blocked' | 'pending'
export type ActivityBoundary = 'shielded' | 'public'

export interface ActivityRecord {
  readonly id: string
  readonly kind: ActivityKind
  readonly status: ActivityStatus
  readonly boundary: ActivityBoundary
  readonly asset?: string
  readonly amountStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly ts: number
}

const storageKey = 'zkf.activity'
const maxRecords = 60

export async function recordActivity(record: ActivityRecord): Promise<void> {
  const next = [record, ...(await readActivity())].slice(0, maxRecords)
  await browser.storage.local.set({ [storageKey]: next })
}

export async function readActivity(): Promise<readonly ActivityRecord[]> {
  const value = (await browser.storage.local.get(storageKey))[storageKey]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function isRecord(value: unknown): value is ActivityRecord {
  return typeof value === 'object' && value !== null && 'id' in value && 'kind' in value && 'status' in value && 'ts' in value
}

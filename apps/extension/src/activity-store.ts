import { browser } from 'wxt/browser'
import { getNetworkConfig, type NetworkKey } from '@zk-freighter/core'

// F4 persistence: every op the runtime performs is appended here (browser.storage
// .local), so the Activity screen shows REAL history that survives popup close +
// browser restart. Records are written from the runtime with the op's actual
// terminal report (status + tx hash) — never fabricated.

export type ActivityKind = 'send' | 'unshield' | 'shield' | 'bridge' | 'confidential' | 'discover' | 'fund' | 'confidentialSetup'
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
  readonly network: NetworkKey
  readonly ts: number
}

const storageKey = 'zkf.activity'
const maxRecords = 60
let activityWriteQueue: Promise<void> = Promise.resolve()

export async function recordActivity(record: ActivityRecord): Promise<void> {
  activityWriteQueue = activityWriteQueue.catch(() => undefined).then(() => writeActivityRecord(record))
  return activityWriteQueue
}

async function writeActivityRecord(record: ActivityRecord): Promise<void> {
  const records = await readStoredRecords()
  const next = [record, ...records.filter((entry) => entry.id !== record.id)].slice(0, maxRecords)
  await browser.storage.local.set({ [storageKey]: next })
}

export async function readActivity(network?: NetworkKey): Promise<readonly ActivityRecord[]> {
  await activityWriteQueue.catch(() => undefined)
  const records = await readStoredRecords()
  const reconciled = await reconcile(records)
  if (reconciled.changed) {
    await writeReconciledRecords(reconciled.records)
  }
  return network === undefined ? filterNetworked(await readStoredRecords()) : filterByNetwork(await readStoredRecords(), network)
}

async function readStoredRecords(): Promise<readonly ActivityRecord[]> {
  const value = (await browser.storage.local.get(storageKey))[storageKey]
  if (!Array.isArray(value)) return []
  return value.filter(isRecord)
}

async function writeReconciledRecords(records: readonly ActivityRecord[]): Promise<void> {
  activityWriteQueue = activityWriteQueue.catch(() => undefined).then(async () => {
    const updates = new Map(records.map((record) => [record.id, record]))
    const latest = await readStoredRecords()
    const next = latest.map((record) => mergeReconciledRecord(record, updates.get(record.id)))
    await browser.storage.local.set({ [storageKey]: next })
  })
  await activityWriteQueue
}

function mergeReconciledRecord(record: ActivityRecord, update: ActivityRecord | undefined): ActivityRecord {
  if (!update || record.status !== 'pending' || update.status === 'pending') return record
  return { ...record, status: update.status }
}

function isRecord(value: unknown): value is ActivityRecord {
  return typeof value === 'object' && value !== null && 'id' in value && 'kind' in value && 'status' in value && 'ts' in value
}

function filterNetworked(records: readonly ActivityRecord[]): readonly ActivityRecord[] {
  return records.filter((record) => record.network === 'testnet' || record.network === 'mainnet')
}

function filterByNetwork(records: readonly ActivityRecord[], network: NetworkKey): readonly ActivityRecord[] {
  return records.filter((record) => record.network === network)
}

async function reconcile(records: readonly ActivityRecord[]): Promise<{ readonly changed: boolean; readonly records: readonly ActivityRecord[] }> {
  let changed = false
  const next = await Promise.all(records.map(async (record) => {
    if (!record.txHash || !record.network || record.status !== 'pending') return record
    const status = await horizonTxStatus(record.network, record.txHash)
    if (!status || status === record.status) return record
    changed = true
    return { ...record, status }
  }))
  return { changed, records: next }
}

async function horizonTxStatus(network: NetworkKey, txHash: string): Promise<ActivityStatus | null> {
  try {
    const url = `${getNetworkConfig(network).horizonUrl}/transactions/${encodeURIComponent(txHash)}`
    const response = await fetch(url)
    if (response.status === 404) return 'pending'
    if (!response.ok) return null
    const body = await response.json() as { readonly successful?: boolean }
    return body.successful === false ? 'failed' : 'submitted'
  } catch {
    return null
  }
}

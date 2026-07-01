import { useEffect, useState } from 'react'
import { Segmented } from '@zk-fighter/ui'

import type { ActivityRecord } from './activity-store'
import { dappMessageTypes, type ActivityResponse } from './dappMessages'
import { formatStroops } from './extension-format'
import { Copy, ExplorerLink } from './extension-ui'

// Activity: real persisted op history (from the runtime store), with the same
// filter chips as the web. Records are written by the runtime from actual op
// reports — never fabricated; an empty store shows an honest empty state.

type Filter = 'all' | 'shielded' | 'public' | 'pending'
const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'shielded', label: 'Shielded' },
  { value: 'public', label: 'Public' },
  { value: 'pending', label: 'Pending' },
]
const KIND_LABEL: Record<ActivityRecord['kind'], string> = {
  send: 'Sent privately',
  unshield: 'Unshielded',
  shield: 'Shielded',
  bridge: 'Bridged',
  confidential: 'Confidential',
  confidentialSetup: 'Confidential setup',
  discover: 'Discoverable',
  fund: 'Demo funded',
}
const STATUS_COLOR: Record<ActivityRecord['status'], string> = { submitted: 'var(--pos)', failed: 'var(--dng)', blocked: 'var(--warn)', pending: 'var(--warn)' }

function fmtStroops(stroops?: string): string {
  if (!stroops) return ''
  try {
    return formatStroops(stroops, 7)
  } catch {
    return ''
  }
}

function ago(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}

export function ExtensionActivityPanel({ sendRuntimeMessage }: { sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [records, setRecords] = useState<readonly ActivityRecord[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = (await sendRuntimeMessage({ type: dappMessageTypes.activity })) as ActivityResponse
        if (!cancelled) setRecords(res?.records ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage])

  const shown = records.filter((record) => (filter === 'all' ? true : filter === 'pending' ? record.status === 'pending' : record.boundary === filter))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Activity</div>
      <Segmented options={FILTERS.map((entry) => ({ value: entry.value, label: entry.label }))} value={filter} onChange={(value) => setFilter(value as Filter)} size="sm" />
      {loading ? (
        <Copy>Loading…</Copy>
      ) : shown.length === 0 ? (
        <Copy>No activity yet — your shield, send and unshield ops will appear here.</Copy>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map((record) => (
            <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{KIND_LABEL[record.kind]}{record.amountStroops ? ` · ${fmtStroops(record.amountStroops)} ${record.asset ?? ''}` : ''}</div>
                <div style={{ font: '600 10px/1 var(--fm)', color: 'var(--tx3)', marginTop: 4 }}>{ago(record.ts)} · {record.boundary}</div>
              </div>
              <span style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.06em', textTransform: 'uppercase', color: STATUS_COLOR[record.status] }}>{record.status}</span>
              {record.explorerUrl ? <ExplorerLink href={record.explorerUrl}>↗</ExplorerLink> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

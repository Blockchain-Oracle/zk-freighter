import { useEffect, useState } from 'react'
import { getNetworkConfig, type AssetCode, type NetworkKey, type XlmNotesReport, type XlmShieldedNote } from '@zk-freighter/core'
import { Callout, Chip, Pill, StatusPill, truncateMiddle } from '@zk-freighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops } from './format'
import { describeNotesIssue } from './balanceIssue'
import { readWebActivity, subscribeWebActivity, type WebActivityRecord } from './webActivityStore'

type Filter = 'all' | 'shielded' | 'public' | 'pending' | 'failed'
const FILTERS: Filter[] = ['all', 'shielded', 'public', 'pending', 'failed']

interface ActivityScreenProps {
  balance: ShieldedBalanceState
  network: NetworkKey
}

interface NoteRow {
  note: XlmShieldedNote
  asset: AssetCode
}

function rowsFrom(report: XlmNotesReport | null): NoteRow[] {
  if (!report || report.status !== 'loaded') return []
  return report.notes.map((note) => ({ note, asset: report.asset }))
}

function firstBlocker(balance: ShieldedBalanceState): string | null {
  if (balance.error) return balance.error
  if (balance.usdc && balance.usdc.status !== 'loaded') return balance.usdc.blockers[0] ?? null
  if (balance.xlm && balance.xlm.status !== 'loaded') return balance.xlm.blockers[0] ?? null
  return null
}

export function ActivityScreen({ balance, network }: ActivityScreenProps) {
  const { loading, xlm, usdc } = balance
  const [filter, setFilter] = useState<Filter>('all')
  const [records, setRecords] = useState<readonly WebActivityRecord[]>(() => readWebActivity(network))

  useEffect(() => {
    const load = () => setRecords(readWebActivity(network))
    load()
    return subscribeWebActivity(load)
  }, [network])

  const allRows = [...rowsFrom(usdc), ...rowsFrom(xlm)].sort((a, b) => b.note.createdAtLedger - a.note.createdAtLedger)
  const visibleRecords = records.filter((record) => {
    if (filter === 'pending') return record.status === 'pending'
    if (filter === 'failed') return record.status === 'failed' || record.status === 'blocked'
    if (filter === 'public') return record.boundary === 'public'
    if (filter === 'shielded') return record.boundary === 'shielded'
    return true
  })
  const rows = filter === 'all' || filter === 'shielded' ? allRows : []
  const issue = describeNotesIssue(firstBlocker(balance))
  const noteRows = issue ? [] : rows
  const empty = noteRows.length === 0 && visibleRecords.length === 0

  return (
    <section style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Activity</div>
        <div style={{ marginLeft: 'auto' }}><Pill label={loading ? 'SYNCING' : 'SYNCED'} tone={loading ? 'warn' : 'pos'} dot pulse={loading} /></div>
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginTop: 6, marginBottom: 18 }}>Spans both worlds. Shielded entries hide their detail; public boundaries are labelled.</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {FILTERS.map((key) => <Chip key={key} label={key[0].toUpperCase() + key.slice(1)} active={filter === key} onClick={() => setFilter(key)} />)}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Loading shielded notes…</div>
      ) : null}

      {!loading && issue ? (
        <div style={{ marginBottom: 12 }}>
          <Callout tone="warn" title={issue.title}>{issue.body}</Callout>
        </div>
      ) : null}

      {!loading && empty ? (
        <div style={{ padding: 18, border: '1px dashed var(--bd2)', borderRadius: 13, textAlign: 'center', fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.5 }}>
          {filter === 'public' ? 'No public boundary legs recorded yet.' : filter === 'pending' ? 'Nothing pending right now.' : filter === 'failed' ? 'No failed or blocked records.' : 'No shielded notes yet. Shield public funds, then your private balance and activity appear here.'}
        </div>
      ) : null}

      {!empty ? (
        <div style={{ border: '1px solid var(--bd)', borderRadius: 16, background: 'var(--panel)', overflow: 'hidden' }}>
          {visibleRecords.map((record, index) => (
            <ActivityRow key={record.id} record={record} first={index === 0} />
          ))}
          {noteRows.map(({ note, asset }, index) => (
            <div key={`${asset}:${note.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderTop: index === 0 && visibleRecords.length === 0 ? 'none' : '1px solid var(--bd)' }}>
              <span style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', background: 'rgba(94,124,250,.13)', color: 'var(--ac2)', display: 'grid', placeItems: 'center', fontSize: 15 }}>◆</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Shielded note · {asset}</div>
                <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)', marginTop: 2 }}>id {truncateMiddle(note.id, 6, 4)} · ledger {note.createdAtLedger}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)' }}>{formatStroops(BigInt(note.amountStroops), asset === 'XLM' ? 3 : 2)} {asset}</div>
                <div style={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end' }}><StatusPill status={note.spent ? 'confirmed' : 'spendable'} label={note.spent ? 'SPENT' : 'SPENDABLE'} /></div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ActivityRow({ record, first }: { readonly record: WebActivityRecord; readonly first: boolean }) {
  const status = record.status === 'submitted' || record.status === 'confirmed' ? 'confirmed' : record.status === 'pending' ? 'pending' : 'proving'
  const label = record.intent === 'confidentialSetup' ? 'Confidential setup' : record.intent[0].toUpperCase() + record.intent.slice(1)
  const amount = record.amountStroops && record.asset ? `${formatStroops(BigInt(record.amountStroops), record.asset === 'XLM' ? 3 : 2)} ${record.asset}` : record.asset
  const explorerUrl = record.explorerUrl ?? (record.txHash ? `${getNetworkConfig(record.network).explorerTxUrl}/${record.txHash}` : undefined)
  const detail = record.txHash ? truncateMiddle(record.txHash, 8, 6) : summarizeActivityError(record.error) ?? new Date(record.ts).toLocaleString()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderTop: first ? 'none' : '1px solid var(--bd)' }}>
      <span style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', background: record.boundary === 'public' ? 'rgba(240,181,77,.14)' : 'rgba(94,124,250,.13)', color: record.boundary === 'public' ? 'var(--warn)' : 'var(--ac2)', display: 'grid', placeItems: 'center', fontSize: 15 }}>
        {record.boundary === 'public' ? '↗' : '◆'}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label} · {record.boundary === 'public' ? 'public boundary' : 'shielded'}</div>
        <div title={record.error ?? record.txHash ?? undefined} style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)', marginTop: 2, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {detail}
        </div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {amount ? <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)' }}>{amount}</div> : null}
        {explorerUrl ? <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: 'var(--ac2)', fontWeight: 700, fontFamily: 'var(--fm)', textDecoration: 'none' }}>View tx ↗</a> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><StatusPill status={status} label={record.status.toUpperCase()} /></div>
      </div>
    </div>
  )
}

function summarizeActivityError(error?: string): string | null {
  if (!error) return null
  if (/transaction simulation failed: HostError: Error\(Contract, #6\)/iu.test(error)) {
    return 'Pool rejected this amount. Use the pool limit and retry.'
  }
  if (/Storage Worker Communication Error: operation timed out/iu.test(error)) {
    return 'Private engine timed out while preparing proof inputs.'
  }
  const firstLine = error.split('\n').find((line) => line.trim().length > 0)?.trim() ?? error.trim()
  const compact = firstLine.replace(/\s+/gu, ' ')
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact
}

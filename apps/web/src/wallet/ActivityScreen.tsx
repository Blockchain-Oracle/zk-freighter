import { useState } from 'react'
import type { AssetCode, XlmNotesReport, XlmShieldedNote } from '@zk-fighter/core'
import { Callout, Chip, Pill, StatusPill, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops } from './format'
import { describeNotesIssue } from './balanceIssue'

type Filter = 'all' | 'shielded' | 'public' | 'pending'
const FILTERS: Filter[] = ['all', 'shielded', 'public', 'pending']

interface ActivityScreenProps {
  balance: ShieldedBalanceState
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

export function ActivityScreen({ balance }: ActivityScreenProps) {
  const { loading, xlm, usdc } = balance
  const [filter, setFilter] = useState<Filter>('all')
  const allRows = [...rowsFrom(usdc), ...rowsFrom(xlm)].sort((a, b) => b.note.createdAtLedger - a.note.createdAtLedger)
  // All current rows are shielded notes. Public/pending legs land here once the
  // persistent activity store (F4) records in-flight ops — until then they're empty.
  const rows = filter === 'public' || filter === 'pending' ? [] : allRows
  const issue = describeNotesIssue(firstBlocker(balance))

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
      ) : issue ? (
        <Callout tone="warn" title={issue.title}>{issue.body}</Callout>
      ) : rows.length === 0 ? (
        <div style={{ padding: 18, border: '1px dashed var(--bd2)', borderRadius: 13, textAlign: 'center', fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.5 }}>
          {filter === 'public' ? 'No public boundary legs recorded yet.' : filter === 'pending' ? 'Nothing pending right now.' : 'No shielded notes yet. Shield public funds, then your private balance and activity appear here.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--bd)', borderRadius: 16, background: 'var(--panel)', overflow: 'hidden' }}>
          {rows.map(({ note, asset }, index) => (
            <div key={`${asset}:${note.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderTop: index === 0 ? 'none' : '1px solid var(--bd)' }}>
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
      )}
    </section>
  )
}

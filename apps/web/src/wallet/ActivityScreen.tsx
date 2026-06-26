import type { AssetCode, XlmNotesReport, XlmShieldedNote } from '@zk-fighter/core'
import { Callout, StatusPill, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops } from './format'
import { describeNotesIssue } from './balanceIssue'

interface ActivityScreenProps {
  balance: ShieldedBalanceState
}

interface NoteRow {
  note: XlmShieldedNote
  asset: AssetCode
}

function rowsFrom(report: XlmNotesReport | null): NoteRow[] {
  if (!report || report.status !== 'loaded') {
    return []
  }
  return report.notes.map((note) => ({ note, asset: report.asset }))
}

function firstBlocker(balance: ShieldedBalanceState): string | null {
  if (balance.error) {
    return balance.error
  }
  if (balance.usdc && balance.usdc.status !== 'loaded') {
    return balance.usdc.blockers[0] ?? null
  }
  if (balance.xlm && balance.xlm.status !== 'loaded') {
    return balance.xlm.blockers[0] ?? null
  }
  return null
}

export function ActivityScreen({ balance }: ActivityScreenProps) {
  const { loading, xlm, usdc } = balance
  const rows = [...rowsFrom(usdc), ...rowsFrom(xlm)].sort((a, b) => b.note.createdAtLedger - a.note.createdAtLedger)
  const issue = describeNotesIssue(firstBlocker(balance))

  return (
    <section style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>Activity</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>Your shielded notes from the pool. Private legs hide the counterparty.</div>

      {loading ? (
        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--tx3)' }}>Loading shielded notes…</div>
      ) : issue ? (
        <div style={{ marginTop: 18 }}>
          <Callout tone="warn" title={issue.title}>{issue.body}</Callout>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ marginTop: 18, padding: 18, border: '1px dashed var(--bd2)', borderRadius: 13, textAlign: 'center', fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.5 }}>
          No shielded notes yet. Shield public funds, then your private balance and activity appear here.
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {rows.map(({ note, asset }) => (
            <div key={`${asset}:${note.id}`} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 2px', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ width: 36, height: 36, flex: 'none', borderRadius: '50%', background: 'var(--card2)', color: 'var(--ac2)', display: 'grid', placeItems: 'center', fontSize: 14 }}>◆</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Shielded note · {asset}</div>
                <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>id {truncateMiddle(note.id, 6, 4)} · ledger {note.createdAtLedger}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatStroops(BigInt(note.amountStroops), asset === 'XLM' ? 3 : 2)} {asset}
                </div>
                <div style={{ marginTop: 2 }}>
                  <StatusPill status={note.spent ? 'confirmed' : 'spendable'} label={note.spent ? 'SPENT' : 'SPENDABLE'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

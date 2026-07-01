import { loadPublicStellarBalances, type AssetCode, type NetworkKey, type PublicBalancesReport, type WalletIdentity, type XlmNotesReport } from '@zk-fighter/core'
import { useEffect, useState } from 'react'
import { Button, Callout, PublicCard, ShieldedCard, Pill, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, sumSpendableStroops } from './format'
import { describeNotesIssue } from './balanceIssue'
import type { WalletScreen } from './screens'
import { readWebActivity, subscribeWebActivity, type WebActivityRecord } from './webActivityStore'

interface HomeScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

interface NoteRow {
  amount: string
  asset: string
}

function spendable(report: XlmNotesReport | null, decimals: number): string | null {
  if (!report || report.status !== 'loaded') return null
  return formatStroops(sumSpendableStroops(report.notes), decimals)
}

function firstBlocker(balance: ShieldedBalanceState): string | null {
  if (balance.error) return balance.error
  if (balance.usdc && balance.usdc.status !== 'loaded') return balance.usdc.blockers[0] ?? null
  if (balance.xlm && balance.xlm.status !== 'loaded') return balance.xlm.blockers[0] ?? null
  return null
}

function collectNotes(report: XlmNotesReport | null, asset: string, decimals: number, into: NoteRow[]) {
  if (!report || report.status !== 'loaded') return
  for (const note of report.notes) {
    if (note.spent) continue
    into.push({ amount: formatStroops(BigInt(note.amountStroops), decimals), asset })
  }
}

const STRIP_ACTIONS: { glyph: string; label: string; screen: WalletScreen }[] = [
  { glyph: '⛉', label: 'Shield', screen: 'shield' },
  { glyph: '⤺', label: 'Unshield', screen: 'unshield' },
  { glyph: '⇄', label: 'Bridge', screen: 'bridge' },
]

function BalanceFace({ usdc, xlm, loading }: { usdc: string | null; xlm: string | null; loading: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: 'var(--fm)', letterSpacing: '.14em', color: 'var(--ac2)' }}>
          <span style={{ width: 8, height: 8, border: '1.5px solid var(--ac2)', transform: 'rotate(45deg)' }} />
          SHIELDED BALANCE
        </span>
        <span style={{ marginLeft: 'auto', padding: '4px 9px', border: '1px solid rgba(94,124,250,.5)', background: 'rgba(94,124,250,.16)', borderRadius: 999, fontSize: 8.5, fontFamily: 'var(--fm)', letterSpacing: '.12em', color: 'var(--ac2)' }}>PRIVATE</span>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: 13, marginTop: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 0.82, color: 'var(--tx)', letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
          {loading ? '…' : (usdc ?? '—')}
        </div>
        <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600, marginBottom: 7 }}>USDC</div>
        <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>{loading ? '' : `+ ${xlm ?? '—'} XLM`}</div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 22, marginTop: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 600, color: 'var(--pos)', fontFamily: 'var(--fm)', letterSpacing: '.04em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pos)', boxShadow: '0 0 8px var(--pos)' }} />
          SPENDABLE {loading ? '…' : (usdc ?? '—')}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)' }}>tap for notes →</span>
      </div>
    </div>
  )
}

function NotesFace({ notes }: { notes: NoteRow[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 9, background: 'linear-gradient(150deg, rgba(24,26,40,.4), rgba(20,22,34,.2))' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--fm)', letterSpacing: '.14em', color: 'var(--ac2)' }}>YOUR NOTES</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)' }}>⟲ tap to flip back</span>
      </div>
      {notes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 8 }}>No shielded notes yet — shield or receive to create one.</div>
      ) : (
        notes.slice(0, 4).map((note, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ac2)', flex: 'none' }} />
            <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600 }}>Note {String(index + 1).padStart(2, '0')}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--tx)' }}>{note.amount} {note.asset}</span>
            <span style={{ fontSize: 9, fontFamily: 'var(--fm)', color: 'var(--pos)', letterSpacing: '.06em', width: 74, textAlign: 'right' }}>SPENDABLE</span>
          </div>
        ))
      )}
    </div>
  )
}

function CrossingStrip({ onNav }: { onNav: (screen: WalletScreen) => void }) {
  return (
    <div style={{ flex: 'none', width: 96, background: 'rgba(229,180,92,.05)', borderLeft: '1.5px dashed rgba(229,180,92,.4)', borderRight: '1.5px dashed rgba(229,180,92,.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 11, padding: '14px 0' }}>
      <span style={{ fontSize: 8, fontFamily: 'var(--fm)', letterSpacing: '.1em', color: 'var(--warn)', textAlign: 'center', lineHeight: 1.4, opacity: 0.85 }}>CROSS THE<br />BOUNDARY</span>
      {STRIP_ACTIONS.map((action) => (
        <button key={action.label} onClick={() => onNav(action.screen)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--bd2)', background: 'var(--card2)', display: 'grid', placeItems: 'center', color: 'var(--tx)', fontSize: 15 }}>{action.glyph}</span>
          <span style={{ fontSize: 8.5, color: 'var(--tx3)' }}>{action.label}</span>
        </button>
      ))}
    </div>
  )
}

function AssetIcon({ asset }: { readonly asset: AssetCode }) {
  return <img src={`/asset-icons/${asset === 'USDC' ? 'usdc' : 'xlm'}.svg`} alt="" style={{ width: 22, height: 22, display: 'block' }} />
}

function PublicFace({ identity, balances, loading, onShield }: { identity: WalletIdentity; balances: PublicBalancesReport | null; loading: boolean; onShield: () => void }) {
  const known = balances?.status === 'loaded' || balances?.status === 'unfunded'
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '22px 22px', display: 'flex', flexDirection: 'column' }}>
      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 9px', border: '1px solid rgba(229,180,92,.4)', background: 'rgba(229,180,92,.08)', borderRadius: 999, fontSize: 8.5, fontFamily: 'var(--fm)', letterSpacing: '.12em', color: 'var(--warn)' }}>PUBLIC · STELLAR</span>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(['USDC', 'XLM'] as const).map((asset) => (
          <div key={asset} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <AssetIcon asset={asset} />
            <span style={{ font: '700 21px/1 var(--fm)', color: known ? 'var(--tx)' : 'var(--tx3)', letterSpacing: '-.02em' }}>{loading ? '…' : known ? formatStroops(balances!.balances[asset], asset === 'USDC' ? 2 : 3) : '—'}</span>
            <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 800 }}>{asset}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5 }}>Visible on-chain until you shield it.</div>
      <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{truncateMiddle(identity.stellarPublicKey, 6, 4)}</div>
      <button onClick={onShield} style={{ marginTop: 14, alignSelf: 'flex-start', padding: '9px 16px', border: 'none', borderRadius: 10, background: 'var(--ac)', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}>Shield now</button>
    </div>
  )
}

export function HomeScreen({ identity, network, balance, onNav }: HomeScreenProps) {
  const { loading, xlm, usdc, refresh } = balance
  const [publicBalances, setPublicBalances] = useState<PublicBalancesReport | null>(null)
  const [publicLoading, setPublicLoading] = useState(true)
  const [activity, setActivity] = useState<readonly WebActivityRecord[]>(() => readWebActivity(network).slice(0, 3))
  const usdcShown = spendable(usdc, 2)
  const xlmShown = spendable(xlm, 3)
  const issue = describeNotesIssue(firstBlocker(balance))
  const notes: NoteRow[] = []
  collectNotes(usdc, 'USDC', 2, notes)
  collectNotes(xlm, 'XLM', 3, notes)

  useEffect(() => {
    let cancelled = false
    setPublicLoading(true)
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
      .then((report) => { if (!cancelled) setPublicBalances(report) })
      .finally(() => { if (!cancelled) setPublicLoading(false) })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network])

  useEffect(() => {
    const load = () => setActivity(readWebActivity(network).slice(0, 3))
    load()
    return subscribeWebActivity(load)
  }, [network])

  return (
    <section style={{ width: '100%', maxWidth: 1024, margin: '0 auto', padding: '30px 38px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 27, letterSpacing: '-.025em' }}>Wallet</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>Shielded transfers · public boundaries always named</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Pill label={loading ? 'SYNCING' : 'SYNCED'} tone={loading ? 'warn' : 'pos'} dot pulse={loading} />
          <button onClick={() => refresh({ syncBeforeRead: true })} title="Refresh notes" style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 11, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx2)', cursor: 'pointer', fontSize: 14 }}>⟳</button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 60, top: -10, width: 340, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,124,250,.55), transparent 65%)', filter: 'blur(46px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', height: 238, border: '1px solid var(--bd2)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 70px -40px #000' }}>
          <ShieldedCard style={{ flex: 1.4, border: 'none', borderRadius: 0 }} back={<NotesFace notes={notes} />}>
            <BalanceFace usdc={usdcShown} xlm={xlmShown} loading={loading} />
          </ShieldedCard>
          <CrossingStrip onNav={onNav} />
          <PublicCard style={{ flex: 1, border: 'none', borderRadius: 0 }}>
            <PublicFace identity={identity} balances={publicBalances} loading={publicLoading} onShield={() => onNav('shield')} />
          </PublicCard>
        </div>
      </div>

      {issue && !loading ? <Callout tone="warn" title={issue.title}>{issue.body}</Callout> : null}

      <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={() => onNav('send')}>↗ Send privately</Button>
        <Button variant="secondary" onClick={() => onNav('receive')}>↓ Receive</Button>
        <Button variant="secondary" onClick={() => onNav('bridge')}>+ Add funds</Button>
        <Button variant="secondary" onClick={() => onNav('disclosure')}>◫ Disclosure</Button>
        <Button variant="secondary" onClick={() => onNav('confidential')}>◐ Confidential</Button>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 15, color: 'var(--tx)', fontWeight: 700 }}>Activity</span>
          <button onClick={() => onNav('activity')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11.5, color: 'var(--ac2)', fontWeight: 600, cursor: 'pointer' }}>See all →</button>
        </div>
        <div style={{ padding: '16px 2px', borderTop: '1px solid var(--bd)', fontSize: 12, color: 'var(--tx3)' }}>
          {activity.length > 0 ? activity.map((record) => <HomeActivityRow key={record.id} record={record} />) : loading ? 'Loading shielded notes…' : 'Open Activity for your shielded notes and public boundary legs.'}
        </div>
      </div>
    </section>
  )
}

function HomeActivityRow({ record }: { readonly record: WebActivityRecord }) {
  const amount = record.amountStroops && record.asset ? `${formatStroops(BigInt(record.amountStroops), record.asset === 'XLM' ? 3 : 2)} ${record.asset}` : record.asset
  const label = record.intent === 'confidentialSetup' ? 'Confidential setup' : record.intent[0].toUpperCase() + record.intent.slice(1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ width: 27, height: 27, borderRadius: '50%', background: record.boundary === 'public' ? 'rgba(240,181,77,.14)' : 'rgba(94,124,250,.13)', color: record.boundary === 'public' ? 'var(--warn)' : 'var(--ac2)', display: 'grid', placeItems: 'center', flex: 'none' }}>{record.boundary === 'public' ? '↗' : '◆'}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--tx)', fontWeight: 700 }}>{label}{amount ? ` · ${amount}` : ''}</span>
        <span style={{ display: 'block', marginTop: 3, font: '600 9.5px/1 var(--fm)', color: 'var(--tx3)' }}>{record.status} · {record.boundary}</span>
      </span>
    </div>
  )
}

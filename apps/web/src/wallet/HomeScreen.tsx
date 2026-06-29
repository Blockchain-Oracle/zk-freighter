import type { WalletIdentity, XlmNotesReport } from '@zk-fighter/core'
import { Callout, StatusPill, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, sumSpendableStroops } from './format'
import { describeNotesIssue } from './balanceIssue'
import type { WalletScreen } from './screens'

const labelStyle = {
  fontSize: 10.5,
  color: 'var(--tx2)',
  fontWeight: 600,
  fontFamily: 'var(--fm)',
  letterSpacing: '.12em',
} as const

interface HomeScreenProps {
  identity: WalletIdentity
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

function spendable(report: XlmNotesReport | null, decimals: number): string | null {
  if (!report || report.status !== 'loaded') {
    return null
  }
  return formatStroops(sumSpendableStroops(report.notes), decimals)
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

export function HomeScreen({ identity, balance, onNav }: HomeScreenProps) {
  const { loading, xlm, usdc, refresh } = balance
  const usdcShown = spendable(usdc, 2)
  const xlmShown = spendable(xlm, 3)
  const issue = describeNotesIssue(firstBlocker(balance))

  const actions: { label: string; glyph: string; screen: WalletScreen; primary?: boolean }[] = [
    { label: 'Add funds', glyph: '+', screen: 'bridge' },
    { label: 'Send', glyph: '↗', screen: 'send', primary: true },
    { label: 'Receive', glyph: '↓', screen: 'receive' },
    { label: 'Shield', glyph: '↧', screen: 'shield' },
    { label: 'Unshield', glyph: '↥', screen: 'unshield' },
    { label: 'Confidential', glyph: '◈', screen: 'confidential' },
  ]

  return (
    <section style={{ width: '100%', maxWidth: 860, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>Home</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Private by default · public only at the edges</div>
        </div>
        <button
          onClick={refresh}
          style={{
            marginLeft: 'auto',
            padding: '8px 13px',
            border: '1px solid var(--bd)',
            borderRadius: 9,
            background: 'var(--card)',
            color: 'var(--tx2)',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh notes'}
        </button>
      </div>

      <div>
        <div style={labelStyle}>SHIELDED BALANCE</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 12 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 54,
              lineHeight: 0.9,
              letterSpacing: '-.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {loading ? '…' : (usdcShown ?? '—')}
          </div>
          <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--fm)' }}>USDC</div>
          <div style={{ marginBottom: 7, fontSize: 13, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '' : `+ ${xlmShown ?? '—'} XLM`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 34, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bd)' }}>
          <div>
            <StatusPill status="spendable" label="SPENDABLE" />
            <div style={{ marginTop: 7, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {usdcShown ?? '—'} <span style={{ color: 'var(--tx3)', fontWeight: 500, fontSize: 11.5 }}>USDC</span> · {xlmShown ?? '—'}{' '}
              <span style={{ color: 'var(--tx3)', fontWeight: 500, fontSize: 11.5 }}>XLM</span>
            </div>
          </div>
        </div>
        {issue && !loading ? (
          <div style={{ marginTop: 14 }}>
            <Callout tone="warn" title={issue.title}>{issue.body}</Callout>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 26 }}>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onNav(action.screen)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 9,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: action.primary ? 'var(--ac)' : 'var(--card2)',
                border: action.primary ? 'none' : '1px solid var(--bd)',
                color: action.primary ? '#fff' : 'var(--tx)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 21,
              }}
            >
              {action.glyph}
            </span>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600 }}>{action.label}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          border: '1px dashed var(--bd2)',
          borderRadius: 14,
          padding: '16px 18px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600 }}>Public Stellar account</span>
            <span style={{ padding: '2px 7px', border: '1px solid var(--bd2)', borderRadius: 5, fontSize: 9, color: 'var(--pub)', fontFamily: 'var(--fm)', letterSpacing: '.08em' }}>PUBLIC</span>
          </div>
          <div style={{ marginTop: 7, fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--tx2)' }}>{truncateMiddle(identity.stellarPublicKey, 8, 6)}</div>
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--tx3)' }}>Funds here are visible on Stellar until you shield them.</div>
        </div>
        <button
          onClick={() => onNav('shield')}
          style={{ marginLeft: 'auto', flex: 'none', padding: '11px 18px', border: 'none', borderRadius: 11, background: 'var(--ac)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Shield now
        </button>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Activity</span>
          <button onClick={() => onNav('activity')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11.5, color: 'var(--ac2)', fontWeight: 600, cursor: 'pointer' }}>
            See all →
          </button>
        </div>
        <div style={{ padding: '16px 2px', borderTop: '1px solid var(--bd)', fontSize: 12, color: 'var(--tx3)' }}>
          {loading ? 'Loading shielded notes…' : 'Open Activity to see your shielded notes and public legs.'}
        </div>
      </div>
    </section>
  )
}

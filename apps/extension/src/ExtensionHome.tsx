import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Button, Logo, PublicCard, ShieldedCard } from '@zk-fighter/ui'

import { dappMessageTypes, type DappBalances, type DappBalancesResponse, type DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'

// Popup Home: real shielded + public balances (durable cache → instant on reopen,
// syncing dot while a refresh lands). HARD RULE: never fabricate a balance — a
// failed/blocked scan shows "—" + the blocker, NOT a confident "0.00"; a dead
// channel shows a retry, not a perpetual "Loading…".

function fmtStroops(value: string, decimals: number): string {
  try {
    return (Number(BigInt(value)) / 1e7).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  } catch {
    return '—'
  }
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'updated just now'
  if (minutes < 60) return `updated ${minutes}m ago`
  return `updated ${Math.floor(minutes / 60)}h ago`
}

const labelMono: CSSProperties = { font: '600 8.5px/1 var(--fm)', letterSpacing: '.12em' }
const warnLine: CSSProperties = { marginTop: 7, fontSize: 10.5, color: 'var(--warn)', lineHeight: 1.4 }
const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--bd)', borderRadius: 13, background: 'var(--card)', cursor: 'pointer', textAlign: 'left', width: '100%' }

interface HomeProps {
  readonly status: DappWalletStatus
  readonly surface: 'popup' | 'side panel'
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly lockWallet: () => Promise<void>
  readonly openSidePanel: () => Promise<void>
  readonly copyReceiveCode: () => Promise<void>
  readonly quickShield?: ReactNode
}

export function ExtensionHome({ status, surface, sendRuntimeMessage, lockWallet, openSidePanel, copyReceiveCode, quickShield }: HomeProps) {
  const [balances, setBalances] = useState<DappBalances | null>(null)
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    async function poll() {
      try {
        const res = (await sendRuntimeMessage({ type: dappMessageTypes.balances })) as DappBalancesResponse
        if (cancelled) return
        if (res?.ok && res.balances) {
          setBalances(res.balances)
          setError('')
        } else if (res && !res.ok) {
          setError(res.error ?? 'Could not load balances.')
        }
        setSyncing(Boolean(res?.syncing))
        if (res?.syncing) timer = window.setTimeout(() => void poll(), 2500)
      } catch {
        if (!cancelled) {
          setError('Couldn’t reach the wallet — reopen to retry.')
          setSyncing(false)
        }
      }
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [sendRuntimeMessage])

  const syncDot = syncing ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx3)' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ac)' }} className="animate-zkPulse" />syncing
    </span>
  ) : balances ? (
    <span style={{ fontSize: 9, color: 'var(--tx3)' }}>{ago(balances.scannedAt)}</span>
  ) : null

  const shieldedKnown = balances?.shieldedOk === true
  const publicKnown = balances?.publicOk === true
  const shieldedSub = !balances
    ? error || 'Loading your shielded notes…'
    : shieldedKnown
      ? `+ ${fmtStroops(balances.shieldedXlmStroops, 2)} XLM · ${balances.noteCount} note${balances.noteCount === 1 ? '' : 's'}`
      : 'Couldn’t scan the shielded pool — not showing a balance.'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Personal</div>
          <div style={{ font: '600 10px/1 var(--fm)', color: 'var(--tx3)', marginTop: 3 }}>{shorten(status.publicKey)}</div>
        </div>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx2)', padding: '5px 9px', border: '1px solid var(--bd)', borderRadius: 999 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.network === 'mainnet' ? 'var(--warn)' : 'var(--pos)' }} />
          {status.network.toUpperCase()}
        </span>
        {surface === 'popup' ? <button type="button" onClick={() => void openSidePanel()} title="Open side panel" style={{ background: 'none', border: '1px solid var(--bd)', borderRadius: 9, color: 'var(--tx2)', width: 28, height: 28, cursor: 'pointer' }}>⤢</button> : null}
      </div>

      <ShieldedCard style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ ...labelMono, color: 'var(--ac2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, border: '1.3px solid var(--ac2)', transform: 'rotate(45deg)' }} />SHIELDED BALANCE</span>
          <span style={{ marginLeft: 'auto' }}>{syncDot}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 14 }}>
          <span style={{ font: '600 30px/1 var(--fm)', color: shieldedKnown ? 'var(--tx)' : 'var(--tx3)' }}>{shieldedKnown ? fmtStroops(balances!.shieldedUsdcStroops, 2) : '—'}</span>
          <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, marginBottom: 3 }}>USDC</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{shieldedSub}</div>
        {balances?.blockers.map((blocker, index) => <div key={index} style={warnLine}>{blocker}</div>)}
      </ShieldedCard>

      <PublicCard style={{ padding: 14 }}>
        <div style={{ ...labelMono, color: 'var(--warn)' }}>○ PUBLIC · STELLAR</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginTop: 10 }}>
          <span style={{ font: '600 20px/1 var(--fm)', color: publicKnown ? 'var(--tx)' : 'var(--tx3)' }}>{publicKnown ? fmtStroops(balances!.publicUsdcStroops, 2) : '—'}</span>
          <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, marginBottom: 2 }}>USDC</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tx3)' }}>{publicKnown ? 'visible on-chain until shielded' : 'balance unavailable'}</span>
        </div>
      </PublicCard>

      {quickShield}

      <button type="button" style={rowStyle} onClick={() => void copyReceiveCode()}>
        <span style={{ fontSize: 16 }}>↓</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>Receive code</span>
          <span style={{ display: 'block', font: '600 10px/1 var(--fm)', color: 'var(--tx3)', marginTop: 3 }}>{shorten(status.privateReceiveCode, 10, 6)} · copy</span>
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>
      </button>

      {surface === 'popup' ? (
        <button type="button" style={rowStyle} onClick={() => void openSidePanel()}>
          <span style={{ fontSize: 16 }}>⇌</span>
          <span><span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>Bridge &amp; Confidential</span><span style={{ display: 'block', fontSize: 10, color: 'var(--tx3)', marginTop: 3 }}>open the side panel</span></span>
          <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>
        </button>
      ) : null}

      <Button variant="secondary" fullWidth onClick={() => void lockWallet()}>Lock wallet</Button>
    </div>
  )
}

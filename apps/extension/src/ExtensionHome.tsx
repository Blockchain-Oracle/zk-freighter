import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownToLine, RefreshCw, Send, Shield, WalletCards } from 'lucide-react'
import type { AssetCode } from '@zk-freighter/core'
import { Callout, PublicCard, ShieldedCard } from '@zk-freighter/ui'

import type { ActivityRecord } from './activity-store'
import { AssetMark } from './asset-marks'
import { describeBalanceIssue } from './balance-issue'
import { ExtensionAutoShieldBanner } from './ExtensionAutoShieldBanner'
import { dappMessageTypes, type ActivityResponse, type AutoShieldTickResponse, type AutoShieldTickResult, type DappBalances, type DappBalancesResponse, type DappWalletStatus, type DemoFundingResponse } from './dappMessages'
import { amountLabel, formatStroops, shorten } from './extension-format'
import { BoundaryBadge, type ExtensionSheet } from './ExtensionShell'
import type { ExtensionNavigate } from './extension-routes'

function ago(tsOrIso: number | string): string {
  const ts = typeof tsOrIso === 'number' ? tsOrIso : new Date(tsOrIso).getTime()
  const ms = Date.now() - ts
  if (!Number.isFinite(ms) || ms < 0) return ''
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

interface HomeProps {
  readonly status: DappWalletStatus
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly navigate: ExtensionNavigate
  readonly openSheet: (sheet: ExtensionSheet) => void
}

export function ExtensionHome({ status, sendRuntimeMessage, navigate, openSheet }: HomeProps) {
  const [balances, setBalances] = useState<DappBalances | null>(null)
  const [records, setRecords] = useState<readonly ActivityRecord[]>([])
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState('')
  const [fundingBusy, setFundingBusy] = useState(false)
  const [fundingMessage, setFundingMessage] = useState('')
  const [manualSyncing, setManualSyncing] = useState(false)
  const [autoShield, setAutoShield] = useState<AutoShieldTickResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // Fires the popup-open auto-shield tick; the background runner's cooldown / latch
      // guards make a rapid re-open a no-op, so this stays a single opportunistic attempt.
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.autoShield })) as AutoShieldTickResponse
      if (cancelled) return
      // Locked wallet / nothing-to-do stays silent, but real errors must not vanish.
      if (!res?.ok) {
        if (res?.error) console.error('[extension] auto-shield tick failed', res.error)
        return
      }
      if (!res.result) return
      setAutoShield(res.result)
      if (res.result.kind === 'shielded') {
        const balanceRes = (await sendRuntimeMessage({ type: dappMessageTypes.balances, syncBeforeRead: true })) as DappBalancesResponse
        if (cancelled) return
        if (balanceRes.ok && balanceRes.balances) setBalances(balanceRes.balances)
        else console.error('[extension] post-auto-shield balance refresh failed', balanceRes)
      }
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage, status.network])

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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.activity, network: status.network })) as ActivityResponse
      if (!cancelled) setRecords(res?.records?.slice(0, 3) ?? [])
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage, status.network])

  const shieldedKnown = balances?.shieldedOk === true
  const publicKnown = balances?.publicOk === true
  const needsDemoFunding = status.network === 'testnet' && (
    !publicKnown ||
    BigInt(balances?.publicXlmStroops ?? '0') < 15_000_000n ||
    BigInt(balances?.publicUsdcStroops ?? '0') < 10_000_000n
  )

  async function requestDemoFunds() {
    setFundingBusy(true)
    setFundingMessage('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.demoFundingRequest })) as DemoFundingResponse
      if (res.ok && res.report) {
        setFundingMessage(res.report.blockers[0] ?? 'Demo funding request finished.')
        const balanceResponse = (await sendRuntimeMessage({ type: dappMessageTypes.balances })) as DappBalancesResponse
        if (balanceResponse.ok && balanceResponse.balances) setBalances(balanceResponse.balances)
      } else {
        setFundingMessage(res.error ?? 'Demo funding failed.')
      }
    } finally {
      setFundingBusy(false)
    }
  }

  async function syncBalancesNow() {
    setManualSyncing(true)
    setSyncing(true)
    setError('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.balances, syncBeforeRead: true })) as DappBalancesResponse
      if (res.ok && res.balances) {
        setBalances(res.balances)
      } else {
        setError(res.error ?? 'Could not sync balances.')
      }
      setSyncing(Boolean(res.syncing))
    } catch {
      setError('Couldn’t reach the wallet — reopen to retry.')
      setSyncing(false)
    } finally {
      setManualSyncing(false)
    }
  }

  return (
    <>
      {autoShield ? <ExtensionAutoShieldBanner result={autoShield} onDismiss={() => setAutoShield(null)} /> : null}
      <BalanceCardStack balances={balances} syncing={syncing || manualSyncing} error={error} shieldedKnown={shieldedKnown} publicKnown={publicKnown} manualSyncing={manualSyncing} onSync={() => void syncBalancesNow()} />
      {needsDemoFunding ? (
        <section style={{ border: '1px solid rgba(229,180,92,.38)', borderRadius: 16, background: 'rgba(229,180,92,.06)', padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 800 }}>Add testnet funds</div>
          <div style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.45 }}>Funds this Stellar testnet account with XLM and USDC from the hosted demo funder once USDC receiving is ready.</div>
          {fundingMessage ? <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.45 }}>{fundingMessage}</div> : null}
          <button type="button" disabled={fundingBusy} onClick={() => void requestDemoFunds()} style={{ border: 0, borderRadius: 12, background: 'var(--ac)', color: '#fff', padding: '10px 12px', fontSize: 11.5, fontWeight: 800, cursor: fundingBusy ? 'default' : 'pointer', opacity: fundingBusy ? 0.65 : 1 }}>{fundingBusy ? 'Adding funds…' : 'Add demo funds'}</button>
        </section>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <HomeAction label="Send" icon={<Send size={18} />} action="action-send" onClick={() => openSheet('send')} />
        <HomeAction label="Receive" icon={<ArrowDownToLine size={18} />} action="action-receive" onClick={() => navigate('receive')} />
        <HomeAction label="Shield/Unshield" icon={<Shield size={18} />} action="action-shield" onClick={() => openSheet('shield')} />
        <HomeAction label="Bridge" icon={<WalletCards size={18} />} action="action-bridge" onClick={() => navigate('bridge')} />
      </div>
      <ReceiveCodeCard status={status} navigate={navigate} />
      <ActivityPreview records={records} navigate={navigate} openSheet={openSheet} />
    </>
  )
}

export function BalanceCardStack({ balances, syncing, error, shieldedKnown, publicKnown, manualSyncing, onSync }: { readonly balances: DappBalances | null; readonly syncing: boolean; readonly error: string; readonly shieldedKnown: boolean; readonly publicKnown: boolean; readonly manualSyncing: boolean; readonly onSync: () => void }) {
  const issue = describeBalanceIssue(balances?.blockers ?? [], error)
  const syncLabel = syncing ? 'syncing' : balances ? (shieldedKnown ? `updated ${ago(balances.scannedAt)}` : 'scan blocked') : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <ShieldedCard style={{ padding: 16, borderRadius: 20 }}>
        <CardTop label="SHIELDED BALANCE" badge={<BoundaryBadge tone="shielded">Private pool</BoundaryBadge>} />
        <AssetRows rows={[['USDC', shieldedKnown ? formatStroops(balances!.shieldedUsdcStroops, 2) : '—'], ['XLM', shieldedKnown ? formatStroops(balances!.shieldedXlmStroops, 3) : '—']]} muted={!shieldedKnown} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
          <div style={{ minWidth: 0, flex: 1, fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{balances ? shieldedKnown ? `${balances.noteCount} note${balances.noteCount === 1 ? '' : 's'}` : 'Shielded balances are unavailable from this RPC window.' : 'Loading shielded notes…'}</div>
          <button type="button" data-zkf-action="sync-balances" disabled={manualSyncing} onClick={onSync} aria-label="Sync shielded balances" title="Sync shielded balances" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--bd)', borderRadius: 999, background: 'var(--card2)', color: 'var(--tx)', padding: '7px 9px', fontSize: 10.5, fontWeight: 800, cursor: manualSyncing ? 'default' : 'pointer', opacity: manualSyncing ? 0.65 : 1 }}>
            <RefreshCw size={12} />
            {manualSyncing ? 'Syncing' : 'Sync now'}
          </button>
        </div>
        {syncLabel ? <div style={{ fontSize: 9.5, color: 'var(--tx3)', marginTop: 8 }}>{syncLabel}</div> : null}
        {issue ? <div style={{ marginTop: 9 }}><Callout tone="warn" title={issue.title}>{issue.body}</Callout></div> : null}
      </ShieldedCard>
      <PublicCard style={{ padding: 14, borderRadius: 18 }}>
        <CardTop label="PUBLIC STELLAR" badge={<BoundaryBadge tone="public">Boundary</BoundaryBadge>} />
        <AssetRows rows={[['USDC', publicKnown ? formatStroops(balances!.publicUsdcStroops, 2) : '—'], ['XLM', publicKnown ? formatStroops(balances!.publicXlmStroops, 3) : '—']]} muted={!publicKnown} small />
        <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 8 }}>{publicKnown ? 'Visible on-chain until shielded.' : 'Public balance unavailable.'}</div>
      </PublicCard>
    </div>
  )
}

function CardTop({ label, badge }: { readonly label: string; readonly badge: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ font: '800 9px/1 var(--fm)', letterSpacing: '.12em', color: 'var(--tx3)' }}>{label}</span>
      <span style={{ marginLeft: 'auto' }}>{badge}</span>
    </div>
  )
}

function AssetRows({ rows, muted, small }: { readonly rows: readonly (readonly [AssetCode, string])[]; readonly muted?: boolean; readonly small?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: small ? 7 : 9, marginTop: small ? 10 : 14 }}>
      {rows.map(([asset, value]) => (
        <div key={asset} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <AssetMark asset={asset} size={small ? 22 : 25} />
          <span style={{ font: `700 ${small ? 19 : 25}px/1 var(--fm)`, color: muted ? 'var(--tx3)' : 'var(--tx)', letterSpacing: '-.02em' }}>{value}</span>
          <span style={{ fontSize: small ? 10.5 : 11.5, color: 'var(--tx2)', fontWeight: 800 }}>{asset}</span>
        </div>
      ))}
    </div>
  )
}

function HomeAction({ label, icon, action, onClick }: { readonly label: string; readonly icon: ReactNode; readonly action: string; readonly onClick: () => void }) {
  const compactLabel = label.length > 10
  return (
    <button type="button" data-zkf-action={action} onClick={onClick} style={{ minWidth: 0, minHeight: 72, border: '1px solid var(--bd)', borderRadius: 18, background: label === 'Send' ? 'var(--ac)' : 'var(--card)', color: label === 'Send' ? '#fff' : 'var(--tx)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
      {icon}
      <span style={{ fontSize: compactLabel ? 8.6 : 10.5, fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}>{label}</span>
    </button>
  )
}

function ReceiveCodeCard({ status, navigate }: { readonly status: DappWalletStatus; readonly navigate: ExtensionNavigate }) {
  return (
    <button type="button" onClick={() => navigate('receive')} style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--bd)', borderRadius: 16, background: 'var(--card)', padding: 13, color: 'var(--tx)', textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ width: 34, height: 34, borderRadius: 12, background: 'var(--card2)', color: 'var(--ac2)', display: 'grid', placeItems: 'center' }}>↓</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800 }}>Private receive code</span>
        <span style={{ display: 'block', font: '600 10px/1 var(--fm)', color: 'var(--tx3)', marginTop: 5 }}>{shorten(status.privateReceiveCode, 10, 6)}</span>
      </span>
      <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>
    </button>
  )
}

function ActivityPreview({ records, navigate, openSheet }: { readonly records: readonly ActivityRecord[]; readonly navigate: ExtensionNavigate; readonly openSheet: (sheet: ExtensionSheet) => void }) {
  return (
    <section style={{ border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Activity</span>
        <button type="button" data-zkf-action="activity-all" onClick={() => navigate('activity')} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--ac2)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>All →</button>
      </div>
      {records.length === 0 ? (
        <div style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.45 }}>
          No activity yet. Shield funds or send a private payment to start real history.
          <button type="button" onClick={() => openSheet('shield')} style={{ display: 'block', marginTop: 10, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', color: 'var(--tx)', padding: '9px 11px', fontWeight: 800, cursor: 'pointer' }}>Shield funds</button>
        </div>
      ) : records.map((record) => <ActivityMiniRow key={record.id} record={record} />)}
    </section>
  )
}

function ActivityMiniRow({ record }: { readonly record: ActivityRecord }) {
  const amount = activityAmount(record)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 9, borderTop: '1px solid var(--bd)' }}>
      <span style={{ width: 30, height: 30, borderRadius: '50%', background: record.boundary === 'public' ? 'rgba(229,180,92,.12)' : 'rgba(94,124,250,.13)', color: record.boundary === 'public' ? 'var(--warn)' : 'var(--ac2)', display: 'grid', placeItems: 'center', flex: 'none' }}>{record.kind === 'unshield' ? '↙' : '↗'}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{record.kind}{amount ? ` · ${amount}` : ''}</span>
        <span style={{ display: 'block', font: '600 9px/1 var(--fm)', color: 'var(--tx3)', marginTop: 4 }}>{ago(record.ts)} · {record.boundary}</span>
      </span>
      <span style={{ font: '700 8px/1 var(--fm)', color: record.status === 'submitted' ? 'var(--pos)' : 'var(--warn)', textTransform: 'uppercase' }}>{record.status}</span>
    </div>
  )
}

function activityAmount(record: ActivityRecord): string {
  if (!record.amountStroops || (record.asset !== 'XLM' && record.asset !== 'USDC')) return ''
  return amountLabel(record.amountStroops, record.asset)
}

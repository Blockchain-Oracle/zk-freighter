import type { ReactNode } from 'react'
import { ArrowDownToLine, FileCheck, KeyRound, Lock, Search, Send, Settings, Shield, WalletCards } from 'lucide-react'

import type { DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'
import { BoundaryBadge, type ExtensionSheet } from './ExtensionShell'
import type { ExtensionScreen } from './extension-routes'

interface MoreSheetProps {
  readonly status: DappWalletStatus
  readonly navigate: (screen: ExtensionScreen) => void
  readonly openSheet: (sheet: ExtensionSheet) => void
  readonly lockWallet: () => Promise<void>
}

interface Row {
  readonly id: string
  readonly icon: ReactNode
  readonly title: string
  readonly detail: string
  readonly badge?: ReactNode
  readonly action: () => void
}

export function ExtensionMoreSheet({ status, navigate, openSheet, lockWallet }: MoreSheetProps) {
  const groups: ReadonlyArray<{ readonly title: string; readonly rows: readonly Row[] }> = [
    {
      title: 'Move',
      rows: [
        { id: 'send', icon: <Send size={15} />, title: 'Send', detail: 'Private shielded transfer', badge: <BoundaryBadge tone="shielded">Shielded</BoundaryBadge>, action: () => openSheet('send') },
        { id: 'receive', icon: <ArrowDownToLine size={15} />, title: 'Receive', detail: 'Private code and QR', badge: <BoundaryBadge tone="shielded">Code</BoundaryBadge>, action: () => navigate('receive') },
        { id: 'shield', icon: <Shield size={15} />, title: 'Shield / Unshield', detail: 'Move across the public boundary', badge: <BoundaryBadge tone="public">Public</BoundaryBadge>, action: () => openSheet('shield') },
        { id: 'bridge', icon: <WalletCards size={15} />, title: 'Bridge', detail: 'CCTP USDC route', badge: <BoundaryBadge tone="public">Public</BoundaryBadge>, action: () => navigate('bridge') },
      ],
    },
    {
      title: 'Prove & Discover',
      rows: [
        { id: 'disclosure', icon: <FileCheck size={15} />, title: 'Disclosure', detail: 'Read-only proof receipt', badge: <BoundaryBadge tone="shielded">Read-only</BoundaryBadge>, action: () => navigate('disclosure') },
        { id: 'confidential', icon: <KeyRound size={15} />, title: 'Confidential', detail: 'Hidden-amount token states', badge: <BoundaryBadge tone="testnet">Testnet</BoundaryBadge>, action: () => navigate('confidential') },
        { id: 'discover', icon: <Search size={15} />, title: 'Discover', detail: 'Make or look up a code', badge: <BoundaryBadge tone="public">Public</BoundaryBadge>, action: () => navigate('discover') },
        { id: 'evidence', icon: <FileCheck size={15} />, title: 'Evidence', detail: 'Runtime readiness checks', badge: <BoundaryBadge tone="ready">Live</BoundaryBadge>, action: () => navigate('proving') },
      ],
    },
    {
      title: 'Account',
      rows: [
        { id: 'signing', icon: <KeyRound size={15} />, title: 'Signing disabled', detail: 'External dApp signing stays closed', action: () => navigate('signingDisabled') },
        { id: 'lock', icon: <Lock size={15} />, title: 'Lock wallet', detail: 'Require password next time', action: () => void lockWallet() },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '700 10px/1 var(--fm)', color: 'var(--tx3)' }}>{shorten(status.publicKey)}</div>
          <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4 }}>{status.network} wallet</div>
        </div>
      </div>
      <MoreRow row={{ id: 'settings', icon: <Settings size={15} />, title: 'Settings', detail: 'Network, appearance, recovery', action: () => navigate('settings') }} />
      {groups.map((group) => (
        <section key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ font: '800 9px/1 var(--fm)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx3)', padding: '6px 2px 3px' }}>{group.title}</div>
          {group.rows.map((row) => <MoreRow key={row.id} row={row} />)}
        </section>
      ))}
    </div>
  )
}

function MoreRow({ row }: { readonly row: Row }) {
  return (
    <button type="button" data-zkf-action={`more-${row.id}`} onClick={row.action} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 2px', border: 0, borderTop: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx)', textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 10, background: 'var(--card2)', color: 'var(--ac2)', display: 'grid', placeItems: 'center' }}>{row.icon}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{row.title}</span>
        <span style={{ display: 'block', fontSize: 10, lineHeight: 1.3, color: 'var(--tx3)', marginTop: 4 }}>{row.detail}</span>
      </span>
      {row.badge ? <span style={{ marginLeft: 'auto' }}>{row.badge}</span> : <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>}
    </button>
  )
}

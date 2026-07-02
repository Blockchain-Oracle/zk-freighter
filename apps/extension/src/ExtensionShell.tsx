import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft, CircleEllipsis, Home, List, Network, QrCode } from 'lucide-react'
import { Logo } from '@zk-freighter/ui'

import type { DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'
import type { ExtensionScreen } from './extension-routes'

export type ExtensionSheet = 'send' | 'shield' | 'unshield' | 'more' | 'network'
export type BottomTab = 'home' | 'activity' | 'receive' | 'more'

const shellStyle: CSSProperties = {
  width: 360,
  maxWidth: '100%',
  minHeight: '100dvh',
  boxSizing: 'border-box',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const iconButton: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: '1px solid var(--bd)',
  background: 'var(--card)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flex: 'none',
}

interface ShellProps {
  readonly status: DappWalletStatus
  readonly activeTab: BottomTab
  readonly children: ReactNode
  readonly navigate: (screen: ExtensionScreen) => void
  readonly openSheet: (sheet: ExtensionSheet) => void
}

export function ExtensionShell({ status, activeTab, children, navigate, openSheet }: ShellProps) {
  return (
    <div style={shellStyle}>
      <MobileHeader status={status} navigate={navigate} openSheet={openSheet} />
      <main style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, paddingBottom: 78 }}>
        {children}
      </main>
      <BottomTabs activeTab={activeTab} navigate={navigate} openSheet={openSheet} />
    </div>
  )
}

export function MobileHeader({ status, navigate, openSheet }: { readonly status: DappWalletStatus; readonly navigate: (screen: ExtensionScreen) => void; readonly openSheet: (sheet: ExtensionSheet) => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 1px' }}>
      <button type="button" aria-label="Home" data-zkf-action="header-home" onClick={() => navigate('home')} style={{ ...iconButton, padding: 0 }}>
        <Logo size={24} />
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em' }}>Personal</div>
        <div style={{ font: '600 10px/1 var(--fm)', color: 'var(--tx3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{shorten(status.publicKey)}</div>
      </div>
      <button type="button" data-zkf-action="network-menu" onClick={() => openSheet('network')} style={networkPill(status.network)}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.network === 'mainnet' ? 'var(--warn)' : 'var(--pos)' }} />
        {status.network}
      </button>
      <button type="button" aria-label="More" data-zkf-action="header-more" onClick={() => openSheet('more')} style={iconButton}>
        <CircleEllipsis size={17} aria-hidden="true" />
      </button>
    </header>
  )
}

function networkPill(network: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    maxWidth: 92,
    padding: '8px 10px',
    borderRadius: 999,
    border: '1px solid var(--bd)',
    background: 'var(--card)',
    color: 'var(--tx2)',
    font: '700 9px/1 var(--fm)',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }
}

const tabs: ReadonlyArray<{ readonly tab: BottomTab; readonly label: string; readonly icon: ReactNode }> = [
  { tab: 'home', label: 'Home', icon: <Home size={17} aria-hidden="true" /> },
  { tab: 'activity', label: 'Activity', icon: <List size={17} aria-hidden="true" /> },
  { tab: 'receive', label: 'Receive', icon: <QrCode size={17} aria-hidden="true" /> },
  { tab: 'more', label: 'More', icon: <CircleEllipsis size={17} aria-hidden="true" /> },
]

export function BottomTabs({ activeTab, navigate, openSheet }: { readonly activeTab: BottomTab; readonly navigate: (screen: ExtensionScreen) => void; readonly openSheet: (sheet: ExtensionSheet) => void }) {
  function select(tab: BottomTab) {
    if (tab === 'more') openSheet('more')
    else navigate(tab)
  }
  return (
    <nav style={{ position: 'sticky', bottom: 12, zIndex: 5, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 6, border: '1px solid var(--bd)', borderRadius: 24, background: 'color-mix(in srgb, var(--panel) 94%, transparent)', boxShadow: '0 18px 36px rgba(0,0,0,.28)' }}>
      {tabs.map((entry) => {
        const active = entry.tab === activeTab
        return (
          <button key={entry.tab} type="button" data-zkf-action={`tab-${entry.tab}`} onClick={() => select(entry.tab)} style={{ minWidth: 0, minHeight: 54, border: 0, borderRadius: 18, background: active ? 'var(--card2)' : 'transparent', color: active ? 'var(--ac2)' : 'var(--tx3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
            {entry.icon}
            <span style={{ fontSize: 9.5, fontWeight: active ? 800 : 600 }}>{entry.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function RouteHeader({ title, badge, onBack }: { readonly title: string; readonly badge?: ReactNode; readonly onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 34 }}>
      <button type="button" aria-label="Back" data-zkf-action="route-back" onClick={onBack} style={{ ...iconButton, width: 32, height: 32 }}>
        <ArrowLeft size={16} aria-hidden="true" />
      </button>
      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.01em' }}>{title}</span>
      {badge ? <span style={{ marginLeft: 'auto' }}>{badge}</span> : null}
    </div>
  )
}

export function BottomSheet({ title, children, onClose }: { readonly title: string; readonly children: ReactNode; readonly onClose: () => void }) {
  return (
    <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.44)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} style={{ width: 400, maxWidth: '100%', maxHeight: '92dvh', overflow: 'auto', border: '1px solid var(--bd)', borderBottom: 0, borderRadius: '24px 24px 0 0', background: 'var(--panel)', padding: '14px 16px 18px', boxShadow: '0 -22px 44px rgba(0,0,0,.36)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--bd)' }}>
          <Logo size={26} />
          <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
          <button type="button" data-zkf-action="sheet-close" onClick={onClose} style={{ ...iconButton, marginLeft: 'auto', width: 30, height: 30 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>{children}</div>
      </section>
    </div>
  )
}

type BoundaryTone = 'shielded' | 'public' | 'danger' | 'testnet' | 'ready'
const toneColor: Record<BoundaryTone, string> = {
  shielded: 'var(--ac2)',
  public: 'var(--warn)',
  danger: 'var(--dng)',
  testnet: 'var(--tx3)',
  ready: 'var(--pos)',
}

export function BoundaryBadge({ tone, children }: { readonly tone: BoundaryTone; readonly children: ReactNode }) {
  const color = toneColor[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${color}`, color, borderRadius: 999, padding: '4px 8px', font: '700 8px/1 var(--fm)', letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {tone === 'shielded' ? <span style={{ width: 5, height: 5, border: `1px solid ${color}`, transform: 'rotate(45deg)' }} /> : null}
      {children}
    </span>
  )
}

export function NetworkSheetIcon() {
  return <Network size={16} aria-hidden="true" />
}

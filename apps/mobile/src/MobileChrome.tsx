import { Activity, ArrowDown, Camera, Home, Loader2, MoreHorizontal, Settings, Shield, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@zk-freighter/ui'
import { usePullToRefresh } from './mobile-gestures'
import { hapticTap } from './mobile-haptics'
import { isSheetRoute } from './mobile-routing'
import type { MobileRoute } from './mobile-storage'
import { truncateMiddle } from './mobile-format'

interface ChromeProps {
  readonly route: MobileRoute
  readonly address: string
  readonly receiveCode: string
  readonly network: string
  readonly children: ReactNode
  readonly overlay?: ReactNode
  readonly onRoute: (route: MobileRoute) => void
  readonly onLock: () => void
  /** When set, pulling the content pane down past the threshold triggers it. */
  readonly onRefresh?: () => Promise<unknown> | void
}

const tabs: readonly { route: MobileRoute; label: string; icon: ReactNode }[] = [
  { route: 'home', label: 'Home', icon: <Home size={18} /> },
  { route: 'activity', label: 'Activity', icon: <Activity size={18} /> },
  { route: 'receive', label: 'Receive', icon: <ArrowDown size={18} /> },
  { route: 'more', label: 'More', icon: <MoreHorizontal size={18} /> },
]

export function MobileChrome({ route, address, receiveCode, network, children, overlay, onRoute, onRefresh }: ChromeProps) {
  const accountId = receiveCode ? truncateMiddle(receiveCode, 8, 4) : truncateMiddle(address, 5, 5)
  const refresh = usePullToRefresh(onRefresh ?? (() => undefined))
  const pullHandlers = onRefresh ? refresh.handlers : {}
  const pullActive = refresh.pull > 0 || refresh.refreshing

  return (
    <main className="phone-shell">
      <header className="mobile-header">
        <button className="brand-button" onClick={() => onRoute('home')}>
          <Logo size={36} glow />
          <span><strong>Personal</strong><em>{accountId}</em></span>
        </button>
        <button className="network-chip" onClick={() => onRoute('settings')}>{network}</button>
        <button className="icon-button" aria-label="Settings" onClick={() => onRoute('settings')}><Settings size={18} /></button>
      </header>
      {onRefresh ? (
        <div className={`pull-indicator${pullActive || refresh.failed ? ' on' : ''}`} style={{ height: refresh.refreshing ? 42 : refresh.failed ? 34 : Math.round(refresh.pull * 0.55) }} aria-hidden>
          {refresh.failed
            ? <span className="pull-failed">Couldn’t refresh — check your connection</span>
            : <Loader2 size={17} className={refresh.refreshing ? 'pull-spin' : ''} style={{ transform: refresh.refreshing ? undefined : `rotate(${refresh.pull * 2.4}deg)` }} />}
        </div>
      ) : null}
      <section
        key={isSheetRoute(route) ? 'home' : route}
        className="phone-content route-enter"
        {...pullHandlers}
      >
        {children}
      </section>
      <nav className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.route}
            className={isActive(route, tab.route) ? 'active' : ''}
            onClick={() => {
              hapticTap()
              onRoute(tab.route)
            }}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </nav>
      {overlay}
    </main>
  )
}

export function MoreSheet({ address, onRoute, onLock, onClose }: { readonly address: string; readonly onRoute: (route: MobileRoute) => void; readonly onLock: () => void; readonly onClose: () => void }) {
  return (
    <div className="screen-stack">
      <div className="more-head"><Logo size={30} glow /><span><strong>More</strong><em>{truncateMiddle(address, 5, 5)}</em></span><button className="sheet-close" aria-label="Close More" onClick={onClose}>×</button></div>
      <MoreGroup title="Move">
        <MoreRow icon={<WalletCards size={18} />} label="Send" detail="Private or public transfer" badge="SHIELDED" onClick={() => onRoute('send')} />
        <MoreRow icon={<Camera size={18} />} label="Scan to pay" detail="Camera or paste a private code" badge="CODE" onClick={() => onRoute('scan')} />
        <MoreRow icon={<ArrowDown size={18} />} label="Receive" detail="Private code and public address" badge="CODE" onClick={() => onRoute('receive')} />
        <MoreRow label="Bridge" detail="CCTP USDC into Stellar" badge="PUBLIC" onClick={() => onRoute('bridge')} />
        <MoreRow icon={<Shield size={18} />} label="Shield" detail="Deposit or withdraw" badge="PUBLIC" onClick={() => onRoute('shield')} />
      </MoreGroup>
      <MoreGroup title="Prove & Discover">
        <MoreRow label="Disclosure" detail="Create or verify a read-only proof" badge="READ-ONLY" onClick={() => onRoute('disclosure')} />
        <MoreRow label="Confidential" detail="Hidden-amount token preview" badge="TESTNET" onClick={() => onRoute('confidential')} />
        <MoreRow label="Discover" detail="Find a discoverable private code" badge="PUBLIC" onClick={() => onRoute('discover')} />
      </MoreGroup>
      <MoreGroup title="Account">
        <MoreRow label="Settings" detail="Network, sync, reset, evidence" badge="LOCAL" onClick={() => onRoute('settings')} />
        <MoreRow label="Lock wallet" detail="Require password to reopen" badge="LOCK" onClick={onLock} />
      </MoreGroup>
    </div>
  )
}

export function ScreenTitle({ title, subtitle, right }: { readonly title: string; readonly subtitle?: string; readonly right?: React.ReactNode }) {
  return <div className="screen-title"><div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>{right}</div>
}

function MoreGroup({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="more-group"><h2>{title}</h2>{children}</section>
}

function MoreRow({ icon, label, detail, badge, onClick }: { readonly icon?: ReactNode; readonly label: string; readonly detail: string; readonly badge: string; readonly onClick: () => void }) {
  return (
    <button className="more-row" onClick={onClick}>
      <span className="more-icon">{icon ?? label[0]}</span>
      <span><strong>{label}</strong><em>{detail}</em></span>
      <b>{badge}</b>
    </button>
  )
}

function isActive(route: MobileRoute, tab: MobileRoute): boolean {
  if (tab === 'home') return ['home', 'send', 'shield', 'bridge'].includes(route)
  if (tab === 'more') return ['more', 'settings', 'scan', 'discover', 'disclosure', 'confidential'].includes(route)
  return route === tab
}

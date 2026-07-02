import type { ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { BoundaryBadge } from '@zk-fighter/ui'
import type { AssetCode, NetworkKey, PublicBalancesReport, WalletIdentity } from '@zk-fighter/core'
import type { MobileRoute, MobileShieldedBalanceCache } from './mobile-storage'
import { formatAssetAmount, truncateMiddle } from './mobile-format'

export interface MobileRouteParams {
  readonly sendCode?: string
  readonly sendMode?: 'private' | 'public'
  readonly shieldMode?: 'shield' | 'unshield'
}

export interface FlowProps {
  readonly network: NetworkKey
  readonly identity: WalletIdentity
  readonly receiveCode: string
  readonly publicBalances: PublicBalancesReport | null
  readonly shieldedCache: MobileShieldedBalanceCache | null
  readonly syncStatus: 'idle' | 'syncing' | 'failed'
  readonly onRoute: (route: MobileRoute, params?: MobileRouteParams) => void
  readonly onSync: () => Promise<void>
  readonly onPublicRefresh?: () => void
}

export function FlowScreen({ title, badge, onBack, children, active }: {
  readonly title: string
  readonly badge: 'shielded' | 'public' | 'both-public' | 'reveals' | 'read-only' | 'testnet' | 'neutral'
  readonly onBack: () => void
  readonly children: ReactNode
  readonly active?: boolean
}) {
  const kind = badge === 'reveals' ? 'reveals-info' : badge
  return <div className={`screen-stack flow-screen ${active ? 'proving-active' : ''}`}><div className="flow-head"><button onClick={onBack}>‹</button><strong>{title}</strong><BoundaryBadge kind={kind} /></div>{children}</div>
}

export function Segment<T extends string>({ value, options, onChange }: {
  readonly value: T
  readonly options: readonly (readonly [T, string])[]
  readonly onChange: (value: T) => void
}) {
  return <div className="mobile-segment">{options.map(([item, label]) => <button key={item} className={value === item ? 'on' : ''} onClick={() => onChange(item)}>{label}</button>)}</div>
}

export function Field({ label, value, placeholder, mono, onChange }: {
  readonly label: string
  readonly value: string
  readonly placeholder: string
  readonly mono?: boolean
  readonly onChange: (value: string) => void
}) {
  return <label className="flow-field"><span>{label}</span><input className={mono ? 'mono' : ''} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

export function AmountBox({ asset, amount, available, error, onAsset, onAmount, onMax }: {
  readonly asset: AssetCode
  readonly amount: string
  readonly available: bigint | null
  readonly error?: string | null
  readonly onAsset: (asset: AssetCode) => void
  readonly onAmount: (amount: string) => void
  readonly onMax: () => void
}) {
  return (
    <section className="amount-box">
      <div className="asset-toggle">
        <button className={asset === 'USDC' ? 'on' : ''} onClick={() => onAsset('USDC')}>USDC</button>
        <button className={asset === 'XLM' ? 'on' : ''} onClick={() => onAsset('XLM')}>XLM</button>
      </div>
      <div className="amount-line"><input value={amount} placeholder="0.00" inputMode="decimal" onChange={(event) => onAmount(event.target.value)} /><b>{asset}</b></div>
      <div className="available-row"><span>Available {available === null ? '--' : formatAssetAmount(available, asset)}</span><button onClick={onMax}>Max</button></div>
      {error ? <div className="mini-error">{error}</div> : null}
    </section>
  )
}

export function CopyBlock({ label, value }: { readonly label: string; readonly value: string }) {
  const display = value.length > 42 ? truncateMiddle(value, 16, 12) : value
  return <section className="copy-block"><span>{label}</span><code>{display}</code><button onClick={() => void navigator.clipboard.writeText(value)}><Copy size={14} /> Copy</button></section>
}

export function ResultCard({ tone, title, detail, href }: { readonly tone: 'ok' | 'warn' | 'info'; readonly title: string; readonly detail?: string; readonly href?: string }) {
  return (
    <section className={`result-card ${tone}`}>
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
      {href ? <a href={href} target="_blank" rel="noreferrer">View on explorer ↗</a> : null}
    </section>
  )
}

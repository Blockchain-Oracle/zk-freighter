import type { CSSProperties, ReactNode } from 'react'
import { fontMono } from './tokens'

// Shared primitives extracted from repeated prototype patterns. Color values come
// from theme CSS vars so these render correctly on every surface and theme.

export type TxStatus = 'proving' | 'confirmed' | 'spendable' | 'bridging' | 'pending'

const STATUS_COLOR: Record<TxStatus, string> = {
  proving: 'var(--warn)',
  confirmed: 'var(--tx3)',
  spendable: 'var(--pos)',
  bridging: 'var(--warn)',
  pending: 'var(--ac)',
}

const STATUS_LABEL: Record<TxStatus, string> = {
  proving: 'PROVING',
  confirmed: 'CONFIRMED',
  spendable: 'SPENDABLE',
  bridging: 'BRIDGING',
  pending: 'PENDING',
}

/** Monospace status chip with a colored dot (PROVING/CONFIRMED/SPENDABLE/…). */
export function StatusPill({ status, label }: { status: TxStatus; label?: string }) {
  const color = STATUS_COLOR[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 9.5,
        color,
        fontFamily: fontMono,
        letterSpacing: '.04em',
      }}
    >
      <span
        className={status === 'pending' || status === 'proving' || status === 'bridging' ? 'animate-zkPulse' : undefined}
        style={{ width: 6, height: 6, borderRadius: '50%', background: color }}
      />
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}

export type Boundary =
  | 'shielded'
  | 'public'
  | 'reveals-info'
  | 'both-public'
  | 'read-only'
  | 'confidential'
  | 'testnet'
  | 'neutral'

const BOUNDARY: Record<Boundary, { label: string; color: string }> = {
  shielded: { label: 'SHIELDED', color: 'var(--ac2)' },
  public: { label: 'PUBLIC BOUNDARY', color: 'var(--warn)' },
  'reveals-info': { label: 'REVEALS INFO', color: 'var(--dng)' },
  'both-public': { label: 'BOTH ENDS PUBLIC', color: 'var(--pub)' },
  'read-only': { label: 'READ-ONLY PROOF', color: 'var(--ac)' },
  confidential: { label: 'CONFIDENTIAL', color: 'var(--ac2)' },
  testnet: { label: 'TESTNET', color: 'var(--pos)' },
  neutral: { label: '', color: 'var(--tx3)' },
}

/** Boundary badge for shield/unshield/bridge/disclosure/confidential surfaces. */
export function BoundaryBadge({
  kind,
  label,
  size = 'md',
}: {
  kind: Boundary
  label?: string
  size?: 'sm' | 'md'
}) {
  const b = BOUNDARY[kind]
  const style: CSSProperties = {
    padding: size === 'sm' ? '2px 6px' : '2px 7px',
    border: '1px solid var(--bd2)',
    borderRadius: 5,
    fontSize: size === 'sm' ? 8.5 : 9,
    color: b.color,
    fontFamily: fontMono,
    letterSpacing: '.06em',
  }
  return <span style={style}>{label ?? b.label}</span>
}

/** Standard bordered surface card. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        border: '1px solid var(--bd)',
        borderRadius: 14,
        background: 'var(--card)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export type CalloutTone = 'info' | 'warn' | 'public' | 'danger' | 'shielded'

const CALLOUT_TONE: Record<CalloutTone, { border: string; bg: string; accent: string }> = {
  info: { border: 'rgba(94,124,250,.25)', bg: 'rgba(94,124,250,.06)', accent: 'var(--ac)' },
  warn: { border: 'rgba(229,180,92,.3)', bg: 'rgba(229,180,92,.06)', accent: 'var(--warn)' },
  public: { border: 'rgba(138,147,162,.25)', bg: 'rgba(138,147,162,.05)', accent: 'var(--pub)' },
  danger: { border: 'rgba(229,103,92,.3)', bg: 'rgba(229,103,92,.06)', accent: 'var(--dng)' },
  shielded: { border: 'rgba(94,124,250,.28)', bg: 'rgba(94,124,250,.07)', accent: 'var(--ac2)' },
}

/** Inline callout for boundary/info/warning copy (info=shielded, warn=reveals, public=boundary). */
export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: CalloutTone
  title?: string
  children: ReactNode
}) {
  const t = CALLOUT_TONE[tone]
  return (
    <div
      style={{
        padding: '12px 14px',
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        background: t.bg,
        fontSize: 11.5,
        color: 'var(--tx2)',
        lineHeight: 1.55,
      }}
    >
      {title ? <span style={{ color: t.accent, fontWeight: 700 }}>{title} </span> : null}
      {children}
    </div>
  )
}

/** Network pill ("TESTNET"/"MAINNET") with a status dot. */
export function NetworkPill({ network }: { network: string }) {
  const isMainnet = network.toLowerCase().includes('main')
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: '1px solid var(--bd)',
        borderRadius: 999,
        fontSize: 9.5,
        color: 'var(--tx2)',
        fontFamily: fontMono,
        letterSpacing: '.08em',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isMainnet ? 'var(--warn)' : 'var(--pos)' }} />
      {network.toUpperCase()}
    </span>
  )
}

/** Filter / preset chip (All/Shielded/Public/Pending, amount presets, chains). */
export function Chip({
  label,
  active = false,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        border: active ? '1px solid var(--ac)' : '1px solid var(--bd)',
        background: active ? 'rgba(94,124,250,.12)' : 'transparent',
        color: active ? 'var(--tx)' : 'var(--tx2)',
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {label}
    </button>
  )
}

export type PillTone = 'pos' | 'warn' | 'ac' | 'neutral'

const PILL_COLOR: Record<PillTone, string> = {
  pos: 'var(--pos)',
  warn: 'var(--warn)',
  ac: 'var(--ac)',
  neutral: 'var(--tx3)',
}

/** Small labelled status pill with optional pulsing dot (e.g. SYNCED). */
export function Pill({
  label,
  tone = 'neutral',
  dot = false,
  pulse = false,
}: {
  label: string
  tone?: PillTone
  dot?: boolean
  pulse?: boolean
}) {
  const color = PILL_COLOR[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: '1px solid var(--bd)',
        borderRadius: 999,
        fontSize: 9.5,
        color,
        fontFamily: fontMono,
        letterSpacing: '.06em',
      }}
    >
      {dot ? (
        <span
          className={pulse ? 'animate-zkPulse' : undefined}
          style={{ width: 5, height: 5, borderRadius: '50%', background: color }}
        />
      ) : null}
      {label}
    </span>
  )
}

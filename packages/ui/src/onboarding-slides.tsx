import type { ReactNode } from 'react'
import { Logo } from './logo'

// Intro v2 slide content + the small "live-UI" diagrams. Kept apart from the
// onboarding container so each file stays well under the 300-line cap. Colors
// are literals (not theme vars): the flow paints its own #0c0d0f stage before
// any <ThemeProvider> mounts, mirroring BrandIntro.
export const onboardingInk = {
  hi: '#f3f4f6',
  mid: '#c7cbd4',
  low: '#9aa0a9',
  faint: '#6b7280',
  accent: '#5E7CFA',
  accentSoft: '#8a9bff',
  pos: '#35c77b',
  card: 'rgba(255,255,255,.03)',
  line: 'rgba(255,255,255,.09)',
} as const

export interface OnboardingSlide {
  readonly title: string
  readonly sub: string
  /** Reduced-motion callers get static frames; the hero drops its ring pulse. */
  readonly visual: (reduced: boolean) => ReactNode
}

function ringStyle(delaySeconds: number): React.CSSProperties {
  return {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: '50%',
    border: '1.5px solid rgba(94,124,250,.5)',
    animation: `zkIntroRing 1.6s ease-out ${delaySeconds}s both`,
    pointerEvents: 'none',
  }
}

function BrandHero(reduced: boolean): ReactNode {
  return (
    <span style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 120 }}>
      {reduced ? null : (
        <>
          <span style={ringStyle(0.15)} />
          <span style={ringStyle(1.0)} />
        </>
      )}
      <span style={{ animation: reduced ? undefined : 'zkIntroCoin 1s cubic-bezier(.3,1.4,.4,1) both' }}>
        <Logo size={88} glow />
      </span>
    </span>
  )
}

const rowBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '13px 15px',
  borderRadius: 15,
  border: `1px solid ${onboardingInk.line}`,
  background: onboardingInk.card,
}

function balanceRow(opts: {
  dot: string
  label: string
  tag: string
  amount: ReactNode
  amountColor: string
}): ReactNode {
  return (
    <div style={rowBase}>
      <span style={{ flex: 'none', width: 10, height: 10, borderRadius: '50%', background: opts.dot, boxShadow: `0 0 10px ${opts.dot}` }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ font: '700 13px/1 var(--font-sans, inherit)', color: onboardingInk.hi }}>{opts.label}</span>
        <span style={{ font: '600 9.5px/1 var(--font-mono, ui-monospace, monospace)', letterSpacing: '.08em', textTransform: 'uppercase', color: onboardingInk.faint }}>{opts.tag}</span>
      </span>
      <span style={{ marginLeft: 'auto', font: '700 13px/1 var(--font-mono, ui-monospace, monospace)', color: opts.amountColor }}>{opts.amount}</span>
    </div>
  )
}

function BalancesDiagram(): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
      {balanceRow({ dot: onboardingInk.pos, label: 'Public balance', tag: 'Visible on-chain', amount: '1,204.50 XLM', amountColor: onboardingInk.hi })}
      {balanceRow({ dot: onboardingInk.accent, label: 'Shielded balance', tag: 'Amounts hidden', amount: '•••• ••', amountColor: onboardingInk.accentSoft })}
    </div>
  )
}

function boundaryPill(text: string, color: string, filled: boolean): ReactNode {
  return (
    <span style={{ padding: '7px 12px', borderRadius: 999, font: '700 10px/1 var(--font-mono, ui-monospace, monospace)', letterSpacing: '.06em', textTransform: 'uppercase', color: filled ? '#0c0d0f' : color, background: filled ? color : 'transparent', border: `1px solid ${color}` }}>{text}</span>
  )
}

function BoundaryDiagram(): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {boundaryPill('Public', onboardingInk.pos, false)}
        <span style={{ color: onboardingInk.accent, fontSize: 16 }}>⇄</span>
        {boundaryPill('Shielded', onboardingInk.accent, true)}
      </div>
      <span style={{ font: '600 9.5px/1.4 var(--font-mono, ui-monospace, monospace)', letterSpacing: '.06em', textTransform: 'uppercase', color: onboardingInk.faint, textAlign: 'center' }}>Shield / unshield crosses the line — visible</span>
    </div>
  )
}

function KeysDiagram(): ReactNode {
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 14, height: 120 }}>
      <span style={{ width: 78, height: 78, borderRadius: 22, border: `1.5px solid ${onboardingInk.line}`, background: 'radial-gradient(circle at 50% 35%, rgba(94,124,250,.22), rgba(94,124,250,.04))', display: 'grid', placeItems: 'center', fontSize: 34 }}>🔑</span>
      <span style={{ font: '600 9.5px/1 var(--font-mono, ui-monospace, monospace)', letterSpacing: '.1em', textTransform: 'uppercase', color: onboardingInk.faint }}>Stored on this device</span>
    </div>
  )
}

export const onboardingSlides: readonly OnboardingSlide[] = [
  {
    title: 'Privacy by default on Stellar.',
    sub: 'Shielded transfers for XLM and USDC.',
    visual: (reduced) => BrandHero(reduced),
  },
  {
    title: 'Two balances. One wallet.',
    sub: 'Your public balance works like any Stellar account. Your shielded balance keeps amounts and recipients out of public view.',
    visual: () => BalancesDiagram(),
  },
  {
    title: 'Shielding in and out is public.',
    sub: 'When you shield or unshield, that boundary transaction is visible on-chain. What you do inside — shielded transfers — is not.',
    visual: () => BoundaryDiagram(),
  },
  {
    title: 'Your keys stay on this device.',
    sub: 'You can make your private code discoverable later — your choice.',
    visual: () => KeysDiagram(),
  },
]

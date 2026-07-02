import { useState, type CSSProperties, type ReactNode } from 'react'
import type { NetworkKey } from '@zk-freighter/core'
import { Button, Logo } from '@zk-freighter/ui'

export type WalletSetupMode = 'create' | 'import'

/** The floating onboarding/unlock card (Onboarding HiFi `.card`). */
export function OnboardCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 380,
        maxWidth: '100%',
        background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent 30%), var(--panel)',
        border: '1px solid var(--bd2)',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -34px #000, 0 0 0 1px rgba(0,0,0,.35)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}

export function CardTop({ left, title, right }: { left?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', borderBottom: '1px solid var(--bd)' }}>
      {left}
      <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
      {right ? <span style={{ marginLeft: 'auto' }}>{right}</span> : null}
    </div>
  )
}

export function CardBody({ children, center, style }: { children: ReactNode; center?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: '24px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
        ...(center ? { alignItems: 'center', textAlign: 'center', justifyContent: 'center', gap: 20 } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function TestnetPill({ network }: { network: NetworkKey }) {
  const mainnet = network === 'mainnet'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx2)', padding: '5px 10px', border: '1px solid var(--bd)', borderRadius: 999 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: mainnet ? 'var(--warn)' : 'var(--pos)', boxShadow: `0 0 6px ${mainnet ? 'var(--warn)' : 'var(--pos)'}` }} />
      {network.toUpperCase()}
    </span>
  )
}

/** Password field with a show/hide toggle, focus-glow on the periwinkle border. */
export function PasswordField({ value, onChange, placeholder, onEnter, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void; autoFocus?: boolean }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 13, background: 'var(--card)', border: `1px solid ${focused ? 'var(--ac)' : 'var(--bd2)'}`, boxShadow: focused ? '0 0 0 3px rgba(94,124,250,.12)' : 'none' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => { if (event.key === 'Enter' && onEnter) onEnter() }}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontSize: 14, letterSpacing: value && !show ? '.18em' : 0 }}
      />
      <button type="button" onClick={() => setShow((s) => !s)} style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 11, cursor: 'pointer' }}>{show ? 'hide' : 'show'}</button>
    </div>
  )
}

interface UnlockScreenProps {
  network: NetworkKey
  busy: boolean
  passkeyEnabled: boolean
  unlockPassword: string
  error?: string
  onPassword: (password: string) => void
  onPasswordUnlock: () => void
  onPasskeyUnlock: () => void
}

/** The returning-user unlock card. */
export function UnlockScreen({ network, busy, unlockPassword, error, onPassword, onPasswordUnlock }: UnlockScreenProps) {
  return (
    <OnboardCard>
      <CardTop left={<Logo size={24} />} title="ZK Freighter" right={<TestnetPill network={network} />} />
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <Logo size={56} glow />
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' }}>Welcome back</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 7 }}>Unlock to open your shielded wallet.</div>
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 }}>VAULT PASSWORD</div>
          <PasswordField value={unlockPassword} onChange={onPassword} onEnter={onPasswordUnlock} autoFocus />
        </div>
        {error ? <div style={{ fontSize: 11.5, color: 'var(--dng)' }}>{error}</div> : null}
        <Button fullWidth loading={busy} disabled={!unlockPassword} onClick={onPasswordUnlock}>Unlock</Button>
        <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5, textAlign: 'center', marginTop: 'auto' }}>
          Your seed phrase is the only recovery path. ZK Freighter cannot recover it for you.
        </div>
      </CardBody>
    </OnboardCard>
  )
}

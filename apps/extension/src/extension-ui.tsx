import type { CSSProperties, ReactNode } from 'react'

// Themed extension primitives (token-based) that replace the old ExtensionApp.css
// classes, so popup + side panel share the same visual language as the web app.

export const fieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 11,
  border: '1px solid var(--bd2)',
  background: 'var(--card)',
  color: 'var(--tx)',
  fontFamily: 'var(--fm)',
  fontSize: 12.5,
  outline: 'none',
}

const monoCaption: CSSProperties = { font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)' }

export function Panel({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section aria-label={label} style={{ border: '1px solid var(--bd)', borderRadius: 16, background: 'var(--panel)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {children}
    </section>
  )
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</h2>
      {right ? <span style={{ marginLeft: 'auto' }}>{right}</span> : null}
    </div>
  )
}

type BadgeTone = 'ready' | 'deferred' | 'progress'
const badgeColors: Record<BadgeTone, string> = { ready: 'var(--pos)', deferred: 'var(--tx3)', progress: 'var(--warn)' }

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 9px/1 var(--fm)', letterSpacing: '.08em', textTransform: 'uppercase', color: badgeColors[tone], padding: '5px 9px', border: `1px solid ${badgeColors[tone]}`, borderRadius: 999, opacity: 0.92 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: badgeColors[tone] }} />
      {children}
    </span>
  )
}

export function Caption({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...monoCaption, ...style }}>{children}</span>
}

export function Copy({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>{children}</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 11.5, color: 'var(--dng)', lineHeight: 1.5 }}>{children}</p>
}

export function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--bd)' }}>
      <span style={{ ...monoCaption }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tx)', fontFamily: 'var(--fm)', minWidth: 0, overflowWrap: 'anywhere', textAlign: 'right' }}>{children}</span>
    </div>
  )
}

export function GhostButton({ children, onClick, disabled, title }: { children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 11, border: '1px solid var(--bd2)', background: 'var(--card)', color: 'var(--tx)', fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function ExplorerLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--ac2)', fontWeight: 600, fontFamily: 'var(--fm)', overflowWrap: 'anywhere' }}>{children}</a>
}

export function BlockerList({ blockers }: { blockers: readonly string[] }) {
  if (blockers.length === 0) return null
  return (
    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {blockers.map((blocker, index) => (
        <li key={index} style={{ fontSize: 11, color: 'var(--warn)', lineHeight: 1.45 }}>{blocker}</li>
      ))}
    </ul>
  )
}

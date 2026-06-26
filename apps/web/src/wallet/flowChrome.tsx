import type { ReactNode } from 'react'

/** Shared flow-screen header: back affordance, title, and an optional boundary badge. */
export function FlowHeader({ title, onBack, badge }: { title: string; onBack: () => void; badge?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={onBack}
        aria-label="Back"
        style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx2)', cursor: 'pointer', fontSize: 15 }}
      >
        ←
      </button>
      <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em' }}>{title}</div>
      {badge ? <div style={{ marginLeft: 'auto' }}>{badge}</div> : null}
    </div>
  )
}

/** Small mono pill flagging a flow's privacy boundary (public / shielded / reveals-info). */
export function BoundaryPill({
  label,
  color = 'var(--pub)',
  dashed = true,
}: {
  label: string
  color?: string
  dashed?: boolean
}) {
  return (
    <span
      style={{
        padding: '4px 10px',
        border: `1px ${dashed ? 'dashed' : 'solid'} var(--bd2)`,
        borderRadius: 6,
        fontSize: 9,
        color,
        fontFamily: 'var(--fm)',
        letterSpacing: '.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

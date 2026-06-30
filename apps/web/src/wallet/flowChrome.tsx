import type { CSSProperties, ReactNode } from 'react'

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

/**
 * Small mono pill flagging a flow's privacy boundary. DEPRECATED — migrating to the
 * shared `BoundaryBadge`; remove once Shield/Bridge/Disclosure/Discover/Confidential adopt it.
 */
export function BoundaryPill({ label, color = 'var(--pub)', dashed = true }: { label: string; color?: string; dashed?: boolean }) {
  return (
    <span style={{ padding: '4px 10px', border: `1px ${dashed ? 'dashed' : 'solid'} var(--bd2)`, borderRadius: 6, fontSize: 9, color, fontFamily: 'var(--fm)', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function stepDotStyle(done: boolean, active: boolean): CSSProperties {
  if (done) return { background: 'rgba(53,199,123,.18)', color: 'var(--pos)', border: '1px solid rgba(53,199,123,.45)' }
  if (active) return { background: 'var(--ac)', color: '#fff', border: '1px solid var(--ac)' }
  return { background: 'transparent', color: 'var(--tx3)', border: '1px solid var(--bd2)' }
}

/** Left step rail for the proving flows: numbered steps + an on-device proving note. */
export function FlowStepRail({
  title,
  steps,
  current,
  note,
}: {
  title: string
  steps: readonly string[]
  current: number
  note: ReactNode
}) {
  return (
    <div style={{ width: 200, flex: 'none', display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.02em', marginBottom: 24 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((label, index) => {
          const done = current > index
          const active = current === index
          return (
            <div key={label}>
              {index > 0 ? <div style={{ width: 1, height: 14, background: 'var(--bd2)', marginLeft: 19 }} /> : null}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 9, background: active ? 'rgba(94,124,250,.12)' : 'transparent' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--fm)', ...stepDotStyle(done, active) }}>
                  {done ? '✓' : index + 1}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'var(--tx)' : done ? 'var(--tx2)' : 'var(--tx3)' }}>{label}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-start', gap: 9, padding: 12, border: '1px solid var(--bd)', borderRadius: 12, background: 'rgba(94,124,250,.05)' }}>
        <span style={{ flex: 'none', width: 7, height: 7, marginTop: 4, borderRadius: '50%', background: 'var(--ac)', boxShadow: '0 0 8px var(--ac)' }} />
        <span style={{ fontSize: 10.5, lineHeight: 1.5, color: 'var(--tx2)' }}>{note}</span>
      </div>
    </div>
  )
}

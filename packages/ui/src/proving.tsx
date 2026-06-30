import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import { fontMono } from './tokens'

// Live proving visual. Unlike the prototype (a simulated timer), the ring + step
// rows here are driven by the real prover/submit heartbeat. Animation uses inline
// SVG SMIL so it is self-contained across web/extension/mobile with no app CSS.

/** Small indeterminate spinner (used in buttons and inline "working" states). */
export function Spinner({ size = 16, color = 'var(--ac)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="var(--bd)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="3" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}

export type RingState = 'active' | 'done' | 'error'

const RING_COLOR: Record<RingState, string> = {
  active: 'var(--ac)',
  done: 'var(--pos)',
  error: 'var(--warn)',
}

/**
 * Determinate progress ring. `progress` (0..1) reflects how many real prover/submit
 * phases have completed; when `state` is 'active' a sweeping accent arc signals the
 * heavy in-flight phase is alive even while the phase count holds steady.
 */
export function ProvingRing({
  progress,
  label,
  sublabel,
  state = 'active',
}: {
  progress: number
  label: string
  sublabel?: string
  state?: RingState
}) {
  const size = 120
  const stroke = 8
  const r = 52
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const offset = circumference * (1 - clamped)
  const color = RING_COLOR[state]
  const center = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={r} stroke="var(--bd)" strokeWidth={stroke} fill="none" />
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset .5s ease',
            filter: state === 'error' ? undefined : 'drop-shadow(0 0 6px rgba(94,124,250,.7))',
          }}
        />
        {state === 'active' ? (
          <circle
            cx={center}
            cy={center - r}
            r={4.5}
            fill={color}
            opacity={0.9}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${center} ${center}`}
              to={`360 ${center} ${center}`}
              dur="1.1s"
              repeatCount="indefinite"
            />
          </circle>
        ) : null}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>
            {label}
          </div>
          {sublabel ? <div style={{ marginTop: 2, fontSize: 10, color: 'var(--tx3)' }}>{sublabel}</div> : null}
        </div>
      </div>
    </div>
  )
}

export type ProofStepState = 'pending' | 'active' | 'done' | 'error'

export interface ProofStep {
  readonly label: string
  readonly state: ProofStepState
  /** Optional override for the right-aligned tag (defaults to running/done/failed). */
  readonly detail?: string
}

const STEP_DOT: Record<ProofStepState, string> = {
  pending: 'var(--tx3)',
  active: 'var(--ac)',
  done: 'var(--pos)',
  error: 'var(--warn)',
}

const STEP_TAG: Record<ProofStepState, string> = {
  pending: '',
  active: 'running',
  done: 'done',
  error: 'failed',
}

function ProofStepRow({ label, state, detail }: ProofStep) {
  const tag = detail ?? STEP_TAG[state]
  const tagStyle: CSSProperties = {
    marginLeft: 'auto',
    fontSize: 10,
    fontFamily: fontMono,
    color: state === 'error' ? 'var(--warn)' : 'var(--tx3)',
    letterSpacing: '.04em',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: STEP_DOT[state] }} />
      <span style={{ fontSize: 12.5, color: state === 'pending' ? 'var(--tx3)' : 'var(--tx)' }}>{label}</span>
      {tag ? <span style={tagStyle}>{tag}</span> : null}
    </div>
  )
}

/** Ordered list of proof/submit steps with per-row pending/active/done/error state. */
export function ProofStepList({ steps }: { steps: readonly ProofStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {steps.map((step) => (
        <ProofStepRow key={step.label} {...step} />
      ))}
    </div>
  )
}

const EVENT_DOT: Record<ProofStepState, CSSProperties> = {
  done: { background: 'rgba(53,199,123,.18)', color: 'var(--pos)', border: '1px solid rgba(53,199,123,.45)' },
  active: { background: 'rgba(94,124,250,.18)', color: 'var(--ac2)', border: '1px solid var(--ac)' },
  pending: { background: 'transparent', color: 'var(--tx3)', border: '1px solid var(--bd2)' },
  error: { background: 'rgba(229,103,92,.16)', color: 'var(--dng)', border: '1px solid rgba(229,103,92,.45)' },
}

function EventStepRow({ label, state, detail }: ProofStep) {
  const labelColor = state === 'done' ? 'var(--pos)' : state === 'active' ? 'var(--tx)' : state === 'error' ? 'var(--dng)' : 'var(--tx3)'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, opacity: state === 'pending' ? 0.6 : 1 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', fontSize: 10, ...EVENT_DOT[state] }}>
        {state === 'done' ? '✓' : state === 'error' ? '!' : state === 'active' ? (
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(94,124,250,.3)', borderTopColor: 'var(--ac)', animation: 'zkSpin .8s linear infinite' }} />
        ) : null}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: state === 'active' ? 700 : 600, color: labelColor }}>{label}</div>
        {detail ? <div style={{ fontSize: 10.5, fontFamily: fontMono, color: state === 'active' ? 'var(--warn)' : 'var(--tx3)', marginTop: 2 }}>{detail}</div> : null}
      </div>
    </div>
  )
}

/** Vertical on-chain event tracker with connectors (bridge burn → attestation → mint → arrived). */
export function EventStepTracker({ steps }: { steps: readonly ProofStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 ? <div style={{ width: 1, height: 14, background: 'var(--bd2)', margin: '4px 0 4px 10px' }} /> : null}
          <EventStepRow {...step} />
        </Fragment>
      ))}
    </div>
  )
}

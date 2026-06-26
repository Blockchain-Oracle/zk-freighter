import type { CSSProperties, ReactNode } from 'react'
import { Button, Callout, ProofStepList, ProvingRing, truncateMiddle } from '@zk-fighter/ui'
import type { ProofFlowModel } from './proofFlow'

export interface ProofRunCopy {
  /** Sub-line under the proving ring. */
  readonly provingHint: string
  /** Success-screen heading + body. */
  readonly successTitle: string
  readonly successBody: ReactNode
  /** Terminal-failure heading (e.g. "Deposit failed" / "Send failed"). */
  readonly failedTitle: string
  /** Heading when a tx may have been broadcast but is unconfirmed. */
  readonly unconfirmedTitle: string
  /** Heading when stalled on a precondition before submit. */
  readonly blockedTitle: string
}

export interface ProofTerminalInfo {
  readonly status: 'submitted' | 'blocked' | 'failed'
  readonly submitReached: boolean
  readonly explorerUrls: readonly string[]
  readonly error?: string
}

interface ProofRunProps {
  model: ProofFlowModel
  /** True once the run has settled, so we never show the ring for a finished run. */
  settled: boolean
  terminal: ProofTerminalInfo | null
  copy: ProofRunCopy
  network: string
  onDone: () => void
  onActivity: () => void
  onRetry: () => void
  onHome: () => void
}

function ExplorerLinks({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) {
    return null
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {urls.map((url, index) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ac2)', fontWeight: 600 }}
        >
          {urls.length > 1 ? `View transaction ${index + 1} ↗` : 'View on explorer ↗'}
          <span style={{ fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{truncateMiddle(url.split('/').pop() ?? '', 6, 6)}</span>
        </a>
      ))}
    </div>
  )
}

/** Generic proving (in-flight) + terminal (submitted/blocked/failed) view for every proof flow. */
export function ProofRun({ model, settled, terminal, copy, network, onDone, onActivity, onRetry, onHome }: ProofRunProps) {
  const center: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }

  if (terminal?.status === 'submitted') {
    return (
      <div style={{ ...center, padding: '24px 0' }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(53,199,123,.12)', color: 'var(--pos)', fontSize: 34 }}>✓</div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' }}>{copy.successTitle}</div>
          <div style={{ marginTop: 8, maxWidth: 360, fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>{copy.successBody}</div>
        </div>
        <ExplorerLinks urls={terminal.explorerUrls} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260, marginTop: 6 }}>
          <Button fullWidth onClick={onDone}>Done</Button>
          <Button variant="secondary" fullWidth onClick={onActivity}>View in activity</Button>
        </div>
      </div>
    )
  }

  if (terminal && (terminal.status === 'failed' || terminal.status === 'blocked')) {
    const blocked = terminal.status === 'blocked'
    // submitReached means a transaction MAY have been broadcast even if confirmation
    // failed — never claim "no funds moved" in that case.
    const reached = terminal.submitReached
    const message = terminal.error ?? 'The action did not complete.'
    const title = blocked ? copy.blockedTitle : reached ? copy.unconfirmedTitle : copy.failedTitle
    const calloutTitle = blocked ? 'Not submitted yet.' : reached ? 'A transaction may have been broadcast.' : 'Nothing was submitted.'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={center}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(229,180,92,.12)', color: 'var(--warn)', fontSize: 30 }}>{reached ? '?' : blocked ? '⏳' : '!'}</div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{title}</div>
        </div>
        <Callout tone="warn" title={calloutTitle}>{message}</Callout>
        <ProofStepList steps={model.steps} />
        <ExplorerLinks urls={terminal.explorerUrls} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reached ? (
            <Button fullWidth onClick={onActivity}>Check activity</Button>
          ) : (
            <Button fullWidth onClick={onRetry}>{blocked ? 'Try again' : 'Back to review'}</Button>
          )}
          <Button variant="secondary" fullWidth onClick={onHome}>Back to home</Button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', textAlign: 'center' }}>
          {reached
            ? 'A transaction may have reached the network — check Activity before retrying.'
            : `${network} · no funds moved`}
        </div>
      </div>
    )
  }

  if (settled) {
    // Terminal step but no recognizable report — never imply "in progress".
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Callout tone="warn" title="Lost track of this transaction.">
          We couldn’t read the result. Check Activity to confirm whether it went through before retrying.
        </Callout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button fullWidth onClick={onActivity}>Check activity</Button>
          <Button variant="secondary" fullWidth onClick={onHome}>Back to home</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '14px 0' }}>
      <ProvingRing progress={model.progress} label={model.percentLabel} state={model.ringState} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{model.headline}…</div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--tx3)' }}>{copy.provingHint}</div>
      </div>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <ProofStepList steps={model.steps} />
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import type { XlmPrivateSubmitReport } from '@zk-freighter/core'
import { Button, EventStepTracker, ProvingRing, type ProofStep } from '@zk-freighter/ui'

import { BlockerList, Copy, ErrorText, ExplorerLink } from './extension-ui'

// Shared proving + terminal views for the private flows (Send + Unshield). The
// offscreen does the real proving/submit; these render an honest in-flight ring
// and the REAL returned report — status, events, explorer — never a faked result.

export function ProvingView({ hint }: { hint: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 8px' }}>
      <ProvingRing progress={0.55} state="active" label="Proving…" sublabel="On your device" />
      <Copy>{hint}</Copy>
    </div>
  )
}

interface TerminalCopy {
  readonly successTitle: string
  readonly successBody: ReactNode
  readonly failedTitle: string
  readonly blockedTitle: string
}

export function PrivateTerminal({ report, copy, onReset }: { report: XlmPrivateSubmitReport; copy: TerminalCopy; onReset: () => void }) {
  const ok = report.status === 'submitted'
  const tone = ok ? 'var(--pos)' : report.status === 'failed' ? 'var(--dng)' : 'var(--warn)'
  const title = ok ? copy.successTitle : report.status === 'failed' ? copy.failedTitle : copy.blockedTitle
  const steps: ProofStep[] = report.statusEvents.map((event, index) => ({
    label: event.message,
    state: !ok && index === report.statusEvents.length - 1 ? 'error' : 'done',
  }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: tone }}>{title}</div>
      {ok ? <Copy>{copy.successBody}</Copy> : null}
      <BlockerList blockers={report.blockers} />
      {report.error && !ok ? <ErrorText>{report.error}</ErrorText> : null}
      {steps.length > 0 ? <EventStepTracker steps={steps} /> : null}
      {report.explorerUrls[0] ? <ExplorerLink href={report.explorerUrls[0]}>View on explorer ↗</ExplorerLink> : null}
      <Button variant="secondary" fullWidth onClick={onReset}>Done</Button>
    </div>
  )
}

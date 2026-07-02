import { useState } from 'react'
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import {
  runXlmTamperedProofRejection,
  type NetworkKey,
  type WalletIdentity,
  type XlmTamperedProofRejectionReport,
} from '@zk-freighter/core'
import './TamperedProofPanel.css'

const latestEventCount = 8

interface TamperedProofPanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

function resultLabel(report: XlmTamperedProofRejectionReport | null): string {
  if (!report) {
    return 'No rejection run yet.'
  }

  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

export function TamperedProofPanel({ identity, network }: TamperedProofPanelProps) {
  const [report, setReport] = useState<XlmTamperedProofRejectionReport | null>(null)
  const [busy, setBusy] = useState(false)
  const testnetOnly = network !== 'testnet'

  async function runCheck() {
    setBusy(true)
    setReport(await runXlmTamperedProofRejection({ identity, network }))
    setBusy(false)
  }

  return (
    <article className="panel tamper-panel">
      <div className="panel-heading">
        <ShieldAlert size={24} aria-hidden="true" />
        <div>
          <h1>Tampered proof rejection</h1>
          <p>Mutates a real prepared proof before submit and expects testnet rejection.</p>
        </div>
      </div>

      <div className="boundary-note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>This uses a tiny testnet withdraw attempt with a deliberately corrupted proof.</span>
      </div>

      <div className="tamper-actions">
        <button className="button secondary" disabled={busy || testnetOnly} onClick={runCheck}>
          <ShieldAlert size={18} aria-hidden="true" />
          {busy ? 'Checking...' : 'Run rejection check'}
        </button>
        <span>{testnetOnly ? 'Switch to testnet to run.' : resultLabel(report)}</span>
      </div>

      {report ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>Submit reached</dt>
              <dd>{report.submitReached ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Rejection</dt>
              <dd>{report.rejectionObserved ? 'Observed' : 'Not observed'}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{report.amountStroops} stroops</dd>
            </div>
          </dl>

          {report.explorerUrl ? (
            <a className="explorer-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              View rejected transaction
            </a>
          ) : null}

          {report.blockers.length > 0 ? (
            <ul className="blocker-list">
              {report.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          <ul className="artifact-list">
            {report.statusEvents.slice(-latestEventCount).map((event, index) => (
              <li key={`${event.elapsedMs}-${index}`}>
                <strong>{event.source}</strong>
                <span>{event.message}</span>
                <code>{event.elapsedMs.toLocaleString()} ms</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

import { useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Gauge } from 'lucide-react'
import {
  runAspMembershipPreflight,
  runNethermindDryDepositProofAttempt,
  runPolicyTx2x2ProverBenchmark,
  type AspMembershipPreflightReport,
  type DryDepositAttemptReport,
  type NetworkKey,
  type ProverArtifactCheck,
  type ProverBenchmarkReport,
  type WalletIdentity,
} from '@zk-freighter/core'
import { truncateMiddle } from './app-helpers'
import { AspInsertSection } from './AspInsertSection'
import './ProofStatusPanel.css'

const latestStatusEventCount = 6

function statusIcon(report: ProverBenchmarkReport | null) {
  if (!report) {
    return <Gauge size={24} aria-hidden="true" />
  }

  return report.status === 'ready' ? (
    <CheckCircle2 size={24} aria-hidden="true" />
  ) : (
    <AlertTriangle size={24} aria-hidden="true" />
  )
}

interface ProofStatusPanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

function artifactLabel(artifact: ProverArtifactCheck): string {
  const size = artifact.bytes === undefined ? 'not loaded' : `${artifact.bytes.toLocaleString()} bytes`
  return `${artifact.status} · ${size}`
}

function attemptLabel(report: DryDepositAttemptReport): string {
  if (report.status === 'proof-generated') {
    return `proof generation observed · ${report.durationMs.toLocaleString()} ms`
  }

  return `${report.status} before proof · ${report.durationMs.toLocaleString()} ms`
}

function preflightLabel(report: AspMembershipPreflightReport): string {
  return report.status === 'needs-registration'
    ? 'ASP leaf derived; insertion/indexing still required'
    : report.status
}

export function ProofStatusPanel({ identity, network }: ProofStatusPanelProps) {
  const [report, setReport] = useState<ProverBenchmarkReport | null>(null)
  const [attempt, setAttempt] = useState<DryDepositAttemptReport | null>(null)
  const [preflight, setPreflight] = useState<AspMembershipPreflightReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [attemptBusy, setAttemptBusy] = useState(false)
  const [preflightBusy, setPreflightBusy] = useState(false)

  async function runBenchmark() {
    setBusy(true)
    const nextReport = await runPolicyTx2x2ProverBenchmark()
    setReport(nextReport)
    setBusy(false)
  }

  async function runDryProofAttempt() {
    setAttemptBusy(true)
    const nextAttempt = await runNethermindDryDepositProofAttempt({ identity, network })
    setAttempt(nextAttempt)
    setAttemptBusy(false)
  }

  async function runPreflight() {
    setPreflightBusy(true)
    const nextPreflight = await runAspMembershipPreflight({ identity, network })
    setPreflight(nextPreflight)
    setPreflightBusy(false)
  }

  return (
    <article className="panel proof-panel">
      <div className="panel-heading">
        {statusIcon(report)}
        <div>
          <h1>Nethermind prover readiness</h1>
          <p>Checks the real browser/WASM artifact path for `policy_tx_2_2`.</p>
        </div>
      </div>

      <div className="proof-actions">
        <button className="button secondary" disabled={busy} onClick={runBenchmark}>
          <Activity size={18} aria-hidden="true" />
          {busy ? 'Checking...' : 'Run readiness check'}
        </button>
        <span>{report ? `${report.status} · ${report.durationMs} ms` : 'No proof generated in Phase 2.'}</span>
      </div>

      <div className="proof-actions">
        <button className="button secondary" disabled={attemptBusy} onClick={runDryProofAttempt}>
          <Activity size={18} aria-hidden="true" />
          {attemptBusy ? 'Attempting...' : 'Attempt dry deposit proof'}
        </button>
        <span>{attempt ? attemptLabel(attempt) : 'Stops before submission.'}</span>
      </div>

      <div className="proof-actions">
        <button className="button secondary" disabled={preflightBusy} onClick={runPreflight}>
          <Activity size={18} aria-hidden="true" />
          {preflightBusy ? 'Checking...' : 'Check ASP preflight'}
        </button>
        <span>{preflight ? preflightLabel(preflight) : 'No membership transaction is submitted here.'}</span>
      </div>

      <AspInsertSection identity={identity} network={network} />

      {report ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>Runtime</dt>
              <dd>{report.runtime}</dd>
            </div>
            <div>
              <dt>Proof status</dt>
              <dd>{report.proofGenerated ? 'Generated' : 'Not generated'}</dd>
            </div>
            <div>
              <dt>Heap signal</dt>
              <dd>{report.runtimeSignal.usedJsHeapSize?.toLocaleString() ?? 'Unavailable'}</dd>
            </div>
          </dl>

          {report.blockers.length > 0 ? (
            <ul className="blocker-list">
              {report.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          <ul className="artifact-list">
            {report.artifacts.map((artifact) => (
              <li key={artifact.path}>
                <strong>{artifact.kind}</strong>
                <span>{artifactLabel(artifact)}</span>
                {artifact.sha256 ? <code>{truncateMiddle(artifact.sha256, 16, 12)}</code> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {attempt ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>Dry proof status</dt>
              <dd>{attempt.proofGenerated ? 'Proof generation observed; not submitted' : 'Not generated'}</dd>
            </div>
            <div>
              <dt>Submit reached</dt>
              <dd>{attempt.submitReached ? 'Stopped before submit hash' : 'No'}</dd>
            </div>
            <div>
              <dt>Worker keys</dt>
              <dd>{attempt.userKeysStored && attempt.aspSecretStored ? 'Stored' : 'Missing'}</dd>
            </div>
          </dl>

          {attempt.blockers.length > 0 ? (
            <ul className="blocker-list">
              {attempt.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          <ul className="artifact-list">
            {attempt.statusEvents.slice(-latestStatusEventCount).map((event, index) => (
              <li key={`${event.elapsedMs}-${index}`}>
                <strong>{event.flow ?? 'runtime'}</strong>
                <span>{event.message ?? event.step ?? 'status'}</span>
                <code>{event.elapsedMs.toLocaleString()} ms</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>ASP contract</dt>
              <dd>{preflight.contractState?.contractId ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Insert mode</dt>
              <dd>{preflight.canInsertWithoutAdmin ? 'Permissionless' : 'Admin auth required or unknown'}</dd>
            </div>
            <div>
              <dt>Membership proof</dt>
              <dd>{preflight.membershipOnChainVerified ? 'Verified' : 'Not verified by preflight'}</dd>
            </div>
            <div>
              <dt>Transaction</dt>
              <dd>{preflight.transactionSubmitted ? 'Submitted' : 'Not submitted'}</dd>
            </div>
          </dl>

          <ul className="artifact-list">
            <li>
              <strong>ASP leaf</strong>
              <span>{preflight.leaf.membershipLeafDecimal}</span>
              <code>{truncateMiddle(preflight.leaf.membershipLeafHex, 16, 12)}</code>
            </li>
            <li>
              <strong>Runtime match</strong>
              <span>{preflight.referenceLeafMatches ? 'Matches Nethermind' : 'Not confirmed'}</span>
              <code>No proof claim</code>
            </li>
          </ul>

          {preflight.blockers.length > 0 ? (
            <ul className="blocker-list">
              {preflight.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

    </article>
  )
}

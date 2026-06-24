import { useState } from 'react'
import { ClipboardCheck, ExternalLink, FileCheck2 } from 'lucide-react'
import {
  phase8CctpBridgeEvidence,
  phase4UsdcDemoEvidence,
  submissionEvidenceDigest,
  type DemoEvidenceTransaction,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import './DemoEvidencePanel.css'

const hashHeadChars = 12
const hashTailChars = 10
const copyStatusResetMs = 1_800

function txLabel(tx: DemoEvidenceTransaction): string {
  if (tx.ledger === 0) {
    return tx.amount
  }

  return `${tx.amount} · ledger ${tx.ledger}`
}

export function DemoEvidencePanel() {
  const [copied, setCopied] = useState(false)

  async function copyDigest() {
    await navigator.clipboard.writeText(submissionEvidenceDigest())
    setCopied(true)
    window.setTimeout(() => setCopied(false), copyStatusResetMs)
  }

  return (
    <article className="panel demo-evidence-panel">
      <div className="panel-heading">
        <FileCheck2 size={24} aria-hidden="true" />
        <div>
          <h1>Demo proof digest</h1>
          <p>Recorded testnet evidence for the USDC shielded loop and bridge-to-shield path.</p>
        </div>
      </div>

      <div className="evidence-header">
        <dl className="meta-list">
          <div>
            <dt>Recorded</dt>
            <dd>{phase4UsdcDemoEvidence.recordedAtUtc}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{phase4UsdcDemoEvidence.network}</dd>
          </div>
          <div>
            <dt>USDC pool</dt>
            <dd>{truncateMiddle(phase4UsdcDemoEvidence.poolContractId)}</dd>
          </div>
          <div>
            <dt>ASP membership</dt>
            <dd>{truncateMiddle(phase4UsdcDemoEvidence.aspMembershipContractId)}</dd>
          </div>
        </dl>
        <button className="button secondary" onClick={copyDigest}>
          <ClipboardCheck size={18} aria-hidden="true" />
          {copied ? 'Copied' : 'Copy digest'}
        </button>
      </div>

      <ul className="boundary-list">
        {phase4UsdcDemoEvidence.boundaryCopy.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <EvidenceTable label="Recorded USDC transaction evidence" transactions={phase4UsdcDemoEvidence.transactions} />

      <div className="evidence-notes">
        <h2>Verified note results</h2>
        <ul>
          {phase4UsdcDemoEvidence.noteResults.map((result) => (
            <li key={result}>{result}</li>
          ))}
        </ul>
      </div>

      <div className="proof-results">
        <ul className="artifact-list">
          {phase4UsdcDemoEvidence.artifacts.map((artifact) => (
            <li key={artifact.label}>
              <strong>{artifact.label}</strong>
              <span>staged artifact</span>
              <code>{truncateMiddle(artifact.value, 16, 12)}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="evidence-notes">
        <h2>CCTP bridge acceptance</h2>
        <ul>
          {phase8CctpBridgeEvidence.boundaryCopy.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <EvidenceTable label="Recorded CCTP bridge evidence" transactions={phase8CctpBridgeEvidence.transactions} />

      <div className="proof-results">
        <ul className="artifact-list">
          {phase8CctpBridgeEvidence.artifacts.map((artifact) => (
            <li key={artifact.label}>
              <strong>{artifact.label}</strong>
              <span>bridge artifact</span>
              <code>{truncateMiddle(artifact.value, 16, 12)}</code>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function EvidenceTable({
  label,
  transactions,
}: {
  readonly label: string
  readonly transactions: readonly DemoEvidenceTransaction[]
}) {
  return (
    <div className="evidence-table" role="table" aria-label={label}>
      <div className="evidence-row evidence-row-head" role="row">
        <span role="columnheader">Step</span>
        <span role="columnheader">Evidence</span>
        <span role="columnheader">Explorer</span>
      </div>
      {transactions.map((tx) => (
        <div className="evidence-row" role="row" key={tx.txHash}>
          <span role="cell">
            <strong>{tx.title}</strong>
            <small>{tx.createdAtUtc}</small>
          </span>
          <span role="cell">
            <span>{txLabel(tx)}</span>
            <code>{truncateMiddle(tx.txHash, hashHeadChars, hashTailChars)}</code>
          </span>
          <span role="cell">
            <a className="explorer-link" href={tx.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              Open
            </a>
          </span>
        </div>
      ))}
    </div>
  )
}

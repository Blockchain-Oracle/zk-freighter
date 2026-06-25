import { CheckCircle2, ExternalLink } from 'lucide-react'
import type { CctpBridgeReport } from '@zk-fighter/core'

const latestBridgeEventCount = 8

interface BridgeResultDetailsProps {
  readonly report: CctpBridgeReport
}

export function BridgeResultDetails({ report }: BridgeResultDetailsProps) {
  return (
    <div className="bridge-results">
      <div className="bridge-timeline">
        <span className={report.evmApproveTxHash ? 'complete' : ''}>{report.sourceChain} approval</span>
        <span className={report.evmBurnTxHash ? 'complete' : ''}>{report.sourceChain} burn</span>
        <span className={report.attestationStatus === 'complete' ? 'complete' : ''}>Circle attestation</span>
        <span className={report.stellarMintTxHash ? 'complete' : ''}>Stellar mint</span>
      </div>

      <div className="bridge-links">
        {report.evmApproveExplorerUrl ? <ExplorerLink href={report.evmApproveExplorerUrl} label="View approval" /> : null}
        {report.evmBurnExplorerUrl ? <ExplorerLink href={report.evmBurnExplorerUrl} label="View burn" /> : null}
        {report.stellarMintExplorerUrl ? <ExplorerLink href={report.stellarMintExplorerUrl} label="View Stellar mint" /> : null}
      </div>

      {report.blockers.length > 0 ? (
        <ul className="blocker-list">
          {report.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}

      <ul className="artifact-list">
        {report.statusEvents.slice(-latestBridgeEventCount).map((event, index) => (
          <li key={`${event.stage}-${event.elapsedMs}-${index}`}>
            <strong>{event.stage}</strong>
            <span>{event.message}</span>
            <code>{event.elapsedMs.toLocaleString()} ms</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ExplorerLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <a className="explorer-link" href={href} target="_blank" rel="noreferrer">
      <ExternalLink size={16} aria-hidden="true" />
      {label}
      <CheckCircle2 size={16} aria-hidden="true" />
    </a>
  )
}

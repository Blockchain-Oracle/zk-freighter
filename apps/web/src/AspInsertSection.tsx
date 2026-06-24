import { useState } from 'react'
import { Activity, ExternalLink } from 'lucide-react'
import {
  insertAspMembershipLeaf,
  type AspMembershipInsertReport,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'

const latestStatusEventCount = 6

interface AspInsertSectionProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

function insertLabel(report: AspMembershipInsertReport | null): string {
  if (!report) {
    return 'No ASP membership transaction submitted.'
  }
  return report.status === 'submitted'
    ? `Submitted · ${truncateMiddle(report.txHash ?? '', 12, 10)}`
    : `${report.status} · ${report.blockers[0] ?? 'see details'}`
}

export function AspInsertSection({ identity, network }: AspInsertSectionProps) {
  const [insertReport, setInsertReport] = useState<AspMembershipInsertReport | null>(null)
  const [insertBusy, setInsertBusy] = useState(false)

  async function runInsert() {
    setInsertBusy(true)
    const nextInsert = await insertAspMembershipLeaf({ identity, network })
    setInsertReport(nextInsert)
    setInsertBusy(false)
  }

  return (
    <>
      <div className="proof-actions">
        <button className="button secondary" disabled={insertBusy} onClick={runInsert}>
          <Activity size={18} aria-hidden="true" />
          {insertBusy ? 'Inserting...' : 'Insert ASP leaf'}
        </button>
        <span>{insertLabel(insertReport)}</span>
      </div>

      {insertReport ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>ASP contract</dt>
              <dd>{insertReport.contractId ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Transaction</dt>
              <dd>{insertReport.txHash ? truncateMiddle(insertReport.txHash, 12, 10) : 'Not submitted'}</dd>
            </div>
          </dl>

          {insertReport.explorerUrl ? (
            <a className="explorer-link" href={insertReport.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              View ASP insert
            </a>
          ) : null}

          {insertReport.blockers.length > 0 ? (
            <ul className="blocker-list">
              {insertReport.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          <ul className="artifact-list">
            {insertReport.statusEvents.slice(-latestStatusEventCount).map((event, index) => (
              <li key={`${event.elapsedMs}-${index}`}>
                <strong>{event.stage}</strong>
                <span>{event.message}</span>
                <code>{event.elapsedMs.toLocaleString()} ms</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

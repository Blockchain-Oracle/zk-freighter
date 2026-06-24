import { useState } from 'react'
import { AlertTriangle, ExternalLink, Shield } from 'lucide-react'
import {
  submitXlmShieldDeposit,
  type AssetCode,
  type NetworkKey,
  type WalletIdentity,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import './ShieldSubmitPanel.css'

const rawUnitsPerDisplayUnit = 10_000_000
const defaultShieldAmounts = { XLM: 1_000_000n, USDC: 10_000_000n } as const satisfies Record<AssetCode, bigint>
const latestEventCount = 8

interface ShieldSubmitPanelProps {
  readonly asset?: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

function amountLabel(rawUnits: string, asset: AssetCode): string {
  const value = Number(rawUnits) / rawUnitsPerDisplayUnit
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${asset}`
}

function reportLabel(report: XlmShieldSubmitReport | null): string {
  if (!report) {
    return 'No shield transaction submitted.'
  }

  if (report.status === 'submitted') {
    return `Submitted · ${truncateMiddle(report.txHash ?? '', 12, 10)}`
  }

  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

export function ShieldSubmitPanel({ asset = 'XLM', identity, network }: ShieldSubmitPanelProps) {
  const [report, setReport] = useState<XlmShieldSubmitReport | null>(null)
  const [busy, setBusy] = useState(false)
  const testnetOnly = network !== 'testnet'

  async function runShield() {
    setBusy(true)
    const nextReport = await submitXlmShieldDeposit({
      asset,
      identity,
      network,
      amountStroops: defaultShieldAmounts[asset],
    })
    setReport(nextReport)
    setBusy(false)
  }

  return (
    <article className="panel shield-panel">
      <div className="panel-heading">
        <Shield size={24} aria-hidden="true" />
        <div>
          <h1>Real {asset} shield</h1>
          <p>Submits a public testnet deposit into the deployed {asset} pool.</p>
        </div>
      </div>

      <div className="boundary-note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          Shielding is a public deposit. Your public Stellar account, the amount, and the pool
          transaction are visible on-chain.
        </span>
      </div>

      <div className="shield-actions">
        <button className="button primary" disabled={busy || testnetOnly} onClick={runShield}>
          <Shield size={18} aria-hidden="true" />
          {busy ? 'Shielding...' : `Submit ${amountLabel(defaultShieldAmounts[asset].toString(), asset)} shield`}
        </button>
        <span>{testnetOnly ? 'Switch to testnet to submit.' : reportLabel(report)}</span>
      </div>

      {report ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>Pool</dt>
              <dd>{report.poolContractId ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{amountLabel(report.amountStroops, asset)}</dd>
            </div>
            <div>
              <dt>Proof</dt>
              <dd>{report.proofGenerated ? 'Generated' : 'Not generated'}</dd>
            </div>
            <div>
              <dt>Transaction</dt>
              <dd>{report.transactionSubmitted ? 'Confirmed' : 'Not submitted'}</dd>
            </div>
          </dl>

          {report.explorerUrl ? (
            <a className="explorer-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              View public testnet deposit
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

import type {
  AspMembershipInsertReport,
  AssetCode,
  StellarUsdcTrustlineReport,
  XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { isShieldedAssetEnabled } from '@zk-fighter/core'
import { Activity, AlertTriangle, ExternalLink, Shield } from 'lucide-react'
import { useState } from 'react'

import {
  dappMessageTypes,
  type DappWalletStatus,
  type PrepareShieldAccessResponse,
  type PrepareUsdcReceiveResponse,
  type QuickShieldResponse,
} from './dappMessages'
import { amountLabel, defaultShieldAmounts, shorten } from './extension-format'

const latestEventCount = 6

interface ExtensionQuickShieldPanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionQuickShieldPanel({ status, sendRuntimeMessage }: ExtensionQuickShieldPanelProps) {
  const [asset, setAsset] = useState<AssetCode>('XLM')
  const [busy, setBusy] = useState(false)
  const [accessBusy, setAccessBusy] = useState(false)
  const [usdcBusy, setUsdcBusy] = useState(false)
  const [report, setReport] = useState<XlmShieldSubmitReport | null>(null)
  const [accessReport, setAccessReport] = useState<AspMembershipInsertReport | null>(null)
  const [usdcReport, setUsdcReport] = useState<StellarUsdcTrustlineReport | null>(null)
  const [error, setError] = useState('')
  const poolEnabled = status ? isShieldedAssetEnabled(status.network, asset) : false
  const disabledReason = !status?.unlocked
    ? 'Unlock the extension vault first.'
    : !poolEnabled
      ? `${asset} pool is not configured for this network.`
      : ''

  async function prepareShieldAccess() {
    setAccessBusy(true)
    setError('')
    setAccessReport(null)
    try {
      const response = (await sendRuntimeMessage({
        type: dappMessageTypes.prepareShieldAccess,
      })) as PrepareShieldAccessResponse
      if (!response.ok || !response.report) {
        setError(response.error ?? 'Shield access setup did not return a report.')
      } else {
        setAccessReport(response.report)
      }
    } finally {
      setAccessBusy(false)
    }
  }

  async function prepareUsdcReceive() {
    setUsdcBusy(true)
    setError('')
    setUsdcReport(null)
    try {
      const response = (await sendRuntimeMessage({
        type: dappMessageTypes.prepareUsdcReceive,
      })) as PrepareUsdcReceiveResponse
      if (!response.ok || !response.report) {
        setError(response.error ?? 'USDC receive preparation did not return a report.')
      } else {
        setUsdcReport(response.report)
      }
    } finally {
      setUsdcBusy(false)
    }
  }

  async function runQuickShield() {
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const response = (await sendRuntimeMessage({
        type: dappMessageTypes.quickShield,
        asset,
        amountStroops: defaultShieldAmounts[asset].toString(),
      })) as QuickShieldResponse
      if (!response.ok || !response.report) {
        setError(response.error ?? 'QuickShield did not return a report.')
      } else {
        setReport(response.report)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="quickshield-heading">
      <div className="section-header">
        <h2 id="quickshield-heading">QuickShield</h2>
        <span className="badge badge-in-progress">{status?.network ?? 'locked'}</span>
      </div>
      <div className="boundary-note">
        <AlertTriangle size={16} aria-hidden="true" />
        <span>Shield/deposit is public. Privacy starts after funds enter the shielded pool.</span>
      </div>
      <button type="button" disabled={Boolean(disabledReason) || accessBusy || busy} onClick={prepareShieldAccess}>
        <Activity size={16} aria-hidden="true" />
        {accessBusy ? 'Preparing...' : 'Prepare shield access'}
      </button>
      <p className="copy">{disabledReason || accessReportLabel(accessReport)}</p>
      {accessReport ? <AccessReport report={accessReport} /> : null}
      {asset === 'USDC' ? (
        <>
          <button
            type="button"
            disabled={Boolean(disabledReason) || accessBusy || busy || usdcBusy}
            onClick={prepareUsdcReceive}
          >
            <Activity size={16} aria-hidden="true" />
            {usdcBusy ? 'Preparing USDC...' : 'Prepare USDC receive'}
          </button>
          <p className="copy">{disabledReason || usdcReportLabel(usdcReport)}</p>
          {usdcReport ? <UsdcReport report={usdcReport} /> : null}
        </>
      ) : null}
      <div className="segmented">
        {(['XLM', 'USDC'] as const).map((item) => (
          <button
            type="button"
            className={asset === item ? '' : 'ghost'}
            key={item}
            onClick={() => setAsset(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <button type="button" disabled={Boolean(disabledReason) || busy} onClick={runQuickShield}>
        <Shield size={16} aria-hidden="true" />
        {busy ? 'Shielding...' : `Shield ${amountLabel(defaultShieldAmounts[asset], asset)}`}
      </button>
      <p className="copy">{disabledReason || reportLabel(report, asset)}</p>
      {error ? <p className="error">{error}</p> : null}
      {report ? <ShieldReport report={report} asset={asset} /> : null}
    </section>
  )
}

function AccessReport({ report }: { readonly report: AspMembershipInsertReport }) {
  return (
    <div className="proof-results">
      <dl className="meta-list">
        <div>
          <dt>ASP setup</dt>
          <dd>{report.status}</dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd>{report.txHash ? shorten(report.txHash, 10, 8) : 'Not submitted'}</dd>
        </div>
      </dl>
      {report.explorerUrl ? (
        <a className="explorer-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> View public setup
        </a>
      ) : null}
      {report.blockers.length > 0 ? (
        <ul className="blocker-list">
          {report.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function UsdcReport({ report }: { readonly report: StellarUsdcTrustlineReport }) {
  return (
    <div className="proof-results">
      <dl className="meta-list">
        <div>
          <dt>USDC receive</dt>
          <dd>{report.status}</dd>
        </div>
        <div>
          <dt>Public account</dt>
          <dd>{shorten(report.userAddress, 8, 8)}</dd>
        </div>
      </dl>
      {report.explorerUrl ? (
        <a className="explorer-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> View trustline setup
        </a>
      ) : null}
    </div>
  )
}

function ShieldReport({ report, asset }: { readonly report: XlmShieldSubmitReport; readonly asset: AssetCode }) {
  return (
    <div className="proof-results">
      <dl className="meta-list">
        <div>
          <dt>Pool</dt>
          <dd>{report.poolContractId ? shorten(report.poolContractId, 10, 8) : 'Unavailable'}</dd>
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
          <ExternalLink size={14} aria-hidden="true" /> View public deposit
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
          </li>
        ))}
      </ul>
      <p className="copy">Amount: {amountLabel(report.amountStroops, asset)}</p>
    </div>
  )
}

function accessReportLabel(report: AspMembershipInsertReport | null): string {
  if (!report) {
    return 'Run once before the first shield if the pool needs a public setup transaction.'
  }
  if (report.status === 'submitted') {
    return `Prepared ${shorten(report.txHash ?? '', 12, 10)}`
  }
  return `${report.status} after ${report.statusEvents.at(-1)?.elapsedMs.toLocaleString() ?? '0'} ms`
}

function usdcReportLabel(report: StellarUsdcTrustlineReport | null): string {
  if (!report) {
    return 'Creates the public USDC trustline. Fund the public Stellar address before shielding USDC.'
  }
  if (report.status === 'created') {
    return `USDC trustline created ${shorten(report.txHash ?? '', 12, 10)}`
  }
  return 'USDC trustline ready. Fund the public address before shielding.'
}

function reportLabel(report: XlmShieldSubmitReport | null, asset: AssetCode): string {
  if (!report) {
    return `Runs the same ${asset} shield path as the web app through the extension offscreen runtime.`
  }
  if (report.status === 'submitted') {
    return `Submitted ${shorten(report.txHash ?? '', 12, 10)}`
  }
  return `${report.status} after ${report.durationMs.toLocaleString()} ms`
}

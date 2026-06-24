import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, CheckCircle2, ExternalLink, RotateCcw, Shield, Wallet } from 'lucide-react'
import {
  getCctpBridgeBlockers,
  getNetworkConfig,
  resumeCctpBridgeToStellar,
  runCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type CctpBridgeReport,
  type NetworkKey,
  type WalletIdentity,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import { bridgeHandoffNotice, bridgeResumeBurnHashFromUrl } from './bridge-handoff'
import { loadBridgeResumeBurnHash, loadCompletedBridgeResumeReport, saveBridgeResumeReport } from './bridge-storage'
import { createInjectedEthereumClient, providerAvailable } from './ethereum-provider'
import './BridgePanel.css'

const bridgedUsdcShieldAmount = 10_000_000n
const latestBridgeEventCount = 8
const ethereumDetectionDelayMs = 500
const ethereumDetectionIntervalMs = 1_000

interface BridgePanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

function reportLabel(report: CctpBridgeReport | null): string {
  if (!report) {
    return 'No bridge transaction submitted.'
  }
  if (report.status === 'completed') {
    return `Arrived publicly on Stellar · ${truncateMiddle(report.stellarMintTxHash ?? '', 12, 10)}`
  }
  if (report.status === 'running') {
    return `Running · ${report.statusEvents.at(-1)?.message ?? 'bridge in progress'}`
  }
  return `${report.status} · ${report.blockers[0] ?? 'see details'}`
}

function shieldLabel(report: XlmShieldSubmitReport | null): string {
  if (!report) {
    return 'Shield step not run.'
  }
  if (report.status === 'submitted') {
    return `Shield submitted · ${truncateMiddle(report.txHash ?? '', 12, 10)}`
  }
  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

export function BridgePanel({ identity, network }: BridgePanelProps) {
  const [bridgeReport, setBridgeReport] = useState<CctpBridgeReport | null>(() =>
    loadCompletedBridgeResumeReport(network, identity.stellarPublicKey),
  )
  const [shieldReport, setShieldReport] = useState<XlmShieldSubmitReport | null>(null)
  const [resumeBurnHash, setResumeBurnHash] = useState(() =>
    bridgeResumeBurnHashFromUrl(network, identity.stellarPublicKey) ??
    loadBridgeResumeBurnHash(network, identity.stellarPublicKey),
  )
  const [busy, setBusy] = useState<'bridge' | 'shield' | null>(null)
  const [ethereumDetected, setEthereumDetected] = useState(false)
  const [walletApprovalPending, setWalletApprovalPending] = useState(false)
  const [error, setError] = useState('')
  const config = getNetworkConfig(network)
  const bridgeBlockers = useMemo(() => getCctpBridgeBlockers(network), [network])
  const evmSource = config.cctp?.evmSource
  const browserProviderMissing = !ethereumDetected
  const disabledReason = bridgeBlockers[0] ?? (browserProviderMissing ? 'No injected Ethereum wallet detected.' : '')
  const canBridge = !disabledReason && busy === null && Boolean(evmSource)
  const hasLoadedCompletedBurn =
    bridgeReport?.status === 'completed' && bridgeReport.evmBurnTxHash === resumeBurnHash.trim()
  const canResume = bridgeBlockers.length === 0 && busy === null && resumeBurnHash.trim().length > 0 && !hasLoadedCompletedBurn
  const canShield = bridgeReport?.status === 'completed' && busy === null
  const bridgeStatus = walletApprovalPending ? 'Waiting for Ethereum wallet approval...' : reportLabel(bridgeReport)
  const handoffNotice = bridgeHandoffNotice(network, identity.stellarPublicKey)

  useEffect(() => {
    const update = () => setEthereumDetected(providerAvailable())
    update()
    const timer = window.setTimeout(update, ethereumDetectionDelayMs)
    const interval = window.setInterval(update, ethereumDetectionIntervalMs)
    window.addEventListener('ethereum#initialized', update, { once: true })
    window.addEventListener('eip6963:announceProvider', update)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
      window.removeEventListener('ethereum#initialized', update)
      window.removeEventListener('eip6963:announceProvider', update)
    }
  }, [])

  function updateBridgeReport(report: CctpBridgeReport) {
    setBridgeReport(report)
    saveBridgeResumeReport(report)
    if (report.evmBurnTxHash) {
      setResumeBurnHash(report.evmBurnTxHash)
    }
  }

  async function runBridge() {
    if (!evmSource) {
      return
    }
    setBusy('bridge')
    setWalletApprovalPending(true)
    setError('')
    setShieldReport(null)
    setBridgeReport(null)
    try {
      const evmClient = await createInjectedEthereumClient(evmSource.chainIdHex)
      setWalletApprovalPending(false)
      updateBridgeReport(await runCctpBridgeToStellar({ identity, network, evmClient, onProgress: updateBridgeReport }))
    } catch (nextError) {
      setWalletApprovalPending(false)
      setError(nextError instanceof Error ? nextError.message : 'Bridge failed before submission.')
    } finally {
      setBusy(null)
    }
  }

  async function resumeBridge() {
    setBusy('bridge')
    setError('')
    setShieldReport(null)
    try {
      updateBridgeReport(
        await resumeCctpBridgeToStellar({
          identity,
          network,
          evmBurnTxHash: resumeBurnHash,
          evmApproveTxHash: bridgeReport?.evmApproveTxHash,
          onProgress: updateBridgeReport,
        }),
      )
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Bridge resume failed.')
    } finally {
      setBusy(null)
    }
  }

  async function runShield() {
    setBusy('shield')
    setError('')
    try {
      setShieldReport(
        await submitXlmShieldDeposit({
          asset: 'USDC',
          identity,
          network,
          amountStroops: bridgedUsdcShieldAmount,
        }),
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="panel bridge-panel">
      <div className="panel-heading">
        <ArrowLeftRight size={24} aria-hidden="true" />
        <div>
          <h1>USDC bridge then shield</h1>
          <p>Burn on Ethereum, mint public USDC on Stellar, then shield as a separate step.</p>
        </div>
      </div>

      <div className="boundary-note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          The bridge leg is public. Ethereum burn, Circle attestation, and Stellar mint are visible before shielding.
        </span>
      </div>

      {handoffNotice ? (
        <div className="boundary-note">
          <ExternalLink size={18} aria-hidden="true" />
          <span>{handoffNotice}</span>
        </div>
      ) : null}

      <div className="bridge-actions">
        <button className="button primary" disabled={!canBridge} onClick={runBridge}>
          <Wallet size={18} aria-hidden="true" />
          {busy === 'bridge' ? 'Bridging...' : 'Start 1 USDC bridge'}
        </button>
        <span>{disabledReason || bridgeStatus}</span>
      </div>

      <dl className="meta-list bridge-meta">
        <div>
          <dt>Source</dt>
          <dd>{evmSource?.label ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{config.label}</dd>
        </div>
        <div>
          <dt>Circle Iris</dt>
          <dd>{config.cctp?.irisUrl ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Stellar forwarder</dt>
          <dd>{truncateMiddle(config.cctp?.cctpForwarder ?? 'Unavailable')}</dd>
        </div>
      </dl>

      <div className="bridge-resume">
        <label className="field">
          <span>Resume burn hash</span>
          <input value={resumeBurnHash} onChange={(event) => setResumeBurnHash(event.target.value)} />
        </label>
        <button className="button secondary" disabled={!canResume} onClick={resumeBridge}>
          <RotateCcw size={18} aria-hidden="true" />
          {busy === 'bridge' ? 'Resuming...' : 'Resume mint'}
        </button>
      </div>

      {bridgeReport ? (
        <div className="bridge-results">
          <div className="bridge-timeline">
            <span className={bridgeReport.evmApproveTxHash ? 'complete' : ''}>Ethereum approval</span>
            <span className={bridgeReport.evmBurnTxHash ? 'complete' : ''}>Ethereum burn</span>
            <span className={bridgeReport.attestationStatus === 'complete' ? 'complete' : ''}>Circle attestation</span>
            <span className={bridgeReport.stellarMintTxHash ? 'complete' : ''}>Stellar mint</span>
          </div>

          <div className="bridge-links">
            {bridgeReport.evmApproveExplorerUrl ? (
              <ExplorerLink href={bridgeReport.evmApproveExplorerUrl} label="View approval" />
            ) : null}
            {bridgeReport.evmBurnExplorerUrl ? <ExplorerLink href={bridgeReport.evmBurnExplorerUrl} label="View burn" /> : null}
            {bridgeReport.stellarMintExplorerUrl ? (
              <ExplorerLink href={bridgeReport.stellarMintExplorerUrl} label="View Stellar mint" />
            ) : null}
          </div>

          {bridgeReport.blockers.length > 0 ? (
            <ul className="blocker-list">
              {bridgeReport.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          <ul className="artifact-list">
            {bridgeReport.statusEvents.slice(-latestBridgeEventCount).map((event, index) => (
              <li key={`${event.stage}-${event.elapsedMs}-${index}`}>
                <strong>{event.stage}</strong>
                <span>{event.message}</span>
                <code>{event.elapsedMs.toLocaleString()} ms</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bridge-actions">
        <button className="button secondary" disabled={!canShield} onClick={runShield}>
          <Shield size={18} aria-hidden="true" />
          {busy === 'shield' ? 'Shielding...' : 'Shield arrived USDC'}
        </button>
        <span>{bridgeReport?.shieldPrompt ? shieldLabel(shieldReport) : 'Enabled after public USDC arrives.'}</span>
      </div>

      {shieldReport?.explorerUrl ? <ExplorerLink href={shieldReport.explorerUrl} label="View shield deposit" /> : null}
      {shieldReport?.blockers.length ? (
        <ul className="blocker-list">
          {shieldReport.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="bridge-error">{error}</p> : null}
    </article>
  )
}

function ExplorerLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <a className="explorer-link" href={href} target="_blank" rel="noreferrer">
      <ExternalLink size={16} aria-hidden="true" />
      {label}
      <CheckCircle2 size={16} aria-hidden="true" />
    </a>
  )
}

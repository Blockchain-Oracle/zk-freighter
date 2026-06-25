import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, ExternalLink, RotateCcw, Shield, Wallet } from 'lucide-react'
import {
  getCctpSource,
  getCctpBridgeBlockers,
  getDefaultCctpSource,
  getEnabledCctpSources,
  getNetworkConfig,
  resumeCctpBridgeToStellar,
  runCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type CctpBridgeReport,
  type CctpSourceKey,
  type NetworkKey,
  type WalletIdentity,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import { bridgeHandoffNotice, bridgeResumeBurnHashFromUrl, bridgeSourceChainFromUrl } from './bridge-handoff'
import {
  loadBridgeResumeBurnHash,
  loadBridgeResumeSourceChain,
  loadCompletedBridgeResumeReport,
  saveBridgeResumeReport,
} from './bridge-storage'
import { BridgeSourceSelector } from './BridgeSourceSelector'
import { BridgeResultDetails, ExplorerLink } from './BridgeResultDetails'
import { createInjectedEthereumClient, providerAvailable } from './ethereum-provider'
import './BridgePanel.css'

const bridgedUsdcShieldAmount = 10_000_000n
const ethereumDetectionDelayMs = 500
const ethereumDetectionIntervalMs = 1_000
const fallbackCctpSource: CctpSourceKey = 'base'

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

function initialBridgeSource(network: NetworkKey, publicKey: string): CctpSourceKey {
  return (
    bridgeSourceChainFromUrl(network, publicKey) ??
    loadBridgeResumeSourceChain(network, publicKey) ??
    getDefaultCctpSource(network)?.key ??
    fallbackCctpSource
  )
}

export function BridgePanel({ identity, network }: BridgePanelProps) {
  const initialSourceKey = initialBridgeSource(network, identity.stellarPublicKey)
  const [sourceChainKey, setSourceChainKey] = useState<CctpSourceKey>(initialSourceKey)
  const [bridgeReport, setBridgeReport] = useState<CctpBridgeReport | null>(() =>
    loadCompletedBridgeResumeReport(network, identity.stellarPublicKey, initialSourceKey),
  )
  const [shieldReport, setShieldReport] = useState<XlmShieldSubmitReport | null>(null)
  const [resumeBurnHash, setResumeBurnHash] = useState(() =>
    bridgeResumeBurnHashFromUrl(network, identity.stellarPublicKey) ??
    loadBridgeResumeBurnHash(network, identity.stellarPublicKey, initialSourceKey),
  )
  const [busy, setBusy] = useState<'bridge' | 'shield' | null>(null)
  const [ethereumDetected, setEthereumDetected] = useState(false)
  const [walletApprovalPending, setWalletApprovalPending] = useState(false)
  const [error, setError] = useState('')
  const config = getNetworkConfig(network)
  const bridgeSources = useMemo(() => getEnabledCctpSources(network), [network])
  const evmSource = getCctpSource(network, sourceChainKey)
  const bridgeBlockers = useMemo(() => getCctpBridgeBlockers(network, sourceChainKey), [network, sourceChainKey])
  const browserProviderMissing = !ethereumDetected
  const disabledReason = bridgeBlockers[0] ?? (browserProviderMissing ? 'No injected EVM wallet detected.' : '')
  const canBridge = !disabledReason && busy === null && Boolean(evmSource)
  const hasLoadedCompletedBurn =
    bridgeReport?.status === 'completed' &&
    bridgeReport.sourceChainKey === sourceChainKey &&
    bridgeReport.evmBurnTxHash === resumeBurnHash.trim()
  const canResume =
    bridgeBlockers.length === 0 && busy === null && resumeBurnHash.trim().length > 0 && !hasLoadedCompletedBurn
  const canShield = bridgeReport?.status === 'completed' && busy === null
  const sourceLabel = evmSource?.label ?? 'source chain'
  const bridgeStatus = walletApprovalPending ? `Waiting for ${sourceLabel} wallet approval...` : reportLabel(bridgeReport)
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

  function selectSource(nextSourceKey: CctpSourceKey) {
    setSourceChainKey(nextSourceKey)
    setBridgeReport(loadCompletedBridgeResumeReport(network, identity.stellarPublicKey, nextSourceKey))
    setResumeBurnHash(loadBridgeResumeBurnHash(network, identity.stellarPublicKey, nextSourceKey))
    setShieldReport(null)
    setError('')
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
      const evmClient = await createInjectedEthereumClient(evmSource.chainIdHex, evmSource.label)
      setWalletApprovalPending(false)
      updateBridgeReport(
        await runCctpBridgeToStellar({
          identity,
          network,
          sourceChainKey: evmSource.key,
          evmClient,
          onProgress: updateBridgeReport,
        }),
      )
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
          sourceChainKey,
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
          <p>Burn public USDC on a CCTP source chain, mint public USDC on Stellar, then shield separately.</p>
        </div>
      </div>

      <div className="boundary-note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          The bridge leg is public. Source-chain burn, Circle attestation, and Stellar mint are visible before shielding.
        </span>
      </div>

      {handoffNotice ? (
        <div className="boundary-note">
          <ExternalLink size={18} aria-hidden="true" />
          <span>{handoffNotice}</span>
        </div>
      ) : null}

      <BridgeSourceSelector
        sources={bridgeSources}
        selectedKey={sourceChainKey}
        disabled={busy !== null || Boolean(bridgeReport?.evmBurnTxHash && bridgeReport.status === 'running')}
        onSelect={selectSource}
      />

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
          <dd>{evmSource ? `${evmSource.label} · ${evmSource.gasToken}` : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Source domain</dt>
          <dd>{evmSource ? `${evmSource.domain} · chain ${evmSource.chainId}` : 'Unavailable'}</dd>
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

      {bridgeReport ? <BridgeResultDetails report={bridgeReport} /> : null}

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

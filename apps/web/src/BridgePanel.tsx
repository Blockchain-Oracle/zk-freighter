import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, ExternalLink, RotateCcw, Shield, Wallet } from 'lucide-react'
import {
  ensureStellarUsdcTrustline,
  getCctpSource,
  getCctpBridgeBlockers,
  getEnabledCctpSources,
  getNetworkConfig,
  resumeCctpBridgeToStellar,
  runCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type CctpBridgeReport,
  type CctpSourceKey,
  type NetworkKey,
  type StellarUsdcTrustlineReport,
  type WalletIdentity,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import { bridgeHandoffNotice } from './bridge-handoff'
import {
  loadBridgeResumeBurnHash,
  loadCompletedBridgeResumeReport,
  saveBridgeResumeReport,
} from './bridge-storage'
import { BridgeReceiveSetupStatus } from './BridgeReceiveSetupStatus'
import { BridgeSourceSelector } from './BridgeSourceSelector'
import { BridgeResultDetails, ExplorerLink } from './BridgeResultDetails'
import { runBridgeAfterDestinationSetup } from './bridgePanelActions'
import { initialBridgeBurnHash, initialBridgeSource, reportLabel, shieldLabel } from './bridgePanelHelpers'
import { createInjectedEthereumClient } from './ethereum-provider'
import { usdcReceiveErrorText } from './usdcReceiveSetupCopy'
import { useEthereumDetected } from './useEthereumDetected'
import './BridgePanel.css'

const bridgedUsdcShieldAmount = 10_000_000n

interface BridgePanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

export function BridgePanel({ identity, network }: BridgePanelProps) {
  const initialSourceKey = initialBridgeSource(network, identity.stellarPublicKey)
  const [sourceChainKey, setSourceChainKey] = useState<CctpSourceKey>(initialSourceKey)
  const [bridgeReport, setBridgeReport] = useState<CctpBridgeReport | null>(() =>
    loadCompletedBridgeResumeReport(network, identity.stellarPublicKey, initialSourceKey),
  )
  const [shieldReport, setShieldReport] = useState<XlmShieldSubmitReport | null>(null)
  const [usdcReceiveReport, setUsdcReceiveReport] = useState<StellarUsdcTrustlineReport | null>(null)
  const [resumeBurnHash, setResumeBurnHash] = useState(() =>
    initialBridgeBurnHash(network, identity.stellarPublicKey, initialSourceKey),
  )
  const ethereumDetected = useEthereumDetected()
  const [busy, setBusy] = useState<'bridge' | 'shield' | null>(null)
  const [walletApprovalPending, setWalletApprovalPending] = useState(false)
  const [bridgePrepStatus, setBridgePrepStatus] = useState('')
  const [error, setError] = useState('')
  const bridgeRunRef = useRef(0)
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
  const bridgeStatus = walletApprovalPending
    ? `Waiting for ${sourceLabel} wallet approval...`
    : bridgePrepStatus || reportLabel(bridgeReport)
  const handoffNotice = bridgeHandoffNotice(network, identity.stellarPublicKey)

  useEffect(() => () => {
    bridgeRunRef.current += 1
  }, [])

  function updateBridgeReport(report: CctpBridgeReport) {
    setBridgePrepStatus('')
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
    setUsdcReceiveReport(null)
    setBridgePrepStatus('')
    setError('')
  }

  async function runBridge() {
    if (!evmSource) {
      return
    }
    setBusy('bridge')
    setWalletApprovalPending(false)
    setError('')
    setShieldReport(null)
    setBridgeReport(null)
    setUsdcReceiveReport(null)
    setBridgePrepStatus('Preparing Stellar USDC receiving...')
    let destinationReady = false
    const runId = bridgeRunRef.current + 1
    bridgeRunRef.current = runId
    const isCurrentRun = () => bridgeRunRef.current === runId
    try {
      updateBridgeReport(
        await runBridgeAfterDestinationSetup({
          identity,
          network,
          evmSource,
          ensureDestinationReady: ensureStellarUsdcTrustline,
          createEvmClient: createInjectedEthereumClient,
          runBridge: runCctpBridgeToStellar,
          shouldContinue: isCurrentRun,
          onDestinationReady: (receiveReport) => {
            destinationReady = true
            setUsdcReceiveReport(receiveReport)
            setBridgePrepStatus('Stellar USDC receiving ready.')
          },
          onWalletApprovalPending: (pending) => {
            if (isCurrentRun()) {
              setWalletApprovalPending(pending)
            }
          },
          onProgress: (report) => {
            if (isCurrentRun()) {
              updateBridgeReport(report)
            }
          },
        }),
      )
    } catch (nextError) {
      if (!isCurrentRun()) {
        return
      }
      setWalletApprovalPending(false)
      setBridgePrepStatus('')
      setError(
        destinationReady
          ? nextError instanceof Error ? nextError.message : 'Bridge failed before submission.'
          : usdcReceiveErrorText(nextError),
      )
    } finally {
      if (isCurrentRun()) {
        setBusy(null)
      }
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
      <BridgeReceiveSetupStatus report={usdcReceiveReport} />

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

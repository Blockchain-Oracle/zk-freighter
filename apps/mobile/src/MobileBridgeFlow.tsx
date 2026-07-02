import { useEffect, useRef, useState } from 'react'
import {
  createSeedEvmClient,
  deriveEvmAddress,
  ensureStellarUsdcTrustline,
  getCctpBridgeBlockers,
  getCctpSource,
  getDefaultCctpSource,
  getEnabledCctpSources,
  loadEvmBalances,
  resumeCctpBridgeToStellar,
  runCctpBridgeToStellar,
  type CctpBridgeReport,
  type EvmCctpSourceConfig,
  type CctpSourceKey,
  type EvmBalances,
} from '@zk-fighter/core'
import { Button } from '@zk-fighter/ui'
import type { FlowProps } from './MobileFlowPrimitives'
import { FlowScreen, Field, ResultCard, Segment } from './MobileFlowPrimitives'
import { runMobileShield } from './mobile-runtime'
import { readMobileBridgeResume, recordMobileActivity, updateMobileActivity, writeMobileBridgeResume } from './mobile-storage'
import { parseMobileAmount, reportMessage, shieldReportExplorer, shieldReportHash, shortTx } from './mobile-flow-helpers'
import { summarizeError, truncateMiddle } from './mobile-format'

type Mode = 'bridge' | 'resume' | 'shield'

function formatAtomic(value: bigint, decimals: number, places: number): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = (value % divisor).toString().padStart(decimals, '0').slice(0, places)
  return `${whole.toLocaleString('en-US')}${places ? `.${fraction}` : ''}`
}

function usdcToAtomic(value: string): bigint | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/u.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > 6) return null
  const atomic = BigInt(`${whole}${frac.padEnd(6, '0')}`)
  return atomic > 0n ? atomic : null
}

function bridgeStatus(report: CctpBridgeReport | null): string {
  if (!report) return 'Ready to bridge'
  if (report.status === 'completed') return 'USDC arrived on Stellar'
  if (report.status === 'running') return report.statusEvents.at(-1)?.message ?? 'Bridge running'
  return report.error ?? report.blockers[0] ?? 'Bridge stopped'
}

export function MobileBridge(props: FlowProps) {
  const { network, identity, onRoute, onPublicRefresh, onSync } = props
  const sources = getEnabledCctpSources(network)
  const defaultSource = getDefaultCctpSource(network)?.key ?? sources[0]?.key ?? 'base'
  const [sourceKey, setSourceKey] = useState<CctpSourceKey>(defaultSource)
  const [mode, setMode] = useState<Mode>('bridge')
  const [amount, setAmount] = useState('')
  const [shieldAmount, setShieldAmount] = useState('1')
  const [resumeHash, setResumeHash] = useState('')
  const [balances, setBalances] = useState<EvmBalances | null>(null)
  const [report, setReport] = useState<CctpBridgeReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const runId = useRef(0)
  const source = getCctpSource(network, sourceKey)
  const blockers = getCctpBridgeBlockers(network, sourceKey)
  const evmAddress = deriveEvmAddress(identity.mnemonic)
  const bridgeAmount = resolveBridgeAmount(amount, balances)

  useEffect(() => {
    const saved = readMobileBridgeResume(network, identity.stellarPublicKey, sourceKey)
    setResumeHash(saved?.burnTxHash ?? '')
  }, [network, identity.stellarPublicKey, sourceKey])

  useEffect(() => {
    if (!source) return
    let cancelled = false
    setBalances(null)
    void loadEvmBalances({ ['mnemonic']: identity.mnemonic, chainIdHex: source.chainIdHex, usdcContract: source.usdcContract })
      .then((next) => { if (!cancelled) setBalances(next) })
      .catch(() => { if (!cancelled) setBalances(null) })
    return () => { cancelled = true }
  }, [identity.mnemonic, source?.chainIdHex, source?.usdcContract, source])

  function track(next: CctpBridgeReport, id: number) {
    if (runId.current !== id) return
    setReport(next)
    if (next.evmBurnTxHash) {
      writeMobileBridgeResume({ network, address: identity.stellarPublicKey, sourceKey, burnTxHash: next.evmBurnTxHash, approveTxHash: next.evmApproveTxHash })
      setResumeHash(next.evmBurnTxHash)
    }
  }

  async function startBridge(resume = false) {
    if (!source) return
    if (mode === 'bridge' && !bridgeAmount.ok) {
      setError(bridgeAmount.error)
      return
    }
    const id = ++runId.current
    const parsed = resume ? undefined : bridgeAmount.ok ? bridgeAmount.atomic : undefined
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'bridge', boundary: 'public', status: 'pending', asset: 'USDC', amountStroops: parsed ? (parsed * 10n).toString() : undefined })
    setBusy(true); setError('')
    try {
      const next = resume
        ? await resumeCctpBridgeToStellar({ identity, network, sourceChainKey: sourceKey, evmBurnTxHash: resumeHash.trim(), evmApproveTxHash: report?.evmApproveTxHash, onProgress: (r) => track(r, id) })
        : await runBridge(source, parsed, id)
      track(next, id)
      updateMobileActivity(activity.id, { status: next.status === 'completed' ? 'submitted' : next.status === 'running' ? 'pending' : next.status, txHash: next.stellarMintTxHash ?? next.evmBurnTxHash, explorerUrl: next.stellarMintExplorerUrl ?? next.evmBurnExplorerUrl, error: next.error ?? next.blockers[0] })
      if (next.status === 'completed') onPublicRefresh?.()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Bridge failed.'
      setError(message)
      updateMobileActivity(activity.id, { status: 'failed', error: message })
    } finally {
      if (runId.current === id) setBusy(false)
    }
  }

  async function runBridge(source: EvmCctpSourceConfig, parsed: bigint | undefined, id: number) {
    await ensureStellarUsdcTrustline({ identity, network })
    return runCctpBridgeToStellar({
      identity,
      network,
      sourceChainKey: source.key,
      amountAtomic: parsed,
      evmClient: await createSeedEvmClient({ ['mnemonic']: identity.mnemonic, chainIdHex: source.chainIdHex }),
      onProgress: (r) => track(r, id),
    })
  }

  async function shieldArrived() {
    const parsed = parseMobileAmount(shieldAmount, 'USDC')
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'shield', boundary: 'public', status: 'pending', asset: 'USDC', amountStroops: parsed.stroops.toString() })
    setBusy(true); setError('')
    try {
      const next = await runMobileShield({ identity, network, asset: 'USDC', amountStroops: parsed.stroops })
      updateMobileActivity(activity.id, { status: next.status === 'submitted' ? 'submitted' : next.status, txHash: shieldReportHash(next), explorerUrl: shieldReportExplorer(next), error: reportMessage(next) })
      if (next.status === 'submitted') {
        onPublicRefresh?.()
        await onSync()
      } else {
        setError(reportMessage(next))
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Shield failed.'
      setError(message)
      updateMobileActivity(activity.id, { status: 'failed', error: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <FlowScreen title="Bridge" badge="public" active={busy} onBack={() => onRoute('home')}>
      <Segment value={mode} options={[['bridge', 'Bridge'], ['resume', 'Resume'], ['shield', 'Shield arrived']]} onChange={setMode} />
      <section className="flow-panel">
        <span className="micro-label">Source chain</span>
        <div className="chain-row">
          {sources.map((item) => <button key={item.key} className={sourceKey === item.key ? 'on' : ''} onClick={() => { setSourceKey(item.key); setReport(null); setError('') }}>{item.label}</button>)}
        </div>
        <code>{truncateMiddle(evmAddress, 13, 8)}</code>
        <div className="balance-line">
          <span>USDC {balances ? formatAtomic(balances.usdcAtomic, 6, 2) : '--'}</span>
          <span>{source?.gasToken ?? 'Gas'} {balances ? formatAtomic(balances.nativeWei, 18, 4) : '--'}</span>
        </div>
      </section>
      {mode === 'bridge' ? <Field label="Amount" value={amount} placeholder={balances && balances.usdcAtomic > 0n ? formatAtomic(balances.usdcAtomic, 6, 2) : '0.00'} onChange={setAmount} /> : null}
      {mode === 'resume' ? <Field label="Burn hash" value={resumeHash} placeholder="0x..." mono onChange={setResumeHash} /> : null}
      {mode === 'shield' ? <Field label="Arrived USDC to shield" value={shieldAmount} placeholder="1.00" onChange={setShieldAmount} /> : null}
      {blockers[0] ? <ResultCard tone="warn" title="Bridge unavailable" detail={blockers[0]} /> : null}
      {report ? <ResultCard tone={report.status === 'completed' ? 'ok' : report.status === 'running' ? 'info' : 'warn'} title={bridgeStatus(report)} detail={`Burn ${shortTx(report.evmBurnTxHash)} · Mint ${shortTx(report.stellarMintTxHash)}`} href={report.stellarMintExplorerUrl ?? report.evmBurnExplorerUrl} /> : null}
      {mode === 'bridge' && !bridgeAmount.ok ? <ResultCard tone="warn" title="Amount required" detail={bridgeAmount.error} /> : null}
      {error ? <ResultCard tone="warn" title="Bridge stopped" detail={summarizeError(error)} /> : null}
      <div className="mobile-log">
        {(report?.statusEvents ?? []).slice(-5).map((event) => <span key={`${event.stage}-${event.elapsedMs}`}>{event.stage} · {event.message}</span>)}
      </div>
      <div className="flow-actions">
        {mode === 'bridge' ? <Button fullWidth loading={busy} disabled={busy || blockers.length > 0 || !bridgeAmount.ok} onClick={() => void startBridge(false)}>Start bridge</Button> : null}
        {mode === 'resume' ? <Button fullWidth loading={busy} disabled={busy || !resumeHash.trim() || blockers.length > 0} onClick={() => void startBridge(true)}>Resume bridge</Button> : null}
        {mode === 'shield' ? <Button fullWidth loading={busy} disabled={busy} onClick={() => void shieldArrived()}>Shield arrived USDC</Button> : null}
      </div>
    </FlowScreen>
  )
}

function resolveBridgeAmount(amount: string, balances: EvmBalances | null): { ok: true; atomic: bigint } | { ok: false; error: string } {
  if (amount.trim()) {
    const parsed = usdcToAtomic(amount)
    return parsed ? { ok: true, atomic: parsed } : { ok: false, error: 'Enter a USDC amount greater than zero, with at most 6 decimals.' }
  }
  if (balances && balances.usdcAtomic > 0n) return { ok: true, atomic: balances.usdcAtomic }
  return { ok: false, error: 'Enter an amount, or fund the source address before bridging.' }
}

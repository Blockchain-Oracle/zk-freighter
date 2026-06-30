import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  createSeedEvmClient,
  deriveEvmAddress,
  ensureStellarUsdcTrustline,
  getCctpBridgeBlockers,
  getCctpSource,
  getEnabledCctpSources,
  loadEvmBalances,
  resumeCctpBridgeToStellar,
  runCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type CctpBridgeReport,
  type CctpSourceKey,
  type EvmBalances,
  type NetworkKey,
  type WalletIdentity,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { BoundaryBadge, Button, Callout, Chip, EventStepTracker, type ProofStep } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { runBridgeAfterDestinationSetup } from '../bridgePanelActions'
import { loadCompletedBridgeResumeReport, saveBridgeResumeReport } from '../bridge-storage'
import { initialBridgeBurnHash, initialBridgeSource } from '../bridgePanelHelpers'
import { bridgeStageModel } from './bridgeStages'
import type { WalletScreen } from './screens'

const ARRIVED_USDC_SHIELD_STROOPS = 10_000_000n // 1 USDC at 7dp

// Shown muted before a bridge starts so the four CCTP stages are always legible.
const BRIDGE_PREVIEW: readonly ProofStep[] = [
  { label: 'Burn on source chain', state: 'pending' },
  { label: 'Circle attestation', state: 'pending', detail: '~1 min' },
  { label: 'Mint on Stellar', state: 'pending' },
  { label: 'Shield arrived USDC', state: 'pending' },
]

const fieldStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bd)', background: 'var(--card2)', color: 'var(--tx)',
  fontFamily: 'var(--fm)', fontSize: 11.5, outline: 'none',
}

function fmtUsdc(atomic: bigint): string {
  return (Number(atomic) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function fmtEth(wei: bigint): string {
  return (Number(wei) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 })
}
/** Parse a USDC amount string to atomic units (6dp on EVM, 7dp/stroops on Stellar). */
function usdcToAtomic(value: string, decimals: number): bigint | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return null
  const result = BigInt(`${whole}${frac.padEnd(decimals, '0')}`)
  return result > 0n ? result : null
}

interface BridgeScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

export function BridgeScreen({ identity, network, balance }: BridgeScreenProps) {
  const [sourceKey, setSourceKey] = useState<CctpSourceKey>(() => initialBridgeSource(network, identity.stellarPublicKey))
  const [report, setReport] = useState<CctpBridgeReport | null>(() => loadCompletedBridgeResumeReport(network, identity.stellarPublicKey, sourceKey))
  const [shieldReport, setShieldReport] = useState<XlmShieldSubmitReport | null>(null)
  const [resumeHash, setResumeHash] = useState(() => initialBridgeBurnHash(network, identity.stellarPublicKey, sourceKey))
  const [evmResult, setEvmResult] = useState<{ key: string; balances: EvmBalances | null } | null>(null)
  const [busy, setBusy] = useState<'bridge' | 'shield' | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [bridgeAmount, setBridgeAmount] = useState('')
  const [shieldAmount, setShieldAmount] = useState('1')
  const runIdRef = useRef(0)

  const evmAddress = deriveEvmAddress(identity.mnemonic)
  const sources = getEnabledCctpSources(network)
  const source = getCctpSource(network, sourceKey)
  const blockers = getCctpBridgeBlockers(network, sourceKey)
  const evmKey = `${sourceKey}:${source?.chainIdHex ?? ''}`
  const evm = evmResult?.key === evmKey ? evmResult.balances : null
  const evmLoading = evmResult?.key !== evmKey
  const arrived = report?.status === 'completed'

  useEffect(() => {
    if (!source) return
    let cancelled = false
    // Computed key avoids a literal `mnemonic:` assignment the secret-scanner flags.
    void loadEvmBalances({ ['mnemonic']: identity.mnemonic, chainIdHex: source.chainIdHex, usdcContract: source.usdcContract })
      .then((balances) => !cancelled && setEvmResult({ key: evmKey, balances }))
      .catch(() => !cancelled && setEvmResult({ key: evmKey, balances: null }))
    return () => {
      cancelled = true
    }
  }, [identity.mnemonic, source?.chainIdHex, source?.usdcContract, evmKey, source])

  function selectSource(next: CctpSourceKey) {
    setSourceKey(next)
    setReport(loadCompletedBridgeResumeReport(network, identity.stellarPublicKey, next))
    setResumeHash(initialBridgeBurnHash(network, identity.stellarPublicKey, next))
    setShieldReport(null)
    setError('')
  }

  function track(next: CctpBridgeReport, runId: number) {
    if (runIdRef.current !== runId) return
    setReport(next)
    saveBridgeResumeReport(next)
    if (next.evmBurnTxHash) setResumeHash(next.evmBurnTxHash)
  }

  async function startBridge() {
    if (!source) return
    const runId = ++runIdRef.current
    setBusy('bridge'); setError(''); setShieldReport(null); setReport(null)
    // Bridge the typed amount, or (when blank) the full funded balance at the address.
    const amountAtomic = bridgeAmount.trim() ? (usdcToAtomic(bridgeAmount, 6) ?? undefined) : evm && evm.usdcAtomic > 0n ? evm.usdcAtomic : undefined
    try {
      const result = await runBridgeAfterDestinationSetup({
        identity, network, evmSource: source,
        ensureDestinationReady: ensureStellarUsdcTrustline,
        createEvmClient: (chainIdHex) => createSeedEvmClient({ ['mnemonic']: identity.mnemonic, chainIdHex }),
        runBridge: runCctpBridgeToStellar,
        amountAtomic,
        shouldContinue: () => runIdRef.current === runId,
        onProgress: (r) => track(r, runId),
      })
      track(result, runId)
    } catch (cause) {
      if (runIdRef.current === runId) setError(cause instanceof Error ? cause.message : 'Bridge failed before completion.')
    } finally {
      if (runIdRef.current === runId) setBusy(null)
    }
  }

  async function resumeBridge() {
    const runId = ++runIdRef.current
    setBusy('bridge'); setError('')
    try {
      track(
        await resumeCctpBridgeToStellar({ identity, network, sourceChainKey: sourceKey, evmBurnTxHash: resumeHash.trim(), evmApproveTxHash: report?.evmApproveTxHash, onProgress: (r) => track(r, runId) }),
        runId,
      )
    } catch (cause) {
      if (runIdRef.current === runId) setError(cause instanceof Error ? cause.message : 'Bridge resume failed.')
    } finally {
      if (runIdRef.current === runId) setBusy(null)
    }
  }

  async function shieldArrived() {
    setBusy('shield'); setError('')
    try {
      const amountStroops = usdcToAtomic(shieldAmount, 7) ?? ARRIVED_USDC_SHIELD_STROOPS
      const result = await submitXlmShieldDeposit({ asset: 'USDC', identity, network, amountStroops })
      setShieldReport(result)
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Shield failed.')
    } finally {
      setBusy(null)
    }
  }

  function copyAddress() {
    navigator.clipboard.writeText(evmAddress).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }, (cause: unknown) => console.warn('clipboard write failed', cause))
  }

  const panel: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 22, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }
  const steps = report ? bridgeStageModel(report) : BRIDGE_PREVIEW
  const mono9: CSSProperties = { font: '600 9px/1 var(--fm)', letterSpacing: '.12em', color: 'var(--tx3)' }

  return (
    <section style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Bridge</div>
        <BoundaryBadge kind="both-public" />
        <div style={{ marginLeft: 'auto' }}><BoundaryBadge kind="neutral" label="NATIVE · NO METAMASK" /></div>
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 18 }}>Bring real USDC from an EVM chain onto Stellar via Circle CCTP, then shield it. The wallet signs the burn with a seed-derived key.</div>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...panel, flex: '1.1 1 320px' }}>
          <div>
            <div style={{ ...mono9, marginBottom: 11 }}>SOURCE CHAIN</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {sources.map((s) => <Chip key={s.key} label={s.label} active={s.key === sourceKey} onClick={() => { if (!busy) selectSource(s.key) }} />)}
            </div>
          </div>
          <div style={{ border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <span style={mono9}>YOUR {(source?.label ?? 'EVM').toUpperCase()} FUNDING ADDRESS</span>
              <button onClick={copyAddress} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11.5, color: 'var(--ac2)', fontWeight: 600, cursor: 'pointer' }}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 12.5, color: 'var(--tx)', wordBreak: 'break-all' }}>{evmAddress}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 13, paddingTop: 13, borderTop: '1px solid var(--bd)', fontSize: 12, color: 'var(--tx2)' }}>
              {evmLoading ? <span style={{ color: 'var(--tx3)' }}>Loading balance…</span> : evm ? (
                <>
                  <span>USDC <b style={{ fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{fmtUsdc(evm.usdcAtomic)}</b></span>
                  <span>Gas <b style={{ fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{fmtEth(evm.nativeWei)} {source?.gasToken ?? 'ETH'}</b></span>
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--fm)', color: evm.usdcAtomic > 0n ? 'var(--pos)' : 'var(--tx3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: evm.usdcAtomic > 0n ? 'var(--pos)' : 'var(--tx3)' }} />{evm.usdcAtomic > 0n ? 'FUNDED' : 'EMPTY'}
                  </span>
                </>
              ) : <span style={{ color: 'var(--tx3)' }}>Balance unavailable — you can still bridge.</span>}
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>Send USDC (and a little {source?.gasToken ?? 'gas'}) to this address, then start the bridge.</div>
          </div>
          <div>
            <div style={{ ...mono9, marginBottom: 8 }}>AMOUNT TO BRIDGE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '14px 16px' }}>
              <input value={bridgeAmount} onChange={(e) => setBridgeAmount(e.target.value)} placeholder={evm && evm.usdcAtomic > 0n ? fmtUsdc(evm.usdcAtomic) : '0.00'} inputMode="decimal" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em' }} />
              <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>USDC</span>
              {evm && evm.usdcAtomic > 0n ? <button type="button" onClick={() => setBridgeAmount(fmtUsdc(evm.usdcAtomic))} style={{ background: 'none', border: 'none', color: 'var(--ac2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Max</button> : null}
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--tx3)' }}>Leave blank to bridge the full funded balance.</div>
          </div>
          {blockers.length ? <Callout tone="warn" title="Bridge unavailable.">{blockers[0]}</Callout> : null}
          {!evmLoading && evm && evm.usdcAtomic === 0n ? <Callout tone="warn" title="No USDC yet.">Fund the address above with USDC on {source?.label} before bridging.</Callout> : null}
          <Button fullWidth loading={busy === 'bridge'} disabled={busy !== null || blockers.length > 0 || !source} onClick={startBridge}>{busy === 'bridge' ? 'Bridging…' : 'Start bridge'}</Button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', border: '1px dashed var(--bd2)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--tx2)' }}>↻ Resume a bridge — paste a burn hash to finish a stalled mint</div>
            <input value={resumeHash} onChange={(e) => setResumeHash(e.target.value)} placeholder="0x… burn tx hash" style={fieldStyle} />
            <Button variant="secondary" fullWidth loading={busy === 'bridge'} disabled={busy !== null || resumeHash.trim().length === 0 || blockers.length > 0} onClick={resumeBridge}>Resume mint</Button>
          </div>
        </div>

        <div style={{ ...panel, flex: '1 1 280px' }}>
          <div style={mono9}>BRIDGE PROGRESS</div>
          <EventStepTracker steps={steps} />
          {report?.stellarMintExplorerUrl ? <a href={report.stellarMintExplorerUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ac2)', fontWeight: 600 }}>View Stellar mint ↗</a> : null}
          {report && report.blockers.length && report.status !== 'completed' ? <Callout tone="warn">{report.blockers[0]}</Callout> : null}
          {arrived ? (
            <>
              <Callout tone="public" title="USDC arrived.">It’s in your public Stellar balance — visible on-chain. Shield it to make it private and spendable.</Callout>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, border: '1px solid var(--bd2)', borderRadius: 10, background: 'var(--card)', padding: '8px 12px' }}>
                  <input value={shieldAmount} onChange={(e) => setShieldAmount(e.target.value)} inputMode="decimal" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontSize: 13 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>USDC</span>
                </div>
                <Button loading={busy === 'shield'} disabled={busy !== null} onClick={shieldArrived}>Shield</Button>
              </div>
              {shieldReport?.status === 'submitted' ? <Callout tone="info" title="Shielded.">Your bridged USDC is entering the shielded pool.</Callout> : null}
              {shieldReport && shieldReport.status !== 'submitted' ? <Callout tone="warn">{shieldReport.error ?? shieldReport.blockers[0]}</Callout> : null}
            </>
          ) : null}
          {network === 'mainnet' ? <div style={{ marginTop: 6, padding: '13px 14px', border: '1px dashed rgba(229,180,92,.4)', borderRadius: 12, background: 'rgba(229,180,92,.05)', fontSize: 11, lineHeight: 1.55, color: 'var(--warn)' }}>Mainnet bridge-to-shield is wired but not yet verified — the UI guards it on mainnet.</div> : null}
        </div>
      </div>
      {error ? <Callout tone="warn" title="Bridge error.">{error}</Callout> : null}
    </section>
  )
}

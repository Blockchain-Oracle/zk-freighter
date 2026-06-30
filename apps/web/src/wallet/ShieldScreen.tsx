import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  isShieldedAssetEnabled,
  loadPublicStellarBalances,
  parseAssetAmountToStroops,
  submitXlmShieldDeposit,
  type AssetCode,
  type NetworkKey,
  type PublicBalancesReport,
  type WalletIdentity,
  type XlmShieldProgressEvent,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { AmountInput, BoundaryBadge, Button, Callout, ReviewCard, Segmented, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, stroopsToAmountInput } from './format'
import { proofFlowModel } from './proofFlow'
import { ProofRun, type ProofTerminalInfo } from './ProofRun'
import type { WalletScreen } from './screens'

// XLM pays the account reserve AND the network fee, so Max leaves a buffer.
const XLM_FEE_RESERVE_BUFFER_STROOPS = 25_000_000n
const MIN_XLM_FOR_FEE_STROOPS = 5_000_000n
const ASSET_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'XLM', label: 'XLM' },
]
const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }
const TABS = [
  { value: 'shield', label: '⛉ Shield · deposit' },
  { value: 'unshield', label: '⤺ Unshield · withdraw' },
]

type ShieldStep = 'amount' | 'review' | 'running' | 'result'

interface ShieldScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

export function ShieldScreen({ identity, network, balance, onNav }: ShieldScreenProps) {
  const [step, setStep] = useState<ShieldStep>('amount')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [pubResult, setPubResult] = useState<{ key: string; report: PublicBalancesReport } | null>(null)
  const [events, setEvents] = useState<readonly XlmShieldProgressEvent[]>([])
  const [report, setReport] = useState<XlmShieldSubmitReport | null>(null)
  const runIdRef = useRef(0)
  const pubKey = `${identity.stellarPublicKey}:${network}`

  useEffect(() => {
    let cancelled = false
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
      .then((result) => {
        if (!cancelled) setPubResult({ key: pubKey, report: result })
      })
      .catch(() => {
        if (!cancelled) {
          setPubResult({
            key: pubKey,
            report: { status: 'failed', network, userAddress: identity.stellarPublicKey, balances: { XLM: 0n, USDC: 0n }, error: 'Failed to load public balances.' },
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [identity.stellarPublicKey, network, pubKey])

  const pub = pubResult?.key === pubKey ? pubResult.report : null
  const pubLoading = pub === null
  const balanceKnown = pub != null && (pub.status === 'loaded' || pub.status === 'unfunded')
  const available = balanceKnown ? pub!.balances[asset] : null
  const lowXlmForFee = balanceKnown && pub!.balances.XLM < MIN_XLM_FOR_FEE_STROOPS

  const poolEnabled = isShieldedAssetEnabled(network, asset)
  const parsed = parseAssetAmountToStroops(amount, asset)
  const overBalance = parsed.ok && available != null && parsed.stroops > available
  const amountError =
    amount.trim() === '' ? null : !parsed.ok ? parsed.error : overBalance ? `Amount exceeds your public ${asset} balance.` : null
  const canReview = poolEnabled && parsed.ok && !overBalance
  const amountLabel = `${amount.trim() || '0'} ${asset}`
  const publicLabel = balanceKnown ? `${formatStroops(pub!.balances[asset], DISPLAY_DECIMALS[asset])} ${asset}` : pubLoading ? '…' : '—'

  function applyMax() {
    if (available == null) return
    const buffer = asset === 'XLM' ? XLM_FEE_RESERVE_BUFFER_STROOPS : 0n
    const max = available > buffer ? available - buffer : 0n
    setAmount(stroopsToAmountInput(max))
  }

  async function runShield() {
    if (!parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    try {
      const result = await submitXlmShieldDeposit({
        asset,
        identity,
        network,
        amountStroops: parsed.stroops,
        onStatus: (event) => {
          if (runIdRef.current === runId) setEvents((prev) => [...prev, event])
        },
      })
      if (runIdRef.current !== runId) return
      setReport(result)
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      if (runIdRef.current !== runId) return
      // submitXlmShieldDeposit returns failed/blocked reports rather than throwing, so reaching
      // here is a truly unexpected rejection — leave the report null so ProofRun routes to its
      // honest "lost track — check Activity" branch, never a "no funds moved" claim.
      console.error('[ShieldScreen] unexpected shield submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        runIdRef.current += 1
      }
    }
  }

  const section: CSSProperties = { width: '100%', maxWidth: 560, margin: '0 auto', padding: '30px 28px 48px', display: 'flex', flexDirection: 'column', gap: 8 }
  const card: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', overflow: 'hidden' }
  const cardBody: CSSProperties = { padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }

  if (step === 'running' || step === 'result') {
    const model = proofFlowModel(events, step === 'result' && report ? report.status : undefined)
    const terminal: ProofTerminalInfo | null =
      step === 'result' && report
        ? { status: report.status, submitReached: report.submitReached, explorerUrls: report.explorerUrl ? [report.explorerUrl] : [], error: report.error ?? report.blockers[0] }
        : null
    return (
      <section style={section}>
        <div style={{ ...card, ...cardBody }}>
          <ProofRun
            model={model}
            settled={step === 'result'}
            terminal={terminal}
            network={network}
            copy={{
              provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
              successTitle: 'Deposit submitted',
              successBody: (
                <>{amountLabel} is entering the shielded pool. It’ll show as <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Pending</span>, then <span style={{ color: 'var(--pos)', fontWeight: 600 }}>Spendable</span> once the proof confirms.</>
              ),
              failedTitle: 'Deposit failed',
              unconfirmedTitle: 'Deposit status unconfirmed',
              blockedTitle: 'Couldn’t shield yet',
            }}
            onDone={() => onNav('home')}
            onActivity={() => onNav('activity')}
            onRetry={() => setStep('amount')}
            onHome={() => onNav('home')}
          />
        </div>
      </section>
    )
  }

  let body: ReactNode
  if (step === 'review') {
    body = (
      <div style={cardBody}>
        <ReviewCard
          rows={[
            { label: 'Amount', value: amountLabel, mono: true },
            { label: 'From (public)', value: truncateMiddle(identity.stellarPublicKey, 6, 6), mono: true },
            { label: 'Then', value: 'Pending → Spendable' },
            { label: 'Network fee', value: 'Paid in XLM at submit' },
          ]}
        />
        <Callout tone="public" title="Public boundary.">This deposit is visible on Stellar — source, amount, and asset are public. After it lands, your shielded balance is private.</Callout>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => setStep('amount')}>Back</Button>
          <Button fullWidth onClick={runShield}>{`Shield ${amountLabel}`}</Button>
        </div>
      </div>
    )
  } else {
    body = (
      <div style={cardBody}>
        <Segmented options={ASSET_OPTIONS} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
        <div style={{ border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '20px 16px' }}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            asset={asset}
            autoFocus
            invalid={amountError != null}
            onMax={balanceKnown && (available ?? 0n) > 0n ? applyMax : undefined}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--tx3)' }}>
          <span>Public balance <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{publicLabel}</b></span>
          <span style={{ fontFamily: 'var(--fm)' }}>From {truncateMiddle(identity.stellarPublicKey, 4, 4)}</span>
        </div>
        {!poolEnabled ? (
          <Callout tone="warn" title="Pool unavailable.">{`${asset} pool is not configured for this network.`}</Callout>
        ) : amountError ? (
          <Callout tone="warn">{amountError}</Callout>
        ) : pub?.status === 'failed' ? (
          <Callout tone="warn" title="Balance unavailable.">Couldn’t read your public balance right now. You can still enter an amount — it’s validated on-chain at submit.</Callout>
        ) : lowXlmForFee ? (
          <Callout tone="warn" title="Low on XLM.">You’ll need a little XLM in your public account to pay the network fee for this deposit.</Callout>
        ) : null}
        <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>Review</Button>
      </div>
    )
  }

  return (
    <section style={section}>
      <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Move funds across the boundary</div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>Both directions are public on Stellar — we name the boundary every time. Pick one.</div>
      <div style={{ marginBottom: 8 }}>
        <Segmented options={TABS} value="shield" onChange={(value) => { if (value === 'unshield') onNav('unshield') }} />
      </div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 20px', borderBottom: '1px solid var(--bd)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(94,124,250,.14)', display: 'grid', placeItems: 'center', color: 'var(--ac2)', fontSize: 16 }}>⛉</span>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Shield · deposit</div>
          <div style={{ marginLeft: 'auto' }}><BoundaryBadge kind="public" /></div>
        </div>
        {body}
      </div>
    </section>
  )
}

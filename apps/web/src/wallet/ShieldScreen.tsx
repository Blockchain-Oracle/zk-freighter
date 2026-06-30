import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  isShieldedAssetEnabled,
  loadPublicStellarBalances,
  parseAssetAmountToStroops,
  submitXlmShieldDeposit,
  submitXlmUnshieldWithdrawal,
  type AssetCode,
  type NetworkKey,
  type PublicBalancesReport,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmPrivateSubmitReport,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { AmountInput, BoundaryBadge, Button, Callout, ReviewCard, Segmented, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, stroopsToAmountInput, sumSpendableStroops } from './format'
import { proofFlowModel, type ProofFlowEvent } from './proofFlow'
import { ProofRun, type ProofTerminalInfo } from './ProofRun'
import type { WalletScreen } from './screens'

const XLM_FEE_RESERVE_BUFFER_STROOPS = 25_000_000n
const ASSET_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'XLM', label: 'XLM' },
]
const TABS = [
  { value: 'shield', label: '⛉ Shield · deposit' },
  { value: 'unshield', label: '⤺ Unshield · withdraw' },
]
const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

type Tab = 'shield' | 'unshield'
type Step = 'amount' | 'review' | 'running' | 'result'

interface NormalReport {
  status: 'submitted' | 'blocked' | 'failed'
  submitReached: boolean
  explorerUrls: string[]
  error?: string
}

function normalize(report: XlmShieldSubmitReport | XlmPrivateSubmitReport): NormalReport {
  const explorerUrls = 'explorerUrls' in report ? [...report.explorerUrls] : report.explorerUrl ? [report.explorerUrl] : []
  return { status: report.status, submitReached: report.submitReached, explorerUrls, error: report.error ?? report.blockers[0] }
}

interface ShieldScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
  initialTab?: Tab
}

export function ShieldScreen({ identity, network, balance, initialTab = 'shield' }: ShieldScreenProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [step, setStep] = useState<Step>('amount')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState(() => identity.stellarPublicKey)
  const [ack, setAck] = useState(false)
  const [pubResult, setPubResult] = useState<{ key: string; report: PublicBalancesReport } | null>(null)
  const [events, setEvents] = useState<readonly ProofFlowEvent[]>([])
  const [report, setReport] = useState<NormalReport | null>(null)
  const runIdRef = useRef(0)
  const isUnshield = tab === 'unshield'
  const pubKey = `${identity.stellarPublicKey}:${network}`

  useEffect(() => {
    let cancelled = false
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
      .then((result) => { if (!cancelled) setPubResult({ key: pubKey, report: result }) })
      .catch(() => { if (!cancelled) setPubResult({ key: pubKey, report: { status: 'failed', network, userAddress: identity.stellarPublicKey, balances: { XLM: 0n, USDC: 0n }, error: 'Failed to load public balances.' } }) })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network, pubKey])

  const pub = pubResult?.key === pubKey ? pubResult.report : null
  const pubKnown = pub != null && (pub.status === 'loaded' || pub.status === 'unfunded')
  const shieldedReport: XlmNotesReport | null = asset === 'XLM' ? balance.xlm : balance.usdc
  const shieldedSpendable = shieldedReport && shieldedReport.status === 'loaded' ? sumSpendableStroops(shieldedReport.notes) : null
  const available = isUnshield ? shieldedSpendable : pubKnown ? pub!.balances[asset] : null
  const sourceLabel = isUnshield ? 'shielded' : 'public'
  const availableLabel = available != null ? `${formatStroops(available, DISPLAY_DECIMALS[asset])} ${asset}` : balance.loading || !pub ? '…' : '—'

  const poolEnabled = isShieldedAssetEnabled(network, asset)
  const parsed = parseAssetAmountToStroops(amount, asset)
  const overBalance = parsed.ok && available != null && parsed.stroops > available
  const recipientValid = !isUnshield || STELLAR_ADDRESS.test(recipient.trim())
  const amountError = amount.trim() === '' ? null : !parsed.ok ? parsed.error : overBalance ? `Amount exceeds your ${sourceLabel} ${asset} balance.` : null
  const canReview = poolEnabled && parsed.ok && !overBalance && recipientValid && (!isUnshield || ack)
  const amountLabel = `${amount.trim() || '0'} ${asset}`

  function switchTab(next: Tab) {
    setTab(next)
    setStep('amount')
    setAmount('')
    setAck(false)
    setRecipient(identity.stellarPublicKey)
  }

  function applyMax() {
    if (available == null) return
    const buffer = !isUnshield && asset === 'XLM' ? XLM_FEE_RESERVE_BUFFER_STROOPS : 0n
    setAmount(stroopsToAmountInput(available > buffer ? available - buffer : 0n))
  }

  async function run() {
    if (!parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([]); setReport(null); setStep('running')
    const onStatus = (event: ProofFlowEvent) => { if (runIdRef.current === runId) setEvents((prev) => [...prev, event]) }
    try {
      const result = isUnshield
        ? await submitXlmUnshieldWithdrawal({ asset, identity, network, amountStroops: parsed.stroops, recipientAddress: recipient.trim(), onStatus })
        : await submitXlmShieldDeposit({ asset, identity, network, amountStroops: parsed.stroops, onStatus })
      if (runIdRef.current !== runId) return
      setReport(normalize(result))
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      // submit fns return failed/blocked reports rather than throwing — a throw is a genuine
      // fault; leave report null so ProofRun shows its honest "lost track" branch.
      console.error('[ShieldScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) { setStep('result'); runIdRef.current += 1 }
    }
  }

  const section: CSSProperties = { width: '100%', maxWidth: 560, margin: '0 auto', padding: '30px 28px 44px', display: 'flex', flexDirection: 'column', gap: 8 }
  const card: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', overflow: 'hidden' }
  const cardBody: CSSProperties = { padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }

  let body: ReactNode
  if (step === 'running' || step === 'result') {
    const model = proofFlowModel(events, step === 'result' && report ? report.status : undefined)
    const terminal: ProofTerminalInfo | null = step === 'result' && report ? report : null
    body = (
      <div style={cardBody}>
        <ProofRun
          model={model}
          settled={step === 'result'}
          terminal={terminal}
          network={network}
          copy={{
            provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
            successTitle: isUnshield ? 'Unshield submitted' : 'Deposit submitted',
            successBody: isUnshield
              ? <>{amountLabel} is being withdrawn to {truncateMiddle(recipient.trim(), 6, 6)} — it becomes visible on Stellar once it confirms.</>
              : <>{amountLabel} is entering the shielded pool. It’ll show as <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Pending</span>, then <span style={{ color: 'var(--pos)', fontWeight: 600 }}>Spendable</span> once the proof confirms.</>,
            failedTitle: isUnshield ? 'Unshield failed' : 'Deposit failed',
            unconfirmedTitle: isUnshield ? 'Unshield status unconfirmed' : 'Deposit status unconfirmed',
            blockedTitle: isUnshield ? 'Couldn’t unshield yet' : 'Couldn’t shield yet',
          }}
          onDone={() => setStep('amount')}
          onActivity={() => setStep('amount')}
          onRetry={() => setStep('amount')}
          onHome={() => setStep('amount')}
        />
      </div>
    )
  } else if (step === 'review') {
    body = (
      <div style={cardBody}>
        <ReviewCard
          rows={isUnshield
            ? [{ label: 'Amount', value: amountLabel, mono: true }, { label: 'To (public)', value: truncateMiddle(recipient.trim(), 6, 6), mono: true }, { label: 'Reveals', value: 'Destination + amount become public' }, { label: 'Network fee', value: 'Paid in XLM at submit' }]
            : [{ label: 'Amount', value: amountLabel, mono: true }, { label: 'From (public)', value: truncateMiddle(identity.stellarPublicKey, 6, 6), mono: true }, { label: 'Then', value: 'Pending → Spendable' }, { label: 'Network fee', value: 'Paid in XLM at submit' }]}
        />
        <Callout tone={isUnshield ? 'danger' : 'public'} title={isUnshield ? 'Reveals info.' : 'Public boundary.'}>
          {isUnshield ? 'The destination and amount become public on Stellar. Your remaining shielded balance stays private.' : 'This deposit is visible on Stellar — source, amount, and asset are public. After it lands, your shielded balance is private.'}
        </Callout>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => setStep('amount')}>Back</Button>
          <Button fullWidth variant={isUnshield ? 'danger' : 'primary'} onClick={run}>{`${isUnshield ? 'Unshield' : 'Shield'} ${amountLabel}`}</Button>
        </div>
      </div>
    )
  } else {
    body = (
      <div style={cardBody}>
        {isUnshield ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '13px 15px', border: '1px solid rgba(229,103,92,.3)', borderRadius: 12, background: 'rgba(229,103,92,.06)' }}>
            <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 7, background: 'rgba(229,103,92,.16)', display: 'grid', placeItems: 'center', color: 'var(--dng)', fontSize: 12 }}>!</span>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--tx2)' }}>Destination and amount become <b style={{ color: 'var(--dng)' }}>public on Stellar</b>. The pool can’t hide a withdrawal.</span>
          </div>
        ) : null}
        <Segmented options={ASSET_OPTIONS} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
        <div style={{ border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '20px 16px' }}>
          <AmountInput value={amount} onChange={setAmount} asset={asset} autoFocus invalid={amountError != null} onMax={available != null && available > 0n ? applyMax : undefined} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--tx3)' }}>
          <span>{isUnshield ? 'Spendable' : 'Public balance'} <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{availableLabel}</b></span>
          <span style={{ fontFamily: 'var(--fm)' }}>{isUnshield ? `To ${truncateMiddle(identity.stellarPublicKey, 4, 4)}` : `From ${truncateMiddle(identity.stellarPublicKey, 4, 4)}`}</span>
        </div>
        {isUnshield ? (
          <div>
            <div style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 }}>TO PUBLIC ADDRESS</div>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="G…" spellCheck={false} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1px solid ${recipient && !recipientValid ? 'var(--warn)' : 'var(--bd2)'}`, background: 'var(--card2)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fm)', outline: 'none' }} />
          </div>
        ) : null}
        {!poolEnabled ? <Callout tone="warn" title="Pool unavailable.">{`${asset} pool is not configured for this network.`}</Callout> : amountError ? <Callout tone="warn">{amountError}</Callout> : recipient && !recipientValid ? <Callout tone="warn">Enter a valid public Stellar address (G…).</Callout> : null}
        {isUnshield ? (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.45, cursor: 'pointer' }}>
            <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--dng)' }} />
            <span>I understand the destination &amp; amount will be visible on-chain.</span>
          </label>
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
        <Segmented options={TABS} value={tab} onChange={(value) => switchTab(value as Tab)} />
      </div>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 20px', borderBottom: '1px solid var(--bd)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: isUnshield ? 'rgba(229,103,92,.12)' : 'rgba(94,124,250,.14)', display: 'grid', placeItems: 'center', color: isUnshield ? 'var(--dng)' : 'var(--ac2)', fontSize: 16 }}>{isUnshield ? '⤺' : '⛉'}</span>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isUnshield ? 'Unshield · withdraw' : 'Shield · deposit'}</div>
          <div style={{ marginLeft: 'auto' }}><BoundaryBadge kind={isUnshield ? 'reveals-info' : 'public'} /></div>
        </div>
        {body}
      </div>
    </section>
  )
}

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  isShieldedAssetEnabled,
  parseAssetAmountToStroops,
  type AssetCode,
  type NetworkKey,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmPrivateProgressEvent,
  type XlmPrivateSubmitReport,
} from '@zk-fighter/core'
import { AmountInput, AssetSelector, Button, Callout, Card, ReviewCard, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, stroopsToAmountInput, sumSpendableStroops } from './format'
import { proofFlowModel } from './proofFlow'
import { ProofRun, type ProofRunCopy, type ProofTerminalInfo } from './ProofRun'
import { FlowHeader } from './flowChrome'
import type { WalletScreen } from './screens'

const ASSET_OPTIONS: readonly AssetCode[] = ['USDC', 'XLM']
const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }
const CONTENT_MAX = 560

type FlowStep = 'form' | 'review' | 'running' | 'result'

export interface PrivateFlowRunArgs {
  asset: AssetCode
  identity: WalletIdentity
  network: NetworkKey
  amountStroops: bigint
  recipient: string
  onStatus: (event: XlmPrivateProgressEvent) => void
}

export interface PrivateFlowConfig {
  title: string
  badge: ReactNode
  intro: { tone: 'info' | 'public' | 'warn'; title?: string; body: ReactNode }
  recipient: {
    label: string
    placeholder: string
    multiline: boolean
    initial: (identity: WalletIdentity) => string
    validate: (value: string, network: NetworkKey) => string | null
    reviewLabel: string
    reviewValue?: (value: string) => string
  }
  ack?: ReactNode
  reviewWarn?: { title: string; body: ReactNode }
  submitVerb: string
  run: (args: PrivateFlowRunArgs) => Promise<XlmPrivateSubmitReport>
  proofCopy: (amountLabel: string, recipient: string) => ProofRunCopy
}

interface PrivateFlowScreenProps {
  config: PrivateFlowConfig
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

function spendableFor(balance: ShieldedBalanceState, asset: AssetCode): bigint | null {
  const report: XlmNotesReport | null = asset === 'XLM' ? balance.xlm : balance.usdc
  if (!report || report.status !== 'loaded') return null
  return sumSpendableStroops(report.notes)
}

function spendableSublabel(balance: ShieldedBalanceState, code: AssetCode): string | undefined {
  const spendable = spendableFor(balance, code)
  if (spendable == null) return balance.loading ? 'Shielded …' : undefined
  return `Shielded ${formatStroops(spendable, DISPLAY_DECIMALS[code])}`
}

function recipientFieldStyle(invalid: boolean): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    borderRadius: 11,
    border: `1px solid ${invalid ? 'var(--warn)' : 'var(--bd)'}`,
    background: 'var(--card2)',
    color: 'var(--tx)',
    fontFamily: 'var(--fm)',
    fontSize: 12.5,
    resize: 'vertical',
    outline: 'none',
  }
}

export function PrivateFlowScreen({ config, identity, network, balance, onNav }: PrivateFlowScreenProps) {
  const [step, setStep] = useState<FlowStep>('form')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState(() => config.recipient.initial(identity))
  const [ack, setAck] = useState(false)
  const [events, setEvents] = useState<readonly XlmPrivateProgressEvent[]>([])
  const [report, setReport] = useState<XlmPrivateSubmitReport | null>(null)
  const runIdRef = useRef(0)

  const poolEnabled = isShieldedAssetEnabled(network, asset)
  const spendable = spendableFor(balance, asset)
  const parsed = parseAssetAmountToStroops(amount, asset)
  const overBalance = parsed.ok && spendable != null && parsed.stroops > spendable
  const amountError =
    amount.trim() === '' ? null : !parsed.ok ? parsed.error : overBalance ? `Amount exceeds your shielded ${asset} balance.` : null
  const recipientError = recipient.trim() === '' ? null : config.recipient.validate(recipient, network)
  const recipientReady = recipient.trim() !== '' && recipientError == null
  const ackOk = config.ack ? ack : true
  const canReview = poolEnabled && parsed.ok && !overBalance && recipientReady && ackOk
  const amountLabel = `${amount.trim() || '0'} ${asset}`

  function applyMax() {
    if (spendable != null && spendable > 0n) setAmount(stroopsToAmountInput(spendable))
  }

  async function runAction() {
    if (!parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    try {
      const result = await config.run({
        asset,
        identity,
        network,
        amountStroops: parsed.stroops,
        recipient: recipient.trim(),
        onStatus: (event) => {
          if (runIdRef.current === runId) setEvents((prev) => [...prev, event])
        },
      })
      if (runIdRef.current !== runId) return
      setReport(result)
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      if (runIdRef.current !== runId) return
      // submitXlmPrivateTransfer/Withdrawal return failed/blocked reports rather than
      // throwing, so reaching here is a truly unexpected rejection where we do NOT know
      // whether a transaction was broadcast. Leave the report null so ProofRun routes to
      // its honest "Lost track — check Activity" branch, never a "no funds moved" claim.
      console.error('[PrivateFlowScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        runIdRef.current += 1
      }
    }
  }

  const section: CSSProperties = { width: '100%', maxWidth: CONTENT_MAX, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }
  const cardStyle: CSSProperties = { padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }

  let onBack: () => void
  let body: ReactNode

  if (step === 'running' || step === 'result') {
    const model = proofFlowModel(events, step === 'result' && report ? report.status : undefined)
    const terminal: ProofTerminalInfo | null =
      step === 'result' && report
        ? { status: report.status, submitReached: report.submitReached, explorerUrls: report.explorerUrls, error: report.error ?? report.blockers[0] }
        : null
    onBack = () => onNav('home')
    body = (
      <ProofRun
        model={model}
        settled={step === 'result'}
        terminal={terminal}
        network={network}
        copy={config.proofCopy(amountLabel, recipient.trim())}
        onDone={() => onNav('home')}
        onActivity={() => onNav('activity')}
        onRetry={() => setStep('review')}
        onHome={() => onNav('home')}
      />
    )
  } else if (step === 'review') {
    onBack = () => setStep('form')
    const reviewValue = config.recipient.reviewValue ? config.recipient.reviewValue(recipient.trim()) : truncateMiddle(recipient.trim(), 8, 6)
    body = (
      <>
        <ReviewCard
          rows={[
            { label: 'Amount', value: amountLabel, mono: true },
            { label: config.recipient.reviewLabel, value: reviewValue, mono: true },
            { label: 'Network', value: network },
            { label: 'Network fee', value: 'Paid in XLM at submit' },
          ]}
        />
        {config.reviewWarn ? <Callout tone="warn" title={config.reviewWarn.title}>{config.reviewWarn.body}</Callout> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button fullWidth onClick={runAction}>{`${config.submitVerb} ${amountLabel}`}</Button>
          <Button variant="ghost" fullWidth onClick={() => setStep('form')}>← Edit</Button>
        </div>
      </>
    )
  } else {
    onBack = () => onNav('home')
    body = (
      <>
        <Callout tone={config.intro.tone} title={config.intro.title}>{config.intro.body}</Callout>
        <AssetSelector
          options={ASSET_OPTIONS.map((code) => ({ code, sublabel: spendableSublabel(balance, code) }))}
          value={asset}
          onChange={(code) => setAsset(code as AssetCode)}
        />
        <div style={{ padding: '16px 0 4px' }}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            asset={asset}
            autoFocus
            invalid={amountError != null}
            caption={`${asset} · from shielded balance`}
            onMax={spendable != null && spendable > 0n ? applyMax : undefined}
          />
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{config.recipient.label}</span>
          {config.recipient.multiline ? (
            <textarea value={recipient} onChange={(event) => setRecipient(event.target.value)} rows={3} placeholder={config.recipient.placeholder} style={recipientFieldStyle(recipientError != null)} />
          ) : (
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={config.recipient.placeholder} style={recipientFieldStyle(recipientError != null)} />
          )}
        </label>
        {recipientError ? <Callout tone="warn">{recipientError}</Callout> : !poolEnabled ? (
          <Callout tone="warn" title="Pool unavailable.">{`${asset} pool is not configured for this network.`}</Callout>
        ) : amountError ? (
          <Callout tone="warn">{amountError}</Callout>
        ) : null}
        {config.ack ? (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} style={{ marginTop: 2 }} />
            <span>{config.ack}</span>
          </label>
        ) : null}
        <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>Review</Button>
      </>
    )
  }

  return (
    <section style={section}>
      <FlowHeader title={config.title} onBack={onBack} badge={config.badge} />
      <Card style={cardStyle}>{body}</Card>
    </section>
  )
}

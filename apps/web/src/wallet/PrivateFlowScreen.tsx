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
import { AmountInput, Button, Callout, Segmented } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, stroopsToAmountInput, sumSpendableStroops } from './format'
import { proofFlowModel } from './proofFlow'
import { ProofRun, type ProofRunCopy, type ProofTerminalInfo } from './ProofRun'
import { FlowStepRail } from './flowChrome'
import type { WalletScreen } from './screens'
import { recordFlowFailure, recordPendingFlow, recordPrivateFlowResult } from './activityRecorders'

const ASSET_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'XLM', label: 'XLM' },
]
const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }
const RAIL_STEPS = ['Recipient & amount', 'Review', 'Prove & send'] as const

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

const labelStyle: CSSProperties = { fontSize: 10, fontFamily: 'var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)' }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '13px 2px', borderTop: '1px solid var(--bd)', fontSize: 12.5, color: 'var(--tx2)' }}>
      {label}
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--tx)' }}>{children}</span>
    </div>
  )
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
  const decimals = DISPLAY_DECIMALS[asset]
  const spendableLabel = spendable != null ? `${formatStroops(spendable, decimals)} ${asset}` : balance.loading ? '…' : '—'
  const parsed = parseAssetAmountToStroops(amount, asset)
  const overBalance = parsed.ok && spendable != null && parsed.stroops > spendable
  const amountError =
    amount.trim() === '' ? null : !parsed.ok ? parsed.error : overBalance ? `Amount exceeds your shielded ${asset} balance.` : null
  const recipientError = recipient.trim() === '' ? null : config.recipient.validate(recipient, network)
  const recipientReady = recipient.trim() !== '' && recipientError == null
  const ackOk = config.ack ? ack : true
  const canReview = poolEnabled && parsed.ok && !overBalance && recipientReady && ackOk
  const amountLabel = `${amount.trim() || '0'} ${asset}`
  const presets = spendable != null && spendable > 0n ? [stroopsToAmountInput(spendable / 4n), stroopsToAmountInput(spendable / 2n)] : undefined
  const railCurrent = step === 'form' ? 0 : step === 'review' ? 1 : 2
  const stepLabel = step === 'form' ? 'Step 1 of 3' : step === 'review' ? 'Step 2 of 3' : step === 'running' ? 'Working…' : 'Done'

  function applyMax() {
    if (spendable != null && spendable > 0n) setAmount(stroopsToAmountInput(spendable))
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setRecipient(text.trim())
    } catch {
      /* clipboard blocked — user can type instead */
    }
  }

  async function runAction() {
    if (!parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    const activityArgs = {
      network,
      intent: 'send',
      boundary: 'shielded',
      asset,
      amountStroops: parsed.stroops.toString(),
    } as const
    const activity = recordPendingFlow(activityArgs)
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
      recordPrivateFlowResult(activity, activityArgs, result)
      setReport(result)
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      if (runIdRef.current !== runId) return
      recordFlowFailure(activity, activityArgs, cause, 'Private send failed before completion.')
      // submit fns return failed/blocked reports rather than throwing, so reaching here is a
      // genuinely unexpected rejection where we do NOT know whether a tx was broadcast — leave
      // the report null so ProofRun routes to its honest "lost track — check Activity" branch.
      console.error('[PrivateFlowScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        runIdRef.current += 1
      }
    }
  }

  let body: ReactNode
  if (step === 'running' || step === 'result') {
    const model = proofFlowModel(events, step === 'result' && report ? report.status : undefined)
    const terminal: ProofTerminalInfo | null =
      step === 'result' && report
        ? { status: report.status, submitReached: report.submitReached, explorerUrls: report.explorerUrls, error: report.error ?? report.blockers[0] }
        : null
    body = (
      <div style={{ padding: '24px 22px', flex: 1 }}>
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
      </div>
    )
  } else if (step === 'review') {
    const reviewValue = config.recipient.reviewValue ? config.recipient.reviewValue(recipient.trim()) : recipient.trim()
    const reveals = Boolean(config.reviewWarn)
    body = (
      <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 38, color: 'var(--tx)', letterSpacing: '-.02em' }}>{amount.trim() || '0'}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{asset} · {reveals ? 'unshield to public' : 'shielded send'}</div>
        </div>
        <Row label={config.recipient.reviewLabel}>{reviewValue}</Row>
        <Row label="Amount">{amountLabel}</Row>
        <Row label="Network fee">Paid in XLM at submit</Row>
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 2px', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', fontSize: 12.5, color: 'var(--tx2)' }}>
          Visibility
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: reveals ? 'var(--warn)' : 'var(--ac2)' }}>
            <span style={{ width: 7, height: 7, border: `1.4px solid ${reveals ? 'var(--warn)' : 'var(--ac2)'}`, transform: 'rotate(45deg)' }} />
            {reveals ? 'Public on Stellar' : 'Fully shielded'}
          </span>
        </div>
        {config.reviewWarn ? <Callout tone="danger" title={config.reviewWarn.title}>{config.reviewWarn.body}</Callout> : null}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 6, padding: '13px 14px', border: '1px solid rgba(94,124,250,.28)', borderRadius: 12, background: 'rgba(94,124,250,.06)' }}>
          <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 7, background: 'rgba(94,124,250,.18)', display: 'grid', placeItems: 'center', color: 'var(--ac2)', fontSize: 13 }}>⏱</span>
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--tx2)' }}>Generating the proof takes <b style={{ color: 'var(--tx)' }}>~6 seconds</b> on this device. Keep this tab open until it confirms.</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
          <Button variant="secondary" onClick={() => setStep('form')}>Back</Button>
          <Button fullWidth onClick={runAction}>{`Generate proof & ${config.submitVerb.toLowerCase()}`}</Button>
        </div>
      </div>
    )
  } else {
    body = (
      <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        <div>
          <div style={{ ...labelStyle, marginBottom: 9 }}>{config.recipient.label.toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', border: `1px solid ${recipientError ? 'var(--warn)' : 'var(--bd2)'}`, borderRadius: 13, background: 'var(--card)' }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: 'rgba(94,124,250,.15)', display: 'grid', placeItems: 'center', color: 'var(--ac2)', fontSize: 14 }}>◇</span>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder={config.recipient.placeholder}
              spellCheck={false}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontSize: 12.5 }}
            />
            <button type="button" onClick={paste} style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--ac2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Paste</button>
          </div>
          {recipientReady ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10.5, color: 'var(--pos)' }}>✓ Valid · {config.reviewWarn ? 'public destination' : 'amount & identity stay hidden'}</div>
          ) : recipientError ? (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warn)' }}>{recipientError}</div>
          ) : null}
        </div>

        {isShieldedAssetEnabled(network, 'XLM') ? (
          <Segmented options={ASSET_OPTIONS} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
        ) : null}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 9 }}>
            <span style={labelStyle}>AMOUNT</span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--tx3)' }}>Spendable <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{spendableLabel}</b></span>
          </div>
          <div style={{ border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '18px 16px' }}>
            <AmountInput
              value={amount}
              onChange={setAmount}
              asset={asset}
              autoFocus
              invalid={amountError != null}
              onMax={spendable != null && spendable > 0n ? applyMax : undefined}
              presets={presets}
              onPreset={setAmount}
            />
          </div>
          {!poolEnabled ? (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warn)' }}>{asset} pool is not configured for this network.</div>
          ) : amountError ? (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warn)' }}>{amountError}</div>
          ) : null}
        </div>

        {config.ack ? (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} style={{ marginTop: 2, accentColor: 'var(--dng)' }} />
            <span>{config.ack}</span>
          </label>
        ) : null}

        <Button fullWidth disabled={!canReview} onClick={() => setStep('review')} style={{ marginTop: 'auto' }}>Continue to review</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 30, justifyContent: 'center', alignItems: 'stretch', padding: '34px 28px', flexWrap: 'wrap' }}>
      <FlowStepRail
        title={config.title}
        steps={RAIL_STEPS}
        current={railCurrent}
        note={<>Proving runs <b style={{ color: 'var(--tx)' }}>on your device</b>. {config.reviewWarn ? 'Only the public boundary is visible on Stellar.' : 'Nothing about this payment touches the public chain.'}</>}
      />
      <div style={{ width: 440, maxWidth: '100%', minHeight: 560, background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent 36%), var(--panel)', border: '1px solid var(--bd2)', borderRadius: 22, boxShadow: '0 50px 120px -50px #000, 0 0 0 1px rgba(0,0,0,.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '18px 22px', borderBottom: '1px solid var(--bd)' }}>
          {config.badge}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{stepLabel}</span>
        </div>
        {body}
      </div>
    </div>
  )
}

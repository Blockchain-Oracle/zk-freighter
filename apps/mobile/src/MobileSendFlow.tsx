import { useEffect, useMemo, useState } from 'react'
import { Button, Callout } from '@zk-freighter/ui'
import { decodeReceiveCode, submitPublicStellarPayment, type AssetCode, type PublicStellarPaymentReport, type XlmPrivateSubmitReport } from '@zk-freighter/core'
import { AmountBox, Field, FlowScreen, ResultCard, Segment, type FlowProps } from './MobileFlowPrimitives'
import { runMobilePrivateTransfer } from './mobile-runtime'
import { formatAssetAmount, noteBalance, summarizeError } from './mobile-format'
import { parseMobileAmount, privateReportExplorer, privateReportHash, reportStatus, STELLAR_ADDRESS } from './mobile-flow-helpers'
import { recordMobileActivity, updateMobileActivity } from './mobile-storage'

type SendMode = 'private' | 'public'

interface SendProps extends FlowProps {
  readonly initialCode?: string
  readonly initialMode?: SendMode
}

export function MobileSend({ network, identity, publicBalances, shieldedCache, initialCode, initialMode, onRoute, onSync, onPublicRefresh }: SendProps) {
  const [mode, setMode] = useState<SendMode>(initialMode ?? 'private')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [recipient, setRecipient] = useState(initialCode ?? '')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [events, setEvents] = useState<string[]>([])
  const [report, setReport] = useState<XlmPrivateSubmitReport | PublicStellarPaymentReport | null>(null)
  const parsed = useMemo(() => parseMobileAmount(amount, asset), [amount, asset])
  const available = mode === 'public' ? publicBalances?.balances[asset] ?? null : shieldedBalance(shieldedCache, asset)
  const recipientError = validateRecipient(mode, recipient, network)
  const amountError = amount.trim() && !parsed.ok ? parsed.error : parsed.ok && available !== null && parsed.stroops > available ? `Amount exceeds available ${asset}.` : ''
  const canSend = parsed.ok && !recipientError && !amountError && !submitting

  useEffect(() => {
    if (initialCode) setRecipient(initialCode)
    if (initialMode) setMode(initialMode)
  }, [initialCode, initialMode])

  async function send() {
    if (!parsed.ok) return
    setSubmitting(true); setEvents([]); setReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'send', boundary: mode === 'private' ? 'shielded' : 'public', status: 'pending', asset, amountStroops: parsed.stroops.toString() })
    try {
      if (mode === 'private') {
        const next = await runMobilePrivateTransfer({
          asset,
          identity,
          network,
          amountStroops: parsed.stroops,
          receiveCode: recipient.trim(),
          onStatus: (event) => setEvents((items) => [...items, event.message]),
        })
        updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: privateReportHash(next), explorerUrl: privateReportExplorer(next), error: next.error ?? next.blockers[0] })
        setReport(next)
        if (next.status === 'submitted') void onSync()
      } else {
        const next = await submitPublicStellarPayment({ identity, network, asset, amountStroops: parsed.stroops, recipientAddress: recipient.trim() })
        updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: next.txHash, explorerUrl: next.explorerUrl, error: next.error ?? next.blockers[0] })
        setReport(next)
        if (next.status === 'submitted') onPublicRefresh?.()
      }
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Send failed before completion.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FlowScreen title="Send" badge={mode === 'private' ? 'shielded' : 'public'} active={submitting} onBack={() => onRoute('home')}>
      <Segment value={mode} options={[['private', 'Private send'], ['public', 'Public send']]} onChange={(value) => { setMode(value); setRecipient(''); setReport(null); setEvents([]) }} />
      <p className="flow-copy">{mode === 'private' ? 'Pay a private receive code with a real shielded transfer.' : 'Send a normal Stellar payment. Recipient and amount are public on-chain.'}</p>
      <Field label={mode === 'private' ? 'Private receive code' : 'Public Stellar address'} value={recipient} placeholder={mode === 'private' ? 'zkf1...' : 'G...'} onChange={setRecipient} mono />
      {recipientError ? <Callout tone="warn">{recipientError}</Callout> : null}
      <AmountBox asset={asset} amount={amount} available={available} error={amountError || null} onAsset={(next) => { setAsset(next); setAmount('') }} onAmount={setAmount} onMax={() => setAmount(maxText(available, asset))} />
      <section className="phase-card compact">
        {(mode === 'private' ? ['Pool sync', 'Proof inputs', 'Generate proof', 'Submit', 'Confirm'] : ['Balance', 'Recipient', 'Fee', 'Submit', 'Confirm']).map((label, index) => <div key={label} className={events.length > index ? 'done' : ''}><span>{events.length > index ? '✓' : index + 1}</span>{label}</div>)}
      </section>
      {events.length ? <section className="mobile-log">{events.slice(-4).map((event, index) => <span key={`${event}-${index}`}>{event}</span>)}</section> : null}
      <Button fullWidth loading={submitting} disabled={!canSend} onClick={() => void send()}>{mode === 'private' ? 'Prove & send' : 'Send public payment'}</Button>
      {report ? <SendResult report={report} /> : null}
    </FlowScreen>
  )
}

function validateRecipient(mode: SendMode, value: string, network: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (mode === 'public') return STELLAR_ADDRESS.test(trimmed) ? '' : 'Enter a valid public Stellar address.'
  const decoded = decodeReceiveCode(trimmed)
  if (!decoded.ok) return 'Enter a valid private receive code.'
  return decoded.value.network === network ? '' : `This private code is for ${decoded.value.network}.`
}

function SendResult({ report }: { readonly report: XlmPrivateSubmitReport | PublicStellarPaymentReport }) {
  const submitted = report.status === 'submitted'
  const isPrivate = 'txHashes' in report
  const explorer = isPrivate ? privateReportExplorer(report) : report.explorerUrl
  const detail = submitted ? (isPrivate ? privateReportHash(report) : report.txHash) : report.error ?? report.blockers[0]
  return <ResultCard tone={submitted ? 'ok' : 'warn'} title={submitted ? 'Send submitted' : 'Send failed'} detail={detail ? summarizeError(detail) : undefined} href={explorer} />
}

function shieldedBalance(cache: FlowProps['shieldedCache'], asset: AssetCode): bigint | null {
  return noteBalance(asset === 'XLM' ? cache?.xlm ?? null : cache?.usdc ?? null)
}

function maxText(value: bigint | null, asset: AssetCode): string {
  if (value === null) return ''
  return formatAssetAmount(value, asset).replace(` ${asset}`, '').replaceAll(',', '')
}

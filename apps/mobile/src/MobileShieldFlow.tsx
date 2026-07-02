import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, Callout } from '@zk-freighter/ui'
import { isShieldedAssetEnabled, maxShieldDepositStroops, type AssetCode, type ShieldWithPrerequisitesReport, type XlmPrivateSubmitReport } from '@zk-freighter/core'
import { AmountBox, Field, FlowScreen, ResultCard, Segment, type FlowProps } from './MobileFlowPrimitives'
import { runMobileShield, runMobileUnshield } from './mobile-runtime'
import { formatAssetAmount, noteBalance, summarizeError } from './mobile-format'
import { parseMobileAmount, privateReportExplorer, privateReportHash, reportStatus, shieldReportExplorer, shieldReportHash, STELLAR_ADDRESS, XLM_FEE_RESERVE_BUFFER_STROOPS } from './mobile-flow-helpers'
import { recordMobileActivity, updateMobileActivity } from './mobile-storage'

type ShieldMode = 'shield' | 'unshield'

interface ShieldProps extends FlowProps {
  readonly initialMode?: ShieldMode
}

export function MobileShield({ network, identity, publicBalances, shieldedCache, syncStatus, initialMode, onRoute, onSync, onPublicRefresh }: ShieldProps) {
  const [mode, setMode] = useState<ShieldMode>(initialMode ?? 'shield')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState(identity.stellarPublicKey)
  const [ack, setAck] = useState(false)
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<string[]>([])
  const [report, setReport] = useState<ShieldWithPrerequisitesReport | XlmPrivateSubmitReport | null>(null)
  const parsed = useMemo(() => parseMobileAmount(amount, asset), [amount, asset])
  const available = mode === 'shield' ? publicBalances?.balances[asset] ?? null : noteBalance(asset === 'XLM' ? shieldedCache?.xlm ?? null : shieldedCache?.usdc ?? null)
  const poolMax = mode === 'shield' ? maxShieldDepositStroops(network, asset) : null
  const recipientError = mode === 'unshield' && !STELLAR_ADDRESS.test(recipient.trim()) ? 'Enter a valid public Stellar address.' : ''
  const amountError = amount.trim() && !parsed.ok ? parsed.error : parsed.ok && available !== null && parsed.stroops > available ? `Amount exceeds available ${asset}.` : parsed.ok && poolMax !== null && parsed.stroops > poolMax ? `Pool limit is ${formatAssetAmount(poolMax, asset)}.` : ''
  const canRun = isShieldedAssetEnabled(network, asset) && parsed.ok && !amountError && !recipientError && (mode === 'shield' || ack) && !running

  async function submit() {
    if (!parsed.ok) return
    setRunning(true); setEvents([]); setReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: mode === 'shield' ? 'shield' : 'unshield', boundary: 'public', status: 'pending', asset, amountStroops: parsed.stroops.toString() })
    try {
      if (mode === 'shield') {
        const next = await runMobileShield({
          asset,
          identity,
          network,
          amountStroops: parsed.stroops,
          onPrerequisiteStatus: (event) => setEvents((items) => [...items, event.message]),
          onStatus: (event) => setEvents((items) => [...items, event.message]),
        })
        updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: shieldReportHash(next), explorerUrl: shieldReportExplorer(next), error: next.error ?? next.blockers[0] })
        setReport(next)
        if (next.status === 'submitted') { void onSync(); onPublicRefresh?.() }
      } else {
        const next = await runMobileUnshield({
          asset,
          identity,
          network,
          amountStroops: parsed.stroops,
          recipientAddress: recipient.trim(),
          onStatus: (event) => setEvents((items) => [...items, event.message]),
        })
        updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: privateReportHash(next), explorerUrl: privateReportExplorer(next), error: next.error ?? next.blockers[0] })
        setReport(next)
        if (next.status === 'submitted') { void onSync(); onPublicRefresh?.() }
      }
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Boundary action failed before completion.' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <FlowScreen title={mode === 'shield' ? 'Shield' : 'Unshield'} badge={mode === 'shield' ? 'public' : 'reveals'} active={running} onBack={() => onRoute('home')}>
      <Segment value={mode} options={[['shield', 'Shield'], ['unshield', 'Unshield']]} onChange={(next) => { setMode(next); setAmount(''); setReport(null); setEvents([]) }} />
      <p className="flow-copy">{mode === 'shield' ? 'Deposit is public. Privacy starts after funds enter the shielded pool.' : 'Withdraw reveals destination and amount on Stellar.'}</p>
      <AmountBox asset={asset} amount={amount} available={available} error={amountError || null} onAsset={(next) => { setAsset(next); setAmount('') }} onAmount={setAmount} onMax={() => setAmount(maxAmount(available, poolMax, mode, asset))} />
      {mode === 'unshield' ? <Field label="Destination public account" value={recipient} placeholder="G..." onChange={setRecipient} mono /> : null}
      {recipientError ? <Callout tone="warn">{recipientError}</Callout> : null}
      {mode === 'unshield' ? <label className="ack-row"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> Destination and amount will be visible on-chain.</label> : <Callout tone="public" title="Setup runs automatically.">ZK Freighter checks balance, USDC receiving, shield access, pool sync, proof, submit, and confirm in one run.</Callout>}
      <section className="phase-card">
        {['Balance / setup', 'Pool sync', 'Proof inputs', 'Generate proof', 'Submit and confirm'].map((label, index) => <div key={label} className={events.length > index ? 'done' : ''}><span>{events.length > index ? '✓' : index + 1}</span>{label}</div>)}
      </section>
      {events.length ? <section className="mobile-log">{events.slice(-5).map((event, index) => <span key={`${event}-${index}`}>{event}</span>)}</section> : null}
      <div className="flow-actions">
        <Button fullWidth variant="secondary" loading={syncStatus === 'syncing'} onClick={() => void onSync()}><RefreshCw size={15} /> Sync balance</Button>
        <Button fullWidth loading={running} disabled={!canRun} onClick={() => void submit()}>{mode === 'shield' ? 'Shield' : 'Unshield'}</Button>
      </div>
      {report ? <BoundaryResult report={report} mode={mode} /> : null}
    </FlowScreen>
  )
}

function BoundaryResult({ report, mode }: { readonly report: ShieldWithPrerequisitesReport | XlmPrivateSubmitReport; readonly mode: ShieldMode }) {
  const submitted = report.status === 'submitted'
  const explorer = mode === 'shield' ? shieldReportExplorer(report as ShieldWithPrerequisitesReport) : privateReportExplorer(report as XlmPrivateSubmitReport)
  const detail = submitted ? (mode === 'shield' ? shieldReportHash(report as ShieldWithPrerequisitesReport) : privateReportHash(report as XlmPrivateSubmitReport)) : report.error ?? report.blockers[0]
  return <ResultCard tone={submitted ? 'ok' : 'warn'} title={submitted ? `${mode === 'shield' ? 'Deposit' : 'Unshield'} submitted` : `${mode === 'shield' ? 'Deposit' : 'Unshield'} did not submit`} detail={detail ? summarizeError(detail) : undefined} href={explorer} />
}

function maxAmount(available: bigint | null, poolMax: bigint | null, mode: ShieldMode, asset: AssetCode): string {
  if (available === null) return ''
  const reserve = mode === 'shield' && asset === 'XLM' ? XLM_FEE_RESERVE_BUFFER_STROOPS : 0n
  let next = available > reserve ? available - reserve : 0n
  if (poolMax !== null && next > poolMax) next = poolMax
  return formatAssetAmount(next, asset).replace(` ${asset}`, '').replaceAll(',', '')
}

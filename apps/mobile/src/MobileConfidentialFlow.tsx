import { useEffect, useMemo, useState } from 'react'
import { Button, Callout } from '@zk-fighter/ui'
import {
  getConfidentialConfig,
  loadConfidentialBalance,
  loadIncomingHistory,
  readConfidentialRegistration,
  submitConfidentialDeposit,
  submitConfidentialMerge,
  type ConfidentialRegistration,
  type ConfidentialSubmitReport,
} from '@zk-fighter/core'
import { Field, FlowScreen, ResultCard, Segment, type FlowProps } from './MobileFlowPrimitives'
import { loadCircuit, reportStatus, STELLAR_ADDRESS } from './mobile-flow-helpers'
import { runMobilePrivateJob } from './mobile-runtime'
import { recordMobileActivity, updateMobileActivity } from './mobile-storage'
import { summarizeError, truncateMiddle } from './mobile-format'

type ConfidentialOp = 'transfer' | 'deposit' | 'withdraw'

export function MobileConfidential({ network, identity, onRoute }: FlowProps) {
  const config = getConfidentialConfig(network)
  const [registration, setRegistration] = useState<ConfidentialRegistration | 'loading'>('loading')
  const [op, setOp] = useState<ConfidentialOp>('transfer')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [report, setReport] = useState<ConfidentialSubmitReport | null>(null)
  const [tick, setTick] = useState(0)
  const [scanMessage, setScanMessage] = useState('')
  const decimals = config?.underlyingDecimals ?? 7
  const code = config?.underlyingCode ?? 'USDC'
  const balance = config ? loadConfidentialBalance(network, config.tokenId, identity.stellarPublicKey) : null
  const history = config ? loadIncomingHistory(network, config.tokenId, identity.stellarPublicKey) : []
  const amountBase = useMemo(() => parseUnits(amount, decimals), [amount, decimals])
  const needsRecipient = op !== 'deposit'
  const recipientError = needsRecipient && !STELLAR_ADDRESS.test(recipient.trim()) ? 'Enter a valid Stellar address.' : ''
  const overSpend = amountBase.ok && needsRecipient && balance !== null && amountBase.value > balance.spendable.v
  const canSubmit = registration === 'registered' && amountBase.ok && !recipientError && !overSpend && !busy

  useEffect(() => {
    let cancelled = false
    setRegistration('loading')
    void readConfidentialRegistration({ identity, network }).then((next) => { if (!cancelled) setRegistration(next) })
    return () => { cancelled = true }
  }, [identity, network, tick])

  async function register() {
    setBusy('register'); setReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'confidentialSetup', boundary: 'public', status: 'pending' })
    try {
      const [{ submitConfidentialRegister }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/register'), loadCircuit('circuit_register')])
      const next = await runMobilePrivateJob(() => submitConfidentialRegister({ identity, network, circuit: circuit as never }))
      setReport(next)
      updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: next.txHash, explorerUrl: next.explorerUrl, error: next.error ?? next.blockers[0] })
      if (next.status === 'submitted') setTick((value) => value + 1)
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Confidential setup failed.' })
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    if (!amountBase.ok) return
    setBusy(op); setReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'confidential', boundary: op === 'deposit' || op === 'withdraw' ? 'public' : 'shielded', status: 'pending', asset: 'USDC', amountStroops: amountBase.value.toString() })
    try {
      const next = await runMobilePrivateJob(() => dispatch(op, amountBase.value))
      setReport(next)
      updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: next.txHash, explorerUrl: next.explorerUrl, error: next.error ?? next.blockers[0] })
      if (next.status === 'submitted') setTick((value) => value + 1)
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : `Confidential ${op} failed.` })
    } finally {
      setBusy(null)
    }
  }

  async function dispatch(kind: ConfidentialOp, value: bigint): Promise<ConfidentialSubmitReport> {
    if (kind === 'deposit') return submitConfidentialDeposit({ identity, network, amount: value })
    if (kind === 'withdraw') {
      const [{ submitConfidentialWithdraw }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/withdraw'), loadCircuit('circuit_withdraw')])
      return submitConfidentialWithdraw({ identity, network, amount: value, to: recipient.trim(), circuit: circuit as never })
    }
    const [{ submitConfidentialTransfer }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/transfer'), loadCircuit('circuit_transfer')])
    return submitConfidentialTransfer({ identity, network, amount: value, to: recipient.trim(), circuit: circuit as never })
  }

  async function scanIncoming() {
    setBusy('scan'); setScanMessage('')
    try {
      const { scanConfidentialIncoming } = await import('@zk-fighter/core/confidential/receive')
      const result = await runMobilePrivateJob(() => scanConfidentialIncoming({ identity, network }))
      setScanMessage(result.receipts.length > 0 ? `Found ${result.receipts.length} transfer(s), credited ${formatUnits(result.creditedTotal, decimals)} ${code}.` : 'No new incoming transfers found.')
      if (result.receipts.length > 0) setTick((value) => value + 1)
    } finally {
      setBusy(null)
    }
  }

  async function merge() {
    setBusy('merge'); setReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'confidential', boundary: 'shielded', status: 'pending', asset: 'USDC' })
    try {
      const next = await runMobilePrivateJob(() => submitConfidentialMerge({ identity, network }))
      setReport(next)
      updateMobileActivity(activity.id, { status: reportStatus(next.status), txHash: next.txHash, explorerUrl: next.explorerUrl, error: next.error ?? next.blockers[0] })
      if (next.status === 'submitted') setTick((value) => value + 1)
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Confidential merge failed.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <FlowScreen title="Confidential" badge="testnet" active={!!busy} onBack={() => onRoute('more')}>
      {!config ? <Callout tone="warn" title="Testnet only.">Confidential tokens are not configured for this network.</Callout> : null}
      <section className="confidential-card">
        <span>CONFIDENTIAL · {code}</span>
        <strong>{registration === 'registered' ? formatUnits(balance?.spendable.v ?? 0n, decimals) : '--'}</strong>
        <em>{registration === 'registered' ? 'spendable hidden amount' : registration === 'loading' ? 'checking account...' : 'setup required'}</em>
      </section>
      {registration !== 'registered' ? <Button fullWidth loading={busy === 'register'} disabled={!config || !!busy} onClick={() => void register()}>Set up confidential account</Button> : (
        <>
          <Segment value={op} options={[['transfer', 'Transfer'], ['deposit', 'Deposit'], ['withdraw', 'Withdraw']]} onChange={setOp} />
          {needsRecipient ? <Field label={op === 'withdraw' ? 'Public destination' : 'Recipient confidential account'} value={recipient} placeholder="G..." onChange={setRecipient} mono /> : null}
          <Field label="Amount" value={amount} placeholder="0.00" onChange={setAmount} mono />
          {recipientError ? <Callout tone="warn">{recipientError}</Callout> : overSpend ? <Callout tone="warn">Amount exceeds spendable confidential balance.</Callout> : null}
          <Button fullWidth loading={busy === op} disabled={!canSubmit} onClick={() => void submit()}>{op[0].toUpperCase() + op.slice(1)} {code}</Button>
          <div className="flow-actions">
            <Button variant="secondary" loading={busy === 'scan'} onClick={() => void scanIncoming()}>Check incoming</Button>
            <Button variant="secondary" loading={busy === 'merge'} onClick={() => void merge()}>Merge to spend</Button>
          </div>
          {scanMessage ? <Callout tone="info">{scanMessage}</Callout> : null}
          {history[0] ? <ResultCard tone="info" title="Latest incoming" detail={`${formatUnits(BigInt(history[0].amount), decimals)} ${code} · ${truncateMiddle(history[0].txHash, 8, 5)}`} /> : null}
        </>
      )}
      {report ? <ConfidentialResult report={report} /> : null}
    </FlowScreen>
  )
}

function ConfidentialResult({ report }: { readonly report: ConfidentialSubmitReport }) {
  const ok = report.status === 'submitted'
  return <ResultCard tone={ok ? 'ok' : 'warn'} title={ok ? `Confidential ${report.op} submitted` : `Confidential ${report.op} failed`} detail={ok ? report.txHash : summarizeError(report.error ?? report.blockers[0])} href={report.explorerUrl} />
}

function parseUnits(value: string, decimals: number): { ok: true; value: bigint } | { ok: false; error: string } {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/u.test(trimmed)) return { ok: false, error: 'Enter a valid amount.' }
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return { ok: false, error: `At most ${decimals} decimal places.` }
  const parsed = BigInt(`${whole}${frac.padEnd(decimals, '0')}`)
  return parsed > 0n ? { ok: true, value: parsed } : { ok: false, error: 'Amount must be greater than zero.' }
}

function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  return `${(value / base).toLocaleString('en-US')}.${(value % base).toString().padStart(decimals, '0').slice(0, 2)}`
}

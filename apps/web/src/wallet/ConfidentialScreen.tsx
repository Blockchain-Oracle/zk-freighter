import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  getConfidentialConfig,
  loadConfidentialBalance,
  readConfidentialRegistration,
  submitConfidentialDeposit,
  submitConfidentialMerge,
  type ConfidentialRegistration,
  type ConfidentialSubmitEvent,
  type ConfidentialSubmitReport,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { AmountInput, Button, Callout, Card, ReviewCard, truncateMiddle } from '@zk-fighter/ui'
import { BoundaryPill, FlowHeader } from './flowChrome'
import type { WalletScreen } from './screens'

const CONTENT_MAX = 560
type SpendOp = 'deposit' | 'withdraw' | 'transfer'
type Step = 'idle' | 'review' | 'running' | 'result'
type RunKind = SpendOp | 'merge' | 'register'

interface ConfidentialScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  onNav: (screen: WalletScreen) => void
}

function toBaseUnits(input: string, decimals: number): { ok: true; value: bigint } | { ok: false; error: string } {
  const trimmed = input.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: 'Enter a valid amount.' }
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return { ok: false, error: `At most ${decimals} decimal places.` }
  const value = BigInt(`${whole}${frac.padEnd(decimals, '0')}`)
  if (value <= 0n) return { ok: false, error: 'Amount must be greater than zero.' }
  return { ok: true, value }
}

function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const frac = (value % base).toString().padStart(decimals, '0').slice(0, 2)
  return `${whole}.${frac}`
}

const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value.trim())

// Lazy-load a proof-gated op module + its compiled circuit only on demand.
async function loadCircuit(name: string): Promise<unknown> {
  const res = await fetch(`/circuits/${name}.json`)
  if (!res.ok) throw new Error(`failed to load ${name} circuit (${res.status})`)
  return res.json()
}

export function ConfidentialScreen({ identity, network, onNav }: ConfidentialScreenProps) {
  const confidential = getConfidentialConfig(network)
  const account = identity.stellarPublicKey
  const [regResult, setRegResult] = useState<{ key: string; status: ConfidentialRegistration } | null>(null)
  const [op, setOp] = useState<SpendOp>('deposit')
  const [step, setStep] = useState<Step>('idle')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [events, setEvents] = useState<readonly ConfidentialSubmitEvent[]>([])
  const [report, setReport] = useState<ConfidentialSubmitReport | null>(null)
  const [tick, setTick] = useState(0) // bump to re-read tracked balance after an op
  const runIdRef = useRef(0)
  const key = `${account}:${network}`

  useEffect(() => {
    let cancelled = false
    void readConfidentialRegistration({ identity, network }).then((status) => {
      if (!cancelled) setRegResult({ key, status })
    })
    return () => {
      cancelled = true
    }
  }, [identity, network, key])

  const registration: ConfidentialRegistration | 'loading' = regResult?.key === key ? regResult.status : 'loading'
  const registered = registration === 'registered'
  const decimals = confidential?.underlyingDecimals ?? 7
  // Re-read on every `tick` change (localStorage is the sync source of truth).
  const balance = confidential ? loadConfidentialBalance(network, confidential.tokenId, account) : null
  void tick
  const spendableLabel = balance ? `${formatUnits(balance.spendable.v, decimals)} ${confidential?.underlyingCode}` : '—'
  const receivingLabel = balance ? formatUnits(balance.receivingV, decimals) : '0'

  const parsed = confidential ? toBaseUnits(amount, decimals) : { ok: false as const, error: '' }
  const amountLabel = `${amount.trim() || '0'} ${confidential?.underlyingCode ?? ''}`
  const needsRecipient = op === 'withdraw' || op === 'transfer'
  const recipientValid = !needsRecipient || isStellarAddress(recipient)
  const overSpend = (op === 'withdraw' || op === 'transfer') && parsed.ok && balance != null && parsed.value > balance.spendable.v
  const amountError = amount.trim() === '' ? null : !parsed.ok ? parsed.error : overSpend ? 'Amount exceeds your spendable balance.' : null
  const canReview = registered && parsed.ok && !overSpend && recipientValid

  async function run(kind: RunKind) {
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    try {
      const result = await dispatch(kind)
      if (runIdRef.current !== runId || !result) return
      setEvents(result.statusEvents)
      setReport(result)
      if (result.status === 'submitted') {
        setTick((value) => value + 1)
        void readConfidentialRegistration({ identity, network }).then((status) => {
          if (runIdRef.current >= runId) setRegResult({ key, status })
        })
      }
    } catch (cause) {
      // Submit helpers return failed/blocked reports rather than throwing; a throw
      // here is a genuine fault — leave report null for the honest "unknown" branch.
      console.error('[ConfidentialScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        runIdRef.current += 1
      }
    }
  }

  async function dispatch(kind: RunKind): Promise<ConfidentialSubmitReport | null> {
    if (kind === 'merge') return submitConfidentialMerge({ identity, network })
    if (kind === 'register') {
      const [{ submitConfidentialRegister }, circuit] = await Promise.all([
        import('@zk-fighter/core/confidential/register'),
        loadCircuit('circuit_register'),
      ])
      return submitConfidentialRegister({ identity, network, circuit: circuit as never })
    }
    if (!parsed.ok) return null
    if (kind === 'deposit') return submitConfidentialDeposit({ identity, network, amount: parsed.value })
    if (kind === 'withdraw') {
      const [{ submitConfidentialWithdraw }, circuit] = await Promise.all([
        import('@zk-fighter/core/confidential/withdraw'),
        loadCircuit('circuit_withdraw'),
      ])
      return submitConfidentialWithdraw({ identity, network, amount: parsed.value, to: recipient.trim(), circuit: circuit as never })
    }
    const [{ submitConfidentialTransfer }, circuit] = await Promise.all([
      import('@zk-fighter/core/confidential/transfer'),
      loadCircuit('circuit_transfer'),
    ])
    return submitConfidentialTransfer({ identity, network, amount: parsed.value, to: recipient.trim(), circuit: circuit as never })
  }

  const section: CSSProperties = { width: '100%', maxWidth: CONTENT_MAX, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }
  const cardStyle: CSSProperties = { padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }
  const opMeta: Record<SpendOp, { verb: string; into: string; boundary: ReactNode }> = {
    deposit: { verb: 'Deposit', into: 'Confidential receiving balance', boundary: <Callout tone="public" title="Public boundary.">The deposit amount is visible on Stellar. Once inside, your balance is a hidden commitment.</Callout> },
    withdraw: { verb: 'Withdraw', into: `Public address ${truncateMiddle(recipient.trim() || account, 6, 6)}`, boundary: <Callout tone="public" title="Public boundary.">Unshielding makes the amount visible on Stellar as it lands in the public account.</Callout> },
    transfer: { verb: 'Transfer', into: `Confidential account ${truncateMiddle(recipient.trim(), 6, 6)}`, boundary: <Callout tone="info" title="Stays private.">A confidential transfer reveals no amount on-chain — only a commitment moves.</Callout> },
  }

  let onBack: () => void = () => onNav('home')
  let body: ReactNode

  if (!confidential) {
    body = <Callout tone="warn" title="Testnet only.">Confidential tokens run on Stellar testnet only — the proving backend is an unaudited preview. Switch to testnet.</Callout>
  } else if (step === 'running' || step === 'result') {
    onBack = () => setStep('idle')
    body = (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((event, index) => (
            <div key={index} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--tx2)' }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ac2)', minWidth: 64 }}>{event.stage}</span>
              <span>{event.message}</span>
            </div>
          ))}
          {step === 'running' ? <div style={{ fontSize: 13, color: 'var(--ac2)' }}>Generating the zero-knowledge proof on your device, then submitting to Stellar — keep this tab open.</div> : null}
        </div>
        {step === 'result' && report ? (
          report.status === 'submitted' ? (
            <Callout tone="info" title={`Confidential ${report.op} submitted`}>
              {report.op === 'register' ? 'Your confidential account is set up.' : report.op === 'merge' ? 'Received funds folded into spendable.' : report.op === 'deposit' ? 'Funds moved into your confidential balance.' : report.op === 'withdraw' ? 'Funds unshielded to the public address.' : 'Confidential transfer sent.'}
              {report.explorerUrl ? <> <a href={report.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ac2)' }}>View on explorer ↗</a></> : null}
            </Callout>
          ) : (
            <Callout tone="warn" title={`Confidential ${report.op} ${report.status}`}>{report.error ?? report.blockers[0] ?? 'Something went wrong.'}</Callout>
          )
        ) : null}
        {step === 'result' ? <Button fullWidth variant="ghost" onClick={() => setStep('idle')}>← Back to confidential</Button> : null}
      </>
    )
  } else if (step === 'review') {
    onBack = () => setStep('idle')
    body = (
      <>
        <ReviewCard rows={[{ label: 'Amount', value: amountLabel, mono: true }, { label: op === 'deposit' ? 'Into' : 'To', value: opMeta[op].into }, { label: 'Network', value: network }]} />
        {opMeta[op].boundary}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button fullWidth onClick={() => run(op)}>{`${opMeta[op].verb} ${amountLabel}`}</Button>
          <Button variant="ghost" fullWidth onClick={() => setStep('idle')}>← Edit</Button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <Callout tone="public">Confidential mode keeps balances on-chain as hidden commitments. Deposits and withdrawals cross the public boundary; transfers stay private.</Callout>
        {registration === 'loading' ? <Callout tone="info">Checking your confidential account status…</Callout>
          : registration === 'unavailable' ? <Callout tone="warn" title="Status unavailable.">Couldn’t read your confidential account right now.</Callout>
          : !registered ? (
            <>
              <Callout tone="warn" title="Make your account discoverable first.">A one-time on-chain proof derives your confidential keys and binds them to this contract. The other actions unlock once it lands.</Callout>
              <Button fullWidth onClick={() => run('register')}>Set up confidential account</Button>
            </>
          ) : (
            <Card style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Spendable</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{spendableLabel}</span>
              {balance && balance.receivingV > 0n ? <span style={{ fontSize: 11.5, color: 'var(--warn)' }}>+{receivingLabel} received · merge to spend</span> : null}
            </Card>
          )}

        {registered ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['deposit', 'withdraw', 'transfer'] as SpendOp[]).map((value) => (
                <button key={value} onClick={() => setOp(value)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${op === value ? 'var(--ac)' : 'var(--bd)'}`, background: op === value ? 'var(--ac)' : 'var(--card)', color: op === value ? '#fff' : 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{value}</button>
              ))}
            </div>
            <AmountInput value={amount} onChange={setAmount} asset={confidential.underlyingCode} invalid={amountError != null} caption={op === 'deposit' ? 'from public balance' : 'from spendable confidential balance'} />
            {needsRecipient ? (
              <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={op === 'withdraw' ? 'Public Stellar address (G…)' : 'Recipient confidential account (G…)'} spellCheck={false} style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1px solid ${recipient && !recipientValid ? 'var(--warn)' : 'var(--bd)'}`, background: 'var(--bg)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--fm)' }} />
            ) : null}
            {amountError ? <Callout tone="warn">{amountError}</Callout> : recipient && !recipientValid ? <Callout tone="warn">Enter a valid Stellar address (G…).</Callout> : null}
            <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>{`Review ${op}`}</Button>
            <Button fullWidth variant="ghost" disabled={balance == null || balance.receivingV === 0n} onClick={() => run('merge')}>Merge received → spendable</Button>
          </>
        ) : null}
      </>
    )
  }

  return (
    <section style={section}>
      <FlowHeader title="Confidential · tokens" onBack={onBack} badge={<BoundaryPill label="CONFIDENTIAL · TESTNET" />} />
      <Card style={cardStyle}>{body}</Card>
    </section>
  )
}

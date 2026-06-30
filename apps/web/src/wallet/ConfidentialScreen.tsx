import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  getConfidentialConfig,
  loadConfidentialBalance,
  loadIncomingHistory,
  readConfidentialRegistration,
  submitConfidentialDeposit,
  submitConfidentialMerge,
  type ConfidentialRegistration,
  type ConfidentialSubmitEvent,
  type ConfidentialSubmitReport,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { AmountInput, BoundaryBadge, Button, Callout, ProvingRing, Segmented, truncateMiddle } from '@zk-fighter/ui'
import { AddressBookPicker, IncomingHistory } from './ConfidentialExtras'
import type { WalletScreen } from './screens'

type SpendOp = 'deposit' | 'withdraw' | 'transfer'
type Step = 'idle' | 'review' | 'running' | 'result'
type RunKind = SpendOp | 'merge' | 'register'

const OP_OPTIONS = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
]
const labelStyle: CSSProperties = { font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 }
const panel: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 320px' }

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
  return `${value / base}.${(value % base).toString().padStart(decimals, '0').slice(0, 2)}`
}

const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value.trim())

async function loadCircuit(name: string): Promise<unknown> {
  const res = await fetch(`/circuits/${name}.json`)
  if (!res.ok) throw new Error(`failed to load ${name} circuit (${res.status})`)
  return res.json()
}

function ProvingView({ events, report, onBack }: { events: readonly ConfidentialSubmitEvent[]; report: ConfidentialSubmitReport | null; onBack: () => void }) {
  const submitted = report?.status === 'submitted'
  const progress = submitted ? 1 : Math.min(0.92, 0.12 + events.length * 0.16)
  if (report && !submitted) {
    return (
      <>
        <Callout tone="warn" title={`Confidential ${report.op} ${report.status}`}>{report.error ?? report.blockers[0] ?? 'Something went wrong.'}</Callout>
        <Button fullWidth variant="secondary" onClick={onBack}>Back to confidential</Button>
      </>
    )
  }
  if (submitted) {
    const done: Record<string, string> = { register: 'Your confidential account is set up.', merge: 'Received funds folded into spendable.', deposit: 'Funds moved into your confidential balance.', withdraw: 'Funds unshielded to the public address.', transfer: 'Confidential transfer sent.' }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '14px 0' }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(53,199,123,.12)', color: 'var(--pos)', fontSize: 34, animation: 'zkPop .4s ease both' }}>✓</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>Confidential {report.op} submitted</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{done[report.op] ?? 'Done.'}</div>
        {report.explorerUrl ? <a href={report.explorerUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ac2)', fontWeight: 600 }}>View on explorer ↗</a> : null}
        <Button fullWidth onClick={onBack}>Done</Button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '10px 0' }}>
      <ProvingRing progress={progress} label={`${Math.round(progress * 100)}%`} sublabel="on your device" state="active" />
      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Generating ZK proof</div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.slice(-5).map((event, index) => (
          <div key={index} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--tx2)' }}>
            <span style={{ color: 'var(--ac2)', fontFamily: 'var(--fm)', minWidth: 60 }}>{event.stage}</span>
            <span style={{ minWidth: 0 }}>{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ConfidentialScreen({ identity, network }: ConfidentialScreenProps) {
  const confidential = getConfidentialConfig(network)
  const account = identity.stellarPublicKey
  const [regResult, setRegResult] = useState<{ key: string; status: ConfidentialRegistration } | null>(null)
  const [op, setOp] = useState<SpendOp>('transfer')
  const [step, setStep] = useState<Step>('idle')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [events, setEvents] = useState<readonly ConfidentialSubmitEvent[]>([])
  const [report, setReport] = useState<ConfidentialSubmitReport | null>(null)
  const [tick, setTick] = useState(0)
  const [scan, setScan] = useState<{ status: 'idle' | 'scanning' | 'done'; credited: bigint; count: number }>({ status: 'idle', credited: 0n, count: 0 })
  const runIdRef = useRef(0)
  const key = `${account}:${network}`

  useEffect(() => {
    let cancelled = false
    void readConfidentialRegistration({ identity, network }).then((status) => { if (!cancelled) setRegResult({ key, status }) })
    return () => { cancelled = true }
  }, [identity, network, key])

  const registration: ConfidentialRegistration | 'loading' = regResult?.key === key ? regResult.status : 'loading'
  const registered = registration === 'registered'
  const decimals = confidential?.underlyingDecimals ?? 7
  void tick // re-read tracked balance after an op
  const balance = confidential ? loadConfidentialBalance(network, confidential.tokenId, account) : null
  const spendableLabel = balance ? formatUnits(balance.spendable.v, decimals) : '0.00'
  const code = confidential?.underlyingCode ?? 'USDC'
  const history = confidential ? loadIncomingHistory(network, confidential.tokenId, account) : []

  const parsed = confidential ? toBaseUnits(amount, decimals) : { ok: false as const, error: '' }
  const amountLabel = `${amount.trim() || '0'} ${code}`
  const needsRecipient = op === 'withdraw' || op === 'transfer'
  const recipientValid = !needsRecipient || isStellarAddress(recipient)
  const overSpend = needsRecipient && parsed.ok && balance != null && parsed.value > balance.spendable.v
  const amountError = amount.trim() === '' ? null : !parsed.ok ? parsed.error : overSpend ? 'Amount exceeds your spendable balance.' : null
  const canReview = registered && parsed.ok && !overSpend && recipientValid

  async function run(kind: RunKind) {
    const runId = ++runIdRef.current
    setEvents([]); setReport(null); setStep('running')
    try {
      const result = await dispatch(kind)
      if (runIdRef.current !== runId || !result) return
      setEvents(result.statusEvents); setReport(result)
      if (result.status === 'submitted') {
        setTick((value) => value + 1)
        void readConfidentialRegistration({ identity, network }).then((status) => { if (runIdRef.current >= runId) setRegResult({ key, status }) })
      }
    } catch (cause) {
      console.error('[ConfidentialScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) { setStep('result'); runIdRef.current += 1 }
    }
  }

  async function dispatch(kind: RunKind): Promise<ConfidentialSubmitReport | null> {
    if (kind === 'merge') return submitConfidentialMerge({ identity, network })
    if (kind === 'register') {
      const [{ submitConfidentialRegister }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/register'), loadCircuit('circuit_register')])
      return submitConfidentialRegister({ identity, network, circuit: circuit as never })
    }
    if (!parsed.ok) return null
    if (kind === 'deposit') return submitConfidentialDeposit({ identity, network, amount: parsed.value })
    if (kind === 'withdraw') {
      const [{ submitConfidentialWithdraw }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/withdraw'), loadCircuit('circuit_withdraw')])
      return submitConfidentialWithdraw({ identity, network, amount: parsed.value, to: recipient.trim(), circuit: circuit as never })
    }
    const [{ submitConfidentialTransfer }, circuit] = await Promise.all([import('@zk-fighter/core/confidential/transfer'), loadCircuit('circuit_transfer')])
    return submitConfidentialTransfer({ identity, network, amount: parsed.value, to: recipient.trim(), circuit: circuit as never })
  }

  async function checkIncoming() {
    setScan({ status: 'scanning', credited: 0n, count: 0 })
    try {
      const { scanConfidentialIncoming } = await import('@zk-fighter/core/confidential/receive')
      const result = await scanConfidentialIncoming({ identity, network })
      setScan({ status: 'done', credited: result.creditedTotal, count: result.receipts.length })
      if (result.receipts.length > 0) setTick((value) => value + 1)
    } catch (cause) {
      console.error('[ConfidentialScreen] incoming scan failed', cause)
      setScan({ status: 'done', credited: 0n, count: 0 })
    }
  }

  const privacyNote: ReactNode = op === 'transfer'
    ? <>Transfer stays private — <b style={{ color: 'var(--tx)' }}>no amount on-chain</b>, only a commitment moves. Requires a proof (~6s).</>
    : op === 'withdraw'
      ? <>Unshielding makes the amount <b style={{ color: 'var(--tx)' }}>public on Stellar</b> as it lands in the destination account.</>
      : <>The deposit amount is <b style={{ color: 'var(--tx)' }}>visible on Stellar</b>. Once inside, your balance is a hidden commitment.</>

  let opsBody: ReactNode
  if (!confidential) {
    opsBody = <Callout tone="warn" title="Testnet only.">Confidential tokens run on Stellar testnet only — the proving backend is an unaudited preview. Switch to testnet.</Callout>
  } else if (step === 'running' || step === 'result') {
    opsBody = <ProvingView events={events} report={report} onBack={() => setStep('idle')} />
  } else if (step === 'review') {
    opsBody = (
      <>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 34 }}>{amount.trim() || '0'}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{code} · confidential {op}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 2px', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', fontSize: 12.5, color: 'var(--tx2)' }}>{op === 'deposit' ? 'Into' : 'To'}<span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{op === 'deposit' ? 'Confidential balance' : truncateMiddle(recipient.trim() || account, 6, 6)}</span></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => setStep('idle')}>Back</Button>
          <Button fullWidth onClick={() => run(op)}>{`${op[0].toUpperCase()}${op.slice(1)} ${amountLabel}`}</Button>
        </div>
      </>
    )
  } else if (registration === 'loading') {
    opsBody = <Callout tone="info">Checking your confidential account status…</Callout>
  } else if (!registered) {
    opsBody = (
      <>
        <Callout tone="warn" title="Set up your confidential account first.">A one-time on-chain proof derives your confidential keys and binds them to this contract. The other actions unlock once it lands.</Callout>
        <Button fullWidth onClick={() => run('register')}>Set up confidential account</Button>
      </>
    )
  } else {
    opsBody = (
      <>
        <Segmented options={OP_OPTIONS} value={op} onChange={(value) => setOp(value as SpendOp)} size="sm" />
        {needsRecipient ? (
          <div>
            <div style={labelStyle}>TO ACCOUNT</div>
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={op === 'withdraw' ? 'Public Stellar address (G…)' : 'Recipient confidential account (G…)'} spellCheck={false} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1px solid ${recipient && !recipientValid ? 'var(--warn)' : 'var(--bd2)'}`, background: 'var(--card2)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fm)', outline: 'none' }} />
            <AddressBookPicker network={network} current={recipient} onPick={setRecipient} />
          </div>
        ) : null}
        <div style={{ border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '18px 16px' }}>
          <AmountInput value={amount} onChange={setAmount} asset={code} invalid={amountError != null} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: '1px solid rgba(94,124,250,.28)', borderRadius: 12, background: 'rgba(94,124,250,.06)' }}>
          <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--ac)', boxShadow: '0 0 8px var(--ac)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>{privacyNote}</span>
        </div>
        {amountError ? <Callout tone="warn">{amountError}</Callout> : recipient && !recipientValid ? <Callout tone="warn">Enter a valid Stellar address (G…).</Callout> : null}
        <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>{`${op[0].toUpperCase()}${op.slice(1)} confidentially`}</Button>
        <Button fullWidth variant="ghost" disabled={scan.status === 'scanning'} onClick={checkIncoming}>{scan.status === 'scanning' ? 'Scanning chain…' : 'Check for incoming transfers'}</Button>
        {scan.status === 'done' ? <Callout tone={scan.count > 0 ? 'info' : 'public'}>{scan.count > 0 ? `Found ${scan.count} incoming transfer${scan.count > 1 ? 's' : ''} — +${formatUnits(scan.credited, decimals)} ${code} credited. Merge to make it spendable.` : 'No new incoming transfers found.'}</Callout> : null}
        <IncomingHistory entries={history} decimals={decimals} code={code} network={network} />
      </>
    )
  }

  const receiving = balance && balance.receiving.v > 0n ? formatUnits(balance.receiving.v, decimals) : null

  return (
    <section style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Confidential tokens</div>
        <BoundaryBadge kind="confidential" label="CONFIDENTIAL · TESTNET" />
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 18 }}>A different privacy tool: addresses stay public, but <b style={{ color: 'var(--tx2)' }}>amounts are hidden</b>. {code} only, testnet only.</div>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: '1 1 300px' }}>
          <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', padding: 22, background: 'linear-gradient(150deg, rgba(94,124,250,.26), rgba(94,124,250,.04) 70%)', border: '1px solid rgba(94,124,250,.2)' }}>
            <BoundaryBadge kind="shielded" label={`CONFIDENTIAL · ${code}`} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginTop: 18 }}>
              <span style={{ fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 36, color: 'var(--tx)' }}>{registered ? spendableLabel : '—'}</span>
              <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, marginBottom: 5 }}>spendable</span>
            </div>
            {receiving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 13, padding: '10px 13px', borderRadius: 11, background: 'rgba(229,180,92,.1)', border: '1px solid rgba(229,180,92,.3)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--warn)' }}><b style={{ fontFamily: 'var(--fm)' }}>+ {receiving}</b> received</span>
                <button onClick={() => run('merge')} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--ac)', color: '#fff', font: '700 11px/1 var(--sans)', cursor: 'pointer' }}>Merge to spend</button>
              </div>
            ) : null}
          </div>
          {!confidential ? (
            <div style={{ padding: '14px 16px', border: '1px dashed rgba(229,180,92,.4)', borderRadius: 12, background: 'rgba(229,180,92,.05)', fontSize: 11.5, lineHeight: 1.55, color: 'var(--warn)' }}>Unaudited preview verifier — mainnet is blocked. Switch to testnet to use confidential tokens.</div>
          ) : null}
        </div>

        <div style={panel}>{opsBody}</div>
      </div>
    </section>
  )
}

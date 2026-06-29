import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  getConfidentialConfig,
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

type DepositStep = 'idle' | 'review' | 'running' | 'result'

interface ConfidentialScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  onNav: (screen: WalletScreen) => void
}

// Parse a decimal USDC string into i128 base units (underlying has 7 decimals).
function toBaseUnits(input: string, decimals: number): { ok: true; value: bigint } | { ok: false; error: string } {
  const trimmed = input.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: 'Enter a valid amount.' }
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return { ok: false, error: `At most ${decimals} decimal places.` }
  const scaled = `${whole}${frac.padEnd(decimals, '0')}`
  const value = BigInt(scaled)
  if (value <= 0n) return { ok: false, error: 'Amount must be greater than zero.' }
  return { ok: true, value }
}

export function ConfidentialScreen({ identity, network, onNav }: ConfidentialScreenProps) {
  const confidential = getConfidentialConfig(network)
  // Keyed so a pending reload / network switch reads as loading with no stale
  // cross-network status leaking through (and the only setState is async, inside
  // .then — a synchronous setState in an effect triggers cascading renders).
  const [regResult, setRegResult] = useState<{ key: string; status: ConfidentialRegistration } | null>(null)
  const [step, setStep] = useState<DepositStep>('idle')
  const [amount, setAmount] = useState('')
  const [events, setEvents] = useState<readonly ConfidentialSubmitEvent[]>([])
  const [report, setReport] = useState<ConfidentialSubmitReport | null>(null)
  const runIdRef = useRef(0)
  const key = `${identity.stellarPublicKey}:${network}`

  useEffect(() => {
    let cancelled = false
    void readConfidentialRegistration({ identity, network }).then((status) => {
      if (!cancelled) setRegResult({ key, status })
    })
    return () => {
      cancelled = true
    }
  }, [identity, network, key])

  const registration: ConfidentialRegistration | 'loading' =
    regResult?.key === key ? regResult.status : 'loading'

  const parsed = confidential ? toBaseUnits(amount, confidential.underlyingDecimals) : { ok: false as const, error: '' }
  const amountError = amount.trim() === '' ? null : parsed.ok ? null : parsed.error
  const registered = registration === 'registered'
  const amountLabel = `${amount.trim() || '0'} ${confidential?.underlyingCode ?? ''}`

  async function run(kind: 'deposit' | 'merge') {
    if (kind === 'deposit' && !parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    try {
      // The core client returns the full status-event list on its report (it
      // doesn't stream yet), so we surface the events once the op resolves.
      const result =
        kind === 'deposit' && parsed.ok
          ? await submitConfidentialDeposit({ identity, network, amount: parsed.value })
          : await submitConfidentialMerge({ identity, network })
      if (runIdRef.current !== runId) return
      setEvents(result.statusEvents)
      setReport(result)
      if (result.status === 'submitted') {
        // State may have changed; re-read registration so the idle view is current.
        void readConfidentialRegistration({ identity, network }).then((status) => {
          if (runIdRef.current >= runId) setRegResult({ key, status })
        })
      }
    } catch (cause) {
      // The submit helpers return failed/blocked reports rather than throwing, so a
      // throw here is a genuinely unexpected fault — leave report null so the result
      // view shows the honest "status unknown — check the explorer" branch.
      console.error('[ConfidentialScreen] unexpected submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        runIdRef.current += 1
      }
    }
  }

  const section: CSSProperties = { width: '100%', maxWidth: CONTENT_MAX, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }
  const cardStyle: CSSProperties = { padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }

  let onBack: () => void = () => onNav('home')
  let body: ReactNode

  if (!confidential) {
    body = (
      <Callout tone="warn" title="Testnet only.">
        Confidential tokens run on Stellar testnet only — the proving backend is an unaudited preview. Switch to testnet to use this mode.
      </Callout>
    )
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
          {step === 'running' ? <div style={{ fontSize: 13, color: 'var(--ac2)' }}>Working…</div> : null}
        </div>
        {step === 'result' && report ? (
          report.status === 'submitted' ? (
            <Callout tone="info" title={`Confidential ${report.op} submitted`}>
              {report.op === 'deposit' ? `${amountLabel} moved into your confidential receiving balance.` : 'Your receiving balance was folded into spendable.'}
              {report.explorerUrl ? (
                <>
                  {' '}
                  <a href={report.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ac2)' }}>View on explorer ↗</a>
                </>
              ) : null}
            </Callout>
          ) : (
            <Callout tone="warn" title={`Confidential ${report.op} ${report.status}`}>
              {report.error ?? report.blockers[0] ?? 'Something went wrong.'}
            </Callout>
          )
        ) : null}
        {step === 'result' ? (
          <Button fullWidth variant="ghost" onClick={() => setStep('idle')}>← Back to confidential</Button>
        ) : null}
      </>
    )
  } else if (step === 'review') {
    onBack = () => setStep('idle')
    body = (
      <>
        <ReviewCard
          rows={[
            { label: 'Amount', value: amountLabel, mono: true },
            { label: 'Into', value: 'Confidential receiving balance' },
            { label: 'From (public)', value: truncateMiddle(identity.stellarPublicKey, 6, 6), mono: true },
            { label: 'Network', value: network },
          ]}
        />
        <Callout tone="public" title="Public boundary.">
          The deposit amount is visible on Stellar — this is the shield-in boundary. Once inside, your confidential balance is hidden as a commitment.
        </Callout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button fullWidth onClick={() => run('deposit')}>{`Deposit ${amountLabel}`}</Button>
          <Button variant="ghost" fullWidth onClick={() => setStep('idle')}>← Edit amount</Button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <Callout tone="public">
          Confidential mode keeps balances on-chain as hidden commitments. Deposits cross the public boundary; everything after is private.
        </Callout>

        {registration === 'loading' ? (
          <Callout tone="info">Checking your confidential account status…</Callout>
        ) : registration === 'unavailable' ? (
          <Callout tone="warn" title="Status unavailable.">Couldn’t read your confidential account from the network right now.</Callout>
        ) : !registered ? (
          <Callout tone="warn" title="Make your account discoverable first.">
            Your account isn’t set up for confidential tokens yet. Registration (a one-time on-chain proof) is the next step — deposits and merges unlock once you’re registered.
          </Callout>
        ) : (
          <Callout tone="info" title="Confidential account ready.">Your account is registered. Deposit public funds in, then merge them to make them spendable.</Callout>
        )}

        <div style={{ padding: '8px 0 4px' }}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            asset={confidential.underlyingCode}
            invalid={amountError != null}
            caption={`${confidential.underlyingCode} · into confidential balance`}
          />
        </div>
        {amountError ? <Callout tone="warn">{amountError}</Callout> : null}

        <Button fullWidth disabled={!registered || !parsed.ok} onClick={() => setStep('review')}>
          Review deposit
        </Button>
        <Button fullWidth variant="ghost" disabled={!registered} onClick={() => run('merge')}>
          Merge received → spendable
        </Button>
      </>
    )
  }

  return (
    <section style={section}>
      <FlowHeader
        title="Confidential · tokens"
        onBack={onBack}
        badge={<BoundaryPill label="CONFIDENTIAL · TESTNET" />}
      />
      <Card style={cardStyle}>{body}</Card>
    </section>
  )
}

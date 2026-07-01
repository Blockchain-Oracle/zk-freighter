import {
  decodeReceiveCode,
  loadPublicStellarBalances,
  parseAssetAmountToStroops,
  submitPublicStellarPayment,
  submitXlmPrivateTransfer,
  type AssetCode,
  type NetworkKey,
  type PublicBalancesReport,
  type PublicStellarPaymentReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { useEffect, useState } from 'react'
import { BoundaryBadge, Button, Segmented, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { PrivateFlowScreen, type PrivateFlowConfig } from './PrivateFlowScreen'
import { formatStroops, stroopsToAmountInput } from './format'
import type { WalletScreen } from './screens'
import { recordWebActivity } from './webActivityStore'

const PUBLIC_ADDRESS = /^G[A-Z2-7]{55}$/
const ASSETS = ['USDC', 'XLM'] as const

function validateReceiveCode(value: string, network: NetworkKey): string | null {
  const decoded = decodeReceiveCode(value.trim())
  if (!decoded.ok) {
    return 'Enter a valid private receive code (zkf1…).'
  }
  if (decoded.value.network !== network) {
    return `This code is for ${decoded.value.network}, not ${network}.`
  }
  return null
}

const SEND_CONFIG: PrivateFlowConfig = {
  title: 'Send privately',
  badge: <BoundaryBadge kind="shielded" label="SHIELDED → SHIELDED" />,
  recipient: {
    label: 'Recipient private receive code',
    placeholder: 'zkf1…',
    multiline: true,
    initial: () => '',
    validate: validateReceiveCode,
    reviewLabel: 'To (private code)',
    reviewValue: (value) => truncateMiddle(value, 10, 8),
  },
  submitVerb: 'Send',
  run: ({ asset, identity, network, amountStroops, recipient, onStatus }) =>
    submitXlmPrivateTransfer({ asset, identity, network, amountStroops, receiveCode: recipient, onStatus }),
  proofCopy: (amountLabel) => ({
    provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
    successTitle: 'Payment sent',
    successBody: (
      <>{amountLabel} was delivered privately to the recipient’s shielded balance. The amount and counterparty stay inside the pool.</>
    ),
    failedTitle: 'Send failed',
    unconfirmedTitle: 'Send status unconfirmed',
    blockedTitle: 'Couldn’t send yet',
  }),
}

export function SendScreen(props: {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}) {
  const [mode, setMode] = useState<'private' | 'public'>('private')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ width: 440, maxWidth: 'calc(100% - 56px)', margin: '30px auto 0' }}>
        <Segmented options={[{ value: 'private', label: 'Private send' }, { value: 'public', label: 'Public send' }]} value={mode} onChange={(value) => setMode(value as 'private' | 'public')} />
      </div>
      {mode === 'private' ? <PrivateFlowScreen config={SEND_CONFIG} {...props} /> : <PublicSendPanel {...props} />}
    </div>
  )
}

function PublicSendPanel({ identity, network, onNav }: {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly onNav: (screen: WalletScreen) => void
}) {
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [balances, setBalances] = useState<PublicBalancesReport | null>(null)
  const [report, setReport] = useState<PublicStellarPaymentReport | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network }).then((next) => {
      if (!cancelled) setBalances(next)
    })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network])

  const parsed = parseAssetAmountToStroops(amount, asset)
  const available = balances?.balances[asset] ?? null
  const addressError = recipient.trim() && !PUBLIC_ADDRESS.test(recipient.trim()) ? 'Enter a valid public Stellar address (G…).' : ''
  const amountError = amount.trim() && !parsed.ok ? parsed.error : parsed.ok && available !== null && parsed.stroops > available ? `Amount exceeds your public ${asset} balance.` : ''
  const canSend = parsed.ok && !amountError && !addressError && PUBLIC_ADDRESS.test(recipient.trim())

  async function submit() {
    if (!parsed.ok) return
    setBusy(true)
    setReport(null)
    const activity = recordWebActivity({
      network,
      intent: 'send',
      boundary: 'public',
      status: 'pending',
      asset,
      amountStroops: parsed.stroops.toString(),
    })
    try {
      const next = await submitPublicStellarPayment({
        identity,
        network,
        asset,
        amountStroops: parsed.stroops,
        recipientAddress: recipient,
      })
      recordWebActivity({
        id: activity.id,
        network,
        intent: 'send',
        boundary: 'public',
        status: next.status,
        asset,
        amountStroops: parsed.stroops.toString(),
        txHash: next.txHash,
        explorerUrl: next.explorerUrl,
        error: next.error ?? next.blockers[0],
      })
      setReport(next)
      if (next.status === 'submitted') {
        const refreshed = await loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
        setBalances(refreshed)
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Public payment failed before completion.'
      recordWebActivity({
        id: activity.id,
        network,
        intent: 'send',
        boundary: 'public',
        status: 'failed',
        asset,
        amountStroops: parsed.stroops.toString(),
        error: message,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '4px 28px 44px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Send public funds</div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 6 }}>Normal Stellar payment. Recipient, amount, and asset are visible on-chain.</div>
      </div>
      <div style={{ border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 22, display: 'flex', flexDirection: 'column', gap: 15 }}>
        <Segmented options={ASSETS.map((value) => ({ value, label: value }))} value={asset} onChange={(value) => { setAsset(value as AssetCode); setAmount('') }} size="sm" />
        <div>
          <Label>Recipient public address</Label>
          <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="G…" spellCheck={false} style={inputStyle(addressError)} />
          {addressError ? <Warn>{addressError}</Warn> : null}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Label>Amount</Label>
            <button type="button" onClick={() => available !== null && setAmount(stroopsToAmountInput(available))} disabled={available === null || available <= 0n} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: available && available > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 11, fontWeight: 700, cursor: available && available > 0n ? 'pointer' : 'default' }}>Max</button>
          </div>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" style={inputStyle(amountError)} />
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 7 }}>Available public balance: <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{available === null ? '…' : `${formatStroops(available, asset === 'USDC' ? 2 : 3)} ${asset}`}</b></div>
          {amountError ? <Warn>{amountError}</Warn> : null}
        </div>
        <Button fullWidth loading={busy} disabled={!canSend || busy} onClick={() => void submit()}>Send public payment</Button>
        {report ? <Result report={report} onActivity={() => onNav('activity')} /> : null}
      </div>
    </section>
  )
}

function Label({ children }: { readonly children: string }) {
  return <div style={{ font: '700 10px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8, textTransform: 'uppercase' }}>{children}</div>
}

function Warn({ children }: { readonly children: string }) {
  return <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warn)' }}>{children}</div>
}

function Result({ report, onActivity }: { readonly report: PublicStellarPaymentReport; readonly onActivity: () => void }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 800, color: report.status === 'submitted' ? 'var(--pos)' : 'var(--warn)' }}>{report.status === 'submitted' ? 'Public payment submitted' : 'Could not send public payment'}</div>
      {report.txHash ? <div style={{ font: '600 11px/1.4 var(--fm)', color: 'var(--tx2)' }}>{truncateMiddle(report.txHash, 12, 10)}</div> : null}
      {report.blockers[0] ? <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.45 }}>{report.blockers[0]}</div> : null}
      <Button variant="secondary" onClick={onActivity}>View activity</Button>
    </div>
  )
}

function inputStyle(invalid: string) {
  return {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 13px',
    borderRadius: 12,
    border: `1px solid ${invalid ? 'var(--warn)' : 'var(--bd2)'}`,
    background: 'var(--card)',
    color: 'var(--tx)',
    fontFamily: 'var(--fm)',
    fontSize: 13,
    outline: 'none',
  }
}

import { useState } from 'react'
import { decodeReceiveCode, type AssetCode, type NetworkKey, type PublicStellarPaymentReport, type XlmPrivateSubmitReport } from '@zk-fighter/core'
import { Button, Segmented } from '@zk-fighter/ui'

import { dappMessageTypes, type DappWalletStatus, type PrivateActionResponse, type PublicActionResponse } from './dappMessages'
import { PrivateTerminal, ProvingView } from './extension-private-views'
import { shorten } from './extension-format'
import { Caption, ErrorText, MetaRow, fieldStyle } from './extension-ui'
import { balanceLabel, balanceStroops, maxAmountInput, useExtensionBalances } from './useExtensionBalances'

// Send (shielded → shielded). Real integration: the offscreen runs the proving +
// submit (submitXlmPrivateTransfer); the popup shows an honest proving ring while
// it awaits, then the REAL terminal report (status, events, explorer) — never faked.

function toStroops(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > 7) return null
  const result = BigInt(`${whole}${frac.padEnd(7, '0')}`)
  return result > 0n ? result.toString() : null
}

function validateCode(value: string, network: NetworkKey): string | null {
  const decoded = decodeReceiveCode(value.trim())
  if (!decoded.ok) return 'Enter a valid private receive code (zkf1…).'
  if (decoded.value.network !== network) return `This code is for ${decoded.value.network}, not ${network}.`
  return null
}

type Step = 'form' | 'review' | 'proving' | 'done'
type SendMode = 'private' | 'public'
const stellarAddressPattern = /^G[A-Z2-7]{55}$/

export function ExtensionSendPanel({ status, sendRuntimeMessage, initialCode }: { status: DappWalletStatus; sendRuntimeMessage: (message: object) => Promise<unknown>; initialCode?: string }) {
  const [step, setStep] = useState<Step>('form')
  const [mode, setMode] = useState<SendMode>('private')
  const [code, setCode] = useState(initialCode ?? '')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [report, setReport] = useState<XlmPrivateSubmitReport | null>(null)
  const [publicReport, setPublicReport] = useState<PublicStellarPaymentReport | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const shieldedBalance = useExtensionBalances(sendRuntimeMessage)

  const stroops = toStroops(amount)
  const available = balanceStroops(shieldedBalance.balances, mode === 'private' ? 'shielded' : 'public', asset)
  const overBalance = stroops !== null && available !== null && BigInt(stroops) > available
  const codeError = code.trim() ? (mode === 'private' ? validateCode(code, status.network) : validatePublicRecipient(code)) : null
  const amountError = overBalance ? `Amount exceeds your ${mode === 'private' ? 'shielded' : 'public'} ${asset} balance.` : null
  const canReview = Boolean(stroops) && code.trim().length > 0 && !codeError && !amountError

  async function send() {
    if (!stroops || submitting) return
    setSubmitting(true)
    setStep(mode === 'private' ? 'proving' : 'review')
    setError('')
    setReport(null)
    setPublicReport(null)
    try {
      const res = mode === 'private'
        ? (await sendRuntimeMessage({ type: dappMessageTypes.privateTransfer, asset, amountStroops: stroops, receiveCode: code.trim() })) as PrivateActionResponse
        : (await sendRuntimeMessage({ type: dappMessageTypes.publicTransfer, asset, amountStroops: stroops, recipientAddress: code.trim() })) as PublicActionResponse
      if (res.ok && res.report) {
        if (mode === 'private') setReport(res.report as XlmPrivateSubmitReport)
        else setPublicReport(res.report as PublicStellarPaymentReport)
        setStep('done')
      } else {
        setError(res.error ?? 'Send failed before completion.')
        setStep('review')
      }
    } catch {
      setError('Couldn’t reach the wallet — try again.')
      setStep('review')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'proving') {
    return <ProvingView hint="Proving on your device, then submitting to Stellar — keep this panel open." />
  }

  if (step === 'done' && report) {
    return (
      <PrivateTerminal
        report={report}
        copy={{ successTitle: 'Payment sent', successBody: 'The amount and counterparty stay inside the shielded pool.', failedTitle: 'Send failed', blockedTitle: 'Couldn’t send yet' }}
        onReset={() => { setStep('form'); setCode(''); setAmount(''); setReport(null) }}
      />
    )
  }

  if (step === 'done' && publicReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Caption>PUBLIC SEND</Caption>
        <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: 12 }}>
          <MetaRow label="STATUS">{publicReport.status}</MetaRow>
          <MetaRow label="TO">{shorten(publicReport.recipientAddress, 8, 8)}</MetaRow>
          <MetaRow label="AMOUNT">{amount} {asset}</MetaRow>
          <MetaRow label="TRANSACTION">{publicReport.txHash ? shorten(publicReport.txHash, 10, 8) : 'Not submitted'}</MetaRow>
        </div>
        {publicReport.blockers.length ? <ErrorText>{publicReport.blockers[0]}</ErrorText> : null}
        <Button fullWidth onClick={() => { setStep('form'); setCode(''); setAmount(''); setPublicReport(null) }}>Done</Button>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Caption>REVIEW</Caption>
        <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: 12 }}>
          <MetaRow label={mode === 'private' ? 'TO (PRIVATE CODE)' : 'TO (PUBLIC ADDRESS)'}>{shorten(code.trim(), 10, 8)}</MetaRow>
          <MetaRow label="AMOUNT">{amount} {asset}</MetaRow>
          <MetaRow label="BOUNDARY">{mode === 'private' ? 'shielded → shielded' : 'public → public'}</MetaRow>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" fullWidth onClick={() => setStep('form')}>Back</Button>
          <Button fullWidth loading={submitting} disabled={submitting} onClick={() => void send()}>{mode === 'private' ? 'Prove & send' : 'Send public payment'}</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Send privately</div>
      <Segmented options={[{ value: 'private', label: 'Private send' }, { value: 'public', label: 'Public send' }]} value={mode} onChange={(value) => { setMode(value as SendMode); setCode(''); setReport(null); setPublicReport(null); setError('') }} size="sm" />
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>{mode === 'private' ? 'RECIPIENT PRIVATE RECEIVE CODE' : 'RECIPIENT PUBLIC STELLAR ADDRESS'}</Caption>
        <textarea value={code} onChange={(event) => setCode(event.target.value)} rows={2} placeholder={mode === 'private' ? 'zkf1…' : 'G…'} style={{ ...fieldStyle, resize: 'vertical' }} />
        {codeError ? <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 5 }}>{codeError}</div> : null}
      </div>
      <Segmented options={(['USDC', 'XLM'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '14px 16px' }}>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em' }} />
        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{asset}</span>
        <button type="button" onClick={() => setAmount(maxAmountInput(available))} disabled={available === null || available <= 0n} style={{ border: 0, background: 'transparent', color: available && available > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 11, fontWeight: 800, cursor: available && available > 0n ? 'pointer' : 'default' }}>Max</button>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{mode === 'private' ? 'Spendable shielded balance' : 'Available public balance'}: <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{balanceLabel(available, asset, shieldedBalance.loading)}</b></div>
      {amountError ? <ErrorText>{amountError}</ErrorText> : null}
      {shieldedBalance.error ? <ErrorText>{shieldedBalance.error}</ErrorText> : null}
      <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>Review</Button>
    </div>
  )
}

function validatePublicRecipient(value: string): string | null {
  return stellarAddressPattern.test(value.trim()) ? null : 'Enter a valid public Stellar address (G…).'
}

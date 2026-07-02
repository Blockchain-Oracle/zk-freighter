import { useState } from 'react'
import type { AssetCode, XlmPrivateSubmitReport } from '@zk-freighter/core'
import { Button, Callout, Segmented } from '@zk-freighter/ui'

import { dappMessageTypes, type DappWalletStatus, type PrivateActionResponse } from './dappMessages'
import { PrivateTerminal, ProvingView } from './extension-private-views'
import { Caption, ErrorText, fieldStyle } from './extension-ui'
import { balanceLabel, balanceStroops, maxAmountInput, useExtensionBalances } from './useExtensionBalances'

// Unshield (withdraw to public). The exit boundary — named in red, with an explicit
// acknowledgement and destructive styling, matching the web app. Real integration:
// the offscreen runs submitXlmUnshieldWithdrawal; the terminal report is the truth.

const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value.trim())

function toStroops(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > 7) return null
  const result = BigInt(`${whole}${frac.padEnd(7, '0')}`)
  return result > 0n ? result.toString() : null
}

type Step = 'form' | 'proving' | 'done'

export function ExtensionUnshieldPanel({ status, sendRuntimeMessage }: { status: DappWalletStatus; sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState(status.publicKey)
  const [ack, setAck] = useState(false)
  const [report, setReport] = useState<XlmPrivateSubmitReport | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('form')
  const shieldedBalance = useExtensionBalances(sendRuntimeMessage)

  const stroops = toStroops(amount)
  const available = balanceStroops(shieldedBalance.balances, 'shielded', asset)
  const overBalance = stroops !== null && available !== null && BigInt(stroops) > available
  const addrOk = isStellarAddress(recipient)
  const amountError = overBalance ? `Amount exceeds your shielded ${asset} balance.` : null
  const canSubmit = Boolean(stroops) && addrOk && ack && !amountError

  async function submit() {
    if (!stroops) return
    setStep('proving')
    setError('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.unshield, asset, amountStroops: stroops, recipientAddress: recipient.trim() })) as PrivateActionResponse
      if (res.ok && res.report) {
        setReport(res.report)
        setStep('done')
      } else {
        setError(res.error ?? 'Unshield failed before completion.')
        setStep('form')
      }
    } catch {
      setError('Couldn’t reach the wallet — try again.')
      setStep('form')
    }
  }

  if (step === 'proving') {
    return <ProvingView hint="Proving on your device, then withdrawing to the public address — keep this panel open." />
  }

  if (step === 'done' && report) {
    return (
      <PrivateTerminal
        report={report}
        copy={{ successTitle: 'Withdrawn', successBody: 'Funds are now public on Stellar at the destination address.', failedTitle: 'Unshield failed', blockedTitle: 'Couldn’t withdraw yet' }}
        onReset={() => { setStep('form'); setAmount(''); setAck(false); setReport(null) }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Unshield</div>
        <span style={{ marginLeft: 'auto', font: '600 9px/1 var(--fm)', letterSpacing: '.08em', color: 'var(--dng)', padding: '5px 9px', border: '1px solid var(--dng)', borderRadius: 999 }}>REVEALS INFO</span>
      </div>
      <Callout tone="danger">Destination &amp; amount become public on Stellar. The pool can’t hide a withdrawal.</Callout>
      <Segmented options={(['USDC', 'XLM'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '14px 16px' }}>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em' }} />
        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{asset}</span>
        <button type="button" onClick={() => setAmount(maxAmountInput(available))} disabled={available === null || available <= 0n} style={{ border: 0, background: 'transparent', color: available && available > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 11, fontWeight: 800, cursor: available && available > 0n ? 'pointer' : 'default' }}>Max</button>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--tx3)' }}>Spendable shielded balance: <b style={{ color: 'var(--tx2)', fontFamily: 'var(--fm)' }}>{balanceLabel(available, asset, shieldedBalance.loading)}</b></div>
      {amountError ? <ErrorText>{amountError}</ErrorText> : null}
      {shieldedBalance.error ? <ErrorText>{shieldedBalance.error}</ErrorText> : null}
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>TO PUBLIC ADDRESS</Caption>
        <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="G… (your public account)" spellCheck={false} style={fieldStyle} />
        {recipient.trim() && !addrOk ? <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 5 }}>Enter a valid Stellar address (G…).</div> : null}
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} style={{ marginTop: 2 }} />
        <span style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.45 }}>I understand the destination &amp; amount will be visible on-chain.</span>
      </label>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button variant="danger" fullWidth disabled={!canSubmit} onClick={() => void submit()}>Unshield &amp; withdraw</Button>
    </div>
  )
}

import { useState } from 'react'
import { decodeReceiveCode, type AssetCode, type NetworkKey, type XlmPrivateSubmitReport } from '@zk-fighter/core'
import { Button, EventStepTracker, ProvingRing, Segmented, type ProofStep } from '@zk-fighter/ui'

import { dappMessageTypes, type DappWalletStatus, type PrivateActionResponse } from './dappMessages'
import { shorten } from './extension-format'
import { Caption, Copy, ErrorText, ExplorerLink, MetaRow, fieldStyle } from './extension-ui'

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

export function ExtensionSendPanel({ status, sendRuntimeMessage }: { status: DappWalletStatus; sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [step, setStep] = useState<Step>('form')
  const [code, setCode] = useState('')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [report, setReport] = useState<XlmPrivateSubmitReport | null>(null)
  const [error, setError] = useState('')

  const stroops = toStroops(amount)
  const codeError = code.trim() ? validateCode(code, status.network) : null
  const canReview = Boolean(stroops) && code.trim().length > 0 && !codeError

  async function send() {
    if (!stroops) return
    setStep('proving')
    setError('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.privateTransfer, asset, amountStroops: stroops, receiveCode: code.trim() })) as PrivateActionResponse
      if (res.ok && res.report) {
        setReport(res.report)
        setStep('done')
      } else {
        setError(res.error ?? 'Send failed before completion.')
        setStep('review')
      }
    } catch {
      setError('Couldn’t reach the wallet — try again.')
      setStep('review')
    }
  }

  if (step === 'proving') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 8px' }}>
        <ProvingRing progress={0.55} state="active" label="Proving…" sublabel="On your device" />
        <Copy>Proving on your device, then submitting to Stellar — keep this panel open.</Copy>
      </div>
    )
  }

  if (step === 'done' && report) {
    return <Terminal report={report} onReset={() => { setStep('form'); setCode(''); setAmount(''); setReport(null) }} />
  }

  if (step === 'review') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Caption>REVIEW</Caption>
        <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: 12 }}>
          <MetaRow label="TO (PRIVATE CODE)">{shorten(code.trim(), 10, 8)}</MetaRow>
          <MetaRow label="AMOUNT">{amount} {asset}</MetaRow>
          <MetaRow label="BOUNDARY">shielded → shielded</MetaRow>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" fullWidth onClick={() => setStep('form')}>Back</Button>
          <Button fullWidth onClick={() => void send()}>Prove &amp; send</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Send privately</div>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>RECIPIENT PRIVATE RECEIVE CODE</Caption>
        <textarea value={code} onChange={(event) => setCode(event.target.value)} rows={2} placeholder="zkf1…" style={{ ...fieldStyle, resize: 'vertical' }} />
        {codeError ? <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 5 }}>{codeError}</div> : null}
      </div>
      <Segmented options={(['USDC', 'XLM'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--bd2)', borderRadius: 14, background: 'var(--card)', padding: '14px 16px' }}>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 24, letterSpacing: '-.02em' }} />
        <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{asset}</span>
      </div>
      <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>Review</Button>
    </div>
  )
}

function Terminal({ report, onReset }: { report: XlmPrivateSubmitReport; onReset: () => void }) {
  const ok = report.status === 'submitted'
  const tone = ok ? 'var(--pos)' : report.status === 'failed' ? 'var(--dng)' : 'var(--warn)'
  const title = ok ? 'Payment sent' : report.status === 'failed' ? 'Send failed' : 'Couldn’t send yet'
  const steps: ProofStep[] = report.statusEvents.map((event, index) => ({
    label: event.message,
    state: !ok && index === report.statusEvents.length - 1 ? 'error' : 'done',
  }))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: tone }}>{title}</div>
      {ok ? <Copy>The amount and counterparty stay inside the shielded pool.</Copy> : null}
      {report.blockers.map((blocker, index) => <div key={index} style={{ fontSize: 11.5, color: 'var(--warn)' }}>{blocker}</div>)}
      {report.error && !ok ? <ErrorText>{report.error}</ErrorText> : null}
      {steps.length > 0 ? <EventStepTracker steps={steps} /> : null}
      {report.explorerUrls[0] ? <ExplorerLink href={report.explorerUrls[0]}>View on explorer ↗</ExplorerLink> : null}
      <Button variant="secondary" fullWidth onClick={onReset}>Done</Button>
    </div>
  )
}

import { useState } from 'react'
import type { AssetCode, GenerateDisclosureReport } from '@zk-fighter/core'
import { Button, Callout, Segmented } from '@zk-fighter/ui'

import { dappMessageTypes, type DisclosureResponse } from './dappMessages'
import { ProvingView } from './extension-private-views'
import { Caption, Copy, ErrorText, fieldStyle } from './extension-ui'

// Disclosure: prove you own a specific note to an auditor — without revealing your
// other notes, the amount, or any power to spend. Heavy proof runs offscreen and
// returns the SAME read-only receipt the web app produces. Never fabricated.

type Step = 'form' | 'proving' | 'done'

export function ExtensionDisclosurePanel({ sendRuntimeMessage }: { sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [authority, setAuthority] = useState('')
  const [purpose, setPurpose] = useState('Q3-2026 audit')
  const [report, setReport] = useState<GenerateDisclosureReport | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!authority.trim()) return
    setStep('proving')
    setError('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.disclosure, asset, authority: authority.trim(), purpose: purpose.trim() || 'Disclosure' })) as DisclosureResponse
      if (res.ok && res.report) {
        setReport(res.report)
        setStep('done')
      } else {
        setError(res.error ?? 'Disclosure generation failed.')
        setStep('form')
      }
    } catch {
      setError('Couldn’t reach the wallet — try again.')
      setStep('form')
    }
  }

  if (step === 'proving') {
    return <ProvingView hint="Proving on your device — nothing is uploaded. The receipt is read-only." />
  }

  if (step === 'done' && report) {
    const ok = report.status === 'generated'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ok ? (
          <div style={{ border: '1px solid var(--pos)', borderRadius: 12, background: 'rgba(53,199,123,.08)', padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pos)' }}>✓ Verified · no spend authority</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, font: '600 10px/1 var(--fm)', color: 'var(--ac2)' }}><span>✓ Proof</span><span>✓ Context</span><span>✓ Known root</span></div>
          </div>
        ) : (
          <Callout tone="warn">{report.blockers[0] ?? 'Disclosure could not be generated.'}</Callout>
        )}
        {report.error && !ok ? <ErrorText>{report.error}</ErrorText> : null}
        {report.artifactJson ? (
          <Button variant="secondary" fullWidth onClick={() => { void navigator.clipboard.writeText(report.artifactJson ?? ''); setCopied(true) }}>{copied ? 'Receipt copied' : 'Copy receipt JSON'}</Button>
        ) : null}
        <Button variant="secondary" fullWidth onClick={() => { setStep('form'); setReport(null); setCopied(false) }}>Done</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Disclosure</div>
      <Copy>Prove you own a specific note to an auditor — revealing that note’s amount to them, but not your other notes, your balance, or any power to spend.</Copy>
      <Segmented options={(['USDC', 'XLM'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>NOTE</Caption>
        <div style={{ ...fieldStyle, color: 'var(--tx2)' }}>Your largest unspent {asset} note will be disclosed.</div>
      </div>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>AUTHORITY</Caption>
        <input value={authority} onChange={(event) => setAuthority(event.target.value)} placeholder="e.g. Acme Bank compliance" style={fieldStyle} />
      </div>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>PURPOSE</Caption>
        <input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="e.g. Q3-2026 audit" style={fieldStyle} />
      </div>
      <Callout tone="info">Proving runs on your device — nothing uploaded. The receipt is read-only; it cannot move funds.</Callout>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button fullWidth disabled={!authority.trim()} onClick={() => void generate()}>Generate disclosure proof</Button>
    </div>
  )
}

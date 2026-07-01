import { useState } from 'react'
import type { AssetCode, GenerateDisclosureReport, VerifyDisclosureReport } from '@zk-fighter/core'
import { Button, Callout, Segmented } from '@zk-fighter/ui'

import { dappMessageTypes, type DisclosureResponse, type DisclosureVerifyResponse } from './dappMessages'
import { ProvingView } from './extension-private-views'
import { Caption, Copy, ErrorText, fieldStyle } from './extension-ui'

// Disclosure: prove you own a specific note to an auditor — without revealing your
// other notes, the amount, or any power to spend. Heavy proof runs offscreen and
// returns the SAME read-only receipt the web app produces. Never fabricated.

type Step = 'form' | 'proving' | 'done'
type Mode = 'create' | 'verify'

export function ExtensionDisclosurePanel({ sendRuntimeMessage }: { sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [mode, setMode] = useState<Mode>('create')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [authority, setAuthority] = useState('')
  const [purpose, setPurpose] = useState('Q3-2026 audit')
  const [report, setReport] = useState<GenerateDisclosureReport | null>(null)
  const [verifyReport, setVerifyReport] = useState<VerifyDisclosureReport | null>(null)
  const [artifactJson, setArtifactJson] = useState('')
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

  async function verify() {
    if (!artifactJson.trim()) return
    setStep('proving')
    setError('')
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.disclosureVerify, artifactJson })) as DisclosureVerifyResponse
      if (res.ok && res.report) {
        setVerifyReport(res.report)
        setStep('done')
      } else {
        setError(res.error ?? 'Disclosure verification failed.')
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

  if (step === 'done' && verifyReport) {
    const ok = verifyReport.status === 'verified'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Callout tone={ok ? 'info' : 'warn'} title={ok ? 'Proof verified.' : 'Proof not verified.'}>
          {ok ? 'Proof, context, and known-root checks passed. The receipt is read-only.' : verifyReport.blockers[0] ?? 'Verification did not pass.'}
        </Callout>
        {verifyReport.error ? <ErrorText>{verifyReport.error}</ErrorText> : null}
        <Button variant="secondary" fullWidth onClick={() => { setStep('form'); setVerifyReport(null) }}>Done</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Disclosure</div>
      <Copy>Prove you own a specific note to an auditor — revealing that note’s amount to them, but not your other notes, your balance, or any power to spend.</Copy>
      <Segmented options={[{ value: 'create', label: 'Create proof' }, { value: 'verify', label: 'Verify a proof' }]} value={mode} onChange={(value) => { setMode(value as Mode); setError('') }} size="sm" />
      {mode === 'create' ? (
        <>
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
        </>
      ) : (
        <div>
          <Caption style={{ display: 'block', marginBottom: 6 }}>RECEIPT JSON</Caption>
          <textarea value={artifactJson} onChange={(event) => setArtifactJson(event.target.value)} rows={7} placeholder="{…}" style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button fullWidth disabled={mode === 'create' ? !authority.trim() : !artifactJson.trim()} onClick={() => void (mode === 'create' ? generate() : verify())}>{mode === 'create' ? 'Create proof' : 'Verify proof'}</Button>
    </div>
  )
}

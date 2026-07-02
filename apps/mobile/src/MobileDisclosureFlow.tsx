import { useState } from 'react'
import { Button, Callout } from '@zk-freighter/ui'
import type { AssetCode, GenerateDisclosureReport, VerifyDisclosureReport } from '@zk-freighter/core'
import { AmountBox, Field, FlowScreen, ResultCard, Segment, type FlowProps } from './MobileFlowPrimitives'
import { runMobileDisclosureGenerate, runMobileDisclosureVerify } from './mobile-runtime'
import { authorityPayloadHex, firstUnspentNote, reportStatus } from './mobile-flow-helpers'
import { formatAssetAmount, summarizeError, truncateMiddle } from './mobile-format'
import { recordMobileActivity, updateMobileActivity } from './mobile-storage'

type DisclosureMode = 'create' | 'verify'

export function MobileDisclosure({ network, identity, shieldedCache, onRoute, onSync }: FlowProps) {
  const [mode, setMode] = useState<DisclosureMode>('create')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [authority, setAuthority] = useState('')
  const [purpose, setPurpose] = useState('Proof of funds review')
  const [artifactJson, setArtifactJson] = useState('')
  const [busy, setBusy] = useState(false)
  const [generateReport, setGenerateReport] = useState<GenerateDisclosureReport | null>(null)
  const [verifyReport, setVerifyReport] = useState<VerifyDisclosureReport | null>(null)
  const note = firstUnspentNote(asset === 'XLM' ? shieldedCache?.xlm ?? null : shieldedCache?.usdc ?? null)
  const canCreate = !!note && authority.trim().length > 0 && !busy
  const canVerify = artifactJson.trim().length > 0 && !busy

  async function createProof() {
    if (!note) return
    setBusy(true); setGenerateReport(null)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'disclosure', boundary: 'shielded', status: 'pending', asset, amountStroops: note.amountStroops })
    try {
      const report = await runMobileDisclosureGenerate({
        identity,
        network,
        asset,
        note,
        authorityLabel: authority.trim(),
        authorityIdentityPayloadHex: authorityPayloadHex(authority),
        purpose: purpose.trim() || 'Proof of funds review',
      })
      setGenerateReport(report)
      if (report.artifactJson) setArtifactJson(report.artifactJson)
      updateMobileActivity(activity.id, { status: reportStatus(report.status), error: report.error ?? report.blockers[0] })
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Disclosure generation failed.' })
    } finally {
      setBusy(false)
    }
  }

  async function verifyProof() {
    setBusy(true); setVerifyReport(null)
    try {
      setVerifyReport(await runMobileDisclosureVerify({ artifactJson, network }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FlowScreen title="Disclosure" badge="read-only" active={busy} onBack={() => onRoute('more')}>
      <Segment value={mode} options={[['create', 'Create proof'], ['verify', 'Verify']]} onChange={setMode} />
      {mode === 'create' ? (
        <>
          <Segment value={asset} options={[['USDC', 'USDC'], ['XLM', 'XLM']]} onChange={(value) => setAsset(value as AssetCode)} />
          <AmountBox asset={asset} amount={note ? formatAssetAmount(BigInt(note.amountStroops), asset).replace(` ${asset}`, '') : ''} available={note ? BigInt(note.amountStroops) : null} onAsset={(value) => setAsset(value)} onAmount={() => undefined} onMax={() => undefined} />
          <Field label="Authority" value={authority} placeholder="Acme Bank compliance" onChange={setAuthority} />
          <Field label="Purpose" value={purpose} placeholder="Proof of funds review" onChange={setPurpose} />
          {!note ? <Callout tone="warn" title={`No ${asset} note.`}>Sync balance or shield funds before creating a disclosure proof.</Callout> : <Callout tone="shielded">The receipt is read-only and cannot spend funds.</Callout>}
          <Button fullWidth variant="secondary" onClick={() => void onSync()}>Sync notes</Button>
          <Button fullWidth loading={busy} disabled={!canCreate} onClick={() => void createProof()}>Create proof</Button>
          {generateReport ? <DisclosureResult report={generateReport} /> : null}
        </>
      ) : (
        <>
          <textarea className="mobile-textarea" value={artifactJson} onChange={(event) => setArtifactJson(event.target.value)} placeholder="Paste disclosure receipt JSON" />
          <Button fullWidth loading={busy} disabled={!canVerify} onClick={() => void verifyProof()}>Verify proof</Button>
          {verifyReport ? <VerifyResult report={verifyReport} /> : null}
        </>
      )}
    </FlowScreen>
  )
}

function DisclosureResult({ report }: { readonly report: GenerateDisclosureReport }) {
  const ok = report.status === 'generated'
  return <ResultCard tone={ok ? 'ok' : 'warn'} title={ok ? 'Disclosure proof created' : 'Disclosure proof not created'} detail={ok ? truncateMiddle(report.artifactJson ?? '', 18, 12) : summarizeError(report.error ?? report.blockers[0])} />
}

function VerifyResult({ report }: { readonly report: VerifyDisclosureReport }) {
  if (report.fullyVerified) return <ResultCard tone="ok" title="Proof verified" detail="Proof, context, known root, and read-only checks passed." />
  return <ResultCard tone="warn" title="Proof not verified" detail={summarizeError(report.error ?? report.blockers[0])} />
}

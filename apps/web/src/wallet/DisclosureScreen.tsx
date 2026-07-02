import { useState, type CSSProperties } from 'react'
import {
  bytesToHex,
  generateDisclosureArtifact,
  isShieldedAssetEnabled,
  verifyDisclosureArtifact,
  type AssetCode,
  type GenerateDisclosureReport,
  type NetworkKey,
  type VerifyDisclosureReport,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmShieldedNote,
} from '@zk-freighter/core'
import { BoundaryBadge, Button, Callout, Segmented, Spinner } from '@zk-freighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops } from './format'
import type { WalletScreen } from './screens'

const ASSET_OPTIONS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'XLM', label: 'XLM' },
]
const MODE_OPTIONS = [
  { value: 'generate', label: 'Create proof' },
  { value: 'verify', label: 'Verify a proof' },
]

const fieldStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--bd)', background: 'var(--card2)', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
}
const labelStyle: CSSProperties = { font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 }
const panel: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 320px' }

function unspentNote(report: XlmNotesReport | null): XlmShieldedNote | undefined {
  if (!report || report.status !== 'loaded') return undefined
  return [...report.notes].filter((n) => !n.spent).sort((a, b) => Number(BigInt(b.amountStroops) - BigInt(a.amountStroops)))[0]
}

function Check({ label, color = 'var(--pos)' }: { label: string; color?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9, font: '600 12px/1 var(--sans)', color }}>✓ {label}</div>
}

interface DisclosureScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

export function DisclosureScreen({ identity, network, balance }: DisclosureScreenProps) {
  const [mode, setMode] = useState<'generate' | 'verify'>('generate')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [authority, setAuthority] = useState('')
  const [purpose, setPurpose] = useState('Q3-2026 audit')
  const [busy, setBusy] = useState<'generate' | 'verify' | null>(null)
  const [genReport, setGenReport] = useState<GenerateDisclosureReport | null>(null)
  const [verifyJson, setVerifyJson] = useState('')
  const [verifyReport, setVerifyReport] = useState<VerifyDisclosureReport | null>(null)
  const [copied, setCopied] = useState(false)

  const note = unspentNote(asset === 'XLM' ? balance.xlm : balance.usdc)
  const poolEnabled = isShieldedAssetEnabled(network, asset)
  const canGenerate = poolEnabled && !!note && authority.trim().length > 0 && busy === null

  async function generate() {
    if (!note) return
    setBusy('generate')
    setGenReport(null)
    try {
      const report = await generateDisclosureArtifact({
        identity, network, asset, note,
        authorityLabel: authority.trim(),
        authorityIdentityPayloadHex: `0x${bytesToHex(new TextEncoder().encode(authority.trim()))}`,
        purpose: purpose.trim() || 'Proof of funds',
      })
      setGenReport(report)
      if (report.artifactJson) setVerifyJson(report.artifactJson)
    } catch (cause) {
      console.error('[DisclosureScreen] generate rejection', cause)
      setGenReport({ status: 'failed', durationMs: 0, network, asset, statusEvents: [], blockers: [cause instanceof Error ? cause.message : 'Generation failed.'], error: 'failed' })
    } finally {
      setBusy(null)
    }
  }

  async function verify() {
    setBusy('verify')
    setVerifyReport(null)
    try {
      setVerifyReport(await verifyDisclosureArtifact({ artifactJson: verifyJson, network }))
    } catch (cause) {
      setVerifyReport({ status: 'failed', fullyVerified: false, proofVerified: false, contextVerified: false, knownRootStatus: false, readOnly: true, spendAuthorityPresent: false, blockers: [cause instanceof Error ? cause.message : 'Verification failed.'] })
    } finally {
      setBusy(null)
    }
  }

  function copyArtifact() {
    if (!genReport?.artifactJson) return
    navigator.clipboard.writeText(genReport.artifactJson).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) }, (c: unknown) => console.warn('clipboard write failed', c))
  }

  function download() {
    if (!genReport?.artifactJson) return
    const url = URL.createObjectURL(new Blob([genReport.artifactJson], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'zk-freighter-disclosure.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Selective disclosure</div>
        <BoundaryBadge kind="read-only" />
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 18 }}>Prove you own a specific note to an auditor — without revealing your other notes, the amount, or any power to spend.</div>
      <div style={{ marginBottom: 4 }}>
        <Segmented options={MODE_OPTIONS} value={mode} onChange={(value) => setMode(value as 'generate' | 'verify')} />
      </div>

      {mode === 'generate' ? (
        <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={panel}>
            <Segmented options={ASSET_OPTIONS} value={asset} onChange={(value) => setAsset(value as AssetCode)} size="sm" />
            <div>
              <div style={labelStyle}>NOTE</div>
              <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', color: note ? 'var(--tx)' : 'var(--tx3)' }}>
                {note ? `Note · ${formatStroops(BigInt(note.amountStroops), asset === 'XLM' ? 3 : 2)} ${asset}` : `No shielded ${asset} note yet`}
              </div>
            </div>
            <div>
              <div style={labelStyle}>AUTHORITY</div>
              <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="e.g. Acme Bank compliance" style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>REFERENCE</div>
              <input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: '1px solid rgba(94,124,250,.28)', borderRadius: 12, background: 'rgba(94,124,250,.06)' }}>
              <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--ac)', boxShadow: '0 0 8px var(--ac)' }} />
              <span style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>Proving on your device — nothing is uploaded. The receipt is read-only and cannot move funds.</span>
            </div>
            {!note ? <Callout tone="warn" title="No shielded note.">{poolEnabled ? `Shield some ${asset} first to create a proof.` : `${asset} pool is not configured for this network.`}</Callout> : null}
            <Button fullWidth loading={busy === 'generate'} disabled={!canGenerate} onClick={generate}>{busy === 'generate' ? 'Proving locally…' : 'Generate disclosure proof'}</Button>
          </div>

          <div style={panel}>
            <div style={labelStyle}>RECEIPT (JSON)</div>
            <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: '#0c0d0f', padding: 14, fontFamily: 'var(--fm)', fontSize: 10.5, lineHeight: 1.6, color: 'var(--tx2)', maxHeight: 200, overflow: 'auto', wordBreak: 'break-all' }}>
              {genReport?.artifactJson ?? (busy === 'generate' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--tx3)' }}><Spinner size={13} /> proving…</span> : <span style={{ color: 'var(--tx3)' }}>Your read-only receipt appears here once generated.</span>)}
            </div>
            {genReport?.artifactJson ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)' }}>
                  <Check label="Proof generated on-device" />
                  <Check label="Read-only receipt" />
                  <Check label="No spend authority" color="var(--ac2)" />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="ghost" onClick={copyArtifact}>{copied ? 'Copied' : 'Copy receipt'}</Button>
                  <Button fullWidth onClick={download}>Download</Button>
                </div>
              </>
            ) : genReport && genReport.status !== 'generated' ? <Callout tone="warn">{genReport.blockers[0] ?? 'Could not create the proof.'}</Callout> : null}
          </div>
        </div>
      ) : (
        <div style={{ ...panel, maxWidth: 560, flex: 'none' }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.5 }}>Paste a disclosure receipt to check its proof, context, and that it carries no spend authority.</div>
          <textarea value={verifyJson} onChange={(e) => setVerifyJson(e.target.value)} rows={8} placeholder="Paste disclosure receipt JSON…" style={{ ...fieldStyle, fontFamily: 'var(--fm)', fontSize: 10.5, resize: 'vertical' }} />
          <Button fullWidth loading={busy === 'verify'} disabled={busy !== null || verifyJson.trim().length === 0} onClick={verify}>Verify proof</Button>
          {verifyReport ? (
            verifyReport.fullyVerified ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)' }}>
                <Check label="Proof valid" />
                <Check label="Context matches" />
                <Check label="Known root" />
                <Check label="No spend authority" color="var(--ac2)" />
              </div>
            ) : (
              <Callout tone="warn" title="Not verified.">{verifyReport.blockers[0] ?? `proof ${verifyReport.proofVerified ? '✓' : '✗'} · context ${verifyReport.contextVerified ? '✓' : '✗'} · root ${verifyReport.knownRootStatus ? '✓' : '✗'}`}</Callout>
            )
          ) : null}
        </div>
      )}
    </section>
  )
}

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
} from '@zk-fighter/core'
import { Button, Callout, Card, Spinner, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops } from './format'
import { BoundaryPill, FlowHeader } from './flowChrome'
import type { WalletScreen } from './screens'

const ASSETS: readonly AssetCode[] = ['USDC', 'XLM']

const fieldStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bd)', background: 'var(--card2)', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
}

function unspentNote(report: XlmNotesReport | null): XlmShieldedNote | undefined {
  if (!report || report.status !== 'loaded') return undefined
  return [...report.notes].filter((n) => !n.spent).sort((a, b) => Number(BigInt(b.amountStroops) - BigInt(a.amountStroops)))[0]
}

function authorityPayloadHex(authority: string): string {
  return `0x${bytesToHex(new TextEncoder().encode(authority.trim()))}`
}

interface DisclosureScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

export function DisclosureScreen({ identity, network, balance, onNav }: DisclosureScreenProps) {
  const [mode, setMode] = useState<'generate' | 'verify'>('generate')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [authority, setAuthority] = useState('')
  const [purpose, setPurpose] = useState('Proof of funds')
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
        authorityIdentityPayloadHex: authorityPayloadHex(authority),
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
    navigator.clipboard.writeText(genReport.artifactJson).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }, (c: unknown) => console.warn('clipboard write failed', c))
  }

  function tabStyle(active: boolean): CSSProperties {
    return { flex: 1, padding: 9, borderRadius: 9, textAlign: 'center', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none', background: active ? 'var(--ac)' : 'transparent', color: active ? '#fff' : 'var(--tx2)', fontFamily: 'inherit' }
  }

  const section: CSSProperties = { width: '100%', maxWidth: 580, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }
  const card: CSSProperties = { padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }

  return (
    <section style={section}>
      <FlowHeader title="Disclosure" onBack={() => onNav('home')} badge={<BoundaryPill label="READ-ONLY PROOF" color="var(--ac2)" dashed={false} />} />

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 12 }}>
        <button type="button" style={tabStyle(mode === 'generate')} onClick={() => setMode('generate')}>Create proof</button>
        <button type="button" style={tabStyle(mode === 'verify')} onClick={() => setMode('verify')}>Verify a proof</button>
      </div>

      {mode === 'generate' ? (
        <Card style={card}>
          <Callout tone="info">
            Prove you own shielded funds to a specific reviewer — without revealing your keys or letting them spend. They get a read-only receipt, proven on your device.
          </Callout>
          <div style={{ display: 'flex', gap: 8 }}>
            {ASSETS.map((code) => (
              <button key={code} type="button" onClick={() => setAsset(code)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: code === asset ? '1px solid var(--ac)' : '1px solid var(--bd)', background: code === asset ? 'rgba(94,124,250,.08)' : 'var(--card2)', color: 'var(--tx)' }}>
                {code}
              </button>
            ))}
          </div>
          {note ? (
            <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>Proving ownership of a {formatStroops(BigInt(note.amountStroops), asset === 'XLM' ? 3 : 2)} {asset} note · {truncateMiddle(note.id, 6, 4)}</div>
          ) : (
            <Callout tone="warn" title="No shielded note.">{poolEnabled ? `Shield some ${asset} first to create a proof.` : `${asset} pool is not configured for this network.`}</Callout>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>Who is this proof for?</span>
            <input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="e.g. Acme Bank compliance" style={fieldStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>Reference</span>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={fieldStyle} />
          </label>
          <Button fullWidth loading={busy === 'generate'} disabled={!canGenerate} onClick={generate}>
            {busy === 'generate' ? 'Proving locally…' : 'Create disclosure proof'}
          </Button>
          {busy === 'generate' ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 11.5, color: 'var(--tx3)' }}><Spinner size={14} /> Proving on your device — nothing is uploaded.</div> : null}
          {genReport?.artifactJson ? (
            <>
              <Callout tone="info" title="Proof ready.">Share this receipt with {authority.trim()}. It’s read-only and cannot move funds.</Callout>
              <textarea readOnly rows={6} value={genReport.artifactJson} style={{ ...fieldStyle, fontFamily: 'var(--fm)', fontSize: 10.5, resize: 'vertical' }} />
              <Button variant="secondary" onClick={copyArtifact}>{copied ? 'Copied' : 'Copy proof'}</Button>
            </>
          ) : genReport && genReport.status !== 'generated' ? (
            <Callout tone="warn">{genReport.blockers[0] ?? 'Could not create the proof.'}</Callout>
          ) : null}
        </Card>
      ) : (
        <Card style={card}>
          <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>Paste a disclosure receipt to check its proof, context, and that it carries no spend authority.</div>
          <textarea value={verifyJson} onChange={(e) => setVerifyJson(e.target.value)} rows={7} placeholder="Paste disclosure receipt JSON…" style={{ ...fieldStyle, fontFamily: 'var(--fm)', fontSize: 10.5, resize: 'vertical' }} />
          <Button fullWidth loading={busy === 'verify'} disabled={busy !== null || verifyJson.trim().length === 0} onClick={verify}>Verify proof</Button>
          {verifyReport ? (
            <Callout tone={verifyReport.fullyVerified ? 'info' : 'warn'} title={verifyReport.fullyVerified ? 'Verified.' : 'Not verified.'}>
              {verifyReport.fullyVerified
                ? `Read-only proof valid${verifyReport.artifact ? ` for note ${truncateMiddle(verifyReport.artifact.activity.commitment, 6, 6)}` : ''}. Proof ✓ · context ✓ · known root ✓ · no spend authority ✓.`
                : (verifyReport.blockers[0] ?? `proof ${verifyReport.proofVerified ? '✓' : '✗'} · context ${verifyReport.contextVerified ? '✓' : '✗'} · root ${verifyReport.knownRootStatus ? '✓' : '✗'}`)}
            </Callout>
          ) : null}
        </Card>
      )}
    </section>
  )
}

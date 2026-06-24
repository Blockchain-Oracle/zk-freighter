import { useMemo, useState } from 'react'
import { Copy, FileCheck2, KeyRound, RefreshCw, ShieldCheck, Upload } from 'lucide-react'
import {
  CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH,
  generateDisclosureArtifact,
  loadXlmShieldedNotes,
  randomDisclosureNonceHex,
  verifyDisclosureArtifact,
  type AssetCode,
  type GenerateDisclosureReport,
  type NetworkKey,
  type VerifyDisclosureReport,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmShieldedNote,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import './DisclosurePanel.css'

interface DisclosurePanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

const assetOptions = ['XLM', 'USDC'] as const satisfies readonly AssetCode[]
const defaultAuthorityPayload = '0x7265766965776572'
const defaultPurpose = 'audit-review'
const stroopsPerUnit = 10_000_000n
const decimalPlaces = 7
const noteCommitmentHeadChars = 8
const noteCommitmentTailChars = 6
const verifiedCommitmentHeadChars = 14
const verifiedCommitmentTailChars = 12

function formatStroops(stroops: string, asset: AssetCode): string {
  const value = BigInt(stroops)
  const whole = value / stroopsPerUnit
  const fraction = (value % stroopsPerUnit).toString().padStart(decimalPlaces, '0').replace(/0+$/, '')
  return `${whole.toString()}${fraction ? `.${fraction}` : ''} ${asset}`
}

function unspentNotes(report: XlmNotesReport | null): readonly XlmShieldedNote[] {
  return report?.notes.filter((note) => !note.spent) ?? []
}

function resultText(report: GenerateDisclosureReport | null): string {
  if (!report) {
    return 'No disclosure generated.'
  }
  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

function checkText(label: string, ok: boolean): string {
  return `${label}: ${ok ? 'pass' : 'fail'}`
}

export function DisclosurePanel({ identity, network }: DisclosurePanelProps) {
  const [asset, setAsset] = useState<AssetCode>('XLM')
  const [notesReport, setNotesReport] = useState<XlmNotesReport | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [authorityLabel, setAuthorityLabel] = useState('Reviewer')
  const [authorityPayload, setAuthorityPayload] = useState(defaultAuthorityPayload)
  const [purpose, setPurpose] = useState(defaultPurpose)
  const [nonce, setNonce] = useState(() => randomDisclosureNonceHex())
  const [generateReport, setGenerateReport] = useState<GenerateDisclosureReport | null>(null)
  const [verifyJson, setVerifyJson] = useState('')
  const [expectedVkHash, setExpectedVkHash] = useState(CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH)
  const [verifyReport, setVerifyReport] = useState<VerifyDisclosureReport | null>(null)
  const [busy, setBusy] = useState<'notes' | 'generate' | 'verify' | null>(null)
  const [copied, setCopied] = useState(false)
  const [formError, setFormError] = useState('')
  const testnetOnly = network !== 'testnet'
  const notes = useMemo(() => unspentNotes(notesReport), [notesReport])
  const selectedNote = notes.find((note) => note.id === selectedNoteId)

  async function refreshNotes(nextAsset = asset) {
    setBusy('notes')
    setFormError('')
    const report = await loadXlmShieldedNotes({ asset: nextAsset, identity, network })
    const firstUnspent = unspentNotes(report)[0]
    setNotesReport(report)
    setSelectedNoteId(firstUnspent?.id ?? '')
    setBusy(null)
  }

  async function generate() {
    if (!selectedNote) {
      setFormError('Load notes and select an unspent note first.')
      return
    }
    setBusy('generate')
    setFormError('')
    const report = await generateDisclosureArtifact({
      identity,
      network,
      asset,
      note: selectedNote,
      authorityLabel,
      authorityIdentityPayloadHex: authorityPayload,
      purpose,
      contextNonceHex: nonce,
    })
    setGenerateReport(report)
    if (report.artifactJson) {
      setVerifyJson(report.artifactJson)
    }
    setBusy(null)
  }

  async function verify() {
    setBusy('verify')
    setFormError('')
    setVerifyReport(
      await verifyDisclosureArtifact({
        artifactJson: verifyJson,
        network,
        expectedVkHash,
      }),
    )
    setBusy(null)
  }

  async function copyArtifact() {
    if (!generateReport?.artifactJson) {
      return
    }
    await navigator.clipboard.writeText(generateReport.artifactJson)
    setCopied(true)
  }

  function changeAsset(nextAsset: AssetCode) {
    setAsset(nextAsset)
    setNotesReport(null)
    setSelectedNoteId('')
    setGenerateReport(null)
  }

  return (
    <article className="panel disclosure-panel">
      <div className="panel-heading">
        <FileCheck2 size={24} aria-hidden="true" />
        <div>
          <h1>Compliance disclosure</h1>
          <p>User-held receipts for a selected shielded note. ZK Fighter cannot disclose for you.</p>
        </div>
      </div>

      <div className="boundary-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          A reviewer gets read-only verification. They cannot spend funds or see anything outside the artifact.
        </span>
      </div>

      <div className="disclosure-grid">
        <section className="disclosure-section" aria-label="Create disclosure artifact">
          <h2>Create scoped receipt</h2>
          <label className="field">
            <span>Pool asset</span>
            <select value={asset} onChange={(event) => changeAsset(event.target.value as AssetCode)}>
              {assetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" disabled={busy !== null || testnetOnly} onClick={() => refreshNotes()}>
            <RefreshCw size={18} aria-hidden="true" />
            {busy === 'notes' ? 'Loading notes...' : 'Load unspent notes'}
          </button>
          <label className="field">
            <span>Unspent note</span>
            <select value={selectedNoteId} disabled={notes.length === 0} onChange={(event) => setSelectedNoteId(event.target.value)}>
              <option value="">Select a note</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {formatStroops(note.amountStroops, asset)} · ledger {note.createdAtLedger} ·{' '}
                  {truncateMiddle(note.id, noteCommitmentHeadChars, noteCommitmentTailChars)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Reviewer label</span>
            <input value={authorityLabel} onChange={(event) => setAuthorityLabel(event.target.value)} />
          </label>
          <label className="field">
            <span>Reviewer identity payload hex</span>
            <input value={authorityPayload} onChange={(event) => setAuthorityPayload(event.target.value)} />
          </label>
          <label className="field">
            <span>Purpose</span>
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </label>
          <label className="field">
            <span>Context nonce</span>
            <div className="nonce-row">
              <input value={nonce} onChange={(event) => setNonce(event.target.value)} />
              <button className="button secondary" type="button" onClick={() => setNonce(randomDisclosureNonceHex())}>
                New
              </button>
            </div>
          </label>
          <button className="button primary" disabled={busy !== null || testnetOnly} onClick={generate}>
            <FileCheck2 size={18} aria-hidden="true" />
            {busy === 'generate' ? 'Generating...' : 'Generate disclosure'}
          </button>
          <span className="disclosure-status">{testnetOnly ? 'Disclosure is testnet-only in this phase.' : resultText(generateReport)}</span>

          {generateReport?.artifactJson ? (
            <div className="artifact-output">
              <textarea readOnly rows={7} value={generateReport.artifactJson} />
              <button className="button secondary" onClick={copyArtifact}>
                <Copy size={18} aria-hidden="true" />
                {copied ? 'Copied' : 'Copy artifact'}
              </button>
            </div>
          ) : null}

          {generateReport?.blockers.length ? <Blockers blockers={generateReport.blockers} /> : null}
          {formError ? <p className="private-error">{formError}</p> : null}
        </section>

        <section className="disclosure-section" aria-label="Verify disclosure artifact">
          <h2>Review artifact</h2>
          <p className="review-copy">
            Activity labels are owner-supplied. Verification checks the receipt proof, context, known root, and that the
            artifact carries no spend authority.
          </p>
          <label className="field">
            <span>Paste disclosure artifact JSON</span>
            <textarea rows={9} value={verifyJson} onChange={(event) => setVerifyJson(event.target.value)} />
          </label>
          <label className="field">
            <span>Expected verifier key hash</span>
            <input value={expectedVkHash} onChange={(event) => setExpectedVkHash(event.target.value)} />
          </label>
          <button className="button primary" disabled={busy !== null || !verifyJson.trim()} onClick={verify}>
            <Upload size={18} aria-hidden="true" />
            {busy === 'verify' ? 'Verifying...' : 'Verify disclosure'}
          </button>

          {verifyReport ? (
            <div className="verification-result">
              <strong>{verifyReport.fullyVerified ? 'Fully verified' : verifyReport.status}</strong>
              <span>{checkText('Proof', verifyReport.proofVerified)}</span>
              <span>{checkText('Context', verifyReport.contextVerified)}</span>
              <span>{checkText('Known root', verifyReport.knownRootStatus)}</span>
              <span>{checkText('Read-only', verifyReport.readOnly && !verifyReport.spendAuthorityPresent)}</span>
              {verifyReport.artifact ? (
                <code>
                  {truncateMiddle(
                    verifyReport.artifact.activity.commitment,
                    verifiedCommitmentHeadChars,
                    verifiedCommitmentTailChars,
                  )}
                </code>
              ) : null}
            </div>
          ) : null}

          {verifyReport?.blockers.length ? <Blockers blockers={verifyReport.blockers} /> : null}
        </section>
      </div>

      <div className="viewing-key-note">
        <KeyRound size={18} aria-hidden="true" />
        <span>Full viewing-key export is intentionally not enabled here. Scoped receipts are the supported MVP path.</span>
      </div>
    </article>
  )
}

function Blockers({ blockers }: { readonly blockers: readonly string[] }) {
  return (
    <ul className="blocker-list">
      {blockers.map((blocker) => (
        <li key={blocker}>{blocker}</li>
      ))}
    </ul>
  )
}

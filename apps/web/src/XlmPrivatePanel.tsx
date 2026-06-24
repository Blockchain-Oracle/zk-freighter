import { useMemo, useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Send, Undo2 } from 'lucide-react'
import {
  loadXlmShieldedNotes,
  submitXlmPrivateTransfer,
  submitXlmUnshieldWithdrawal,
  type AssetCode,
  type NetworkKey,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmPrivateSubmitReport,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import './XlmPrivatePanel.css'

const stroopsPerXlm = 10_000_000n
const zeroStroops = 0n
const amountDecimalPlaces = 7
const defaultPrivateAmounts = { XLM: '0.05', USDC: '0.5' } as const satisfies Record<AssetCode, string>
const latestEventCount = 8
const visibleNoteLimit = 4

interface XlmPrivatePanelProps {
  readonly asset?: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly receiveCode: string
}

function formatStroops(stroops: string | bigint, asset: AssetCode): string {
  const value = typeof stroops === 'bigint' ? stroops : BigInt(stroops)
  const whole = value / stroopsPerXlm
  const fraction = (value % stroopsPerXlm).toString().padStart(amountDecimalPlaces, '0')
  const trimmed = fraction.replace(/0+$/, '')
  return `${whole.toString()}${trimmed ? `.${trimmed}` : ''} ${asset}`
}

function parseAssetAmount(value: string, asset: AssetCode): bigint {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,7})?$/.test(trimmed)) {
    throw new Error(`Enter a ${asset} amount with up to 7 decimal places.`)
  }

  const [whole, fraction = ''] = trimmed.split('.')
  const stroops = BigInt(whole) * stroopsPerXlm + BigInt(fraction.padEnd(amountDecimalPlaces, '0'))
  if (stroops <= zeroStroops) {
    throw new Error('Amount must be greater than zero.')
  }

  return stroops
}

function unspentTotal(report: XlmNotesReport | null): bigint {
  if (!report) {
    return zeroStroops
  }

  return report.notes.reduce((total, note) => (note.spent ? total : total + BigInt(note.amountStroops)), zeroStroops)
}

function actionLabel(report: XlmPrivateSubmitReport | null): string {
  if (!report) {
    return 'No private transaction submitted.'
  }

  if (report.status === 'submitted') {
    return `Submitted · ${report.txHashes.length} tx`
  }

  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

function ActionReport({ report }: { readonly report: XlmPrivateSubmitReport | null }) {
  if (!report) {
    return null
  }

  return (
    <div className="proof-results">
      <dl className="meta-list">
        <div>
          <dt>Proof</dt>
          <dd>{report.proofGenerated ? 'Generated' : 'Not generated'}</dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd>{report.transactionSubmitted ? 'Confirmed' : 'Not submitted'}</dd>
        </div>
        <div>
          <dt>Amount</dt>
              <dd>{formatStroops(report.amountStroops, report.asset)}</dd>
        </div>
      </dl>

      {report.explorerUrls.length > 0 ? (
        <div className="private-links">
          {report.explorerUrls.map((url, index) => (
            <a key={url} className="explorer-link" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              View transaction {index + 1}
            </a>
          ))}
        </div>
      ) : null}

      {report.blockers.length > 0 ? (
        <ul className="blocker-list">
          {report.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}

      <ul className="artifact-list">
        {report.statusEvents.slice(-latestEventCount).map((event, index) => (
          <li key={`${event.elapsedMs}-${index}`}>
            <strong>{event.source}</strong>
            <span>{event.message}</span>
            <code>{event.elapsedMs.toLocaleString()} ms</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function XlmPrivatePanel({ asset = 'XLM', identity, network, receiveCode }: XlmPrivatePanelProps) {
  const [notesReport, setNotesReport] = useState<XlmNotesReport | null>(null)
  const [transferReport, setTransferReport] = useState<XlmPrivateSubmitReport | null>(null)
  const [withdrawReport, setWithdrawReport] = useState<XlmPrivateSubmitReport | null>(null)
  const [transferCodeDraft, setTransferCodeDraft] = useState({ source: receiveCode, value: receiveCode })
  const [transferAmount, setTransferAmount] = useState<string>(defaultPrivateAmounts[asset])
  const [withdrawAmount, setWithdrawAmount] = useState<string>(defaultPrivateAmounts[asset])
  const [withdrawRecipient, setWithdrawRecipient] = useState(identity.stellarPublicKey)
  const [busy, setBusy] = useState<'notes' | 'transfer' | 'withdraw' | null>(null)
  const [formError, setFormError] = useState('')
  const testnetOnly = network !== 'testnet'
  const total = useMemo(() => unspentTotal(notesReport), [notesReport])
  const transferCode = transferCodeDraft.source === receiveCode ? transferCodeDraft.value : receiveCode

  async function refreshNotes() {
    setBusy('notes')
    setFormError('')
    setNotesReport(await loadXlmShieldedNotes({ asset, identity, network }))
    setBusy(null)
  }

  async function runTransfer() {
    setBusy('transfer')
    setFormError('')
    try {
      const amountStroops = parseAssetAmount(transferAmount, asset)
      setTransferReport(
        await submitXlmPrivateTransfer({
          asset,
          identity,
          network,
          amountStroops,
          receiveCode: transferCode,
        }),
      )
      await refreshNotes()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Private send failed.')
    } finally {
      setBusy(null)
    }
  }

  async function runWithdraw() {
    setBusy('withdraw')
    setFormError('')
    try {
      const amountStroops = parseAssetAmount(withdrawAmount, asset)
      setWithdrawReport(
        await submitXlmUnshieldWithdrawal({
          asset,
          identity,
          network,
          amountStroops,
          recipientAddress: withdrawRecipient.trim(),
        }),
      )
      await refreshNotes()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unshield failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="panel xlm-private-panel">
      <div className="panel-heading">
        <Send size={24} aria-hidden="true" />
        <div>
          <h1>{asset} shielded loop</h1>
          <p>Refresh real notes, send privately to a receive code, or unshield publicly.</p>
        </div>
      </div>

      <div className="boundary-note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>Unshield is public. The public Stellar destination and amount are visible on-chain.</span>
      </div>

      <div className="private-summary">
        <button className="button secondary" disabled={busy !== null || testnetOnly} onClick={refreshNotes}>
          <RefreshCw size={18} aria-hidden="true" />
          {busy === 'notes' ? 'Refreshing...' : 'Refresh notes'}
        </button>
        <span>{testnetOnly ? `Switch to testnet to use ${asset} pool.` : `Unspent seen: ${formatStroops(total, asset)}`}</span>
      </div>

      {notesReport?.blockers.length ? (
        <ul className="blocker-list">
          {notesReport.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}

      <div className="notes-strip">
        {(notesReport?.notes ?? []).slice(0, visibleNoteLimit).map((note) => (
          <div key={note.id} className="note-pill">
            <strong>{formatStroops(note.amountStroops, asset)}</strong>
            <span>{note.spent ? 'Spent' : 'Unspent'} · ledger {note.createdAtLedger}</span>
            <code>{truncateMiddle(note.id, 10, 8)}</code>
          </div>
        ))}
      </div>

      <div className="private-action-grid">
        <section className="private-action">
          <h2>Private send</h2>
          <label className="field">
            <span>Amount</span>
            <input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} />
          </label>
          <label className="field">
            <span>Recipient private receive code</span>
            <textarea
              rows={3}
              value={transferCode}
              onChange={(event) => setTransferCodeDraft({ source: receiveCode, value: event.target.value })}
            />
          </label>
          <button className="button primary" disabled={busy !== null || testnetOnly} onClick={runTransfer}>
            <Send size={18} aria-hidden="true" />
            {busy === 'transfer' ? 'Sending...' : `Send shielded ${asset}`}
          </button>
          <span className="action-status">{actionLabel(transferReport)}</span>
          <ActionReport report={transferReport} />
        </section>

        <section className="private-action">
          <h2>Unshield</h2>
          <label className="field">
            <span>Amount</span>
            <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
          </label>
          <label className="field">
            <span>Public Stellar destination</span>
            <input value={withdrawRecipient} onChange={(event) => setWithdrawRecipient(event.target.value)} />
          </label>
          <button className="button primary" disabled={busy !== null || testnetOnly} onClick={runWithdraw}>
            <Undo2 size={18} aria-hidden="true" />
            {busy === 'withdraw' ? 'Unshielding...' : `Unshield ${asset}`}
          </button>
          <span className="action-status">{actionLabel(withdrawReport)}</span>
          <ActionReport report={withdrawReport} />
        </section>
      </div>

      {formError ? <p className="private-error">{formError}</p> : null}
    </article>
  )
}

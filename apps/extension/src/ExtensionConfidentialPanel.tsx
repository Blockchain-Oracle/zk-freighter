import { getConfidentialConfig, isConfidentialEnabled, type ConfidentialSubmitReport } from '@zk-fighter/core'
import { Eye, ExternalLink, KeyRound, Layers, Lock } from 'lucide-react'
import { useState } from 'react'

import { dappMessageTypes, type ConfidentialOpKind, type ConfidentialResponse, type DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'

const latestEventCount = 5
type SpendOp = 'deposit' | 'withdraw' | 'transfer'
const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value.trim())

function toBaseUnits(input: string, decimals: number): string | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) return null
  const value = BigInt(`${whole}${frac.padEnd(decimals, '0')}`)
  return value > 0n ? value.toString() : null
}

interface ExtensionConfidentialPanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionConfidentialPanel({ status, sendRuntimeMessage }: ExtensionConfidentialPanelProps) {
  const [op, setOp] = useState<SpendOp>('deposit')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [busy, setBusy] = useState<ConfidentialOpKind | null>(null)
  const [report, setReport] = useState<ConfidentialSubmitReport | null>(null)
  const [scan, setScan] = useState<{ count: number; creditedTotal: string } | null>(null)
  const [error, setError] = useState('')

  const enabled = status ? isConfidentialEnabled(status.network) : false
  const confidential = status ? getConfidentialConfig(status.network) : undefined
  const decimals = confidential?.underlyingDecimals ?? 7
  const code = confidential?.underlyingCode ?? 'USDC'
  const disabledReason = !status?.unlocked ? 'Unlock the extension vault first.' : !enabled ? 'Confidential tokens are testnet-only.' : ''
  const needsRecipient = op === 'withdraw' || op === 'transfer'

  async function run(kind: ConfidentialOpKind) {
    setBusy(kind)
    setError('')
    setReport(null)
    setScan(null)
    try {
      const amountBase = kind === 'deposit' || kind === 'withdraw' || kind === 'transfer' ? toBaseUnits(amount, decimals) : undefined
      if ((kind === 'deposit' || kind === 'withdraw' || kind === 'transfer') && !amountBase) {
        setError('Enter a valid amount.')
        return
      }
      if ((kind === 'withdraw' || kind === 'transfer') && !isStellarAddress(recipient)) {
        setError('Enter a valid recipient address (G…).')
        return
      }
      const response = (await sendRuntimeMessage({
        type: dappMessageTypes.confidential,
        op: kind,
        amount: amountBase,
        to: needsRecipient ? recipient.trim() : undefined,
      })) as ConfidentialResponse
      if (!response.ok || !response.report) {
        setError(response.error ?? 'Confidential op returned no report.')
      } else if (kind === 'scan') {
        setScan(response.report as { count: number; creditedTotal: string })
      } else {
        setReport(response.report as ConfidentialSubmitReport)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="panel" aria-labelledby="confidential-heading">
      <div className="section-header">
        <h2 id="confidential-heading">Confidential</h2>
        <span className="badge badge-in-progress">{status?.network ?? 'locked'}</span>
      </div>
      <p className="copy">Balances are hidden commitments. Proving runs on-device in the extension offscreen.</p>

      <button type="button" disabled={Boolean(disabledReason) || busy !== null} onClick={() => run('register')}>
        <KeyRound size={16} aria-hidden="true" />
        {busy === 'register' ? 'Registering… (generating proof)' : 'Set up confidential account'}
      </button>

      <div className="segmented">
        {(['deposit', 'withdraw', 'transfer'] as const).map((item) => (
          <button type="button" className={op === item ? '' : 'ghost'} key={item} onClick={() => setOp(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Amount (${code})`} inputMode="decimal" />
      {needsRecipient ? (
        <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={op === 'withdraw' ? 'Public address (G…)' : 'Recipient account (G…)'} spellCheck={false} />
      ) : null}
      <button type="button" disabled={Boolean(disabledReason) || busy !== null} onClick={() => run(op)}>
        <Lock size={16} aria-hidden="true" />
        {busy === op ? `${op[0].toUpperCase() + op.slice(1)}ing…` : `${op[0].toUpperCase() + op.slice(1)} ${amount || '0'} ${code}`}
      </button>

      <div className="segmented">
        <button type="button" className="ghost" disabled={Boolean(disabledReason) || busy !== null} onClick={() => run('merge')}>
          <Layers size={16} aria-hidden="true" /> {busy === 'merge' ? 'Merging…' : 'Merge'}
        </button>
        <button type="button" className="ghost" disabled={Boolean(disabledReason) || busy !== null} onClick={() => run('scan')}>
          <Eye size={16} aria-hidden="true" /> {busy === 'scan' ? 'Scanning…' : 'Check incoming'}
        </button>
      </div>

      <p className="copy">{disabledReason}</p>
      {error ? <p className="error">{error}</p> : null}
      {scan ? <p className="copy">{scan.count > 0 ? `Received ${scan.count} transfer(s) — credited ${(Number(scan.creditedTotal) / 10 ** decimals).toFixed(2)} ${code}.` : 'No new incoming transfers.'}</p> : null}
      {report ? <ConfidentialReport report={report} /> : null}
    </section>
  )
}

function ConfidentialReport({ report }: { readonly report: ConfidentialSubmitReport }) {
  return (
    <div className="proof-results">
      <dl className="meta-list">
        <div>
          <dt>{report.op}</dt>
          <dd>{report.status}</dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd>{report.txHash ? shorten(report.txHash, 10, 8) : 'Not submitted'}</dd>
        </div>
      </dl>
      {report.explorerUrl ? (
        <a className="explorer-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> View on explorer
        </a>
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
            <strong>{event.stage}</strong>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

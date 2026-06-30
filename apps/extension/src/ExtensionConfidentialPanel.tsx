import { getConfidentialConfig, isConfidentialEnabled, type ConfidentialSubmitReport } from '@zk-fighter/core'
import { Eye, KeyRound, Layers, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button, Segmented } from '@zk-fighter/ui'

import { dappMessageTypes, type ConfidentialOpKind, type ConfidentialResponse, type DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'
import { Badge, BlockerList, Copy, ErrorText, ExplorerLink, MetaRow, Panel, SectionHeader, fieldStyle } from './extension-ui'

const latestEventCount = 5
type SpendOp = 'deposit' | 'withdraw' | 'transfer'
const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value.trim())
const cap = (value: string) => value[0].toUpperCase() + value.slice(1)

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
  const blocked = Boolean(disabledReason) || busy !== null

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
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.confidential, op: kind, amount: amountBase, to: needsRecipient ? recipient.trim() : undefined })) as ConfidentialResponse
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
    <Panel label="Confidential">
      <SectionHeader title="Confidential" right={<Badge tone="progress">{status?.network ?? 'locked'}</Badge>} />
      <Copy>Balances are hidden commitments. Proving runs on-device in the extension offscreen.</Copy>

      <Button variant="secondary" fullWidth loading={busy === 'register'} disabled={blocked} onClick={() => void run('register')}>
        <KeyRound size={15} aria-hidden="true" /> {busy === 'register' ? 'Registering… (proof)' : 'Set up confidential account'}
      </Button>

      <Segmented options={(['deposit', 'withdraw', 'transfer'] as const).map((value) => ({ value, label: cap(value) }))} value={op} onChange={(value) => setOp(value as SpendOp)} size="sm" />
      <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={`Amount (${code})`} inputMode="decimal" style={fieldStyle} />
      {needsRecipient ? <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={op === 'withdraw' ? 'Public address (G…)' : 'Recipient account (G…)'} spellCheck={false} style={fieldStyle} /> : null}
      <Button fullWidth loading={busy === op} disabled={blocked} onClick={() => void run(op)}>
        <Lock size={15} aria-hidden="true" /> {busy === op ? `${cap(op)}ing…` : `${cap(op)} ${amount || '0'} ${code}`}
      </Button>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" fullWidth loading={busy === 'merge'} disabled={blocked} onClick={() => void run('merge')}><Layers size={15} aria-hidden="true" /> Merge</Button>
        <Button variant="secondary" fullWidth loading={busy === 'scan'} disabled={blocked} onClick={() => void run('scan')}><Eye size={15} aria-hidden="true" /> Check incoming</Button>
      </div>

      {disabledReason ? <Copy>{disabledReason}</Copy> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {scan ? <Copy>{scan.count > 0 ? `Received ${scan.count} transfer(s) — credited ${(Number(scan.creditedTotal) / 10 ** decimals).toFixed(2)} ${code}.` : 'No new incoming transfers.'}</Copy> : null}
      {report ? <ConfidentialReport report={report} /> : null}
    </Panel>
  )
}

function ConfidentialReport({ report }: { readonly report: ConfidentialSubmitReport }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 12, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <MetaRow label={report.op.toUpperCase()}>{report.status}</MetaRow>
      <MetaRow label="TRANSACTION">{report.txHash ? shorten(report.txHash, 10, 8) : 'Not submitted'}</MetaRow>
      {report.explorerUrl ? <ExplorerLink href={report.explorerUrl}>View on explorer ↗</ExplorerLink> : null}
      <BlockerList blockers={report.blockers} />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {report.statusEvents.slice(-latestEventCount).map((event, index) => (
          <li key={`${event.elapsedMs}-${index}`} style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
            <strong style={{ color: 'var(--tx2)' }}>{event.stage}</strong> · {event.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

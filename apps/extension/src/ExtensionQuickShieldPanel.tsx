import type { AssetCode, XlmShieldSubmitReport } from '@zk-freighter/core'
import { isShieldedAssetEnabled, maxShieldDepositStroops, parseAssetAmountToStroops } from '@zk-freighter/core'
import { Shield } from 'lucide-react'
import { useState } from 'react'
import { Button, Callout, Segmented } from '@zk-freighter/ui'

import {
  dappMessageTypes,
  type DappWalletStatus,
  type QuickShieldResponse,
} from './dappMessages'
import { amountLabel, defaultShieldAmounts, formatStroops, shorten } from './extension-format'
import { Badge, BlockerList, Caption, Copy, ErrorText, ExplorerLink, MetaRow, Panel, SectionHeader, fieldStyle } from './extension-ui'
import { balanceLabel, balanceStroops, maxAmountInput, useExtensionBalances } from './useExtensionBalances'

const latestEventCount = 6

type ShieldReportWithPrerequisites = XlmShieldSubmitReport & {
  readonly prerequisites?: {
    readonly usdcTrustline?: { readonly status: string; readonly txHash?: string; readonly explorerUrl?: string }
    readonly aspInsert?: { readonly status: string; readonly txHash?: string; readonly explorerUrl?: string; readonly blockers?: readonly string[] }
    readonly events?: readonly { readonly elapsedMs: number; readonly stage: string; readonly message: string }[]
  }
}

interface ExtensionQuickShieldPanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionQuickShieldPanel({ status, sendRuntimeMessage }: ExtensionQuickShieldPanelProps) {
  const [asset, setAsset] = useState<AssetCode>('XLM')
  const [amountInput, setAmountInput] = useState(defaultAmountInput('XLM'))
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ShieldReportWithPrerequisites | null>(null)
  const [error, setError] = useState('')
  const publicBalance = useExtensionBalances(sendRuntimeMessage)
  const poolEnabled = status ? isShieldedAssetEnabled(status.network, asset) : false
  const disabledReason = !status?.unlocked ? 'Unlock the extension vault first.' : !poolEnabled ? `${asset} pool is not configured for this network.` : ''
  const available = balanceStroops(publicBalance.balances, 'public', asset)
  const poolMax = status ? maxShieldDepositStroops(status.network, asset) : null
  const maxSelectable = cappedAvailable(available, poolMax)
  const poolMaxLabel = poolMax !== null ? `${formatStroops(poolMax, asset === 'XLM' ? 3 : 2)} ${asset}` : ''
  const parsedAmount = parseAssetAmountToStroops(amountInput, asset)
  const overBalance = parsedAmount.ok && available !== null && parsedAmount.stroops > available
  const overPoolMax = parsedAmount.ok && poolMax !== null && parsedAmount.stroops > poolMax
  const amountError = amountInput.trim() && !parsedAmount.ok
    ? parsedAmount.error
    : overBalance
      ? `Amount exceeds your public ${asset} balance.`
      : overPoolMax
        ? `Amount exceeds this pool's ${poolMaxLabel} per-deposit limit.`
        : ''

  async function runQuickShield() {
    const parsed = parseAssetAmountToStroops(amountInput, asset)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.quickShield, asset, amountStroops: parsed.stroops.toString() })) as QuickShieldResponse
      if (!response.ok || !response.report) setError(response.error ?? 'QuickShield did not return a report.')
      else setReport(response.report as ShieldReportWithPrerequisites)
    } finally {
      setBusy(false)
    }
  }

  function selectAsset(value: string) {
    const next = value as AssetCode
    setAsset(next)
    setAmountInput(defaultAmountInput(next))
    setError('')
  }

  return (
    <Panel label="QuickShield">
      <SectionHeader title="QuickShield" right={<Badge tone="progress">{status?.network ?? 'locked'}</Badge>} />
      <Callout tone="public">Shield/deposit is public. Privacy starts after funds enter the shielded pool.</Callout>
      <Copy>{disabledReason || 'Shield checks public balance, USDC receiving, shield access, pool sync, proof, and submit in one run.'}</Copy>

      <Segmented options={(['XLM', 'USDC'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={selectAsset} size="sm" />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <Caption>AMOUNT</Caption>
          <button type="button" onClick={() => setAmountInput(maxAmountInput(maxSelectable))} disabled={maxSelectable === null || maxSelectable <= 0n} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: maxSelectable && maxSelectable > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 10.5, fontWeight: 800, cursor: maxSelectable && maxSelectable > 0n ? 'pointer' : 'default' }}>Max</button>
        </div>
        <input data-zkf-action="shield-amount" value={amountInput} onChange={(event) => setAmountInput(event.target.value)} inputMode="decimal" placeholder="0.00" style={fieldStyle} />
        <Copy>Available public balance: {balanceLabel(available, asset, publicBalance.loading)}</Copy>
        {poolMaxLabel ? <Copy>Pool limit: shield up to {poolMaxLabel} per deposit.</Copy> : null}
      </div>
      <Button fullWidth loading={busy} disabled={Boolean(disabledReason) || Boolean(amountError) || busy} onClick={() => void runQuickShield()}>
        <Shield size={15} aria-hidden="true" /> {busy ? 'Shielding…' : `Shield ${amountInput || '0'} ${asset}`}
      </Button>
      <Copy>{disabledReason || reportLabel(report, asset)}</Copy>
      {amountError ? <ErrorText>{amountError}</ErrorText> : null}
      {publicBalance.error ? <ErrorText>{publicBalance.error}</ErrorText> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {report ? <ShieldReport report={report} asset={asset} /> : null}
    </Panel>
  )
}

function ReportCard({ rows, explorer, explorerText, blockers }: { rows: ReadonlyArray<readonly [string, string]>; explorer?: string; explorerText: string; blockers?: readonly string[] }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 12, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(([label, value]) => <MetaRow key={label} label={label}>{value}</MetaRow>)}
      {explorer ? <ExplorerLink href={explorer}>{explorerText} ↗</ExplorerLink> : null}
      {blockers ? <BlockerList blockers={blockers} /> : null}
    </div>
  )
}

function ShieldReport({ report, asset }: { readonly report: ShieldReportWithPrerequisites; readonly asset: AssetCode }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 12, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {report.prerequisites?.usdcTrustline ? <ReportCard rows={[['USDC RECEIVE', report.prerequisites.usdcTrustline.status], ['TRANSACTION', report.prerequisites.usdcTrustline.txHash ? shorten(report.prerequisites.usdcTrustline.txHash, 10, 8) : 'Not submitted']]} explorer={report.prerequisites.usdcTrustline.explorerUrl} explorerText="View USDC setup" /> : null}
      {report.prerequisites?.aspInsert ? <ReportCard rows={[['SHIELD ACCESS', report.prerequisites.aspInsert.status], ['TRANSACTION', report.prerequisites.aspInsert.txHash ? shorten(report.prerequisites.aspInsert.txHash, 10, 8) : 'Not submitted']]} explorer={report.prerequisites.aspInsert.explorerUrl} explorerText="View shield setup" blockers={report.prerequisites.aspInsert.blockers} /> : null}
      <MetaRow label="POOL">{report.poolContractId ? shorten(report.poolContractId, 10, 8) : 'Unavailable'}</MetaRow>
      <MetaRow label="PROOF">{report.proofGenerated ? 'Generated' : 'Not generated'}</MetaRow>
      <MetaRow label="TRANSACTION">{report.transactionSubmitted ? 'Confirmed' : 'Not submitted'}</MetaRow>
      {report.explorerUrl ? <ExplorerLink href={report.explorerUrl}>View public deposit ↗</ExplorerLink> : null}
      <BlockerList blockers={report.blockers} />
      {report.prerequisites?.events?.length ? <BlockerList blockers={report.prerequisites.events.slice(-4).map((event) => `${event.stage} · ${event.message}`)} /> : null}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {report.statusEvents.slice(-latestEventCount).map((event, index) => (
          <li key={`${event.elapsedMs}-${index}`} style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
            <strong style={{ color: 'var(--tx2)' }}>{event.source}</strong> · {event.message}
          </li>
        ))}
      </ul>
      <Copy>Amount: {amountLabel(report.amountStroops, asset)}</Copy>
    </div>
  )
}

function defaultAmountInput(asset: AssetCode): string {
  return amountLabel(defaultShieldAmounts[asset], asset).replace(` ${asset}`, '')
}

function cappedAvailable(available: bigint | null, poolMax: bigint | null): bigint | null {
  if (available === null) return null
  return poolMax !== null && available > poolMax ? poolMax : available
}

function reportLabel(report: XlmShieldSubmitReport | null, asset: AssetCode): string {
  if (!report) return `Runs the real ${asset} shield path through the extension offscreen runtime.`
  if (report.status === 'submitted') return `Submitted ${shorten(report.txHash ?? '', 12, 10)}`
  return `${report.status} after ${report.durationMs.toLocaleString()} ms`
}

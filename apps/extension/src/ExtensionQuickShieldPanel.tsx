import type {
  AspMembershipInsertReport,
  AssetCode,
  StellarUsdcTrustlineReport,
  XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { isShieldedAssetEnabled, parseAssetAmountToStroops } from '@zk-fighter/core'
import { Activity, Shield } from 'lucide-react'
import { useState } from 'react'
import { Button, Callout, Segmented } from '@zk-fighter/ui'

import {
  dappMessageTypes,
  type DappWalletStatus,
  type PrepareShieldAccessResponse,
  type PrepareUsdcReceiveResponse,
  type QuickShieldResponse,
} from './dappMessages'
import { amountLabel, defaultShieldAmounts, shorten } from './extension-format'
import { Badge, BlockerList, Caption, Copy, ErrorText, ExplorerLink, MetaRow, Panel, SectionHeader, fieldStyle } from './extension-ui'
import { balanceLabel, balanceStroops, maxAmountInput, useExtensionBalances } from './useExtensionBalances'

const latestEventCount = 6

interface ExtensionQuickShieldPanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionQuickShieldPanel({ status, sendRuntimeMessage }: ExtensionQuickShieldPanelProps) {
  const [asset, setAsset] = useState<AssetCode>('XLM')
  const [amountInput, setAmountInput] = useState(defaultAmountInput('XLM'))
  const [busy, setBusy] = useState(false)
  const [accessBusy, setAccessBusy] = useState(false)
  const [usdcBusy, setUsdcBusy] = useState(false)
  const [report, setReport] = useState<XlmShieldSubmitReport | null>(null)
  const [accessReport, setAccessReport] = useState<AspMembershipInsertReport | null>(null)
  const [usdcReport, setUsdcReport] = useState<StellarUsdcTrustlineReport | null>(null)
  const [error, setError] = useState('')
  const publicBalance = useExtensionBalances(sendRuntimeMessage)
  const poolEnabled = status ? isShieldedAssetEnabled(status.network, asset) : false
  const disabledReason = !status?.unlocked ? 'Unlock the extension vault first.' : !poolEnabled ? `${asset} pool is not configured for this network.` : ''
  const usdcReady = asset === 'USDC' && (usdcReport?.status === 'ready' || usdcReport?.status === 'created')
  const available = balanceStroops(publicBalance.balances, 'public', asset)
  const parsedAmount = parseAssetAmountToStroops(amountInput, asset)
  const overBalance = parsedAmount.ok && available !== null && parsedAmount.stroops > available
  const amountError = overBalance ? `Amount exceeds your public ${asset} balance.` : ''

  async function prepareShieldAccess() {
    setAccessBusy(true)
    setError('')
    setAccessReport(null)
    try {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.prepareShieldAccess })) as PrepareShieldAccessResponse
      if (!response.ok || !response.report) setError(response.error ?? 'Shield access setup did not return a report.')
      else setAccessReport(response.report)
    } finally {
      setAccessBusy(false)
    }
  }

  async function prepareUsdcReceive() {
    setUsdcBusy(true)
    setError('')
    setUsdcReport(null)
    try {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.prepareUsdcReceive })) as PrepareUsdcReceiveResponse
      if (!response.ok || !response.report) setError(usdcReceiveErrorText(response.error))
      else setUsdcReport(response.report)
    } finally {
      setUsdcBusy(false)
    }
  }

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
      else setReport(response.report)
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

      <Button variant="secondary" fullWidth loading={accessBusy} disabled={Boolean(disabledReason) || accessBusy || busy} onClick={() => void prepareShieldAccess()}>
        <Activity size={15} aria-hidden="true" /> {accessBusy ? 'Preparing…' : 'Prepare shield access'}
      </Button>
      <Copy>{disabledReason || accessReportLabel(accessReport)}</Copy>
      {accessReport ? <ReportCard rows={[['ASP SETUP', accessReport.status], ['TRANSACTION', accessReport.txHash ? shorten(accessReport.txHash, 10, 8) : 'Not submitted']]} explorer={accessReport.explorerUrl} explorerText="View public setup" blockers={accessReport.blockers} /> : null}

      {asset === 'USDC' && !usdcReady ? (
        <>
          <Button variant="secondary" fullWidth loading={usdcBusy} disabled={Boolean(disabledReason) || accessBusy || busy || usdcBusy} onClick={() => void prepareUsdcReceive()}>
            <Activity size={15} aria-hidden="true" /> {usdcBusy ? 'Checking USDC…' : 'Enable USDC receiving'}
          </Button>
          <Copy>{disabledReason || usdcReportLabel(usdcReport)}</Copy>
          {usdcReport ? <ReportCard rows={[['USDC RECEIVE', usdcReport.status], ['PUBLIC ACCOUNT', shorten(usdcReport.userAddress, 8, 8)]]} explorer={usdcReport.explorerUrl} explorerText="View public setup" /> : null}
        </>
      ) : null}

      <Segmented options={(['XLM', 'USDC'] as const).map((value) => ({ value, label: value }))} value={asset} onChange={selectAsset} size="sm" />
      {usdcReady ? <Copy>{usdcReportLabel(usdcReport)}</Copy> : null}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <Caption>AMOUNT</Caption>
          <button type="button" onClick={() => setAmountInput(maxAmountInput(available))} disabled={available === null || available <= 0n} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: available && available > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 10.5, fontWeight: 800, cursor: available && available > 0n ? 'pointer' : 'default' }}>Max</button>
        </div>
        <input data-zkf-action="shield-amount" value={amountInput} onChange={(event) => setAmountInput(event.target.value)} inputMode="decimal" placeholder="0.00" style={fieldStyle} />
        <Copy>Available public balance: {balanceLabel(available, asset, publicBalance.loading)}</Copy>
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

function ShieldReport({ report, asset }: { readonly report: XlmShieldSubmitReport; readonly asset: AssetCode }) {
  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 12, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <MetaRow label="POOL">{report.poolContractId ? shorten(report.poolContractId, 10, 8) : 'Unavailable'}</MetaRow>
      <MetaRow label="PROOF">{report.proofGenerated ? 'Generated' : 'Not generated'}</MetaRow>
      <MetaRow label="TRANSACTION">{report.transactionSubmitted ? 'Confirmed' : 'Not submitted'}</MetaRow>
      {report.explorerUrl ? <ExplorerLink href={report.explorerUrl}>View public deposit ↗</ExplorerLink> : null}
      <BlockerList blockers={report.blockers} />
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

function accessReportLabel(report: AspMembershipInsertReport | null): string {
  if (!report) return 'Run once before the first shield if the pool needs a public setup transaction.'
  if (report.status === 'submitted') return `Prepared ${shorten(report.txHash ?? '', 12, 10)}`
  return `${report.status} after ${report.statusEvents.at(-1)?.elapsedMs.toLocaleString() ?? '0'} ms`
}

function usdcReportLabel(report: StellarUsdcTrustlineReport | null): string {
  if (!report) return 'Checks whether this public address can receive USDC. If needed, it submits the one-time public setup transaction and may reserve 0.5 XLM.'
  if (report.status === 'created') return `USDC receiving enabled ${shorten(report.txHash ?? '', 12, 10)}`
  return 'USDC receiving is ready. Fund the public address before shielding.'
}

function usdcReceiveErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/not funded/i.test(message)) return 'Fund this Stellar address with XLM first, then enable USDC receiving.'
  if (/insufficient|underfunded|tx_insufficient_balance|op_underfunded/i.test(message)) return 'Add enough XLM for the one-time 0.5 XLM reserve and network fee, then try again.'
  if (/friendbot/i.test(message)) return 'Testnet funding failed. Try again after the faucet recovers.'
  return message ? 'USDC receiving setup failed. Check the network and XLM reserve, then try again.' : 'USDC receive preparation did not return a report.'
}

function defaultAmountInput(asset: AssetCode): string {
  return amountLabel(defaultShieldAmounts[asset], asset).replace(` ${asset}`, '')
}

function reportLabel(report: XlmShieldSubmitReport | null, asset: AssetCode): string {
  if (!report) return `Runs the real ${asset} shield path through the extension offscreen runtime.`
  if (report.status === 'submitted') return `Submitted ${shorten(report.txHash ?? '', 12, 10)}`
  return `${report.status} after ${report.durationMs.toLocaleString()} ms`
}

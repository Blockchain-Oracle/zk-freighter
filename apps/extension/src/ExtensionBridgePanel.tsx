import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { bridgeAmountDisplay, getDefaultCctpSource, getEnabledCctpSources, isEvmFaucetChain, parseEvmUsdcAmountToAtomic, type CctpSourceKey, type EvmFundingReport, type NetworkKey } from '@zk-freighter/core'
import { Button } from '@zk-freighter/ui'

import { ChainMark } from './asset-marks'
import { dappMessageTypes, type BridgeSourceBalancesResponse, type DappBalances, type DappBalancesResponse, type DappWalletStatus, type EvmFundResponse, type QuickBridgeResponse } from './dappMessages'
import { amountLabel, atomicToAmountInput, formatAtomic, shorten } from './extension-format'
import { Caption, Copy, ErrorText, ExplorerLink, MetaRow, Panel, SectionHeader, fieldStyle } from './extension-ui'

interface ExtensionBridgePanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionBridgePanel({ status, sendRuntimeMessage }: ExtensionBridgePanelProps) {
  const network = status?.network ?? 'testnet'
  const sources = useMemo(() => getEnabledCctpSources(network), [network])
  const [sourceChainKey, setSourceChainKey] = useState<CctpSourceKey>(() => getDefaultCctpSource('testnet')?.key ?? 'base')
  const [amount, setAmount] = useState('1')
  const [resumeBurnHash, setResumeBurnHash] = useState('')
  const [balances, setBalances] = useState<DappBalances | null>(null)
  const [sourceBalances, setSourceBalances] = useState<BridgeSourceBalancesResponse | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [result, setResult] = useState<QuickBridgeResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const disabledReason = status?.unlocked ? '' : 'Unlock the extension vault first.'
  const selectedSource = sources.find((source) => source.key === sourceChainKey) ?? getDefaultCctpSource(network)
  const evmAddress = status?.evmAddress ?? ''
  const resumeMode = Boolean(resumeBurnHash.trim())
  const parsedAmount = parseEvmUsdcAmountToAtomic(amount)
  const destinationUsdc = balances?.publicOk ? amountLabel(balances.publicUsdcStroops, 'USDC') : '—'
  const sourceUsdcAtomic = sourceBalances?.ok && sourceBalances.usdcAtomic ? BigInt(sourceBalances.usdcAtomic) : null
  const sourceNativeWei = sourceBalances?.ok && sourceBalances.nativeWei ? BigInt(sourceBalances.nativeWei) : null
  const overSourceBalance = !resumeMode && parsedAmount.ok && sourceUsdcAtomic !== null && parsedAmount.atomic > sourceUsdcAtomic

  useEffect(() => {
    const defaultSource = getDefaultCctpSource(network)
    if (defaultSource && !sources.some((source) => source.key === sourceChainKey)) {
      setSourceChainKey(defaultSource.key)
    }
  }, [network, sourceChainKey, sources])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.balances })) as DappBalancesResponse
      if (!cancelled && response.ok && response.balances) setBalances(response.balances)
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage])

  useEffect(() => {
    if (!selectedSource) return
    let cancelled = false
    setSourceLoading(true)
    setSourceBalances(null)
    void (async () => {
      try {
        const response = (await sendRuntimeMessage({ type: dappMessageTypes.bridgeSourceBalances, sourceChainKey: selectedSource.key })) as BridgeSourceBalancesResponse
        if (!cancelled) setSourceBalances(response)
      } finally {
        if (!cancelled) setSourceLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedSource, sendRuntimeMessage])

  async function startBridge() {
    if (!selectedSource) {
      setError('Choose a source chain.')
      return
    }
    const nextAmount = resumeMode ? null : parseEvmUsdcAmountToAtomic(amount)
    if (nextAmount && !nextAmount.ok) {
      setError(nextAmount.error)
      return
    }
    if (overSourceBalance) {
      setError('Amount exceeds the USDC funded on this source-chain address.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const amountAtomic = nextAmount?.ok ? nextAmount.atomic.toString() : undefined
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.quickBridge, sourceChainKey: selectedSource.key, amountAtomic, resumeBurnHash })) as QuickBridgeResponse
      setResult(response)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel label="Bridge then shield">
      <SectionHeader title="Bridge then shield" right={<span style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', padding: '5px 9px', border: '1px solid var(--bd)', borderRadius: 999 }}>NATIVE</span>} />
      <Copy>Bring USDC from another chain into your public Stellar balance via Circle CCTP. ZK Freighter signs the burn with its own seed-derived EVM key inside the extension.</Copy>
      <MetaRow label="FUND THIS EVM ADDRESS">{evmAddress ? shorten(evmAddress, 10, 8) : 'Unlock first'}</MetaRow>
      <MetaRow label="PUBLIC STELLAR USDC">{destinationUsdc}</MetaRow>
      <MetaRow label="SOURCE USDC">{sourceLoading ? 'Loading…' : sourceUsdcAtomic === null ? '—' : `${formatAtomic(sourceUsdcAtomic, 6, 2)} USDC`}</MetaRow>
      <MetaRow label="SOURCE GAS">{sourceLoading ? 'Loading…' : sourceNativeWei === null ? '—' : `${formatAtomic(sourceNativeWei, 18, 4)} ${sourceBalances?.gasToken ?? selectedSource?.gasToken ?? 'gas'}`}</MetaRow>
      <EvmFundRow network={network} chain={selectedSource?.key ?? sourceChainKey} label={selectedSource?.label ?? 'this chain'} sendRuntimeMessage={sendRuntimeMessage} />
      <MetaRow label="SOURCE">{selectedSource ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><ChainMark chain={selectedSource.key} size={21} />{selectedSource.label}</span> : 'Unavailable'}</MetaRow>
      <MetaRow label="AMOUNT">{resumeMode ? 'Resolved from burn attestation' : parsedAmount.ok ? bridgeAmountDisplay(parsedAmount.atomic) : '— USDC'}</MetaRow>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>SOURCE CHAIN</Caption>
        <select value={selectedSource?.key ?? sourceChainKey} onChange={(event) => setSourceChainKey(event.target.value as CctpSourceKey)} style={fieldStyle}>
          {sources.map((source) => (
            <option value={source.key} key={source.key}>{source.label}</option>
          ))}
        </select>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <Caption>AMOUNT</Caption>
          <button type="button" onClick={() => setAmount(sourceUsdcAtomic && sourceUsdcAtomic > 0n ? atomicToAmountInput(sourceUsdcAtomic, 6) : '')} disabled={!sourceUsdcAtomic || sourceUsdcAtomic <= 0n} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: sourceUsdcAtomic && sourceUsdcAtomic > 0n ? 'var(--ac2)' : 'var(--tx3)', fontSize: 10.5, fontWeight: 800, cursor: sourceUsdcAtomic && sourceUsdcAtomic > 0n ? 'pointer' : 'default' }}>Max</button>
        </div>
        <input data-zkf-action="bridge-amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={sourceUsdcAtomic && sourceUsdcAtomic > 0n ? atomicToAmountInput(sourceUsdcAtomic, 6) : '1.00'} style={fieldStyle} />
      </div>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>RESUME BURN HASH</Caption>
        <input value={resumeBurnHash} onChange={(event) => setResumeBurnHash(event.target.value)} placeholder="0x… (optional)" style={fieldStyle} />
      </div>
      <Copy>{disabledReason || bridgeResultText(result)}</Copy>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {sourceBalances && !sourceBalances.ok ? <ErrorText>{sourceBalances.error ?? 'Could not load source-chain balances.'}</ErrorText> : null}
      {overSourceBalance ? <ErrorText>Amount exceeds the funded source-chain USDC balance.</ErrorText> : null}
      <Button fullWidth loading={busy} disabled={Boolean(disabledReason) || overSourceBalance || busy} onClick={() => void startBridge()}>
        <ArrowLeftRight size={15} aria-hidden="true" /> {busy ? 'Bridging…' : 'Start bridge'}
      </Button>
      {result?.report?.stellarMintExplorerUrl ? <ExplorerLink href={result.report.stellarMintExplorerUrl}>View Stellar mint ↗</ExplorerLink> : null}
    </Panel>
  )
}

function bridgeResultText(result: QuickBridgeResponse | null): string {
  if (!result) {
    return 'Fund the EVM address with USDC and gas, then bridge natively inside the extension.'
  }
  if (!result.ok) {
    return result.error ?? 'Bridge failed.'
  }
  const report = result.report
  if (!report) {
    return 'Bridge submitted.'
  }
  if (report.status === 'completed') {
    return 'USDC arrived publicly on Stellar — shield it via Quick shield.'
  }
  return `${report.status}: ${report.statusEvents.at(-1)?.message ?? report.blockers[0] ?? 'in progress'}`
}

function EvmFundRow({ network, chain, label, sendRuntimeMessage }: { readonly network: NetworkKey; readonly chain: CctpSourceKey; readonly label: string; readonly sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<EvmFundingReport | null>(null)
  if (network !== 'testnet' || !isEvmFaucetChain(chain)) return null
  const faucetChain = chain

  async function fund() {
    setBusy(true)
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.evmFund, chain: faucetChain })) as EvmFundResponse
      setReport(res.report ?? null)
    } finally {
      setBusy(false)
    }
  }

  const cooldown = report?.cooldownUntil ? new Date(report.cooldownUntil) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button type="button" data-zkf-action="evm-fund" disabled={busy} onClick={() => void fund()} style={{ border: '1px solid rgba(94,124,250,.35)', borderRadius: 12, background: 'rgba(94,124,250,.08)', color: 'var(--tx)', padding: '9px 11px', fontSize: 11, fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.65 : 1 }}>
        {busy ? 'Requesting…' : `Get test USDC + gas on ${label}`}
      </button>
      {report ? (
        <div style={{ fontSize: 10.5, color: 'var(--tx2)', lineHeight: 1.5 }}>
          {report.assets.map((asset) => (
            <div key={asset.asset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{asset.asset}</span>
              <span style={{ color: asset.status === 'funded' || asset.status === 'ready' ? 'var(--pos)' : 'var(--warn)' }}>{asset.status}</span>
              {asset.explorerUrl ? <a href={asset.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ac2)' }}>view ↗</a> : null}
            </div>
          ))}
          {report.assets.length === 0 && report.blockers[0] ? <div style={{ color: 'var(--warn)' }}>{report.blockers[0]}</div> : null}
          {cooldown ? <div style={{ color: 'var(--tx3)', marginTop: 3 }}>Faucet cooldown until {cooldown.toLocaleTimeString()}.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

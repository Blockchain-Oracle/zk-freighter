import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDefaultCctpSource, getEnabledCctpSources, type CctpSourceKey } from '@zk-fighter/core'
import { Button } from '@zk-fighter/ui'

import { dappMessageTypes, type DappWalletStatus, type QuickBridgeResponse } from './dappMessages'
import { shorten } from './extension-format'
import { Caption, Copy, ExplorerLink, MetaRow, Panel, SectionHeader, fieldStyle } from './extension-ui'

interface ExtensionBridgePanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionBridgePanel({ status, sendRuntimeMessage }: ExtensionBridgePanelProps) {
  const network = status?.network ?? 'testnet'
  const sources = useMemo(() => getEnabledCctpSources(network), [network])
  const [sourceChainKey, setSourceChainKey] = useState<CctpSourceKey>(() => getDefaultCctpSource('testnet')?.key ?? 'base')
  const [resumeBurnHash, setResumeBurnHash] = useState('')
  const [result, setResult] = useState<QuickBridgeResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const disabledReason = status?.unlocked ? '' : 'Unlock the extension vault first.'
  const selectedSource = sources.find((source) => source.key === sourceChainKey) ?? getDefaultCctpSource(network)
  const evmAddress = status?.evmAddress ?? ''

  useEffect(() => {
    const defaultSource = getDefaultCctpSource(network)
    if (defaultSource && !sources.some((source) => source.key === sourceChainKey)) {
      setSourceChainKey(defaultSource.key)
    }
  }, [network, sourceChainKey, sources])

  async function startBridge() {
    setBusy(true)
    try {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.quickBridge, sourceChainKey: selectedSource?.key, resumeBurnHash })) as QuickBridgeResponse
      setResult(response)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel label="Bridge then shield">
      <SectionHeader title="Bridge then shield" right={<span style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', padding: '5px 9px', border: '1px solid var(--bd)', borderRadius: 999 }}>NATIVE</span>} />
      <Copy>Bring USDC from another chain into your public Stellar balance via Circle CCTP. ZK Fighter signs the burn with its own seed-derived EVM key — no MetaMask, no web handoff.</Copy>
      <MetaRow label="FUND THIS EVM ADDRESS">{evmAddress ? shorten(evmAddress, 10, 8) : 'Unlock first'}</MetaRow>
      <MetaRow label="SOURCE">{selectedSource ? `${selectedSource.label} · ${selectedSource.gasToken} gas` : 'Unavailable'}</MetaRow>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>SOURCE CHAIN</Caption>
        <select value={selectedSource?.key ?? sourceChainKey} onChange={(event) => setSourceChainKey(event.target.value as CctpSourceKey)} style={fieldStyle}>
          {sources.map((source) => (
            <option value={source.key} key={source.key}>{source.label}</option>
          ))}
        </select>
      </div>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>RESUME BURN HASH</Caption>
        <input value={resumeBurnHash} onChange={(event) => setResumeBurnHash(event.target.value)} placeholder="0x… (optional)" style={fieldStyle} />
      </div>
      <Button fullWidth loading={busy} disabled={Boolean(disabledReason) || busy} onClick={() => void startBridge()}>
        <ArrowLeftRight size={15} aria-hidden="true" /> {busy ? 'Bridging…' : 'Start bridge'}
      </Button>
      <Copy>{disabledReason || bridgeResultText(result)}</Copy>
      {result?.report?.stellarMintExplorerUrl ? <ExplorerLink href={result.report.stellarMintExplorerUrl}>View Stellar mint ↗</ExplorerLink> : null}
    </Panel>
  )
}

function bridgeResultText(result: QuickBridgeResponse | null): string {
  if (!result) {
    return 'Fund the EVM address with USDC (and a little gas), then bridge natively — no web handoff.'
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

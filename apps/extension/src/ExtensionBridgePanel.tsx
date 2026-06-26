import { ArrowLeftRight, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDefaultCctpSource, getEnabledCctpSources, type CctpSourceKey } from '@zk-fighter/core'

import { dappMessageTypes, type DappWalletStatus, type QuickBridgeResponse } from './dappMessages'
import { shorten } from './extension-format'

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
    const response = (await sendRuntimeMessage({
      type: dappMessageTypes.quickBridge,
      sourceChainKey: selectedSource?.key,
      resumeBurnHash,
    })) as QuickBridgeResponse
    setResult(response)
    setBusy(false)
  }

  return (
    <section className="panel" aria-labelledby="bridge-heading">
      <div className="section-header">
        <h2 id="bridge-heading">Bridge then shield</h2>
        <span className="badge">native</span>
      </div>
      <p className="copy">
        Bring USDC from another chain into your public Stellar balance via Circle CCTP. ZK Fighter signs the burn with
        its own seed-derived EVM key — no MetaMask, no web handoff.
      </p>
      <dl className="meta-list">
        <div>
          <dt>Fund this EVM address</dt>
          <dd>{evmAddress ? shorten(evmAddress, 10, 8) : 'Unlock first'}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{selectedSource ? `${selectedSource.label} · ${selectedSource.gasToken} gas` : 'Unavailable'}</dd>
        </div>
      </dl>
      <label className="field">
        <span>Source chain</span>
        <select value={selectedSource?.key ?? sourceChainKey} onChange={(event) => setSourceChainKey(event.target.value as CctpSourceKey)}>
          {sources.map((source) => (
            <option value={source.key} key={source.key}>
              {source.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Resume burn hash</span>
        <input value={resumeBurnHash} onChange={(event) => setResumeBurnHash(event.target.value)} />
      </label>
      <button type="button" disabled={Boolean(disabledReason) || busy} onClick={startBridge}>
        <ArrowLeftRight size={16} aria-hidden="true" /> {busy ? 'Bridging...' : 'Start bridge'}
      </button>
      <p className="copy">{disabledReason || bridgeResultText(result)}</p>
      {result?.report?.stellarMintExplorerUrl ? (
        <a className="explorer-link" href={result.report.stellarMintExplorerUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> View Stellar mint
        </a>
      ) : null}
    </section>
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

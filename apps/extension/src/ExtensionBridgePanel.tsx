import { ArrowLeftRight, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import { dappMessageTypes, type BridgeHandoffResponse, type DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'

interface ExtensionBridgePanelProps {
  readonly status: DappWalletStatus | null
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionBridgePanel({ status, sendRuntimeMessage }: ExtensionBridgePanelProps) {
  const [resumeBurnHash, setResumeBurnHash] = useState('')
  const [result, setResult] = useState<BridgeHandoffResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const disabledReason = status?.unlocked ? '' : 'Unlock the extension vault first.'

  async function openBridge() {
    setBusy(true)
    const response = (await sendRuntimeMessage({
      type: dappMessageTypes.openBridgeHandoff,
      resumeBurnHash,
    })) as BridgeHandoffResponse
    setResult(response)
    setBusy(false)
  }

  return (
    <section className="panel" aria-labelledby="bridge-heading">
      <div className="section-header">
        <h2 id="bridge-heading">Bridge then shield</h2>
        <span className="badge badge-in-progress">handoff</span>
      </div>
      <p className="copy">
        Opens the web bridge flow so the Ethereum wallet can sign on a normal web page. The bridge leg stays public,
        then ZK Fighter shields USDC separately after arrival.
      </p>
      <dl className="meta-list">
        <div>
          <dt>Destination</dt>
          <dd>{status?.publicKey ? shorten(status.publicKey) : 'Locked'}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>Ethereum Sepolia USDC via Circle CCTP</dd>
        </div>
      </dl>
      <label className="field">
        <span>Resume burn hash</span>
        <input value={resumeBurnHash} onChange={(event) => setResumeBurnHash(event.target.value)} />
      </label>
      <button type="button" disabled={Boolean(disabledReason) || busy} onClick={openBridge}>
        <ArrowLeftRight size={16} aria-hidden="true" /> {busy ? 'Opening...' : 'Open web bridge'}
      </button>
      <p className="copy">{disabledReason || bridgeResultText(result)}</p>
      {result?.url ? (
        <a className="explorer-link" href={result.url} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> {shorten(result.url, 34, 10)}
        </a>
      ) : null}
    </section>
  )
}

function bridgeResultText(result: BridgeHandoffResponse | null): string {
  if (!result) {
    return 'Extension-native Ethereum provider access stays deferred until a real Chrome runtime spike proves it.'
  }
  return result.ok ? 'Opened the web bridge handoff.' : result.error ?? 'Bridge handoff failed.'
}

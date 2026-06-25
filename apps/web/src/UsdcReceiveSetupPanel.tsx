import { Activity, ExternalLink } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  ensureStellarUsdcTrustline,
  type NetworkKey,
  type StellarUsdcTrustlineReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { usdcReceiveErrorText, usdcReceiveLabel } from './usdcReceiveSetupCopy'
import { truncateMiddle } from './app-helpers'
import './UsdcReceiveSetupPanel.css'

interface UsdcReceiveSetupPanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

export function UsdcReceiveSetupPanel({ identity, network }: UsdcReceiveSetupPanelProps) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<StellarUsdcTrustlineReport | null>(null)
  const [error, setError] = useState('')
  const requestKey = `${network}:${identity.stellarPublicKey}`
  const latestRequestRef = useRef(requestKey)

  async function enableUsdcReceiving() {
    const activeRequestKey = requestKey
    latestRequestRef.current = activeRequestKey
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const nextReport = await ensureStellarUsdcTrustline({ identity, network })
      if (latestRequestRef.current === activeRequestKey) {
        setReport(nextReport)
      }
    } catch (nextError) {
      if (latestRequestRef.current === activeRequestKey) {
        setError(usdcReceiveErrorText(nextError))
      }
    } finally {
      if (latestRequestRef.current === activeRequestKey) {
        setBusy(false)
      }
    }
  }

  return (
    <section className="usdc-receive-setup" aria-labelledby="usdc-receive-heading">
      <div className="usdc-receive-header">
        <Activity size={18} aria-hidden="true" />
        <div>
          <h3 id="usdc-receive-heading">USDC receiving</h3>
          <p>If needed, this submits a public setup transaction and reserves 0.5 XLM plus fee.</p>
        </div>
      </div>
      <button className="button secondary" type="button" disabled={busy} onClick={enableUsdcReceiving}>
        <Activity size={16} aria-hidden="true" />
        {busy ? 'Checking...' : 'Enable USDC receiving'}
      </button>
      <p className={error ? 'usdc-receive-error' : 'usdc-receive-copy'}>
        {error || usdcReceiveLabel(report)}
      </p>
      {report?.explorerUrl ? (
        <a className="usdc-receive-link" href={report.explorerUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" />
          View public setup
        </a>
      ) : null}
      {report?.friendbotHash ? (
        <p className="usdc-receive-copy">Testnet account funded: {truncateMiddle(report.friendbotHash, 10, 8)}</p>
      ) : null}
    </section>
  )
}

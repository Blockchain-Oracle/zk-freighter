import { useState } from 'react'
import { ExternalLink, RadioTower, Search } from 'lucide-react'
import {
  lookupPublishedReceiveCode,
  publishPrivateReceiveDiscovery,
  type NetworkKey,
  type PublicDiscoveryLookupReport,
  type PublicDiscoveryPublishReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { truncateMiddle } from './app-helpers'
import './PublicDiscoveryPanel.css'

interface PublicDiscoveryPanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

const foundCodeHeadChars = 20
const foundCodeTailChars = 14

function publishLabel(report: PublicDiscoveryPublishReport | null): string {
  if (!report) {
    return 'Not published from this browser session.'
  }

  if (report.status === 'submitted') {
    return `Published to ${report.pools.length} pool${report.pools.length === 1 ? '' : 's'}`
  }

  return report.status
}

function lookupLabel(report: PublicDiscoveryLookupReport | null): string {
  if (!report) {
    return 'No lookup run yet.'
  }

  return report.status === 'found' ? `Found from ledger ${report.ledger}` : report.status
}

export function PublicDiscoveryPanel({ identity, network }: PublicDiscoveryPanelProps) {
  const [publishReport, setPublishReport] = useState<PublicDiscoveryPublishReport | null>(null)
  const [lookupReport, setLookupReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const [lookupAddress, setLookupAddress] = useState(identity.stellarPublicKey)
  const [busy, setBusy] = useState<'publish' | 'lookup' | null>(null)
  const [copied, setCopied] = useState(false)

  async function publish() {
    setBusy('publish')
    setPublishReport(await publishPrivateReceiveDiscovery({ identity, network }))
    setBusy(null)
  }

  async function lookup() {
    setBusy('lookup')
    setLookupReport(await lookupPublishedReceiveCode({ ownerAddress: lookupAddress.trim(), network }))
    setCopied(false)
    setBusy(null)
  }

  async function copyFoundCode() {
    if (!lookupReport?.receiveCode) {
      return
    }

    await navigator.clipboard.writeText(lookupReport.receiveCode)
    setCopied(true)
  }

  return (
    <article className="panel discovery-panel">
      <div className="panel-heading">
        <RadioTower size={24} aria-hidden="true" />
        <div>
          <h1>Private code discovery</h1>
          <p>Direct receive-code sharing stays the default. Publishing is optional.</p>
        </div>
      </div>

      <div className="boundary-note">
        <RadioTower size={18} aria-hidden="true" />
        <span>
          Publishing does not expose your seed, spend keys, funds, or notes. It does create a public
          link between this Stellar address and your private receive keys.
        </span>
      </div>

      <div className="discovery-actions">
        <button className="button primary" disabled={busy !== null} onClick={publish}>
          <RadioTower size={18} aria-hidden="true" />
          {busy === 'publish' ? 'Publishing...' : 'Make my private code discoverable'}
        </button>
        <span>{publishLabel(publishReport)}</span>
      </div>

      {publishReport ? (
        <div className="proof-results">
          <dl className="meta-list">
            <div>
              <dt>Public Stellar address</dt>
              <dd>{truncateMiddle(publishReport.userAddress)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{publishReport.status}</dd>
            </div>
          </dl>

          <ul className="artifact-list">
            {publishReport.pools.map((pool) => (
              <li key={pool.poolContractId}>
                <strong>{pool.asset}</strong>
                <span>{pool.status}</span>
                {pool.txHash ? <code>{truncateMiddle(pool.txHash, 12, 10)}</code> : null}
                {pool.explorerUrl ? (
                  <a className="explorer-link" href={pool.explorerUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden="true" />
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          {publishReport.blockers.length > 0 ? (
            <ul className="blocker-list">
              {publishReport.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="lookup-box" aria-label="Find private code by public Stellar address">
        <h2>Find a private code</h2>
        <label className="field">
          <span>Public Stellar address</span>
          <input value={lookupAddress} onChange={(event) => setLookupAddress(event.target.value)} />
        </label>
        <div className="discovery-actions">
          <button className="button secondary" disabled={busy !== null || !lookupAddress.trim()} onClick={lookup}>
            <Search size={18} aria-hidden="true" />
            {busy === 'lookup' ? 'Looking...' : 'Find published code'}
          </button>
          <span>{lookupLabel(lookupReport)}</span>
        </div>

        {lookupReport?.receiveCode ? (
          <div className="found-code">
            <code>{truncateMiddle(lookupReport.receiveCode, foundCodeHeadChars, foundCodeTailChars)}</code>
            <button className="button secondary" onClick={copyFoundCode}>
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : null}

        {lookupReport?.blockers.length ? (
          <ul className="blocker-list">
            {lookupReport.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </article>
  )
}

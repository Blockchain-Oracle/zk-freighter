import { useState } from 'react'
import {
  lookupPublishedReceiveCode,
  publishPrivateReceiveDiscovery,
  type NetworkKey,
  type PublicDiscoveryLookupReport,
  type PublicDiscoveryPublishReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { Button, Callout, Card, truncateMiddle } from '@zk-fighter/ui'
import { BoundaryPill, FlowHeader } from './flowChrome'
import type { WalletScreen } from './screens'

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '11px 13px',
  borderRadius: 11,
  border: '1px solid var(--bd)',
  background: 'var(--card2)',
  color: 'var(--tx)',
  fontFamily: 'var(--fm)',
  fontSize: 12,
  outline: 'none',
}

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

interface DiscoverScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  onNav: (screen: WalletScreen) => void
}

export function DiscoverScreen({ identity, network, onNav }: DiscoverScreenProps) {
  const [publishing, setPublishing] = useState(false)
  const [publishReport, setPublishReport] = useState<PublicDiscoveryPublishReport | null>(null)
  const [lookupAddress, setLookupAddress] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupReport, setLookupReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const [copied, setCopied] = useState(false)

  async function publish() {
    setPublishing(true)
    setPublishReport(null)
    try {
      setPublishReport(await publishPrivateReceiveDiscovery({ identity, network }))
    } catch (cause) {
      console.error('[DiscoverScreen] publish rejection', cause)
      setPublishReport({
        status: 'failed', network, userAddress: identity.stellarPublicKey,
        notePublicKeyHex: '', encryptionPublicKeyHex: '', pools: [],
        blockers: [cause instanceof Error ? cause.message : 'Publish failed.'],
      })
    } finally {
      setPublishing(false)
    }
  }

  async function lookup() {
    const address = lookupAddress.trim()
    if (!STELLAR_ADDRESS.test(address)) {
      setLookupReport({ status: 'failed', network, ownerAddress: address, blockers: ['Enter a valid public Stellar address (G…).'] })
      return
    }
    setLooking(true)
    setLookupReport(null)
    try {
      setLookupReport(await lookupPublishedReceiveCode({ ownerAddress: address, network }))
    } catch (cause) {
      setLookupReport({ status: 'failed', network, ownerAddress: address, blockers: [cause instanceof Error ? cause.message : 'Lookup failed.'] })
    } finally {
      setLooking(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      (cause: unknown) => console.warn('clipboard write failed', cause),
    )
  }

  const publishTone = publishReport?.status === 'submitted' ? 'info' : 'warn'

  return (
    <section style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FlowHeader title="Discoverable code" onBack={() => onNav('receive')} badge={<BoundaryPill label="PUBLIC BOUNDARY" />} />

      <Card style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Make my code discoverable</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3, lineHeight: 1.5 }}>
            Link your public Stellar address to your private receive keys on-chain, so anyone who knows your public address can look up your private code.
          </div>
        </div>
        <Callout tone="public" title="Public boundary.">
          Publishing registers your receive keys on-chain against {truncateMiddle(identity.stellarPublicKey, 6, 6)}. It never exposes your seed or spend authority.
        </Callout>
        <Button fullWidth loading={publishing} onClick={publish}>Publish my code</Button>
        {publishReport ? (
          <Callout tone={publishTone} title={publishReport.status === 'submitted' ? 'Published.' : publishReport.status === 'partial' ? 'Partly published.' : 'Not published.'}>
            {publishReport.status === 'submitted'
              ? 'Your private code is now discoverable by your public address.'
              : publishReport.blockers[0] ?? 'Some pools could not be registered.'}
          </Callout>
        ) : null}
      </Card>

      <Card style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Find someone’s code</div>
        <input value={lookupAddress} onChange={(event) => setLookupAddress(event.target.value)} placeholder="Their public Stellar address (G…)" style={fieldStyle} />
        <Button variant="secondary" fullWidth loading={looking} onClick={lookup}>Find code</Button>
        {lookupReport?.status === 'found' && lookupReport.receiveCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <code style={{ fontFamily: 'var(--fm)', fontSize: 11.5, color: 'var(--tx2)', wordBreak: 'break-all', lineHeight: 1.45 }}>{lookupReport.receiveCode}</code>
            <Button variant="secondary" onClick={() => copyCode(lookupReport.receiveCode as string)}>{copied ? 'Copied' : 'Copy code'}</Button>
          </div>
        ) : lookupReport ? (
          <Callout tone="warn">{lookupReport.blockers[0] ?? 'No published code found for that address.'}</Callout>
        ) : null}
      </Card>
    </section>
  )
}

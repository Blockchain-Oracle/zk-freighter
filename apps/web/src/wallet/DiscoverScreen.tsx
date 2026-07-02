import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  encodeReceiveCode,
  lookupPublishedReceiveCode,
  publishPrivateReceiveDiscovery,
  type NetworkKey,
  type PublicDiscoveryLookupReport,
  type PublicDiscoveryPublishReport,
  type WalletIdentity,
} from '@zk-freighter/core'
import { BoundaryBadge, Button, Callout, truncateMiddle } from '@zk-freighter/ui'
import type { WalletScreen } from './screens'
import { readStoredPublish, writeStoredPublish } from './discoveryStorage'

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

const fieldStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11,
  border: '1px solid var(--bd)', background: 'var(--card2)', color: 'var(--tx)', fontFamily: 'var(--fm)', fontSize: 12, outline: 'none',
}
const panel: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 18, background: 'var(--panel)', padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 300px' }

function OnChainNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: '1px solid rgba(94,124,250,.28)', borderRadius: 12, background: 'rgba(94,124,250,.06)' }}>
      <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--ac)', boxShadow: '0 0 8px var(--ac)' }} />
      <span style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>{children}</span>
    </div>
  )
}

interface DiscoverScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  onNav: (screen: WalletScreen) => void
}

export function DiscoverScreen({ identity, network, onNav }: DiscoverScreenProps) {
  const [publishing, setPublishing] = useState(false)
  const [publishReport, setPublishReport] = useState<PublicDiscoveryPublishReport | null>(() => readStoredPublish(network, identity.stellarPublicKey))
  const [selfLookup, setSelfLookup] = useState<PublicDiscoveryLookupReport | null>(null)
  const [lookupAddress, setLookupAddress] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupReport, setLookupReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const [copied, setCopied] = useState(false)
  const receiveCode = useMemo(() => encodeReceiveCode({
    version: 1,
    network,
    notePublicKey: identity.privateReceive.notePublicKey,
    encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
  }), [identity.privateReceive.encryptionPublicKey, identity.privateReceive.notePublicKey, network])
  const storedDiscoverable = publishReport?.status === 'submitted' || publishReport?.status === 'partial'
  const discoverable = selfLookup?.status === 'found' || (selfLookup === null && storedDiscoverable)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setPublishReport(readStoredPublish(network, identity.stellarPublicKey))
        setSelfLookup(null)
      }
    })
    void lookupPublishedReceiveCode({ ownerAddress: identity.stellarPublicKey, network })
      .then((report) => { if (!cancelled) setSelfLookup(report) })
      .catch((cause) => {
        if (!cancelled) setSelfLookup({ status: 'failed', network, ownerAddress: identity.stellarPublicKey, blockers: [cause instanceof Error ? cause.message : 'Lookup failed.'] })
      })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network])

  async function publish() {
    setPublishing(true)
    setPublishReport(null)
    try {
      const report = await publishPrivateReceiveDiscovery({ identity, network })
      setPublishReport(report)
      if (report.status === 'submitted' || report.status === 'partial') writeStoredPublish(report)
    } catch (cause) {
      console.error('[DiscoverScreen] publish rejection', cause)
      setPublishReport({ status: 'failed', network, userAddress: identity.stellarPublicKey, notePublicKeyHex: '', encryptionPublicKeyHex: '', pools: [], blockers: [cause instanceof Error ? cause.message : 'Publish failed.'] })
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
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) },
      (cause: unknown) => console.warn('clipboard write failed', cause),
    )
  }

  const found = lookupReport?.status === 'found' && lookupReport.receiveCode ? lookupReport : null

  return (
    <section style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Discover</div>
        <BoundaryBadge kind="public" />
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 18 }}>
        Make your private code findable by your public address — or look up someone else’s. Never exposes your seed or spend authority.
      </div>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={panel}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{discoverable ? 'Your code is discoverable' : 'Make my code discoverable'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>Links this public address to your private receive keys on-chain, so others can find your <span style={{ fontFamily: 'var(--fm)' }}>zkf1…</span> code.</div>
          <div style={{ ...fieldStyle, color: 'var(--tx2)', cursor: 'default' }}>{truncateMiddle(identity.stellarPublicKey, 6, 6)} <span style={{ color: 'var(--tx3)' }}>(your public account)</span></div>
          <OnChainNote>Visible on-chain · never exposes your seed or any power to spend.</OnChainNote>
          {discoverable ? (
            <div style={{ padding: 14, border: '1px solid rgba(53,199,123,.42)', borderRadius: 12, background: 'rgba(53,199,123,.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pos)' }}>Ready to receive through Discover</div>
              <div style={{ font: '600 10px/1.4 var(--fm)', color: 'var(--tx3)', marginTop: 6 }}>Public · {truncateMiddle(identity.stellarPublicKey, 8, 8)}</div>
              <div style={{ font: '600 10px/1.4 var(--fm)', color: 'var(--tx3)', marginTop: 6 }}>{truncateMiddle(selfLookup?.receiveCode ?? receiveCode, 10, 6)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="secondary" fullWidth onClick={() => copyCode(identity.stellarPublicKey)}>{copied ? 'Copied' : 'Copy public'}</Button>
                <Button variant="secondary" fullWidth onClick={() => copyCode(selfLookup?.receiveCode ?? receiveCode)}>{copied ? 'Copied' : 'Copy code'}</Button>
              </div>
            </div>
          ) : (
            <Button fullWidth loading={publishing} onClick={publish}>Make discoverable</Button>
          )}
          {publishReport ? (
            <Callout tone={publishReport.status === 'submitted' ? 'info' : 'warn'} title={publishReport.status === 'submitted' ? 'Published.' : publishReport.status === 'partial' ? 'Partly published.' : 'Not published.'}>
              {publishReport.status === 'submitted' ? 'Your private code is now discoverable by your public address.' : publishReport.blockers[0] ?? 'Some pools could not be registered.'}
            </Callout>
          ) : null}
        </div>

        <div style={panel}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Find someone’s code</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>Enter a public Stellar address to fetch their private receive code, if they’ve made it discoverable.</div>
          <input value={lookupAddress} onChange={(event) => setLookupAddress(event.target.value)} placeholder="G… public address" style={fieldStyle} />
          <Button variant="secondary" fullWidth loading={looking} onClick={lookup}>Look up</Button>
          {found ? (
            <div style={{ marginTop: 'auto', padding: 14, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: 'rgba(53,199,123,.13)', color: 'var(--pos)', display: 'grid', placeItems: 'center', fontSize: 13 }}>✓</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Found · {truncateMiddle(found.ownerAddress, 4, 4)}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--fm)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateMiddle(found.receiveCode as string, 8, 6)} · ready to pay</div>
              </div>
              <button onClick={() => { copyCode(found.receiveCode as string); onNav('send') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ac2)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>{copied ? 'Copied' : 'Pay →'}</button>
            </div>
          ) : lookupReport ? (
            <Callout tone="warn">{lookupReport.blockers[0] ?? 'No published code found for that address.'}</Callout>
          ) : null}
        </div>
      </div>
    </section>
  )
}

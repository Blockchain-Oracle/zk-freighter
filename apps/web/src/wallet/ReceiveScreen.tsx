import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { lookupPublishedReceiveCode, type NetworkKey, type WalletIdentity } from '@zk-fighter/core'
import { BoundaryBadge, Button, Callout, QrCard, Segmented, truncateMiddle } from '@zk-fighter/ui'
import { UsdcReceiveSetupPanel } from '../UsdcReceiveSetupPanel'
import type { WalletScreen } from './screens'
import { readStoredPublish } from './discoveryStorage'

type Tab = 'private' | 'public'

const TABS = [
  { value: 'private', label: 'Private code' },
  { value: 'public', label: 'Public address' },
]

interface ReceiveScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  onNav: (screen: WalletScreen) => void
}

export function ReceiveScreen({ identity, network, receiveCode, onNav }: ReceiveScreenProps) {
  const [tab, setTab] = useState<Tab>('private')
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [discoverableCode, setDiscoverableCode] = useState<string | null>(() =>
    readStoredPublish(network, identity.stellarPublicKey) ? receiveCode : null,
  )

  useEffect(() => {
    let cancelled = false
    setDiscoverableCode(readStoredPublish(network, identity.stellarPublicKey) ? receiveCode : null)
    void lookupPublishedReceiveCode({ ownerAddress: identity.stellarPublicKey, network })
      .then((report) => {
        if (!cancelled && report.status === 'found') setDiscoverableCode(report.receiveCode ?? receiveCode)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network, receiveCode])

  function copy(value: string) {
    // Only affirm "Copied" if the write actually succeeded — never imply a stale/empty copy.
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      (cause: unknown) => console.warn('clipboard write failed', cause),
    )
  }

  const isPrivate = tab === 'private'
  const value = isPrivate ? receiveCode : identity.stellarPublicKey
  const codeShown = isPrivate && !showFull && receiveCode.length > 64 ? `${receiveCode.slice(0, 46)}…${receiveCode.slice(-12)}` : value

  return (
    <section style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Receive</div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginTop: 6, marginBottom: 22 }}>
        Share your private code to be paid privately, or your public address — which is a named public boundary.
      </div>

      <div style={{ marginBottom: 24 }}>
        <Segmented options={TABS} value={tab} onChange={(next) => { setTab(next as Tab); setCopied(false) }} />
      </div>

      <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <QrCard
          badge={isPrivate ? <BoundaryBadge kind="shielded" label="PRIVATE CODE" /> : <BoundaryBadge kind="public" label="PUBLIC · STELLAR" />}
          caption={isPrivate ? 'Scan to pay this wallet privately' : 'A public boundary — visible on Stellar'}
          logo={isPrivate}
        >
          <QRCodeSVG value={value} size={172} level={isPrivate ? 'Q' : 'M'} marginSize={0} />
        </QrCard>

        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 }}>
              {isPrivate ? 'YOUR PRIVATE RECEIVE CODE' : 'YOUR PUBLIC STELLAR ADDRESS'}
            </div>
            <div style={{ border: '1px solid var(--bd2)', borderRadius: 13, background: 'var(--card)', padding: 15, fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, wordBreak: 'break-all' }}>
              {codeShown}
              {isPrivate ? <span style={{ color: 'var(--tx3)' }}> (Bech32m)</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 11 }}>
            <Button onClick={() => copy(value)}>{copied ? 'Copied' : isPrivate ? 'Copy code' : 'Copy address'}</Button>
            {isPrivate ? <Button variant="ghost" onClick={() => setShowFull((v) => !v)}>{showFull ? 'Show less' : 'Show full'}</Button> : null}
          </div>

          {isPrivate ? (
            <button
              onClick={() => onNav('discover')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 17px', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <span style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', background: 'rgba(94,124,250,.14)', display: 'grid', placeItems: 'center', color: 'var(--ac2)', fontSize: 15 }}>⌖</span>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{discoverableCode ? 'Your code is discoverable' : 'Make my code discoverable'}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{discoverableCode ? truncateMiddle(discoverableCode, 10, 6) : 'Link your public address so others find this code — never exposes your seed.'}</span>
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--ac2)', fontSize: 14 }}>›</span>
            </button>
          ) : (
            <>
              <Callout tone="warn" title="This is a public boundary.">
                Deposits here are visible on-chain until you shield them ({truncateMiddle(identity.stellarPublicKey, 6, 6)}). For private payments, share your Private code instead.
              </Callout>
              <UsdcReceiveSetupPanel key={`${network}:${identity.stellarPublicKey}`} identity={identity} network={network} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

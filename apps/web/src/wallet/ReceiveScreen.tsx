import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { NetworkKey, WalletIdentity } from '@zk-fighter/core'
import { Callout, truncateMiddle } from '@zk-fighter/ui'
import { UsdcReceiveSetupPanel } from '../UsdcReceiveSetupPanel'
import type { WalletScreen } from './screens'

type Tab = 'private' | 'public'

const qrBoxStyle = {
  background: '#fff',
  padding: 15,
  borderRadius: 18,
  width: 'fit-content',
} as const

interface ReceiveScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  onNav: (screen: WalletScreen) => void
}

function CodeRow({ value, onCopy, copied }: { value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', marginTop: 7 }}>
      <code style={{ flex: 1, minWidth: 0, fontFamily: 'var(--fm)', fontSize: 11.5, color: 'var(--tx2)', wordBreak: 'break-all', lineHeight: 1.45 }}>{value}</code>
      <button onClick={onCopy} style={{ flex: 'none', padding: '9px 14px', border: 'none', borderRadius: 9, background: 'var(--ac)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function ReceiveScreen({ identity, network, receiveCode, onNav }: ReceiveScreenProps) {
  const [tab, setTab] = useState<Tab>('private')
  const [copied, setCopied] = useState<string | null>(null)

  function copy(value: string, which: string) {
    // Only affirm "Copied" if the write actually succeeded — otherwise the user
    // could ship a stale/empty receive code believing it copied.
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(which)
        window.setTimeout(() => setCopied((current) => (current === which ? null : current)), 1600)
      },
      (cause: unknown) => {
        console.warn('clipboard write failed', cause)
      },
    )
  }

  function tabStyle(active: boolean) {
    return {
      padding: 11,
      borderRadius: 10,
      textAlign: 'center' as const,
      fontSize: 12.5,
      fontWeight: 700,
      cursor: 'pointer',
      background: active ? 'var(--ac)' : 'transparent',
      color: active ? '#fff' : 'var(--tx2)',
    }
  }

  return (
    <section style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>Receive</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>One wallet · two jobs. Choose carefully.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 13, marginTop: 18 }}>
        <div onClick={() => setTab('private')} style={tabStyle(tab === 'private')}>Private code</div>
        <div onClick={() => setTab('public')} style={tabStyle(tab === 'public')}>Public address</div>
      </div>

      {tab === 'private' ? (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={qrBoxStyle}>
              <QRCodeSVG value={receiveCode} size={184} level="M" marginSize={0} />
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--fm)', letterSpacing: '.06em' }}>PRIVATE RECEIVE CODE · zkf1…</div>
          <CodeRow value={receiveCode} onCopy={() => copy(receiveCode, 'code')} copied={copied === 'code'} />
          <div style={{ marginTop: 13, fontSize: 12, color: 'var(--tx2)', lineHeight: 1.55 }}>
            Share this to be paid privately. The sender, amount, and memo stay shielded inside the pool.
          </div>
          <div style={{ marginTop: 13 }}>
            <Callout tone="public" title="Not your public address.">
              Use the Public tab for deposits, bridge arrival, and withdrawals — those are visible on Stellar. Want others to find this code by name?{' '}
              <button onClick={() => onNav('discover')} style={{ background: 'none', border: 'none', color: 'var(--ac2)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Make it discoverable →
              </button>
            </Callout>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={qrBoxStyle}>
              <QRCodeSVG value={identity.stellarPublicKey} size={184} level="M" marginSize={0} />
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 10, color: 'var(--tx3)', fontFamily: 'var(--fm)', letterSpacing: '.06em' }}>PUBLIC STELLAR ADDRESS · G…</div>
          <CodeRow value={identity.stellarPublicKey} onCopy={() => copy(identity.stellarPublicKey, 'addr')} copied={copied === 'addr'} />
          <div style={{ marginTop: 13 }}>
            <Callout tone="warn" title="This is a public boundary.">
              Deposits here are visible on-chain until you shield them ({truncateMiddle(identity.stellarPublicKey, 6, 6)}). For private payments, share your Private code instead.
            </Callout>
          </div>
          <div style={{ marginTop: 16 }}>
            <UsdcReceiveSetupPanel key={`${network}:${identity.stellarPublicKey}`} identity={identity} network={network} />
          </div>
        </div>
      )}
    </section>
  )
}

import { NETWORKS, type NetworkKey, type PasskeyEnvelope, type WalletIdentity } from '@zk-fighter/core'
import { truncateMiddle, useTheme } from '@zk-fighter/ui'
import { PasskeySettings } from './PasskeySettings'
import type { WalletScreen } from './screens'

const networkKeys = Object.keys(NETWORKS) as NetworkKey[]

const sectionLabel = {
  fontSize: 9.5,
  color: 'var(--tx3)',
  fontFamily: 'var(--fm)',
  letterSpacing: '.1em',
  marginTop: 22,
} as const

interface SettingsScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  passkeyEnvelope: PasskeyEnvelope | null
  onChangeNetwork: (network: NetworkKey) => void
  onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
  onNav: (screen: WalletScreen) => void
  onLock: () => void
}

export function SettingsScreen({
  identity,
  network,
  receiveCode,
  passkeyEnvelope,
  onChangeNetwork,
  onPasskeyEnvelopeChange,
  onNav,
  onLock,
}: SettingsScreenProps) {
  const { theme, toggleTheme } = useTheme()

  function netStyle(active: boolean) {
    return {
      padding: 10,
      borderRadius: 8,
      textAlign: 'center' as const,
      fontSize: 12.5,
      fontWeight: 700,
      cursor: 'pointer',
      background: active ? 'var(--ac)' : 'transparent',
      color: active ? '#fff' : 'var(--tx2)',
    }
  }

  return (
    <section style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>Settings</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>Security, network, and developer controls.</div>

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(145deg,var(--ac2),var(--ac))' }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Personal</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{truncateMiddle(receiveCode || identity.stellarPublicKey, 8, 4)}</div>
        </div>
      </div>

      <div style={sectionLabel}>SECURITY</div>
      <PasskeySettings identity={identity} passkeyEnvelope={passkeyEnvelope} onPasskeyEnvelopeChange={onPasskeyEnvelopeChange} />

      <div style={sectionLabel}>NETWORK</div>
      <div style={{ marginTop: 8, padding: '14px 16px', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)' }}>
        <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, marginBottom: 10 }}>Active network</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 11 }}>
          {networkKeys.map((key) => (
            <div key={key} onClick={() => onChangeNetwork(key)} style={netStyle(network === key)}>
              {NETWORKS[key].label}
            </div>
          ))}
        </div>
      </div>

      <div style={sectionLabel}>APPEARANCE</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Theme</div>
        <button onClick={toggleTheme} style={{ marginLeft: 'auto', padding: '8px 14px', border: '1px solid var(--bd2)', borderRadius: 9, background: 'var(--card2)', color: 'var(--tx)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>

      <div style={sectionLabel}>DEVELOPER · DEMO EVIDENCE</div>
      <button
        onClick={() => onNav('tools')}
        style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', color: 'var(--tx)', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Developer &amp; demo evidence</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Prover readiness, the tampered-proof rejection demo, and recorded on-chain evidence — for judges and developers.</div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>
      </button>

      <button
        onClick={onLock}
        style={{ marginTop: 22, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14, border: '1px solid rgba(229,110,110,.3)', borderRadius: 13, background: 'rgba(229,110,110,.06)', color: '#E88', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
      >
        Lock wallet
      </button>
    </section>
  )
}

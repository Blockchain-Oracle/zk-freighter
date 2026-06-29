import { useState } from 'react'
import type { NetworkKey, PasskeyEnvelope, WalletIdentity } from '@zk-fighter/core'
import { NetworkPill, truncateMiddle, useTheme } from '@zk-fighter/ui'
import { WalletFlowPanels } from '../WalletFlowPanels'
import { HomeScreen } from './HomeScreen'
import { ReceiveScreen } from './ReceiveScreen'
import { ActivityScreen } from './ActivityScreen'
import { SettingsScreen } from './SettingsScreen'
import { ShieldScreen } from './ShieldScreen'
import { SendScreen } from './SendScreen'
import { UnshieldScreen } from './UnshieldScreen'
import { DiscoverScreen } from './DiscoverScreen'
import { BridgeScreen } from './BridgeScreen'
import { DisclosureScreen } from './DisclosureScreen'
import { ConfidentialScreen } from './ConfidentialScreen'
import { useShieldedBalance } from './useShieldedBalance'
import type { WalletScreen } from './screens'

const NAV: { id: WalletScreen; label: string; glyph: string }[] = [
  { id: 'home', label: 'Home', glyph: '⌂' },
  { id: 'activity', label: 'Activity', glyph: '≋' },
  { id: 'receive', label: 'Receive', glyph: '↓' },
  { id: 'confidential', label: 'Confidential', glyph: '◈' },
  { id: 'disclosure', label: 'Disclosure', glyph: '✓' },
  { id: 'settings', label: 'Settings', glyph: '⚙' },
]

interface WalletShellProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  passkeyEnvelope: PasskeyEnvelope | null
  onChangeNetwork: (network: NetworkKey) => void
  onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
  onLock: () => void
}

function ToolsScreen({
  identity,
  network,
  onBack,
}: {
  identity: WalletIdentity
  network: NetworkKey
  onBack: () => void
}) {
  return (
    <section style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '30px 34px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={onBack} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx2)', cursor: 'pointer', fontSize: 15 }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>Developer · Demo evidence</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Real working flows, being migrated into the redesign — no mocks.</div>
        </div>
      </div>
      <div style={{ color: 'var(--tx)' }}>
        <WalletFlowPanels identity={identity} network={network} />
      </div>
    </section>
  )
}

export function WalletShell({
  identity,
  network,
  receiveCode,
  passkeyEnvelope,
  onChangeNetwork,
  onPasskeyEnvelopeChange,
  onLock,
}: WalletShellProps) {
  const [screen, setScreen] = useState<WalletScreen>('home')
  const { theme, toggleTheme } = useTheme()
  // Loaded once for the whole shell so the expensive prover note-load is shared
  // across Home + Activity instead of re-running on every tab switch.
  const balance = useShieldedBalance(identity, network)

  function navItemStyle(active: boolean) {
    return {
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 12px',
      borderRadius: 11,
      cursor: 'pointer',
      fontSize: 13.5,
      fontWeight: 600,
      background: active ? 'var(--card)' : 'transparent',
      color: active ? 'var(--tx)' : 'var(--tx2)',
      border: 'none',
      width: '100%',
      textAlign: 'left' as const,
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 236, flex: 'none', background: 'var(--side)', borderRight: '1px solid var(--bd)', padding: '22px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 4px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(145deg,var(--ac2),var(--ac))' }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: '-.02em' }}>ZK Fighter</div>
            <div style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--fm)', letterSpacing: '.14em' }}>SHIELDED · STELLAR</div>
          </div>
        </div>
        <div style={{ margin: '6px 6px 10px' }}>
          <NetworkPill network={network} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = screen === item.id
            return (
              <button key={item.id} onClick={() => setScreen(item.id)} style={navItemStyle(active)}>
                <span style={{ position: 'absolute', left: 0, top: 11, bottom: 11, width: 2.5, borderRadius: 2, background: active ? 'var(--ac)' : 'transparent' }} />
                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.glyph}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(145deg,var(--ac2),var(--ac))' }} />
            <div style={{ lineHeight: 1.25, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Personal</div>
              <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>{truncateMiddle(receiveCode || identity.stellarPublicKey, 6, 4)}</div>
            </div>
          </div>
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', color: 'var(--tx3)', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}>
            <span style={{ width: 14, textAlign: 'center' }}>{theme === 'dark' ? '☾' : '☀'}</span>
            {theme === 'dark' ? 'Dark' : 'Light'} theme
          </button>
          <button onClick={onLock} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', color: 'var(--tx3)', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}>
            <span style={{ width: 14, textAlign: 'center' }}>⊘</span>
            Lock wallet
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, maxHeight: '100vh', overflowY: 'auto' }}>
        {screen === 'home' ? <HomeScreen identity={identity} balance={balance} onNav={setScreen} /> : null}
        {screen === 'shield' ? <ShieldScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'send' ? <SendScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'unshield' ? <UnshieldScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'discover' ? <DiscoverScreen identity={identity} network={network} onNav={setScreen} /> : null}
        {screen === 'bridge' ? <BridgeScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'disclosure' ? <DisclosureScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'confidential' ? <ConfidentialScreen identity={identity} network={network} onNav={setScreen} /> : null}
        {screen === 'activity' ? <ActivityScreen balance={balance} /> : null}
        {screen === 'receive' ? <ReceiveScreen identity={identity} network={network} receiveCode={receiveCode} onNav={setScreen} /> : null}
        {screen === 'settings' ? (
          <SettingsScreen
            identity={identity}
            network={network}
            receiveCode={receiveCode}
            passkeyEnvelope={passkeyEnvelope}
            onChangeNetwork={onChangeNetwork}
            onPasskeyEnvelopeChange={onPasskeyEnvelopeChange}
            onNav={setScreen}
            onLock={onLock}
          />
        ) : null}
        {screen === 'tools' ? (
          <ToolsScreen identity={identity} network={network} onBack={() => setScreen('settings')} />
        ) : null}
      </main>
    </div>
  )
}

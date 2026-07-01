import { useState } from 'react'
import type { NetworkKey, PasskeyEnvelope, WalletIdentity } from '@zk-fighter/core'
import { Logo, NetworkPill, useTheme } from '@zk-fighter/ui'
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
  { id: 'send', label: 'Send', glyph: '↗' },
  { id: 'receive', label: 'Receive', glyph: '↓' },
  { id: 'shield', label: 'Shield', glyph: '⬡' },
  { id: 'bridge', label: 'Bridge', glyph: '⇌' },
  { id: 'disclosure', label: 'Disclosure', glyph: '✓' },
  { id: 'confidential', label: 'Confidential', glyph: '◈' },
  { id: 'discover', label: 'Discover', glyph: '⌖' },
  { id: 'settings', label: 'Settings', glyph: '⚙' },
]

interface WalletShellProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  passkeyEnvelope: PasskeyEnvelope | null
  privateEngineSwitching: boolean
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
  privateEngineSwitching,
  onChangeNetwork,
  onPasskeyEnvelopeChange,
  onLock,
}: WalletShellProps) {
  const [screen, setScreen] = useState<WalletScreen>('home')
  const { theme, toggleTheme } = useTheme()
  // Loaded once for the whole shell so the expensive prover note-load is shared
  // across Home + Activity instead of re-running on every tab switch.
  const balance = useShieldedBalance(identity, network, !privateEngineSwitching)

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
      background: active ? 'linear-gradient(90deg, rgba(94,124,250,.16), rgba(94,124,250,.02))' : 'transparent',
      color: active ? 'var(--tx)' : 'var(--tx2)',
      border: 'none',
      width: '100%',
      textAlign: 'left' as const,
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{ width: 236, flex: 'none', background: 'var(--side)', borderRight: '1px solid var(--bd)', padding: '22px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 4px' }}>
          <Logo size={36} glow />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: '-.02em' }}>ZK Fighter</div>
            <div style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: 'var(--fm)', letterSpacing: '.14em' }}>SHIELDED · STELLAR</div>
          </div>
        </div>
        <div style={{ margin: '6px 6px 10px' }}>
          <NetworkPill network={network} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
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
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onLock} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', color: 'var(--tx2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, textAlign: 'left' }}>
            <span>⊘</span> Lock wallet
          </button>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme" style={{ flex: 'none', display: 'grid', placeItems: 'center', width: 38, height: 38, color: 'var(--tx2)', cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, fontSize: 14 }}>
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto' }}>
        {privateEngineSwitching ? (
          <div style={{ margin: '18px auto 0', width: 'calc(100% - 56px)', maxWidth: 760, border: '1px solid rgba(240,181,77,.32)', borderRadius: 12, background: 'rgba(240,181,77,.08)', color: 'var(--tx2)', padding: '10px 12px', fontSize: 12, fontWeight: 650 }}>
            Switching private engine… shielded scans and proofs will resume on {network}.
          </div>
        ) : null}
        {screen === 'home' ? <HomeScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'shield' ? <ShieldScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'send' ? <SendScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'unshield' ? <UnshieldScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'discover' ? <DiscoverScreen identity={identity} network={network} onNav={setScreen} /> : null}
        {screen === 'bridge' ? <BridgeScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'disclosure' ? <DisclosureScreen identity={identity} network={network} balance={balance} onNav={setScreen} /> : null}
        {screen === 'confidential' ? <ConfidentialScreen identity={identity} network={network} onNav={setScreen} /> : null}
        {screen === 'activity' ? <ActivityScreen balance={balance} network={network} /> : null}
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

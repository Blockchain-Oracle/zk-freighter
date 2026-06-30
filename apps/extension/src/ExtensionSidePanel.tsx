import { useState, type CSSProperties, type ReactNode } from 'react'
import { Logo } from '@zk-fighter/ui'

import { ExtensionBridgePanel } from './ExtensionBridgePanel'
import { ExtensionConfidentialPanel } from './ExtensionConfidentialPanel'
import { ExtensionDisclosurePanel } from './ExtensionDisclosurePanel'
import { ExtensionDiscoverPanel } from './ExtensionDiscoverPanel'
import { ExtensionQuickShieldPanel } from './ExtensionQuickShieldPanel'
import { ExtensionReadinessPanel } from './ExtensionReadinessPanel'
import { ExtensionSendPanel } from './ExtensionSendPanel'
import { ExtensionUnshieldPanel } from './ExtensionUnshieldPanel'
import { ExtensionWalletPanel } from './ExtensionWalletPanel'
import type { DappWalletStatus } from './dappMessages'

// The 400px side panel is a router (the v2 design shows each flow as its own
// focused screen, not a stacked list). A nav lists the flows; selecting one shows
// it with a back header. New screens (Send/Unshield/Discover/Disclosure/Activity)
// are added here as they land.
type SideScreen = 'nav' | 'wallet' | 'send' | 'unshield' | 'discover' | 'disclosure' | 'quickshield' | 'bridge' | 'confidential' | 'readiness'

interface NavEntry {
  readonly key: SideScreen
  readonly icon: string
  readonly title: string
  readonly detail: string
}

const NAV: readonly NavEntry[] = [
  { key: 'send', icon: '↗', title: 'Send', detail: 'Pay a private receive code (shielded → shielded)' },
  { key: 'wallet', icon: '◊', title: 'Wallet', detail: 'Address, receive code, lock' },
  { key: 'quickshield', icon: '⛉', title: 'QuickShield', detail: 'Move public funds into the shielded pool' },
  { key: 'unshield', icon: '↓', title: 'Unshield', detail: 'Withdraw to a public Stellar address (reveals info)' },
  { key: 'discover', icon: '⌕', title: 'Discover', detail: 'Find a discoverable code, then pay it privately' },
  { key: 'disclosure', icon: '✦', title: 'Disclosure', detail: 'Read-only receipt proving note ownership' },
  { key: 'bridge', icon: '⇌', title: 'Bridge', detail: 'Native CCTP USDC from another chain' },
  { key: 'confidential', icon: '◈', title: 'Confidential', detail: 'Hidden-amount token ops (testnet)' },
  { key: 'readiness', icon: '✓', title: 'Runtime readiness', detail: 'Offscreen prover + capabilities' },
]

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: '1px solid var(--bd)', borderRadius: 13, background: 'var(--card)', cursor: 'pointer', textAlign: 'left', width: '100%' }

interface SidePanelProps {
  readonly status: DappWalletStatus
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly lockWallet: () => Promise<void>
  readonly copyPublicKey: () => Promise<void>
  readonly copyReceiveCode: () => Promise<void>
}

export function ExtensionSidePanel(props: SidePanelProps) {
  const [screen, setScreen] = useState<SideScreen>('nav')
  const [pendingCode, setPendingCode] = useState('') // a code handed off from Discover → Send

  if (screen === 'nav') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 4px' }}>
          <Logo size={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Workspace</div>
            <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 3 }}>Full wallet — heavy flows run here.</div>
          </div>
        </div>
        {NAV.map((entry) => (
          <button key={entry.key} type="button" style={rowStyle} onClick={() => setScreen(entry.key)}>
            <span style={{ fontSize: 17, width: 22, textAlign: 'center', color: 'var(--ac2)' }}>{entry.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{entry.title}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--tx3)', marginTop: 3 }}>{entry.detail}</span>
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--tx3)' }}>›</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <ScreenFrame onBack={() => { setScreen('nav'); setPendingCode('') }}>
      {screen === 'wallet' ? <ExtensionWalletPanel status={props.status} lockWallet={props.lockWallet} copyPublicKey={props.copyPublicKey} copyReceiveCode={props.copyReceiveCode} /> : null}
      {screen === 'send' ? <ExtensionSendPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} initialCode={pendingCode} /> : null}
      {screen === 'unshield' ? <ExtensionUnshieldPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /> : null}
      {screen === 'discover' ? <ExtensionDiscoverPanel sendRuntimeMessage={props.sendRuntimeMessage} onPay={(code) => { setPendingCode(code); setScreen('send') }} /> : null}
      {screen === 'disclosure' ? <ExtensionDisclosurePanel sendRuntimeMessage={props.sendRuntimeMessage} /> : null}
      {screen === 'quickshield' ? <ExtensionQuickShieldPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /> : null}
      {screen === 'bridge' ? <ExtensionBridgePanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /> : null}
      {screen === 'confidential' ? <ExtensionConfidentialPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /> : null}
      {screen === 'readiness' ? <ExtensionReadinessPanel /> : null}
    </ScreenFrame>
  )
}

function ScreenFrame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button type="button" onClick={onBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--tx2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 2px 0' }}>‹ Workspace</button>
      {children}
    </div>
  )
}

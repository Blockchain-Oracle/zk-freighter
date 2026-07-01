import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { NetworkKey } from '@zk-fighter/core'
import { Button, ThemeProvider, type ThemeName } from '@zk-fighter/ui'
import { browser } from 'wxt/browser'

import { ExtensionAccess } from './ExtensionAccess'
import { ExtensionActivityPanel } from './ExtensionActivityPanel'
import { ExtensionBridgePanel } from './ExtensionBridgePanel'
import { ExtensionConfidentialPanel } from './ExtensionConfidentialPanel'
import { ExtensionDisclosurePanel } from './ExtensionDisclosurePanel'
import { ExtensionDiscoverPanel } from './ExtensionDiscoverPanel'
import { ExtensionHome } from './ExtensionHome'
import { ExtensionMoreSheet } from './ExtensionMoreSheet'
import { ExtensionQuickShieldPanel } from './ExtensionQuickShieldPanel'
import { ExtensionReadinessPanel } from './ExtensionReadinessPanel'
import { ExtensionReceiveScreen } from './ExtensionReceiveScreen'
import { ExtensionSendPanel } from './ExtensionSendPanel'
import { ExtensionSettingsScreen } from './ExtensionSettingsScreen'
import { BottomSheet, BoundaryBadge, ExtensionShell, RouteHeader, type BottomTab, type ExtensionSheet } from './ExtensionShell'
import { ExtensionPublicViewScreen, ExtensionSigningDisabledScreen } from './ExtensionUtilityScreens'
import { ExtensionUnshieldPanel } from './ExtensionUnshieldPanel'
import { dappMessageTypes, type DappWalletStatus } from './dappMessages'
import type { ExtensionScreen } from './extension-routes'

const statusRefreshMs = 1_000
const themeStorageKey = 'zkf.extension.theme'

export function ExtensionApp() {
  const [status, setStatus] = useState<DappWalletStatus | null>(null)
  const [screen, setScreen] = useState<ExtensionScreen>(() => screenFromHash())
  const [sheet, setSheet] = useState<ExtensionSheet | null>(() => sheetFromHash())
  const [theme, setTheme] = useState<ThemeName | null>(null)
  const [pendingCode, setPendingCode] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const sendRuntimeMessage = useCallback(async (message: object): Promise<unknown> => {
    const next = await browser.runtime.sendMessage(message)
    if (isWalletStatus(next)) setStatus(next)
    return next
  }, [])

  const refreshStatus = useCallback(async () => {
    const next = (await sendRuntimeMessage({ type: dappMessageTypes.status })) as DappWalletStatus
    setStatus(next)
  }, [sendRuntimeMessage])

  useEffect(() => {
    void browser.storage.local.get(themeStorageKey).then((value) => setTheme(value[themeStorageKey] === 'light' ? 'light' : 'dark'))
    void refreshStatus()
    const timer = window.setInterval(() => void refreshStatus(), statusRefreshMs)
    return () => window.clearInterval(timer)
  }, [refreshStatus])

  useEffect(() => {
    const onHash = () => {
      setScreen(screenFromHash())
      setSheet(sheetFromHash())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((next: ExtensionScreen) => {
    setSheet(null)
    setScreen(next)
    setPendingCode('')
    window.history.replaceState(null, '', next === 'home' ? '#/' : `#/${next}`)
  }, [])

  const openSheet = useCallback((next: ExtensionSheet) => {
    setSheet(next)
    window.history.replaceState(null, '', sheetHash(next))
  }, [])

  const closeSheet = useCallback(() => {
    if (sheet === 'send') setPendingCode('')
    setSheet(null)
    window.history.replaceState(null, '', screen === 'home' ? '#/' : `#/${screen}`)
  }, [screen, sheet])

  const persistTheme = useCallback((next: ThemeName) => {
    void browser.storage.local.set({ [themeStorageKey]: next })
  }, [])

  async function importWallet() {
    setBusy(true)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.importVault, mnemonic, password, network: status?.network ?? 'testnet' })
      setMnemonic('')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  async function unlockWallet() {
    setBusy(true)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.unlock, password })
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  async function lockWallet() {
    navigate('home')
    await sendRuntimeMessage({ type: dappMessageTypes.lock })
  }

  if (theme === null) return null
  const locked = !status?.hasVault || !status?.unlocked

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={persistTheme} className="flex justify-center">
      {locked ? (
        <div style={{ width: 360, maxWidth: '100%', minHeight: '100dvh', boxSizing: 'border-box', padding: 14, display: 'flex', alignItems: 'center' }}>
          <ExtensionAccess status={status} mnemonic={mnemonic} password={password} busy={busy} setMnemonic={setMnemonic} setPassword={setPassword} importWallet={importWallet} unlockWallet={unlockWallet} />
        </div>
      ) : status ? (
        <ExtensionShell status={status} activeTab={activeTabFor(screen, sheet)} navigate={navigate} openSheet={openSheet}>
          {renderScreen({ screen, status, pendingCode, navigate, openSheet, setPendingCode, sendRuntimeMessage, lockWallet })}
          {renderSheet({ sheet, status, pendingCode, navigate, openSheet, closeSheet, setPendingCode, sendRuntimeMessage, lockWallet })}
        </ExtensionShell>
      ) : null}
    </ThemeProvider>
  )
}

function renderScreen(props: {
  readonly screen: ExtensionScreen
  readonly status: DappWalletStatus
  readonly pendingCode: string
  readonly navigate: (screen: ExtensionScreen) => void
  readonly openSheet: (sheet: ExtensionSheet) => void
  readonly setPendingCode: (code: string) => void
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly lockWallet: () => Promise<void>
}) {
  if (props.screen === 'home') return <ExtensionHome status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} navigate={props.navigate} openSheet={props.openSheet} />
  if (props.screen === 'activity') return <ExtensionActivityPanel sendRuntimeMessage={props.sendRuntimeMessage} />
  if (props.screen === 'receive') return <ExtensionReceiveScreen status={props.status} navigate={props.navigate} sendRuntimeMessage={props.sendRuntimeMessage} />
  if (props.screen === 'settings') return <RouteFrame title="Settings" onBack={() => props.navigate('home')}><ExtensionSettingsScreen status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} lockWallet={props.lockWallet} /></RouteFrame>
  if (props.screen === 'publicView') return <RouteFrame title="Public view" badge={<BoundaryBadge tone="public">Public</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionPublicViewScreen status={props.status} navigate={props.navigate} openSheet={props.openSheet} /></RouteFrame>
  if (props.screen === 'signingDisabled') return <RouteFrame title="Signing disabled" onBack={() => props.navigate('home')}><ExtensionSigningDisabledScreen /></RouteFrame>
  if (props.screen === 'bridge') return <RouteFrame title="Bridge" badge={<BoundaryBadge tone="public">Both ends public</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionBridgePanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /></RouteFrame>
  if (props.screen === 'disclosure') return <RouteFrame title="Disclosure" badge={<BoundaryBadge tone="shielded">Read-only proof</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionDisclosurePanel sendRuntimeMessage={props.sendRuntimeMessage} /></RouteFrame>
  if (props.screen === 'discover') return <RouteFrame title="Discover" badge={<BoundaryBadge tone="public">Public boundary</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionDiscoverPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} onPay={(code) => { props.setPendingCode(code); props.openSheet('send') }} /></RouteFrame>
  if (props.screen === 'confidential') return <RouteFrame title="Confidential" badge={<BoundaryBadge tone="testnet">Testnet</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionConfidentialPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /></RouteFrame>
  return <RouteFrame title="Evidence" badge={<BoundaryBadge tone="ready">Live</BoundaryBadge>} onBack={() => props.navigate('home')}><ExtensionReadinessPanel /></RouteFrame>
}

function renderSheet(props: {
  readonly sheet: ExtensionSheet | null
  readonly status: DappWalletStatus
  readonly pendingCode: string
  readonly navigate: (screen: ExtensionScreen) => void
  readonly openSheet: (sheet: ExtensionSheet) => void
  readonly closeSheet: () => void
  readonly setPendingCode: (code: string) => void
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly lockWallet: () => Promise<void>
}) {
  if (!props.sheet) return null
  if (props.sheet === 'more') return <BottomSheet title="More" onClose={props.closeSheet}><ExtensionMoreSheet status={props.status} navigate={props.navigate} openSheet={props.openSheet} lockWallet={props.lockWallet} /></BottomSheet>
  if (props.sheet === 'send') return <BottomSheet title="Send" onClose={props.closeSheet}><ExtensionSendPanel status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} initialCode={props.pendingCode} /></BottomSheet>
  if (props.sheet === 'network') return <BottomSheet title="Network" onClose={props.closeSheet}><NetworkSheet status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /></BottomSheet>
  return <BottomSheet title="Shield / Unshield" onClose={props.closeSheet}><ShieldMoveSheet key={props.sheet} initial={props.sheet} status={props.status} sendRuntimeMessage={props.sendRuntimeMessage} /></BottomSheet>
}

function RouteFrame({ title, badge, onBack, children }: { readonly title: string; readonly badge?: ReactNode; readonly onBack: () => void; readonly children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><RouteHeader title={title} badge={badge} onBack={onBack} />{children}</div>
}

function ShieldMoveSheet({ initial, status, sendRuntimeMessage }: { readonly initial: 'shield' | 'unshield'; readonly status: DappWalletStatus; readonly sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [mode, setMode] = useState<'shield' | 'unshield'>(initial)
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {(['shield', 'unshield'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setMode(value)} style={{ border: `1px solid ${mode === value ? 'var(--ac2)' : 'var(--bd)'}`, borderRadius: 12, background: mode === value ? 'rgba(94,124,250,.13)' : 'var(--card)', color: mode === value ? 'var(--tx)' : 'var(--tx3)', padding: '9px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{value === 'shield' ? 'Shield' : 'Unshield'}</button>
        ))}
      </div>
      {mode === 'shield' ? <ExtensionQuickShieldPanel status={status} sendRuntimeMessage={sendRuntimeMessage} /> : <ExtensionUnshieldPanel status={status} sendRuntimeMessage={sendRuntimeMessage} />}
    </>
  )
}

function NetworkSheet({ status, sendRuntimeMessage }: { readonly status: DappWalletStatus; readonly sendRuntimeMessage: (message: object) => Promise<unknown> }) {
  const [busy, setBusy] = useState<NetworkKey | ''>('')
  async function setNetwork(network: NetworkKey) {
    setBusy(network)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.setNetwork, network })
    } finally {
      setBusy('')
    }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {(['testnet', 'mainnet'] as const).map((network) => <Button key={network} data-zkf-action={`network-${network}`} variant={status.network === network ? 'primary' : 'secondary'} loading={busy === network} onClick={() => void setNetwork(network)}>{network}</Button>)}
    </div>
  )
}

function activeTabFor(screen: ExtensionScreen, sheet: ExtensionSheet | null): BottomTab {
  if (sheet === 'more') return 'more'
  if (screen === 'activity') return 'activity'
  if (screen === 'receive') return 'receive'
  if (screen === 'home') return 'home'
  return 'more'
}

function screenFromHash(): ExtensionScreen {
  const value = hashValue()
  return isExtensionScreen(value) ? value : 'home'
}

function sheetFromHash(): ExtensionSheet | null {
  const value = hashValue()
  if (value === 'send') return 'send'
  if (value === 'quickshield' || value === 'shield') return 'shield'
  if (value === 'unshield') return 'unshield'
  if (value === 'more' || value === 'workspace') return 'more'
  return null
}

function sheetHash(sheet: ExtensionSheet): string {
  if (sheet === 'send') return '#/send'
  if (sheet === 'shield') return '#/quickshield'
  if (sheet === 'unshield') return '#/unshield'
  return `#/${sheet}`
}

function hashValue(): string {
  return window.location.hash.replace(/^#\/?/u, '')
}

function isExtensionScreen(value: string): value is ExtensionScreen {
  return ['home', 'receive', 'publicView', 'settings', 'confidential', 'activity', 'disclosure', 'discover', 'bridge', 'proving', 'signingDisabled'].includes(value)
}

function isWalletStatus(value: unknown): value is DappWalletStatus {
  return typeof value === 'object' && value !== null && 'hasVault' in value && 'unlocked' in value
}

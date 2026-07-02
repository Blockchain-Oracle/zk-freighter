import { useEffect, useMemo, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import {
  createEncryptedVault,
  deriveWalletIdentity,
  encodeReceiveCode,
  loadPublicStellarBalances,
  requestDemoFunding,
  unlockEncryptedVault,
  type EncryptedVault,
  type NetworkKey,
  type PublicBalancesReport,
  type WalletIdentity,
} from '@zk-freighter/core'
import { ThemeProvider, type ThemeName } from '@zk-freighter/ui'
import { MobileAccess } from './MobileAccess'
import { MobileChrome } from './MobileChrome'
import { MobileConfidential, MobileDiscover, MobileDisclosure } from './MobileFlows'
import { MobileHome } from './MobileHome'
import { MobileActivity, MobileReceive } from './MobileReceiveActivity'
import { MobileScan } from './MobileScan'
import { MobileSheetOverlay } from './MobileSheetOverlay'
import { MobileSettings } from './MobileTools'
import type { MobileRouteParams } from './MobileFlowPrimitives'
import { isSheetRoute, parseMobileDeepLink, vaultErrorText } from './mobile-routing'
import { resetMobilePrivateRuntime, syncMobileShieldedBalances } from './mobile-runtime'
import {
  clearMobilePrivateCache,
  getStoredNetwork,
  getStoredTheme,
  getStoredVault,
  getStoredWalletPublicKey,
  readMobileActivity,
  readShieldedBalanceCache,
  recordMobileActivity,
  setStoredNetwork,
  setStoredTheme,
  vaultStorageKey,
  walletPublicKeyStorageKey,
  type MobileActivityRecord,
  type MobileRoute,
  type MobileShieldedBalanceCache,
} from './mobile-storage'

export function MobileApp() {
  const [network, setNetwork] = useState<NetworkKey>(() => getStoredNetwork())
  const [vault, setVault] = useState<EncryptedVault | null>(() => getStoredVault())
  const [identity, setIdentity] = useState<WalletIdentity | null>(null)
  const [route, setRoute] = useState<MobileRoute>('home')
  const [routeStack, setRouteStack] = useState<MobileRoute[]>([])
  const [flowParams, setFlowParams] = useState<MobileRouteParams>({})
  const [busy, setBusy] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [publicBalances, setPublicBalances] = useState<PublicBalancesReport | null>(null)
  const [publicLoading, setPublicLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'failed'>('idle')
  const [shieldedCache, setShieldedCache] = useState<MobileShieldedBalanceCache | null>(null)
  const [records, setRecords] = useState<readonly MobileActivityRecord[]>([])
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme())

  const receiveCode = useMemo(() => {
    if (!identity) return ''
    return encodeReceiveCode({
      version: 1,
      network,
      notePublicKey: identity.privateReceive.notePublicKey,
      encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
    })
  }, [identity, network])

  useEffect(() => {
    if (!identity) return
    setPublicLoading(true)
    setPublicBalances(null)
    setShieldedCache(readShieldedBalanceCache(network, identity.stellarPublicKey))
    setRecords(readMobileActivity(network, identity.stellarPublicKey))
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
      .then(setPublicBalances)
      .finally(() => setPublicLoading(false))
  }, [identity, network])

  useEffect(() => {
    const refresh = () => { if (identity) setRecords(readMobileActivity(network, identity.stellarPublicKey)) }
    window.addEventListener('zkf:mobile-activity', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('zkf:mobile-activity', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [identity, network])

  useEffect(() => {
    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('backButton', () => {
      if (route !== 'home') {
        goBack()
      } else {
        void CapacitorApp.exitApp()
      }
    }).then((next) => {
      if (cancelled) void next.remove()
      else handle = next
    })
    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [route, routeStack])

  useEffect(() => {
    let cancelled = false
    let handle: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('appUrlOpen', (event) => {
      const parsed = parseMobileDeepLink(event)
      if (parsed) navigate(parsed.route, parsed.params)
    }).then((next) => {
      if (cancelled) void next.remove()
      else handle = next
    })
    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [])

  function navigate(next: MobileRoute, params: MobileRouteParams = {}) {
    setFlowParams(params)
    setRoute((current) => {
      if (current !== next) setRouteStack((stack) => [...stack, current].slice(-16))
      return next
    })
  }

  function goBack() {
    setRouteStack((stack) => {
      const previous = stack[stack.length - 1]
      setRoute(previous ?? 'home')
      if (!previous) setFlowParams({})
      return stack.slice(0, -1)
    })
  }

  async function saveVault(seedPhrase: string, password: string): Promise<boolean> {
    setBusy(true)
    setAccessError('')
    try {
      const encrypted = await createEncryptedVault(seedPhrase, password)
      if (!encrypted.ok) {
        setAccessError(vaultErrorText(encrypted.error))
        return false
      }
      const nextIdentity = deriveWalletIdentity(seedPhrase, network)
      localStorage.setItem(vaultStorageKey, JSON.stringify(encrypted.value))
      localStorage.setItem(walletPublicKeyStorageKey, nextIdentity.stellarPublicKey)
      setVault(encrypted.value)
      return true
    } finally {
      setBusy(false)
    }
  }

  async function unlock(password: string): Promise<void> {
    if (!vault) return
    setBusy(true)
    setAccessError('')
    try {
      const unlocked = await unlockEncryptedVault(vault, password)
      if (!unlocked.ok) {
        setAccessError(vaultErrorText(unlocked.error))
        return
      }
      const nextIdentity = deriveWalletIdentity(unlocked.value, network)
      const stored = getStoredWalletPublicKey()
      if (stored && stored !== nextIdentity.stellarPublicKey) {
        setAccessError('Vault password unlocked a different wallet identity.')
        return
      }
      localStorage.setItem(walletPublicKeyStorageKey, nextIdentity.stellarPublicKey)
      setIdentity(nextIdentity)
      setRoute('home')
    } finally {
      setBusy(false)
    }
  }

  function changeNetwork(nextNetwork: NetworkKey) {
    setStoredNetwork(nextNetwork)
    setNetwork(nextNetwork)
    setIdentity((current) => current ? deriveWalletIdentity(current.mnemonic, nextNetwork) : null)
    setRoute('home')
    setRouteStack([])
    setFlowParams({})
  }

  async function syncPrivate() {
    if (!identity) return
    setSyncStatus('syncing')
    const report = await syncMobileShieldedBalances(identity, network)
    if (report.status === 'loaded') {
      setShieldedCache(readShieldedBalanceCache(network, identity.stellarPublicKey))
      setSyncStatus('idle')
    } else {
      setSyncStatus('failed')
    }
  }

  async function resetPrivate() {
    if (!identity) return
    clearMobilePrivateCache(network, identity.stellarPublicKey)
    setShieldedCache(null)
    await resetMobilePrivateRuntime()
  }

  async function requestFunds(): Promise<string> {
    if (!identity) return 'Unlock the wallet first.'
    if (network !== 'testnet') return 'Add funds is only available on Testnet. Switch to Testnet in Settings.'
    const report = await requestDemoFunding({ identity, network })
    if (report.trustline?.txHash || report.trustline?.friendbotHash) {
      recordMobileActivity({
        network,
        ownerAddress: identity.stellarPublicKey,
        intent: 'fund',
        boundary: 'public',
        status: 'submitted',
        asset: report.trustline.txHash ? 'USDC' : 'XLM',
        txHash: report.trustline.txHash ?? report.trustline.friendbotHash,
        explorerUrl: report.trustline.explorerUrl,
      })
    }
    for (const asset of report.hostedFunding?.assets ?? []) {
      if (asset.txHash) {
        recordMobileActivity({
          network,
          ownerAddress: identity.stellarPublicKey,
          intent: 'fund',
          boundary: 'public',
          status: asset.status === 'failed' ? 'failed' : 'submitted',
          asset: asset.asset,
          amountStroops: asset.balanceStroops,
          txHash: asset.txHash,
          explorerUrl: asset.explorerUrl,
          error: asset.blocker,
        })
      }
    }
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network }).then(setPublicBalances)
    return report.blockers[0] ?? (report.status === 'ready' ? 'Funding is ready.' : report.status === 'funded' ? 'Funding submitted. Wait a few ledgers.' : 'Funding did not complete.')
  }

  const onThemeChange = (nextTheme: ThemeName) => {
    setStoredTheme(nextTheme)
    setTheme(nextTheme)
  }

  if (!identity) {
    return (
      <ThemeProvider initialTheme={theme} onThemeChange={onThemeChange}>
        <MobileAccess network={network} hasVault={vault !== null} busy={busy} error={accessError} onUnlock={(password) => void unlock(password)} onCreate={saveVault} onImport={saveVault} onNetwork={changeNetwork} />
      </ThemeProvider>
    )
  }

  const unlockedIdentity = identity
  const contentRoute = isSheetRoute(route) ? 'home' : route
  const flowProps = {
    network,
    identity: unlockedIdentity,
    receiveCode,
    publicBalances,
    shieldedCache,
    syncStatus,
    onRoute: navigate,
    onSync: syncPrivate,
    onPublicRefresh: () => void loadPublicStellarBalances({ address: unlockedIdentity.stellarPublicKey, network }).then(setPublicBalances),
  }
  const sheetOverlay = isSheetRoute(route)
    ? <MobileSheetOverlay route={route} params={flowParams} address={unlockedIdentity.stellarPublicKey} flowProps={flowProps} onClose={() => navigate('home')} onLock={() => setIdentity(null)} />
    : null

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={onThemeChange}>
      <MobileChrome route={route} address={unlockedIdentity.stellarPublicKey} receiveCode={receiveCode} network={network} overlay={sheetOverlay} onRoute={navigate} onLock={() => setIdentity(null)}>
        {contentRoute === 'home' ? <MobileHome network={network} address={unlockedIdentity.stellarPublicKey} publicBalances={publicBalances} publicLoading={publicLoading} shieldedCache={shieldedCache} records={records} syncStatus={syncStatus} onRoute={navigate} onSync={syncPrivate} onFunding={requestFunds} /> : null}
        {contentRoute === 'receive' ? <MobileReceive network={network} identity={unlockedIdentity} receiveCode={receiveCode} onRoute={navigate} /> : null}
        {contentRoute === 'activity' ? <MobileActivity records={records} network={network} /> : null}
        {contentRoute === 'settings' ? <MobileSettings network={network} address={unlockedIdentity.stellarPublicKey} syncStatus={syncStatus} onNetwork={changeNetwork} onSync={syncPrivate} onReset={resetPrivate} onLock={() => setIdentity(null)} /> : null}
        {contentRoute === 'scan' ? <MobileScan onRoute={navigate} onPay={(code) => navigate('send', { sendCode: code, sendMode: 'private' })} /> : null}
        {contentRoute === 'discover' ? <MobileDiscover network={network} identity={unlockedIdentity} receiveCode={receiveCode} publicBalances={publicBalances} shieldedCache={shieldedCache} syncStatus={syncStatus} onRoute={navigate} onSync={syncPrivate} onPay={(code) => navigate('send', { sendCode: code, sendMode: 'private' })} /> : null}
        {contentRoute === 'disclosure' ? <MobileDisclosure network={network} identity={unlockedIdentity} receiveCode={receiveCode} publicBalances={publicBalances} shieldedCache={shieldedCache} syncStatus={syncStatus} onRoute={navigate} onSync={syncPrivate} /> : null}
        {contentRoute === 'confidential' ? <MobileConfidential network={network} identity={unlockedIdentity} receiveCode={receiveCode} publicBalances={publicBalances} shieldedCache={shieldedCache} syncStatus={syncStatus} onRoute={navigate} onSync={syncPrivate} /> : null}
      </MobileChrome>
    </ThemeProvider>
  )

}

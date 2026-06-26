import { useMemo, useState } from 'react'
import {
  NETWORKS,
  createEncryptedVault,
  deriveWalletIdentity,
  encodeReceiveCode,
  unlockPasskeyEnvelope,
  unlockEncryptedVault,
  type EncryptedVault,
  type NetworkKey,
  type PasskeyEnvelope,
  type WalletIdentity,
} from '@zk-fighter/core'
import { Callout, ThemeProvider } from '@zk-fighter/ui'
import {
  getStoredPasskeyEnvelope,
  getStoredVault,
  passkeyEnvelopeStorageKey,
  passkeyErrorText,
  vaultErrorText,
  vaultStorageKey,
} from './app-helpers'
import { CreateWalletPanel, OnboardingHeader, UnlockWalletPanel, type WalletSetupMode } from './AccessPanels'
import { WalletShell } from './wallet/WalletShell'
import './App.css'

const networks = Object.keys(NETWORKS) as NetworkKey[]
const themeStorageKey = 'zk-fighter:theme:v1'

function App() {
  const [network, setNetwork] = useState<NetworkKey>('testnet')
  const [vault, setVault] = useState<EncryptedVault | null>(() => getStoredVault())
  const [passkeyEnvelope, setPasskeyEnvelope] = useState<PasskeyEnvelope | null>(() => getStoredPasskeyEnvelope())
  const [identity, setIdentity] = useState<WalletIdentity | null>(null)
  const [mode, setMode] = useState<WalletSetupMode>('create')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [unlockPassword, setUnlockPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const receiveCode = useMemo(() => {
    if (!identity) {
      return ''
    }
    return encodeReceiveCode({
      version: 1,
      network,
      notePublicKey: identity.privateReceive.notePublicKey,
      encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
    })
  }, [identity, network])

  function resetForm() {
    setPassword('')
    setConfirmPassword('')
    setUnlockPassword('')
    setAcknowledged(false)
    setStatus('')
  }

  async function saveWallet(seedPhrase: string) {
    setBusy(true)
    setStatus('')
    const encrypted = await createEncryptedVault(seedPhrase, password)
    if (!encrypted.ok) {
      setStatus(vaultErrorText(encrypted.error))
      setBusy(false)
      return
    }
    window.localStorage.setItem(vaultStorageKey, JSON.stringify(encrypted.value))
    setVault(encrypted.value)
    setIdentity(deriveWalletIdentity(seedPhrase, network))
    resetForm()
    setBusy(false)
  }

  async function unlockWallet() {
    if (!vault) {
      return
    }
    setBusy(true)
    setStatus('')
    const unlocked = await unlockEncryptedVault(vault, unlockPassword)
    if (!unlocked.ok) {
      setStatus(vaultErrorText(unlocked.error))
      setBusy(false)
      return
    }
    setIdentity(deriveWalletIdentity(unlocked.value, network))
    resetForm()
    setBusy(false)
  }

  async function unlockWalletWithPasskey() {
    if (!passkeyEnvelope) {
      return
    }
    setBusy(true)
    setStatus('')
    const unlocked = await unlockPasskeyEnvelope({ envelope: passkeyEnvelope })
    if (!unlocked.ok) {
      setStatus(passkeyErrorText(unlocked.error))
      setBusy(false)
      return
    }
    setIdentity(deriveWalletIdentity(unlocked.value, network))
    resetForm()
    setBusy(false)
  }

  function savePasskeyEnvelope(envelope: PasskeyEnvelope | null) {
    if (envelope) {
      window.localStorage.setItem(passkeyEnvelopeStorageKey, JSON.stringify(envelope))
    } else {
      window.localStorage.removeItem(passkeyEnvelopeStorageKey)
    }
    setPasskeyEnvelope(envelope)
  }

  function changeNetwork(nextNetwork: NetworkKey) {
    setNetwork(nextNetwork)
    setIdentity((current) => (current ? deriveWalletIdentity(current.mnemonic, nextNetwork) : null))
  }

  const initialTheme: 'dark' | 'light' = window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
  const onThemeChange = (nextTheme: 'dark' | 'light') => window.localStorage.setItem(themeStorageKey, nextTheme)

  if (identity) {
    return (
      <ThemeProvider initialTheme={initialTheme} onThemeChange={onThemeChange}>
        <WalletShell
          identity={identity}
          network={network}
          receiveCode={receiveCode}
          passkeyEnvelope={passkeyEnvelope}
          onChangeNetwork={changeNetwork}
          onPasskeyEnvelopeChange={savePasskeyEnvelope}
          onLock={() => setIdentity(null)}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider
      initialTheme={initialTheme}
      onThemeChange={onThemeChange}
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div style={{ width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <OnboardingHeader network={network} networks={networks} onChangeNetwork={changeNetwork} />
        {vault ? (
          <UnlockWalletPanel
            busy={busy}
            network={network}
            passkeyEnabled={passkeyEnvelope !== null}
            unlockPassword={unlockPassword}
            onPassword={setUnlockPassword}
            onPasswordUnlock={() => void unlockWallet()}
            onPasskeyUnlock={() => void unlockWalletWithPasskey()}
          />
        ) : (
          <CreateWalletPanel
            acknowledged={acknowledged}
            busy={busy}
            confirmPassword={confirmPassword}
            mnemonic={mnemonic}
            mode={mode}
            password={password}
            onAcknowledge={setAcknowledged}
            onConfirmPassword={setConfirmPassword}
            onMnemonic={setMnemonic}
            onMode={setMode}
            onPassword={setPassword}
            onSave={(seedPhrase) => void saveWallet(seedPhrase)}
          />
        )}
        {status ? <Callout tone="warn">{status}</Callout> : null}
      </div>
    </ThemeProvider>
  )
}

export default App

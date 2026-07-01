import { useMemo, useState } from 'react'
import {
  NETWORKS,
  createEncryptedVault,
  deriveWalletIdentity,
  encodeReceiveCode,
  requestDemoFunding,
  restartNethermindWebClientCache,
  unlockPasskeyEnvelope,
  unlockEncryptedVault,
  type EncryptedVault,
  type NetworkKey,
  type PasskeyEnvelope,
  type WalletIdentity,
} from '@zk-fighter/core'
import { ThemeProvider } from '@zk-fighter/ui'
import {
  getStoredPasskeyEnvelope,
  getStoredWalletPublicKey,
  getStoredVault,
  passkeyEnvelopeStorageKey,
  passkeyErrorText,
  vaultErrorText,
  vaultStorageKey,
  walletPublicKeyStorageKey,
} from './app-helpers'
import { UnlockScreen } from './AccessPanels'
import { OnboardingFlow } from './OnboardingFlow'
import { WalletShell } from './wallet/WalletShell'

const networks = Object.keys(NETWORKS) as NetworkKey[]
const themeStorageKey = 'zk-fighter:theme:v1'

function App() {
  const [network, setNetwork] = useState<NetworkKey>('testnet')
  const [vault, setVault] = useState<EncryptedVault | null>(() => getStoredVault())
  const [passkeyEnvelope, setPasskeyEnvelope] = useState<PasskeyEnvelope | null>(() => getStoredPasskeyEnvelope())
  const [identity, setIdentity] = useState<WalletIdentity | null>(null)
  // Returning users (vault already on disk) see Unlock; a fresh session runs the
  // create/import flow even after createVault writes the vault, so the Ready step shows.
  const [flow, setFlow] = useState<'onboard' | 'unlock'>(() => (getStoredVault() ? 'unlock' : 'onboard'))
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [busy, setBusy] = useState(false)
  const [privateEngineSwitching, setPrivateEngineSwitching] = useState(false)

  const receiveCode = useMemo(() => {
    if (!identity) return ''
    return encodeReceiveCode({
      version: 1,
      network,
      notePublicKey: identity.privateReceive.notePublicKey,
      encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
    })
  }, [identity, network])

  function enterWith(seedPhrase: string) {
    const nextIdentity = deriveWalletIdentity(seedPhrase, network)
    window.localStorage.setItem(walletPublicKeyStorageKey, nextIdentity.stellarPublicKey)
    setIdentity(nextIdentity)
  }

  async function createVault(seedPhrase: string, password: string): Promise<{ ok: boolean; error?: string }> {
    setBusy(true)
    const encrypted = await createEncryptedVault(seedPhrase, password)
    setBusy(false)
    if (!encrypted.ok) return { ok: false, error: vaultErrorText(encrypted.error) }
    window.localStorage.setItem(vaultStorageKey, JSON.stringify(encrypted.value))
    window.localStorage.setItem(walletPublicKeyStorageKey, deriveWalletIdentity(seedPhrase, network).stellarPublicKey)
    setVault(encrypted.value)
    return { ok: true }
  }

  async function requestOnboardingDemoFunding(seedPhrase: string): Promise<{ ok: boolean; message: string }> {
    setBusy(true)
    try {
      const report = await requestDemoFunding({ identity: deriveWalletIdentity(seedPhrase, network), network })
      const ok = report.status === 'ready'
      const message = report.blockers[0]
        ?? (report.status === 'funded' ? 'Funding transaction submitted. Wait a few ledgers, then check balances before shielding.'
          : ok ? 'Testnet funding is ready.'
            : 'Testnet funding did not complete.')
      return { ok, message }
    } finally {
      setBusy(false)
    }
  }

  async function unlockWallet() {
    if (!vault) return
    setBusy(true)
    setUnlockError('')
    const unlocked = await unlockEncryptedVault(vault, unlockPassword)
    setBusy(false)
    if (!unlocked.ok) {
      setUnlockError(vaultErrorText(unlocked.error))
      return
    }
    const nextIdentity = deriveWalletIdentity(unlocked.value, network)
    const storedPublicKey = getStoredWalletPublicKey()
    if (storedPublicKey && storedPublicKey !== nextIdentity.stellarPublicKey) {
      setUnlockError('Vault password unlocked a different wallet identity.')
      return
    }
    window.localStorage.setItem(walletPublicKeyStorageKey, nextIdentity.stellarPublicKey)
    setIdentity(nextIdentity)
    setUnlockPassword('')
  }

  async function unlockWalletWithPasskey() {
    if (!passkeyEnvelope) return
    setBusy(true)
    setUnlockError('')
    const unlocked = await unlockPasskeyEnvelope({ envelope: passkeyEnvelope })
    setBusy(false)
    if (!unlocked.ok) {
      setUnlockError(passkeyErrorText(unlocked.error))
      return
    }
    const nextIdentity = deriveWalletIdentity(unlocked.value, network)
    const storedPublicKey = getStoredWalletPublicKey()
    if (!storedPublicKey) {
      setUnlockError('Passkey metadata is missing the wallet identity. Unlock with your password and set it up again.')
      return
    }
    if (storedPublicKey !== nextIdentity.stellarPublicKey) {
      setUnlockError('Passkey decrypted a different wallet than this vault.')
      return
    }
    setIdentity(nextIdentity)
  }

  function savePasskeyEnvelope(envelope: PasskeyEnvelope | null) {
    if (envelope) {
      window.localStorage.setItem(passkeyEnvelopeStorageKey, JSON.stringify(envelope))
      if (identity) window.localStorage.setItem(walletPublicKeyStorageKey, identity.stellarPublicKey)
    } else window.localStorage.removeItem(passkeyEnvelopeStorageKey)
    setPasskeyEnvelope(envelope)
  }

  function changeNetwork(nextNetwork: NetworkKey) {
    setPrivateEngineSwitching(true)
    void restartNethermindWebClientCache().finally(() => setPrivateEngineSwitching(false))
    setNetwork(nextNetwork)
    setIdentity((current) => (current ? deriveWalletIdentity(current.mnemonic, nextNetwork) : null))
  }

  const initialTheme: 'dark' | 'light' = window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
  const onThemeChange = (nextTheme: 'dark' | 'light') => window.localStorage.setItem(themeStorageKey, nextTheme)

  if (identity) {
    return (
      <ThemeProvider initialTheme={initialTheme} onThemeChange={onThemeChange} className="flex items-start justify-center p-8 max-[980px]:p-0">
        <div className="w-[1260px] max-w-full h-[calc(100dvh-64px)] max-h-[880px] overflow-hidden rounded-[24px] border border-bd2 bg-panel shadow-panel max-[980px]:h-dvh max-[980px]:max-h-none max-[980px]:rounded-none max-[980px]:border-0">
          <WalletShell
            identity={identity}
            network={network}
            receiveCode={receiveCode}
            passkeyEnvelope={passkeyEnvelope}
            privateEngineSwitching={privateEngineSwitching}
            onChangeNetwork={changeNetwork}
            onPasskeyEnvelopeChange={savePasskeyEnvelope}
            onLock={() => { setIdentity(null); setFlow('unlock') }}
          />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider initialTheme={initialTheme} onThemeChange={onThemeChange} className="flex items-center justify-center p-6">
      {flow === 'unlock' && vault ? (
        <UnlockScreen
          network={network}
          busy={busy}
          passkeyEnabled={passkeyEnvelope !== null}
          unlockPassword={unlockPassword}
          error={unlockError}
          onPassword={setUnlockPassword}
          onPasswordUnlock={() => void unlockWallet()}
          onPasskeyUnlock={() => void unlockWalletWithPasskey()}
        />
      ) : (
        <OnboardingFlow
          network={network}
          networks={networks}
          busy={busy}
          onChangeNetwork={changeNetwork}
          onCreate={createVault}
          onDemoFunding={requestOnboardingDemoFunding}
          onEnter={enterWith}
        />
      )}
    </ThemeProvider>
  )
}

export default App

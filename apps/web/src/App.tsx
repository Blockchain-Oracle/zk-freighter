import { useMemo, useState } from 'react'
import { Copy, Lock, QrCode, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  NETWORKS,
  createEncryptedVault,
  decodeReceiveCode,
  deriveWalletIdentity,
  encodeReceiveCode,
  unlockPasskeyEnvelope,
  unlockEncryptedVault,
  type EncryptedVault,
  type NetworkKey,
  type PasskeyEnvelope,
  type WalletIdentity,
} from '@zk-fighter/core'
import {
  getStoredPasskeyEnvelope,
  getStoredVault,
  passkeyEnvelopeStorageKey,
  passkeyErrorText,
  receiveCodeHeadChars,
  receiveCodeTailChars,
  truncateMiddle,
  vaultErrorText,
  vaultStorageKey,
} from './app-helpers'
import { CreateWalletPanel, UnlockWalletPanel, type WalletSetupMode } from './AccessPanels'
import { UsdcReceiveSetupPanel } from './UsdcReceiveSetupPanel'
import { WalletFlowPanels } from './WalletFlowPanels'
import './App.css'

const networks = Object.keys(NETWORKS) as NetworkKey[]

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

  const receiveCodeValid = receiveCode ? decodeReceiveCode(receiveCode).ok : false

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

  async function copyReceiveCode() {
    await navigator.clipboard.writeText(receiveCode)
    setStatus('Private receive code copied.')
  }

  function changeNetwork(nextNetwork: NetworkKey) {
    setNetwork(nextNetwork)
    setIdentity((current) => (current ? deriveWalletIdentity(current.mnemonic, nextNetwork) : null))
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <strong>ZK Fighter</strong>
            <span>Shielded Stellar wallet</span>
          </div>
        </div>
        <label className="network-picker">
          <span>Network</span>
          <select value={network} onChange={(event) => changeNetwork(event.target.value as NetworkKey)}>
            {networks.map((key) => (
              <option key={key} value={key}>
                {NETWORKS[key].label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!identity && !vault ? (
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
      ) : null}

      {!identity && vault ? (
        <UnlockWalletPanel
          busy={busy}
          passkeyEnabled={passkeyEnvelope !== null}
          unlockPassword={unlockPassword}
          onPassword={setUnlockPassword}
          onPasswordUnlock={() => void unlockWallet()}
          onPasskeyUnlock={() => void unlockWalletWithPasskey()}
        />
      ) : null}

      {identity ? (
        <section className="wallet-grid" aria-label="Wallet receive view">
          <article className="panel">
            <div className="panel-heading">
              <QrCode size={24} aria-hidden="true" />
              <div>
                <h1>Your private receive code</h1>
                <p>QR and copy payload are the raw `zkf1...` string.</p>
              </div>
            </div>
            <div className="receive-layout">
              <div className="qr-box">
                <QRCodeSVG value={receiveCode} size={192} level="M" marginSize={2} />
              </div>
              <div className="receive-copy">
                <code>{truncateMiddle(receiveCode, receiveCodeHeadChars, receiveCodeTailChars)}</code>
                <button className="button primary" onClick={copyReceiveCode} title="Copy private receive code">
                  <Copy size={18} aria-hidden="true" />
                  Copy
                </button>
              </div>
            </div>
          </article>

          <aside className="panel">
            <h2>Wallet plumbing</h2>
            <dl className="meta-list">
              <div>
                <dt>Mode</dt>
                <dd>{NETWORKS[network].label}</dd>
              </div>
              <div>
                <dt>Public Stellar address</dt>
                <dd>{truncateMiddle(identity.stellarPublicKey)}</dd>
              </div>
              <div>
                <dt>Receive code check</dt>
                <dd>{receiveCodeValid ? 'Valid zkf1 payload' : 'Invalid'}</dd>
              </div>
              <div>
                <dt>Balances</dt>
                <dd>Loaded from the shielded pool panels</dd>
              </div>
            </dl>
            <UsdcReceiveSetupPanel key={`${network}:${identity.stellarPublicKey}`} identity={identity} network={network} />
            <button className="button secondary" onClick={() => setIdentity(null)} title="Lock wallet">
              <Lock size={18} aria-hidden="true" />
              Lock
            </button>
          </aside>

          <WalletFlowPanels
            identity={identity}
            network={network}
            passkeyEnvelope={passkeyEnvelope}
            receiveCode={receiveCode}
            onPasskeyEnvelopeChange={savePasskeyEnvelope}
          />
        </section>
      ) : null}

      {status ? <p className="status-line">{status}</p> : null}
    </main>
  )
}

export default App

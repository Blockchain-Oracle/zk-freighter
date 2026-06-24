import { Fingerprint, KeyRound, Lock } from 'lucide-react'
import { generateSeedPhrase, validateSeedPhrase } from '@zk-fighter/core'
import { passwordMinLength } from './app-helpers'

export type WalletSetupMode = 'create' | 'import'

interface CreateWalletPanelProps {
  readonly acknowledged: boolean
  readonly busy: boolean
  readonly confirmPassword: string
  readonly mnemonic: string
  readonly mode: WalletSetupMode
  readonly password: string
  readonly onAcknowledge: (acknowledged: boolean) => void
  readonly onConfirmPassword: (password: string) => void
  readonly onMnemonic: (mnemonic: string) => void
  readonly onMode: (mode: WalletSetupMode) => void
  readonly onPassword: (password: string) => void
  readonly onSave: (seedPhrase: string) => void
}

interface UnlockWalletPanelProps {
  readonly busy: boolean
  readonly passkeyEnabled: boolean
  readonly unlockPassword: string
  readonly onPassword: (password: string) => void
  readonly onPasswordUnlock: () => void
  readonly onPasskeyUnlock: () => void
}

export function CreateWalletPanel({
  acknowledged,
  busy,
  confirmPassword,
  mnemonic,
  mode,
  password,
  onAcknowledge,
  onConfirmPassword,
  onMnemonic,
  onMode,
  onPassword,
  onSave,
}: CreateWalletPanelProps) {
  const passwordsMatch = password.length >= passwordMinLength && password === confirmPassword
  const canSaveWallet = passwordsMatch && acknowledged && validateSeedPhrase(mnemonic)

  return (
    <section className="panel narrow" aria-labelledby="onboarding-title">
      <div className="panel-heading">
        <KeyRound size={24} aria-hidden="true" />
        <div>
          <h1 id="onboarding-title">Create your wallet</h1>
          <p>Seed phrase first. Passkey unlock is optional after the vault exists.</p>
        </div>
      </div>

      <div className="segmented" role="tablist" aria-label="Wallet setup mode">
        <button className={mode === 'create' ? 'active' : ''} onClick={() => onMode('create')}>
          Create
        </button>
        <button className={mode === 'import' ? 'active' : ''} onClick={() => onMode('import')}>
          Import
        </button>
      </div>

      <div className="form-grid">
        {mode === 'create' ? (
          <button className="button secondary" onClick={() => onMnemonic(generateSeedPhrase())}>
            Generate 12-word phrase
          </button>
        ) : (
          <label className="field">
            <span>Recovery phrase</span>
            <textarea value={mnemonic} onChange={(event) => onMnemonic(event.target.value)} rows={4} />
          </label>
        )}

        {mnemonic ? <code className="phrase">{mnemonic}</code> : null}

        <label className="field">
          <span>Vault password</span>
          <input type="password" value={password} onChange={(event) => onPassword(event.target.value)} />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" value={confirmPassword} onChange={(event) => onConfirmPassword(event.target.value)} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} />
          <span>If this phrase is lost, this wallet cannot be recovered.</span>
        </label>
        <button className="button primary" disabled={!canSaveWallet || busy} onClick={() => onSave(mnemonic)}>
          Encrypt vault
        </button>
      </div>
    </section>
  )
}

export function UnlockWalletPanel({
  busy,
  passkeyEnabled,
  unlockPassword,
  onPassword,
  onPasswordUnlock,
  onPasskeyUnlock,
}: UnlockWalletPanelProps) {
  return (
    <section className="panel narrow" aria-labelledby="unlock-title">
      <div className="panel-heading">
        <Lock size={24} aria-hidden="true" />
        <div>
          <h1 id="unlock-title">Unlock wallet</h1>
          <p>Your recovery phrase is encrypted in this browser vault.</p>
        </div>
      </div>

      {passkeyEnabled ? (
        <button className="button secondary passkey-unlock" disabled={busy} onClick={onPasskeyUnlock}>
          <Fingerprint size={18} aria-hidden="true" />
          {busy ? 'Waiting for passkey...' : 'Unlock with passkey'}
        </button>
      ) : null}

      <label className="field">
        <span>Vault password</span>
        <input
          type="password"
          value={unlockPassword}
          onChange={(event) => onPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onPasswordUnlock()
          }}
        />
      </label>
      <button className="button primary" disabled={!unlockPassword || busy} onClick={onPasswordUnlock}>
        Unlock
      </button>
    </section>
  )
}

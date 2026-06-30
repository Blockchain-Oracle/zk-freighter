import type { CSSProperties } from 'react'
import { generateSeedPhrase, validateSeedPhrase, type NetworkKey } from '@zk-fighter/core'
import { Button, Card, NetworkPill, PasswordStrength } from '@zk-fighter/ui'
import { passwordMinLength } from './app-helpers'

export type WalletSetupMode = 'create' | 'import'

const fieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 13px',
  borderRadius: 11,
  border: '1px solid var(--bd)',
  background: 'var(--card2)',
  color: 'var(--tx)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

/** Branded header + network switch shown above the onboarding card. */
export function OnboardingHeader({
  network,
  networks,
  onChangeNetwork,
}: {
  network: NetworkKey
  networks: readonly NetworkKey[]
  onChangeNetwork: (network: NetworkKey) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(145deg,var(--ac2),var(--ac))' }} />
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>ZK Fighter</div>
        <div style={{ fontSize: 9.5, color: 'var(--tx3)', fontFamily: 'var(--fm)', letterSpacing: '.14em' }}>SHIELDED · STELLAR</div>
      </div>
      <select
        value={network}
        onChange={(event) => onChangeNetwork(event.target.value as NetworkKey)}
        aria-label="Network"
        style={{ marginLeft: 'auto', padding: '7px 10px', borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx2)', fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        {networks.map((key) => (
          <option key={key} value={key}>{key === 'mainnet' ? 'Mainnet' : 'Testnet'}</option>
        ))}
      </select>
    </div>
  )
}

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

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: 9,
    borderRadius: 9,
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--ac)' : 'transparent',
    color: active ? '#fff' : 'var(--tx2)',
    fontFamily: 'inherit',
  }
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
  const words = mnemonic.trim() ? mnemonic.trim().split(/\s+/) : []

  return (
    <Card style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em' }}>Create your wallet</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>Seed phrase first · passkey unlock is optional after the vault exists.</div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--card2)', border: '1px solid var(--bd)', borderRadius: 12 }}>
        <button type="button" style={tabStyle(mode === 'create')} onClick={() => onMode('create')}>Create</button>
        <button type="button" style={tabStyle(mode === 'import')} onClick={() => onMode('import')}>Import</button>
      </div>

      {mode === 'create' ? (
        <Button variant="secondary" fullWidth onClick={() => onMnemonic(generateSeedPhrase())}>
          {words.length ? 'Regenerate 12-word phrase' : 'Generate 12-word phrase'}
        </Button>
      ) : (
        <Field label="Recovery phrase">
          <textarea value={mnemonic} onChange={(event) => onMnemonic(event.target.value)} rows={3} placeholder="word1 word2 …" style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--fm)' }} />
        </Field>
      )}

      {mode === 'create' && words.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {words.map((word, index) => (
            <div key={`${index}-${word}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', border: '1px solid var(--bd)', borderRadius: 10, background: 'var(--card)' }}>
              <span style={{ font: '600 9px/1 var(--fm)', color: 'var(--tx3)', width: 14 }}>{index + 1}</span>
              <span style={{ font: '600 12px/1 var(--sans)', color: 'var(--tx)' }}>{word}</span>
            </div>
          ))}
        </div>
      ) : null}

      <Field label="Vault password">
        <input type="password" value={password} onChange={(event) => onPassword(event.target.value)} style={fieldStyle} />
        {password ? <PasswordStrength password={password} /> : null}
      </Field>
      <Field label="Confirm password">
        <input type="password" value={confirmPassword} onChange={(event) => onConfirmPassword(event.target.value)} style={fieldStyle} />
      </Field>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5, cursor: 'pointer' }}>
        <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} style={{ marginTop: 2 }} />
        <span>If this phrase is lost, this wallet cannot be recovered.</span>
      </label>

      <Button fullWidth loading={busy} disabled={!canSaveWallet} onClick={() => onSave(mnemonic)}>Encrypt vault</Button>
    </Card>
  )
}

interface UnlockWalletPanelProps {
  readonly busy: boolean
  readonly network: NetworkKey
  readonly passkeyEnabled: boolean
  readonly unlockPassword: string
  readonly onPassword: (password: string) => void
  readonly onPasswordUnlock: () => void
  readonly onPasskeyUnlock: () => void
}

export function UnlockWalletPanel({
  busy,
  network,
  passkeyEnabled,
  unlockPassword,
  onPassword,
  onPasswordUnlock,
  onPasskeyUnlock,
}: UnlockWalletPanelProps) {
  return (
    <Card style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em' }}>Unlock wallet</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>Your recovery phrase is encrypted in this browser vault.</div>
        </div>
        <div style={{ marginLeft: 'auto' }}><NetworkPill network={network} /></div>
      </div>

      {passkeyEnabled ? (
        <Button variant="secondary" fullWidth loading={busy} onClick={onPasskeyUnlock}>
          {busy ? 'Waiting for passkey…' : '🔑 Unlock with passkey'}
        </Button>
      ) : null}

      <Field label="Vault password">
        <input
          type="password"
          value={unlockPassword}
          onChange={(event) => onPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onPasswordUnlock()
          }}
          style={fieldStyle}
        />
      </Field>
      <Button fullWidth loading={busy} disabled={!unlockPassword} onClick={onPasswordUnlock}>Unlock</Button>
    </Card>
  )
}

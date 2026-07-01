import {
  parseEncryptedVault,
  type EncryptedVault,
  parsePasskeyEnvelope,
  type PasskeyEnvelope,
  type PasskeyError,
  type VaultError,
} from '@zk-fighter/core'

export const vaultStorageKey = 'zk-fighter:vault:v1'
export const passkeyEnvelopeStorageKey = 'zk-fighter:passkey-envelope:v1'
export const walletPublicKeyStorageKey = 'zk-fighter:wallet-public-key:v1'
export const passwordMinLength = 8

export function truncateMiddle(value: string, head = 14, tail = 10): string {
  if (value.length <= head + tail) {
    return value
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function getStoredVault(): EncryptedVault | null {
  const stored = window.localStorage.getItem(vaultStorageKey)
  if (!stored) {
    return null
  }

  const parsed = parseEncryptedVault(stored)
  return parsed.ok ? parsed.value : null
}

export function getStoredPasskeyEnvelope(): PasskeyEnvelope | null {
  const stored = window.localStorage.getItem(passkeyEnvelopeStorageKey)
  if (!stored) {
    return null
  }

  const parsed = parsePasskeyEnvelope(stored)
  return parsed.ok ? parsed.value : null
}

export function getStoredWalletPublicKey(): string | null {
  const stored = window.localStorage.getItem(walletPublicKeyStorageKey)
  return stored && /^G[A-Z2-7]{55}$/.test(stored) ? stored : null
}

export function vaultErrorText(error: VaultError): string {
  const messages = {
    'corrupt-vault': 'The saved vault cannot be read.',
    'crypto-unavailable': 'Browser crypto is unavailable.',
    'invalid-mnemonic': 'Enter a valid 12-word recovery phrase.',
    'invalid-password': 'Password did not unlock this vault.',
    'unsupported-vault': 'This vault version is not supported.',
  } satisfies Record<VaultError, string>

  return messages[error]
}

export function passkeyErrorText(error: PasskeyError): string {
  const messages = {
    'ceremony-cancelled': 'Passkey prompt was cancelled.',
    'corrupt-passkey': 'The saved passkey unlock data cannot be read.',
    'crypto-unavailable': 'Browser crypto is unavailable.',
    'invalid-mnemonic': 'The seed phrase could not be bound to a passkey.',
    'passkey-mismatch': 'This passkey did not unlock this wallet.',
    'prf-unsupported': 'This passkey does not expose the PRF needed for ZK Fighter unlock.',
    'webauthn-unavailable': 'Passkeys are unavailable in this browser context.',
  } satisfies Record<PasskeyError, string>

  return messages[error]
}

import {
  deriveWalletIdentity,
  type EncryptedVault,
  type NetworkKey,
  type PasskeyEnvelope,
  type WalletIdentity,
} from '@zk-fighter/core'
import { browser } from 'wxt/browser'

const storageKey = 'zkf.extension.dappWallet'

export interface StoredDappWallet {
  readonly vault?: EncryptedVault
  readonly network: NetworkKey
  readonly walletPublicKey?: string
  readonly passkeyEnvelope?: PasskeyEnvelope
}

const defaultStoredWallet: StoredDappWallet = {
  network: 'testnet',
}

export async function readStoredDappWallet(): Promise<StoredDappWallet> {
  const value = (await browser.storage.local.get(storageKey))[storageKey]
  if (!isStoredDappWallet(value)) {
    return defaultStoredWallet
  }

  return {
    vault: value.vault,
    network: value.network,
    walletPublicKey: typeof value.walletPublicKey === 'string' ? value.walletPublicKey : undefined,
    passkeyEnvelope: value.passkeyEnvelope,
  }
}

export async function writeStoredDappWallet(state: StoredDappWallet): Promise<void> {
  await browser.storage.local.set({ [storageKey]: state })
}

export function identityForMnemonic(
  mnemonic: string | null,
  state: StoredDappWallet,
): WalletIdentity | null {
  return mnemonic === null ? null : deriveWalletIdentity(mnemonic, state.network)
}

export type UnlockedDappWallet =
  | { readonly ok: true; readonly mnemonic: string; readonly network: NetworkKey }
  | { readonly ok: false; readonly error: string }

export async function requireUnlockedDappWallet(unlockedMnemonic: string | null): Promise<UnlockedDappWallet> {
  const state = await readStoredDappWallet()
  const identity = identityForMnemonic(unlockedMnemonic, state)
  if (!state.vault) return { ok: false, error: 'Import a seed-backed vault before shielding.' }
  if (!identity || !unlockedMnemonic) return { ok: false, error: 'Unlock ZK Fighter before shielding.' }
  return { ok: true, ['mnemonic']: unlockedMnemonic, network: state.network }
}

function isStoredDappWallet(value: unknown): value is StoredDappWallet {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Partial<StoredDappWallet>
  return isNetworkKey(record.network)
}

function isNetworkKey(value: unknown): value is NetworkKey {
  return value === 'testnet' || value === 'mainnet'
}

import {
  deriveWalletIdentity,
  type EncryptedVault,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { browser } from 'wxt/browser'

const storageKey = 'zkf.extension.dappWallet'

export interface StoredDappWallet {
  readonly vault?: EncryptedVault
  readonly network: NetworkKey
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

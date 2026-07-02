import {
  createPasskeyEnvelopeFromMaterial,
  clearNethermindWebClientCache,
  deriveWalletIdentity,
  getPasskeySupportReport,
  unlockPasskeyEnvelopeFromMaterial,
  unlockEncryptedVault,
  type NetworkKey,
  type PasskeyCreateMaterial,
  type PasskeyUnlockMaterial,
} from '@zk-freighter/core'
import { browser } from 'wxt/browser'

import { clearAllBalanceCache } from './balance-cache'
import type { PasskeyPrepareCreateResponse, PasskeySupportResponse } from './dappMessages'
import { readStoredDappWallet, writeStoredDappWallet } from './dappRuntimeState'

interface ExtensionMessageSender {
  readonly tab?: unknown
  readonly url?: string
}

interface BasicResponse {
  readonly ok: boolean
  readonly error?: string
}

export async function setNetworkFlow(network: NetworkKey): Promise<BasicResponse> {
  const state = await readStoredDappWallet()
  clearNethermindWebClientCache()
  await writeStoredDappWallet({ ...state, network })
  await clearAllBalanceCache()
  return { ok: true }
}

export async function passkeySupportFlow(): Promise<PasskeySupportResponse> {
  const state = await readStoredDappWallet()
  return {
    ok: true,
    support: await getPasskeySupportReport(),
    enabled: state.passkeyEnvelope !== undefined,
    envelope: state.passkeyEnvelope,
  }
}

export async function passkeyPrepareCreateFlow(
  password: string,
  sender: ExtensionMessageSender | undefined,
): Promise<PasskeyPrepareCreateResponse> {
  if (!isExtensionPageSender(sender)) return { ok: false, error: 'Passkey setup is only available inside ZK Freighter.' }
  const unlocked = await verifiedVaultMnemonic(password)
  if (!unlocked.ok) return { ok: false, error: unlocked.error }
  return { ok: true }
}

export async function passkeyCreateFlow(
  password: string,
  material: PasskeyCreateMaterial,
  sender: ExtensionMessageSender | undefined,
): Promise<BasicResponse> {
  if (!isExtensionPageSender(sender)) return { ok: false, error: 'Passkey setup is only available inside ZK Freighter.' }
  const unlocked = await verifiedVaultMnemonic(password)
  if (!unlocked.ok) return { ok: false, error: unlocked.error }
  const envelope = await createPasskeyEnvelopeFromMaterial({ ['mnemonic']: unlocked.mnemonic, material })
  if (!envelope.ok) return { ok: false, error: `Passkey setup failed: ${envelope.error}` }
  const state = await readStoredDappWallet()
  await writeStoredDappWallet({ ...state, walletPublicKey: unlocked.walletPublicKey, passkeyEnvelope: envelope.value })
  return { ok: true }
}

async function verifiedVaultMnemonic(password: string): Promise<{ readonly ok: true; readonly mnemonic: string; readonly walletPublicKey: string } | { readonly ok: false; readonly error: string }> {
  const state = await readStoredDappWallet()
  if (!state.vault) return { ok: false, error: 'Import a seed-backed vault before setting up a passkey.' }
  const unlocked = await unlockEncryptedVault(state.vault, password)
  if (!unlocked.ok) return { ok: false, error: `Vault unlock failed: ${unlocked.error}` }
  const walletPublicKey = deriveWalletIdentity(unlocked.value, state.network).stellarPublicKey
  if (state.walletPublicKey && state.walletPublicKey !== walletPublicKey) {
    return { ok: false, error: 'Vault password unlocked a different wallet identity.' }
  }
  if (!state.walletPublicKey) await writeStoredDappWallet({ ...state, walletPublicKey })
  return { ok: true, mnemonic: unlocked.value, walletPublicKey }
}

export async function passkeyRemoveFlow(sender: ExtensionMessageSender | undefined): Promise<BasicResponse> {
  if (!isExtensionPageSender(sender)) return { ok: false, error: 'Passkey removal is only available inside ZK Freighter.' }
  const state = await readStoredDappWallet()
  await writeStoredDappWallet({ vault: state.vault, network: state.network, walletPublicKey: state.walletPublicKey })
  return { ok: true }
}

export async function passkeyUnlockFlow(
  material: PasskeyUnlockMaterial,
  sender: ExtensionMessageSender | undefined,
): Promise<{ readonly ok: true; readonly mnemonic: string } | { readonly ok: false; readonly error: string }> {
  if (!isExtensionPageSender(sender)) return { ok: false, error: 'Passkey unlock is only available inside ZK Freighter.' }
  const state = await readStoredDappWallet()
  if (!state.vault || !state.passkeyEnvelope) return { ok: false, error: 'Passkey unlock is not set up for this vault.' }
  const unlocked = await unlockPasskeyEnvelopeFromMaterial({ envelope: state.passkeyEnvelope, material })
  if (!unlocked.ok) return { ok: false, error: `Passkey unlock failed: ${unlocked.error}` }
  const mnemonic = unlocked.value
  const walletPublicKey = deriveWalletIdentity(mnemonic, state.network).stellarPublicKey
  if (!state.walletPublicKey) return { ok: false, error: 'Passkey metadata is missing the wallet identity. Unlock with your password and set it up again.' }
  if (state.walletPublicKey !== walletPublicKey) return { ok: false, error: 'Passkey decrypted a different wallet than this vault.' }
  return { ok: true, mnemonic }
}

function isExtensionPageSender(sender: ExtensionMessageSender | undefined): boolean {
  return sender?.url?.startsWith(browser.runtime.getURL('')) === true || sender?.tab === undefined
}

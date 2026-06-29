// Read-only (simulate) views into the confidential-token + auditor contracts.
// No transactions are submitted. Split from soroban.ts to keep each file small.

import { Account, Address, Contract, TransactionBuilder, nativeToScVal, scValToNative } from '@stellar/stellar-sdk'
import { getConfidentialConfig, getNetworkConfig } from './../networks'
import {
  defaultServerFactory,
  invokeFee,
  invokeTimeoutSeconds,
  type ConfidentialSubmitOptions,
} from './soroban'

type RetvalSim = { error?: unknown; result?: { retval?: Parameters<typeof scValToNative>[0] } }

export type ConfidentialRegistration = 'registered' | 'unregistered' | 'unavailable' | 'gated'

/**
 * Read whether `account` (defaults to the caller) is registered for confidential
 * mode on-chain. Simulate-only. Returns 'gated' when the network has no
 * confidential deployment, 'unavailable' on read error.
 */
export async function readConfidentialRegistration(
  options: ConfidentialSubmitOptions & { readonly account?: string },
): Promise<ConfidentialRegistration> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) return 'gated'
  const networkConfig = getNetworkConfig(options.network)
  const account = options.account ?? options.identity.stellarPublicKey
  try {
    const server = (options.serverFactory ?? defaultServerFactory)(networkConfig.rpcUrl)
    const source = new Account(account, '0')
    const tx = new TransactionBuilder(source, { fee: invokeFee, networkPassphrase: networkConfig.passphrase })
      .addOperation(new Contract(confidential.tokenId).call('is_registered', Address.fromString(account).toScVal()))
      .setTimeout(invokeTimeoutSeconds)
      .build()
    const simulated = (await server.simulateTransaction(tx)) as RetvalSim
    if (simulated.error || !simulated.result?.retval) return 'unavailable'
    return scValToNative(simulated.result.retval) === true ? 'registered' : 'unregistered'
  } catch {
    return 'unavailable'
  }
}

/**
 * Read an auditor's Grumpkin public key (`K_aud`, 64 bytes) from the auditor
 * registry by `auditorId`. The withdraw/transfer witnesses need this exact key
 * (the contract fetches the same one to rebuild the proof's public inputs).
 */
export async function readAuditorKey(
  options: ConfidentialSubmitOptions & { readonly auditorId: number },
): Promise<Uint8Array | null> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) return null
  const networkConfig = getNetworkConfig(options.network)
  try {
    const server = (options.serverFactory ?? defaultServerFactory)(networkConfig.rpcUrl)
    const source = new Account(options.identity.stellarPublicKey, '0')
    const tx = new TransactionBuilder(source, { fee: invokeFee, networkPassphrase: networkConfig.passphrase })
      .addOperation(new Contract(confidential.auditorId).call('get_key', nativeToScVal(options.auditorId, { type: 'u32' })))
      .setTimeout(invokeTimeoutSeconds)
      .build()
    const simulated = (await server.simulateTransaction(tx)) as RetvalSim
    if (simulated.error || !simulated.result?.retval) return null
    const key = scValToNative(simulated.result.retval) as Uint8Array
    return key instanceof Uint8Array && key.length === 64 ? key : null
  } catch {
    return null
  }
}

export interface ConfidentialAccountView {
  /// Public viewing key PVK (Grumpkin affine, 64 bytes) — the transfer ECDH target.
  readonly viewingPublicKey: Uint8Array
  readonly auditorId: number
}

/**
 * Read a registered account's public viewing key + auditor id from the token
 * contract (`account(addr)` view). Returns null when not registered / gated / error.
 */
export async function readConfidentialAccount(
  options: ConfidentialSubmitOptions & { readonly account: string },
): Promise<ConfidentialAccountView | null> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) return null
  const networkConfig = getNetworkConfig(options.network)
  try {
    const server = (options.serverFactory ?? defaultServerFactory)(networkConfig.rpcUrl)
    const source = new Account(options.identity.stellarPublicKey, '0')
    const tx = new TransactionBuilder(source, { fee: invokeFee, networkPassphrase: networkConfig.passphrase })
      .addOperation(new Contract(confidential.tokenId).call('account', Address.fromString(options.account).toScVal()))
      .setTimeout(invokeTimeoutSeconds)
      .build()
    const simulated = (await server.simulateTransaction(tx)) as RetvalSim
    if (simulated.error || !simulated.result?.retval) return null
    const account = scValToNative(simulated.result.retval) as { viewing_public_key?: Uint8Array; auditor_id?: number } | null
    const viewingPublicKey = account?.viewing_public_key
    if (!(viewingPublicKey instanceof Uint8Array) || viewingPublicKey.length !== 64) return null
    return { viewingPublicKey, auditorId: Number(account?.auditor_id ?? 0) }
  } catch {
    return null
  }
}

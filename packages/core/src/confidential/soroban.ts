// Confidential-token (Track B) Soroban client — high-level invocations for the
// deployed confidential-token contract. This module covers the PROOFLESS ops
// (deposit, merge): both are real, on-chain, and need no ZK prover. The
// proof-gated ops (register/withdraw/transfer) build on the prover runtime and
// live alongside this once their witness construction lands.
//
// Submission mirrors the shielded-pool flows (see asp-membership-insert.ts):
// build → simulate → assemble → sign → submit → confirm → structured report
// with a status-event stream the UI renders as a progress timeline.

import {
  Address,
  Contract,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from '@stellar/stellar-sdk'
import { deriveWalletKeypair, type WalletIdentity } from './../identity'
import { getConfidentialConfig, getNetworkConfig, type NetworkKey } from './../networks'
import { afterDeposit, afterMerge, loadConfidentialBalance, saveConfidentialBalance } from './balance-state'

export const invokeFee = '10000000'
export const invokeTimeoutSeconds = 120
const defaultConfirmationPolls = 60
const defaultPollIntervalMs = 2_000

export type ConfidentialOp = 'deposit' | 'merge' | 'register' | 'withdraw' | 'transfer'
export type ConfidentialSubmitStatus = 'submitted' | 'blocked' | 'failed'
export type ConfidentialStage = 'readiness' | 'simulate' | 'submit' | 'confirm'

export interface ConfidentialSubmitEvent {
  readonly elapsedMs: number
  readonly stage: ConfidentialStage
  readonly message: string
}

export interface ConfidentialSubmitReport {
  readonly status: ConfidentialSubmitStatus
  readonly op: ConfidentialOp
  readonly network: NetworkKey
  readonly contractId?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly statusEvents: readonly ConfidentialSubmitEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface ConfidentialSorobanServer {
  getAccount(publicKey: string): Promise<ConstructorParameters<typeof TransactionBuilder>[0]>
  simulateTransaction(transaction: Transaction): Promise<unknown>
  sendTransaction(transaction: Transaction): Promise<{ status?: string; hash?: string }>
  getTransaction(hash: string): Promise<{ status?: string }>
}

export interface ConfidentialSubmitOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly serverFactory?: (rpcUrl: string) => ConfidentialSorobanServer
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
  readonly confirmationPolls?: number
  readonly pollIntervalMs?: number
}

/// Pull `amount` of the public underlying into the recipient's confidential
/// receiving balance. `amount` is in underlying base units (i128). Defaults the
/// recipient to the caller (self-deposit); pass `to` to fund another account.
export interface ConfidentialDepositOptions extends ConfidentialSubmitOptions {
  readonly amount: bigint
  readonly to?: string
}

export async function submitConfidentialDeposit(
  options: ConfidentialDepositOptions,
): Promise<ConfidentialSubmitReport> {
  const from = options.identity.stellarPublicKey
  const to = options.to ?? from
  if (options.amount < 0n) {
    return failFast(options, 'deposit', ['Deposit amount must be non-negative.'])
  }
  const report = await runConfidentialInvocation(options, 'deposit', (contractId) =>
    new Contract(contractId).call(
      'deposit',
      Address.fromString(from).toScVal(),
      Address.fromString(to).toScVal(),
      nativeToScVal(options.amount, { type: 'i128' }),
    ),
  )
  // Track our own receiving balance only for a self-deposit (we don't hold
  // another account's plaintext state).
  if (report.status === 'submitted' && to === from && report.contractId) {
    const balance = loadConfidentialBalance(options.network, report.contractId, from)
    saveConfidentialBalance(options.network, report.contractId, from, afterDeposit(balance, options.amount))
  }
  return report
}

/// Fold the caller's confidential receiving balance into their spendable
/// balance, making received funds spendable. Proofless and owner-authed.
export async function submitConfidentialMerge(
  options: ConfidentialSubmitOptions,
): Promise<ConfidentialSubmitReport> {
  const account = options.identity.stellarPublicKey
  const report = await runConfidentialInvocation(options, 'merge', (contractId) =>
    new Contract(contractId).call('merge', Address.fromString(account).toScVal()),
  )
  if (report.status === 'submitted' && report.contractId) {
    const balance = loadConfidentialBalance(options.network, report.contractId, account)
    saveConfidentialBalance(options.network, report.contractId, account, afterMerge(balance))
  }
  return report
}

/**
 * Run a confidential-token invocation through the full Soroban lifecycle
 * (build → simulate → assemble → sign → submit → confirm) and return a
 * structured report. Shared by the proofless ops here and the proof-gated
 * register path in ./register; `buildCall` produces the contract call (already
 * carrying any proof/public-input bytes).
 */
export async function runConfidentialInvocation(
  options: ConfidentialSubmitOptions,
  op: ConfidentialOp,
  buildCall: (contractId: string) => ReturnType<Contract['call']>,
): Promise<ConfidentialSubmitReport> {
  const networkConfig = getNetworkConfig(options.network)
  const confidential = getConfidentialConfig(options.network)
  const now = options.now ?? defaultNow
  const started = now()
  const statusEvents: ConfidentialSubmitEvent[] = []
  let txHash: string | undefined
  const emit = (stage: ConfidentialStage, message: string) => {
    statusEvents.push({ elapsedMs: Math.round(now() - started), stage, message })
  }
  const report = (
    status: ConfidentialSubmitStatus,
    blockers: readonly string[],
    error?: string,
  ): ConfidentialSubmitReport => ({
    status,
    op,
    network: options.network,
    contractId: confidential?.tokenId,
    txHash,
    explorerUrl: txHash ? `${networkConfig.explorerTxUrl}/${txHash}` : undefined,
    statusEvents,
    blockers,
    error,
  })

  if (!confidential) {
    return report('blocked', ['Confidential tokens are available on testnet only.'])
  }

  try {
    emit('readiness', `Preparing confidential ${op}`)
    const server = (options.serverFactory ?? defaultServerFactory)(networkConfig.rpcUrl)
    const account = await server.getAccount(options.identity.stellarPublicKey)
    const tx = new TransactionBuilder(account, {
      fee: invokeFee,
      networkPassphrase: networkConfig.passphrase,
    })
      .addOperation(buildCall(confidential.tokenId))
      .setTimeout(invokeTimeoutSeconds)
      .build()

    emit('simulate', `Simulating confidential ${op}`)
    const simulated = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(simulated as Parameters<typeof rpc.Api.isSimulationError>[0])) {
      const message = `Confidential ${op} simulation failed.`
      return report('failed', [message], message)
    }

    const prepared = rpc
      .assembleTransaction(tx, simulated as Parameters<typeof rpc.assembleTransaction>[1])
      .build()
    prepared.sign(deriveWalletKeypair(options.identity.mnemonic))

    emit('submit', `Submitting confidential ${op}`)
    const send = await server.sendTransaction(prepared)
    if (send.status === 'ERROR' || !send.hash) {
      const message = `Confidential ${op} submission failed.`
      return report('failed', [message], message)
    }
    txHash = send.hash

    const result = await confirm(server, txHash, op, options, emit)
    return result === 'SUCCESS'
      ? report('submitted', [])
      : report('failed', [`Confidential ${op} confirmation did not succeed (${txHash}).`])
  } catch (error) {
    const message = error instanceof Error ? error.message : `unknown confidential ${op} error`
    return report('failed', [message], message)
  }
}

function failFast(
  options: ConfidentialSubmitOptions,
  op: ConfidentialOp,
  blockers: readonly string[],
): ConfidentialSubmitReport {
  return {
    status: 'blocked',
    op,
    network: options.network,
    contractId: getConfidentialConfig(options.network)?.tokenId,
    statusEvents: [],
    blockers,
  }
}

async function confirm(
  server: ConfidentialSorobanServer,
  txHash: string,
  op: ConfidentialOp,
  options: ConfidentialSubmitOptions,
  emit: (stage: ConfidentialStage, message: string) => void,
): Promise<string> {
  const sleep = options.sleep ?? defaultSleep
  const polls = options.confirmationPolls ?? defaultConfirmationPolls
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  for (let index = 0; index < polls; index += 1) {
    emit('confirm', `Confirming confidential ${op} ${index + 1}/${polls}`)
    await sleep(pollIntervalMs)
    const result = await server.getTransaction(txHash)
    if (result.status === 'SUCCESS' || result.status === 'FAILED') {
      emit('confirm', result.status === 'SUCCESS' ? `Confidential ${op} confirmed` : `Confidential ${op} failed`)
      return result.status
    }
  }
  return 'TIMEOUT'
}

export function defaultServerFactory(rpcUrl: string): ConfidentialSorobanServer {
  return new rpc.Server(rpcUrl) as unknown as ConfidentialSorobanServer
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

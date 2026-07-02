import {
  Contract,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from '@stellar/stellar-sdk'
import { deriveAspMembershipLeaf, runAspMembershipPreflight, type AspMembershipLeaf, type AspMembershipPreflightOptions } from './asp-membership'
import { deriveWalletKeypair } from './identity'
import { getNetworkConfig, isShieldedAssetEnabled, type NetworkKey } from './networks'

const aspInsertFee = '10000000'
const aspInsertTimeoutSeconds = 120
const defaultConfirmationPolls = 60
const defaultPollIntervalMs = 2_000

export type AspMembershipInsertStatus = 'submitted' | 'blocked' | 'failed'

export interface AspMembershipInsertEvent {
  readonly elapsedMs: number
  readonly message: string
  readonly stage: 'readiness' | 'simulate' | 'submit' | 'confirm'
}

export interface AspMembershipInsertReport {
  readonly status: AspMembershipInsertStatus
  readonly network: NetworkKey
  readonly userAddress: string
  readonly leaf: AspMembershipLeaf
  readonly contractId?: string
  readonly txHash?: string
  readonly ledger?: number
  readonly explorerUrl?: string
  readonly statusEvents: readonly AspMembershipInsertEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

interface AspSorobanServer {
  getAccount(publicKey: string): Promise<ConstructorParameters<typeof TransactionBuilder>[0]>
  simulateTransaction(transaction: Transaction): Promise<unknown>
  sendTransaction(transaction: Transaction): Promise<{ status?: string; hash?: string; errorResultXdr?: unknown }>
  getTransaction(hash: string): Promise<{ status?: string; resultXdr?: unknown; ledger?: number; latestLedger?: number }>
}

export interface AspMembershipInsertOptions extends AspMembershipPreflightOptions {
  readonly serverFactory?: (rpcUrl: string) => AspSorobanServer
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
  readonly confirmationPolls?: number
  readonly pollIntervalMs?: number
}

export async function insertAspMembershipLeaf(
  options: AspMembershipInsertOptions,
): Promise<AspMembershipInsertReport> {
  const network = getNetworkConfig(options.network)
  const now = options.now ?? defaultNow
  const started = now()
  const statusEvents: AspMembershipInsertEvent[] = []
  const leaf = deriveAspMembershipLeaf(options.identity)
  let txHash: string | undefined
  let ledger: number | undefined
  const emit = (stage: AspMembershipInsertEvent['stage'], message: string) => {
    statusEvents.push({ elapsedMs: Math.round(now() - started), stage, message })
  }

  if (!isShieldedAssetEnabled(options.network, 'XLM')) {
    return report('blocked', ['ASP membership insertion is enabled only for deployed XLM shielded pools.'])
  }

  try {
    const preflight = await runAspMembershipPreflight(options)
    const contractId = preflight.contractState?.contractId
    if (preflight.status === 'failed') {
      return report('failed', preflight.blockers, contractId, preflight.error)
    }
    if (!contractId) {
      return report('blocked', preflight.blockers.length > 0
        ? preflight.blockers
        : ['ASP membership contract state could not be read.'])
    }
    if (!preflight.canInsertWithoutAdmin) {
      return report('blocked', ['ASP membership insertion requires admin auth for this deployed contract.'], contractId)
    }
    if (preflight.referenceLeafMatches === false) {
      return report('failed', ['Local ASP leaf derivation does not match the Nethermind runtime.'], contractId)
    }

    emit('readiness', 'ASP membership leaf ready')
    const server = (options.serverFactory ?? defaultServerFactory)(network.rpcUrl)
    const account = await server.getAccount(options.identity.stellarPublicKey)
    const tx = new TransactionBuilder(account, {
      fee: aspInsertFee,
      networkPassphrase: network.passphrase,
    })
      .addOperation(
        new Contract(contractId).call('insert_leaf', nativeToScVal(BigInt(leaf.membershipLeafDecimal), { type: 'u256' })),
      )
      .setTimeout(aspInsertTimeoutSeconds)
      .build()

    emit('simulate', 'Simulating ASP insert_leaf')
    const simulated = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(simulated as Parameters<typeof rpc.Api.isSimulationError>[0])) {
      return report('failed', ['ASP insert_leaf simulation failed.'], contractId, 'ASP insert_leaf simulation failed.')
    }

    const prepared = rpc.assembleTransaction(tx, simulated as Parameters<typeof rpc.assembleTransaction>[1]).build()
    prepared.sign(deriveWalletKeypair(options.identity.mnemonic))
    emit('submit', 'Submitting ASP insert_leaf')
    const send = await server.sendTransaction(prepared)
    if (send.status === 'ERROR' || !send.hash) {
      return report('failed', ['ASP insert_leaf submission failed.'], contractId, 'ASP insert_leaf submission failed.')
    }

    txHash = send.hash
    const result = await confirmTransaction(server, txHash, options, emit)
    ledger = result.ledger
    return result.status === 'SUCCESS'
      ? report('submitted', [], contractId)
      : report('failed', [`ASP insert_leaf confirmation did not succeed (${txHash}).`], contractId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown ASP insert_leaf error'
    return report('failed', [message], undefined, message)
  }

  function report(
    status: AspMembershipInsertStatus,
    blockers: readonly string[],
    contractId?: string,
    error?: string,
  ): AspMembershipInsertReport {
    return {
      status,
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      leaf,
      contractId,
      txHash,
      ledger,
      explorerUrl: txHash ? `${network.explorerTxUrl}/${txHash}` : undefined,
      statusEvents,
      blockers,
      error,
    }
  }
}

async function confirmTransaction(
  server: AspSorobanServer,
  txHash: string,
  options: AspMembershipInsertOptions,
  emit: (stage: AspMembershipInsertEvent['stage'], message: string) => void,
): Promise<{ readonly status: string; readonly ledger?: number }> {
  const sleep = options.sleep ?? defaultSleep
  const polls = options.confirmationPolls ?? defaultConfirmationPolls
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  for (let index = 0; index < polls; index += 1) {
    emit('confirm', `Confirming ASP insert_leaf ${index + 1}/${polls}`)
    await sleep(pollIntervalMs)
    const result = await server.getTransaction(txHash)
    if (result.status === 'SUCCESS' || result.status === 'FAILED') {
      emit('confirm', result.status === 'SUCCESS' ? 'ASP insert_leaf confirmed' : 'ASP insert_leaf failed')
      return { status: result.status, ledger: numericLedger(result) }
    }
  }
  return { status: 'TIMEOUT' }
}

function numericLedger(result: { readonly ledger?: number; readonly latestLedger?: number }): number | undefined {
  const value = result.ledger ?? result.latestLedger
  return Number.isFinite(value) ? value : undefined
}

function defaultServerFactory(rpcUrl: string): AspSorobanServer {
  return new rpc.Server(rpcUrl) as unknown as AspSorobanServer
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

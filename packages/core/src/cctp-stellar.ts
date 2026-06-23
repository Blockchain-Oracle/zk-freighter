import {
  Account,
  Asset,
  Contract,
  Horizon,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from '@stellar/stellar-sdk'
import { hexToBytes } from './bytes'
import type { CctpAttestationMessage, CctpBridgeProgressEvent } from './cctp-types'
import { deriveWalletKeypair, type WalletIdentity } from './identity'
import { getNetworkConfig, type NetworkKey } from './networks'

const sorobanCctpFee = '10000000'
const sorobanCctpTimeoutSeconds = 120
const classicTxTimeoutSeconds = 30
const defaultConfirmationPolls = 60
const defaultPollIntervalMs = 2_000
const defaultFriendbotUrl = 'https://friendbot.stellar.org'

interface CctpSorobanServer {
  getAccount(publicKey: string): Promise<Account>
  simulateTransaction(transaction: Transaction): Promise<unknown>
  sendTransaction(transaction: Transaction): Promise<{ status?: string; hash?: string; errorResultXdr?: unknown }>
  getTransaction(hash: string): Promise<{ status?: string; resultXdr?: unknown }>
}

interface HorizonBalanceLine {
  readonly asset_type: string
  readonly asset_code?: string
  readonly asset_issuer?: string
}

type HorizonSourceAccount = ConstructorParameters<typeof TransactionBuilder>[0] & {
  readonly balances?: readonly HorizonBalanceLine[]
}

interface CctpHorizonServer {
  loadAccount(publicKey: string): Promise<HorizonSourceAccount>
  fetchBaseFee(): Promise<number | string>
  submitTransaction(transaction: Transaction): Promise<{ readonly hash?: string }>
}

export interface SubmitCctpMintAndForwardOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly attestation: CctpAttestationMessage
  readonly onStatus?: (event: CctpBridgeProgressEvent) => void
  readonly serverFactory?: (rpcUrl: string) => CctpSorobanServer
  readonly horizonFactory?: (horizonUrl: string) => CctpHorizonServer
  readonly fetch?: typeof fetch
  readonly friendbotUrl?: string
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
  readonly confirmationPolls?: number
  readonly pollIntervalMs?: number
}

export interface EnsureStellarUsdcTrustlineOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly keypair?: ReturnType<typeof deriveWalletKeypair>
  readonly networkConfig?: ReturnType<typeof getNetworkConfig>
  readonly emit?: (message: string) => void
  readonly horizonFactory?: (horizonUrl: string) => CctpHorizonServer
  readonly fetch?: typeof fetch
  readonly friendbotUrl?: string
}

export interface StellarUsdcTrustlineReport {
  readonly status: 'ready' | 'created'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly friendbotHash?: string
}

export async function submitCctpMintAndForward(
  options: SubmitCctpMintAndForwardOptions,
): Promise<{ readonly hash: string }> {
  const network = getNetworkConfig(options.network)
  const forwarder = network.cctp?.cctpForwarder
  if (options.network !== 'testnet' || !forwarder) {
    throw new Error('CCTP mint-and-forward is enabled only for configured testnet CCTP in this phase.')
  }

  const now = options.now ?? defaultNow
  const started = now()
  const emit = (message: string) => options.onStatus?.({ stage: 'mint', elapsedMs: Math.round(now() - started), message })
  const server = (options.serverFactory ?? defaultServerFactory)(network.rpcUrl)
  const keypair = deriveWalletKeypair(options.identity.mnemonic)
  await ensureCctpDestinationReady({ ...options, keypair, networkConfig: network, emit })
  const account = await server.getAccount(options.identity.stellarPublicKey)
  const contract = new Contract(forwarder)
  const tx = new TransactionBuilder(account, {
    fee: sorobanCctpFee,
    networkPassphrase: network.passphrase,
  })
    .addOperation(
      contract.call(
        'mint_and_forward',
        xdr.ScVal.scvBytes(asScvBytesInput(hexToBytes(options.attestation.message))),
        xdr.ScVal.scvBytes(asScvBytesInput(hexToBytes(options.attestation.attestation))),
      ),
    )
    .setTimeout(sorobanCctpTimeoutSeconds)
    .build()

  emit('Simulating Stellar mint_and_forward')
  const simulated = await server.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(simulated as Parameters<typeof rpc.Api.isSimulationError>[0])) {
    throw new Error(`CCTP mint simulation failed: ${summarizeSimulationError(simulated)}`)
  }

  emit('Signing Stellar mint_and_forward')
  const prepared = rpc.assembleTransaction(tx, simulated as Parameters<typeof rpc.assembleTransaction>[1]).build()
  prepared.sign(keypair)

  emit('Submitting Stellar mint_and_forward')
  const send = await server.sendTransaction(prepared)
  if (send.status === 'ERROR' || !send.hash) {
    throw new Error(`CCTP mint submission failed${send.errorResultXdr ? ` (${String(send.errorResultXdr)})` : ''}`)
  }

  const sleep = options.sleep ?? defaultSleep
  const polls = options.confirmationPolls ?? defaultConfirmationPolls
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  for (let index = 0; index < polls; index += 1) {
    emit(`Confirming Stellar mint_and_forward ${index + 1}/${polls}`)
    await sleep(pollIntervalMs)
    const result = await server.getTransaction(send.hash)
    if (result.status === 'SUCCESS') {
      return { hash: send.hash }
    }
    if (result.status === 'FAILED') {
      throw new Error(`CCTP mint transaction ${send.hash} failed${result.resultXdr ? ` (${String(result.resultXdr)})` : ''}`)
    }
  }

  throw new Error(`CCTP mint confirmation timed out after ${polls} polls (${send.hash})`)
}

function asScvBytesInput(bytes: Uint8Array): Parameters<typeof xdr.ScVal.scvBytes>[0] {
  return bytes as Parameters<typeof xdr.ScVal.scvBytes>[0]
}

export async function ensureCctpDestinationReady(options: SubmitCctpMintAndForwardOptions & {
  readonly keypair?: ReturnType<typeof deriveWalletKeypair>
  readonly networkConfig?: ReturnType<typeof getNetworkConfig>
  readonly emit?: (message: string) => void
}): Promise<void> {
  await ensureStellarUsdcTrustline(options)
}

export async function ensureStellarUsdcTrustline(
  options: EnsureStellarUsdcTrustlineOptions,
): Promise<StellarUsdcTrustlineReport> {
  const network = options.networkConfig ?? getNetworkConfig(options.network)
  const usdc = network.assets.USDC
  const base = { network: options.network, userAddress: options.identity.stellarPublicKey } as const
  if (options.network !== 'testnet' || !usdc.issuer) {
    return { ...base, status: 'ready' }
  }

  const keypair = options.keypair ?? deriveWalletKeypair(options.identity.mnemonic)
  const horizon = (options.horizonFactory ?? defaultHorizonFactory)(network.horizonUrl)
  options.emit?.('Checking Stellar account and USDC trustline')
  const loaded = await loadOrFundHorizonAccount({
    horizon,
    publicKey: options.identity.stellarPublicKey,
    fetch: options.fetch,
    friendbotUrl: options.friendbotUrl,
    emit: options.emit,
  })
  let account = loaded.account

  if (hasTrustline(account, usdc.code, usdc.issuer)) {
    options.emit?.('Stellar USDC trustline ready')
    return { ...base, status: 'ready', friendbotHash: loaded.friendbotHash }
  }

  options.emit?.('Creating Stellar USDC trustline')
  const fee = await horizon.fetchBaseFee()
  const tx = new TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: network.passphrase,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(usdc.code, usdc.issuer) }))
    .setTimeout(classicTxTimeoutSeconds)
    .build()

  tx.sign(keypair)
  const result = await horizon.submitTransaction(tx)
  account = await horizon.loadAccount(options.identity.stellarPublicKey)
  if (!hasTrustline(account, usdc.code, usdc.issuer)) {
    throw new Error(`Stellar USDC trustline was not visible after changeTrust${result.hash ? ` (${result.hash})` : ''}.`)
  }
  options.emit?.('Stellar USDC trustline ready')
  return {
    ...base,
    status: 'created',
    txHash: result.hash,
    explorerUrl: result.hash ? `${network.explorerTxUrl}/${result.hash}` : undefined,
    friendbotHash: loaded.friendbotHash,
  }
}

async function loadOrFundHorizonAccount(options: {
  readonly horizon: CctpHorizonServer
  readonly publicKey: string
  readonly fetch?: typeof fetch
  readonly friendbotUrl?: string
  readonly emit?: (message: string) => void
}): Promise<{ readonly account: HorizonSourceAccount; readonly friendbotHash?: string }> {
  try {
    return { account: await options.horizon.loadAccount(options.publicKey) }
  } catch {
    const fetcher = options.fetch ?? globalThis.fetch
    if (!fetcher) {
      throw new Error(`Stellar account ${options.publicKey} is not funded, and Friendbot fetch is unavailable.`)
    }

    options.emit?.('Funding Stellar testnet account with Friendbot')
    const url = `${options.friendbotUrl ?? defaultFriendbotUrl}?addr=${encodeURIComponent(options.publicKey)}`
    const response = await fetcher(url, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`Friendbot funding failed with HTTP ${response.status}.`)
    }
    const body = await response.json().catch(() => undefined)
    const friendbotHash = isRecord(body) && typeof body.hash === 'string' ? body.hash : undefined
    return { account: await options.horizon.loadAccount(options.publicKey), friendbotHash }
  }
}

function hasTrustline(account: HorizonSourceAccount, code: string, issuer: string): boolean {
  return Boolean(
    account.balances?.some((balance) => balance.asset_code === code && balance.asset_issuer === issuer),
  )
}

function summarizeSimulationError(value: unknown): string {
  if (isRecord(value) && typeof value.error === 'string') {
    return value.error
  }
  if (isRecord(value) && typeof value.message === 'string') {
    return value.message
  }
  return 'simulation returned an error response.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function defaultServerFactory(rpcUrl: string): CctpSorobanServer {
  return new rpc.Server(rpcUrl) as unknown as CctpSorobanServer
}

function defaultHorizonFactory(horizonUrl: string): CctpHorizonServer {
  return new Horizon.Server(horizonUrl) as unknown as CctpHorizonServer
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

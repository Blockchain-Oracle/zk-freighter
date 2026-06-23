import {
  Address,
  Transaction,
  authorizeEntry,
  rpc,
  xdr,
} from '@stellar/stellar-sdk'
import { deriveWalletKeypair, type WalletIdentity } from './identity'
import { getNetworkConfig, type NetworkKey } from './networks'
import type { NethermindPreparedProverTx, PreparedSorobanTx } from './nethermind-runtime'

const authValidityLedgerBuffer = 100
const defaultConfirmationPolls = 30
const defaultPollIntervalMs = 1_000

export type SorobanSubmitStage = 'sign_auth' | 'sign_tx' | 'submit' | 'confirm'

export interface SorobanSubmitStatus {
  readonly stage: SorobanSubmitStage
  readonly message: string
  readonly current?: number
  readonly total?: number
}

export interface SorobanSubmitResult {
  readonly hash: string
  readonly signedAuthEntryCount: number
}

interface SorobanRpcServer {
  sendTransaction(transaction: Transaction): Promise<{ hash?: string; errorResultXdr?: unknown }>
  getTransaction(hash: string): Promise<{ status?: string; resultXdr?: unknown }>
  getLatestLedger(): Promise<{ sequence: number }>
}

export interface SubmitPreparedSorobanTxOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly onStatus?: (status: SorobanSubmitStatus) => void
  readonly serverFactory?: (rpcUrl: string) => SorobanRpcServer
  readonly sleep?: (ms: number) => Promise<void>
  readonly confirmationPolls?: number
  readonly pollIntervalMs?: number
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function defaultServerFactory(rpcUrl: string): SorobanRpcServer {
  return new rpc.Server(rpcUrl) as unknown as SorobanRpcServer
}

function optionalDetail(value: unknown): string {
  return value === undefined ? '' : ` (${String(value)})`
}

function getSorobanTx(value: PreparedSorobanTx | NethermindPreparedProverTx): PreparedSorobanTx {
  if ('sorobanTx' in value) {
    return value.sorobanTx
  }

  return value
}

function validatePreparedSorobanTx(prepared: PreparedSorobanTx): void {
  if (!prepared.txXdr || typeof prepared.txXdr !== 'string') {
    throw new Error('Invalid prepared txXdr')
  }

  if (!Array.isArray(prepared.authEntries)) {
    throw new Error('Invalid prepared authEntries')
  }
}

function addressCredentials(
  credentials: xdr.SorobanCredentials,
): xdr.SorobanAddressCredentials | undefined {
  const type = credentials.switch().value

  if (type === xdr.SorobanCredentialsType.sorobanCredentialsAddress().value) {
    return credentials.address()
  }

  if (type === xdr.SorobanCredentialsType.sorobanCredentialsAddressV2().value) {
    return credentials.addressV2()
  }

  if (type === xdr.SorobanCredentialsType.sorobanCredentialsAddressWithDelegates().value) {
    return credentials.addressWithDelegates().addressCredentials()
  }

  return undefined
}

function signatureIsEmpty(signature: xdr.ScVal): boolean {
  if (signature.switch().name === 'scvVoid') {
    return true
  }

  if (signature.switch().name !== 'scvVec') {
    return false
  }

  const values = signature.vec()
  return !values || values.length === 0
}

function needsWalletAuthEntry(entryXdr: string, address: string): boolean {
  const entry = xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, 'base64')
  const credentials = addressCredentials(entry.credentials())

  if (!credentials || !signatureIsEmpty(credentials.signature())) {
    return false
  }

  return Address.fromScAddress(credentials.address()).toString() === address
}

async function signPreparedAuthEntry(
  entryXdr: string,
  identity: WalletIdentity,
  networkPassphrase: string,
  latestLedger: number,
  server: SorobanRpcServer,
): Promise<string> {
  if (!needsWalletAuthEntry(entryXdr, identity.stellarPublicKey)) {
    return entryXdr
  }

  const entry = xdr.SorobanAuthorizationEntry.fromXDR(entryXdr, 'base64')
  const credentials = addressCredentials(entry.credentials())
  let validUntil = Number(credentials?.signatureExpirationLedger() ?? 0)

  if (!validUntil) {
    const ledger = latestLedger > 0 ? latestLedger : (await server.getLatestLedger()).sequence
    validUntil = ledger + authValidityLedgerBuffer
  }

  const signed = await authorizeEntry(
    entry,
    deriveWalletKeypair(identity.mnemonic),
    validUntil,
    networkPassphrase,
  )
  return signed.toXDR('base64')
}

function patchAuthEntries(txXdr: string, signedAuthEntries: readonly string[]): string {
  const envelope = xdr.TransactionEnvelope.fromXDR(txXdr, 'base64')
  const v1 = envelope.v1()

  if (!v1) {
    throw new Error('Unsupported transaction envelope; expected v1')
  }

  const authEntries = signedAuthEntries.map((entry) =>
    xdr.SorobanAuthorizationEntry.fromXDR(entry, 'base64'),
  )

  for (const operation of v1.tx().operations()) {
    const body = operation.body()
    if (body.switch().value !== xdr.OperationType.invokeHostFunction().value) {
      continue
    }

    body.invokeHostFunctionOp().auth(authEntries)
    return envelope.toXDR('base64')
  }

  throw new Error('No invokeHostFunction operation found to attach auth entries')
}

export function signTransactionXdrWithWallet(
  txXdr: string,
  identity: WalletIdentity,
  networkPassphrase: string,
): string {
  const transaction = new Transaction(txXdr, networkPassphrase)
  transaction.sign(deriveWalletKeypair(identity.mnemonic))
  return transaction.toEnvelope().toXDR('base64')
}

export async function submitPreparedSorobanTx(
  value: PreparedSorobanTx | NethermindPreparedProverTx,
  options: SubmitPreparedSorobanTxOptions,
): Promise<SorobanSubmitResult> {
  const prepared = getSorobanTx(value)
  validatePreparedSorobanTx(prepared)

  const network = getNetworkConfig(options.network)
  const server = (options.serverFactory ?? defaultServerFactory)(network.rpcUrl)
  const emit = (status: SorobanSubmitStatus) => options.onStatus?.(status)
  const signedAuthEntries: string[] = []
  let walletAuthStep = 0
  const walletAuthTotal = prepared.authEntries.filter((entry) =>
    needsWalletAuthEntry(entry, options.identity.stellarPublicKey),
  ).length

  for (const entryXdr of prepared.authEntries) {
    if (needsWalletAuthEntry(entryXdr, options.identity.stellarPublicKey)) {
      walletAuthStep += 1
      emit({
        stage: 'sign_auth',
        message: `Signing authorization ${walletAuthStep}/${walletAuthTotal}`,
        current: walletAuthStep,
        total: walletAuthTotal,
      })
    }

    signedAuthEntries.push(
      await signPreparedAuthEntry(
        entryXdr,
        options.identity,
        network.passphrase,
        prepared.latestLedger,
        server,
      ),
    )
  }

  const txXdr = walletAuthTotal > 0 ? patchAuthEntries(prepared.txXdr, signedAuthEntries) : prepared.txXdr
  emit({ stage: 'sign_tx', message: 'Signing transaction envelope' })
  const signedTxXdr = signTransactionXdrWithWallet(txXdr, options.identity, network.passphrase)

  emit({ stage: 'submit', message: 'Submitting transaction' })
  const send = await server.sendTransaction(new Transaction(signedTxXdr, network.passphrase))

  if (!send.hash) {
    const suffix = optionalDetail(send.errorResultXdr)
    throw new Error(`Transaction submission failed${suffix}`)
  }

  const sleep = options.sleep ?? defaultSleep
  const polls = options.confirmationPolls ?? defaultConfirmationPolls
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs

  for (let index = 0; index < polls; index += 1) {
    emit({ stage: 'confirm', message: 'Confirming transaction', current: index + 1, total: polls })
    await sleep(pollIntervalMs)
    const response = await server.getTransaction(send.hash)

    if (response.status === 'SUCCESS') {
      return { hash: send.hash, signedAuthEntryCount: walletAuthTotal }
    }

    if (response.status === 'FAILED') {
      const suffix = optionalDetail(response.resultXdr)
      throw new Error(`Transaction ${send.hash} failed${suffix}`)
    }
  }

  throw new Error(`Transaction confirmation timed out after ${polls} polls (${send.hash})`)
}

export function isPreparedProverTx(value: unknown): value is NethermindPreparedProverTx {
  return isRecord(value) && isRecord(value.sorobanTx)
}

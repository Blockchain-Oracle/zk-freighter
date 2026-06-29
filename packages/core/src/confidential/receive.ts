// Confidential-token RECEIVE half: a transfer recipient recovers the plaintext
// amount + blinding of an incoming C_tx from the emitted ciphertext, using their
// viewing key. Light module (no bb.js) — pure field/curve math.
//
// Diffie-Hellman symmetry is what makes this work: the sender computed the
// shared secret s_x = ecdh(r_e, PVK_B) = (r_e·vk_B·H).x; the recipient holds
// vk_B and the emitted R_e = r_e·H, so it recomputes the SAME x as
// ecdh(vk_B, R_e). From s_x + sigma it inverts the amount mask and re-derives
// the transfer blinding.

import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk'
import { getConfidentialConfig, getNetworkConfig, type NetworkKey } from './../networks'
import { afterReceive, loadConfidentialBalance, saveConfidentialBalance } from './balance-state'
import { appendIncomingHistory } from './incoming-history'
import { decryptAmount } from './encrypt'
import { fieldFrom32BE, pointFrom64BE } from './encoding'
import { grumpkinEcdhSharedX, type GrumpkinAffine } from './grumpkin'
import { deriveConfidentialSpendingKey, viewingKeyFromSpendingKey } from './keys'
import { deriveTxBlind } from './spend-primitives'
import type { WalletIdentity } from './../identity'

export interface IncomingTransfer {
  /// Recovered plaintext transfer amount (underlying base units).
  readonly amount: bigint
  /// Recovered Pedersen blinding of C_tx — needed to spend the funds after merge.
  readonly rTx: bigint
}

/**
 * Decrypt one incoming transfer's amount + blinding from its emitted ciphertext.
 * `secret` is the recipient's confidential secret (`identity.keyDerivationSignature`);
 * `rEPoint`, `vTilde`, `sigma` come from the transfer event / payload.
 */
export async function decryptIncomingTransfer(args: {
  readonly secret: Uint8Array
  readonly addrF: bigint
  readonly rEPoint: GrumpkinAffine
  readonly vTilde: bigint
  readonly sigma: bigint
}): Promise<IncomingTransfer> {
  const sk = deriveConfidentialSpendingKey(args.secret)
  const vk = await viewingKeyFromSpendingKey(sk, args.addrF)
  const sx = grumpkinEcdhSharedX(vk, args.rEPoint)
  const amount = await decryptAmount(args.vTilde, sx, args.sigma)
  const rTx = await deriveTxBlind(sx, args.sigma)
  return { amount, rTx }
}

/** Decode a transfer's recipient-channel ciphertext from raw 64/32-byte fields. */
export function decodeTransferCiphertext(rE: Uint8Array, vTilde: Uint8Array, sigma: Uint8Array): {
  rEPoint: GrumpkinAffine
  vTilde: bigint
  sigma: bigint
} {
  return { rEPoint: pointFrom64BE(rE), vTilde: fieldFrom32BE(vTilde), sigma: fieldFrom32BE(sigma) }
}

// ── Event scanning ──────────────────────────────────────────────────────────
// Persist which transfer events we've already credited (dedup) + how far we've
// scanned, so a re-scan is idempotent and never double-counts a receipt.

const SCAN_PREFIX = 'zkf:confidential:incoming:v1'
const DEFAULT_LOOKBACK_LEDGERS = 100_000 // ~ a few days of testnet retention

interface ScanState {
  readonly processed: string[] // event ids already credited
  readonly cursorLedger: number
}

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
function browserStore(): KeyValueStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}
const scanKey = (network: string, tokenId: string, account: string) => `${SCAN_PREFIX}:${network}:${tokenId}:${account}`

function loadScanState(store: KeyValueStore | null, key: string): ScanState {
  const raw = store?.getItem(key)
  if (!raw) return { processed: [], cursorLedger: 0 }
  try {
    return JSON.parse(raw) as ScanState
  } catch {
    return { processed: [], cursorLedger: 0 }
  }
}

export interface IncomingReceipt extends IncomingTransfer {
  readonly eventId: string
  readonly ledger: number
  readonly txHash: string
}

export interface ScanIncomingResult {
  readonly receipts: readonly IncomingReceipt[]
  /// Total newly-credited amount (base units) across this scan.
  readonly creditedTotal: bigint
}

interface ScanServer {
  getLatestLedger(): Promise<{ sequence: number }>
  getEvents(request: unknown): Promise<{ events: unknown[] }>
}

export interface ScanIncomingOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly serverFactory?: (rpcUrl: string) => ScanServer
  readonly store?: KeyValueStore | null
  readonly lookbackLedgers?: number
}

/**
 * Scan the token contract for `transfer` events addressed to this wallet, decrypt
 * each new one with the viewing key, and credit the recovered (amount, r_tx) into
 * the local receiving balance. Idempotent: already-credited events are skipped.
 */
export async function scanConfidentialIncoming(options: ScanIncomingOptions): Promise<ScanIncomingResult> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) return { receipts: [], creditedTotal: 0n }
  const networkConfig = getNetworkConfig(options.network)
  const account = options.identity.stellarPublicKey
  const store = options.store === undefined ? browserStore() : options.store
  const server = (options.serverFactory ?? ((url: string) => new rpc.Server(url) as unknown as ScanServer))(networkConfig.rpcUrl)

  const state = loadScanState(store, scanKey(options.network, confidential.tokenId, account))
  const latest = (await server.getLatestLedger()).sequence
  const lookback = options.lookbackLedgers ?? DEFAULT_LOOKBACK_LEDGERS
  const startLedger = Math.max(1, state.cursorLedger > 0 ? state.cursorLedger : latest - lookback)

  // Topic filter: ("transfer", from = *, to = me). A symbol-only filter matches
  // nothing — Soroban requires every topic segment (or a trailing `**`).
  const transferTopic = xdr.ScVal.scvSymbol('transfer').toXDR('base64')
  const toTopic = Address.fromString(account).toScVal().toXDR('base64')
  const filters = [{ type: 'contract', contractIds: [confidential.tokenId], topics: [[transferTopic, '*', toTopic]] }]
  const getFrom = (ledger: number) => server.getEvents({ startLedger: Math.max(1, Math.floor(ledger)), filters, limit: 200 })
  let events: unknown[]
  try {
    ;({ events } = await getFrom(startLedger))
  } catch (error) {
    // The RPC retention window moves; a stale cursor / too-old startLedger yields
    // -32600 with the valid range. Retry inside it rather than silently scanning nothing.
    const range = /(\d+)\s*-\s*(\d+)/.exec((error as { message?: string })?.message ?? '')
    if (!range) throw error
    const [min, max] = [Number(range[1]), Number(range[2])]
    ;({ events } = await getFrom(Math.max(min, max - lookback)))
  }

  const addrF = BigInt(`0x${confidential.addrFHex}`)
  const processed = new Set(state.processed)
  const receipts: IncomingReceipt[] = []
  let balance = loadConfidentialBalance(options.network, confidential.tokenId, account, store)

  for (const raw of events) {
    const event = raw as { id: string; ledger: number; txHash?: string; value: unknown }
    if (processed.has(event.id)) continue
    const data = scValToNative(toScVal(event.value)) as [Uint8Array, Uint8Array, Uint8Array]
    if (!Array.isArray(data) || data.length !== 3) continue
    const ct = decodeTransferCiphertext(data[0], data[1], data[2])
    const incoming = await decryptIncomingTransfer({ secret: options.identity.keyDerivationSignature, addrF, ...ct })
    if (incoming.amount <= 0n) continue // not for us / undecodable
    balance = afterReceive(balance, incoming.amount, incoming.rTx)
    processed.add(event.id)
    receipts.push({ ...incoming, eventId: event.id, ledger: event.ledger, txHash: event.txHash ?? '' })
  }

  if (receipts.length > 0) {
    saveConfidentialBalance(options.network, confidential.tokenId, account, balance, store)
    appendIncomingHistory(
      options.network,
      confidential.tokenId,
      account,
      receipts.map((receipt) => ({ amount: receipt.amount.toString(), ledger: receipt.ledger, txHash: receipt.txHash, eventId: receipt.eventId })),
      store,
    )
  }
  store?.setItem(
    scanKey(options.network, confidential.tokenId, account),
    JSON.stringify({ processed: [...processed], cursorLedger: latest } satisfies ScanState),
  )

  const creditedTotal = receipts.reduce((sum, receipt) => sum + receipt.amount, 0n)
  return { receipts, creditedTotal }
}

function toScVal(value: unknown): xdr.ScVal {
  if (typeof value === 'string') return xdr.ScVal.fromXDR(value, 'base64')
  return value as xdr.ScVal
}

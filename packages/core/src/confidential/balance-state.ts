// Local confidential-balance bookkeeping. To PROVE a withdraw/transfer the
// wallet must know the plaintext spendable value `v` and its blinding `r` — the
// chain only holds the commitment v·G + r·H. We can't recover r from chain (it's
// derived from vk + a per-op random sigma the wallet chooses), so the wallet
// tracks (v, r) itself across its own ops.
//
// Invariant tie to the contract (Pedersen commitments add homomorphically, so
//   commit(v_s,r_s) + commit(v_tx,r_tx) = commit(v_s+v_tx, r_s+r_tx) mod the
//   Grumpkin group order):
//   - deposit adds amount·G to RECEIVING (no blinding) → receiving.v += amount
//   - an incoming transfer adds commit(v_tx, r_tx) → receiving.{v,r} += {v_tx, r_tx}
//   - merge folds receiving into spendable → spendable.{v,r} += receiving.{v,r}
//   - withdraw/transfer replace spendable with commit(v−x, r') where r' = derive_spend_r
//
// This mirrors only the wallet's OWN operations + transfers it has decrypted via
// the receive path; cross-device sync is not handled here.

import { GRUMPKIN_ORDER } from './grumpkin'

const STORAGE_PREFIX = 'zkf:confidential:balance:v2'

const modOrder = (value: bigint): bigint => ((value % GRUMPKIN_ORDER) + GRUMPKIN_ORDER) % GRUMPKIN_ORDER

export interface CommitmentState {
  /** Plaintext value in underlying base units. */
  readonly v: bigint
  /** Pedersen blinding of the on-chain commitment (0 until a transfer/spend adds one). */
  readonly r: bigint
}
/** @deprecated alias kept for callers — spendable + receiving share this shape. */
export type SpendableState = CommitmentState

export interface ConfidentialBalance {
  readonly spendable: CommitmentState
  /** Funds (deposits + decrypted incoming transfers) awaiting a merge. */
  readonly receiving: CommitmentState
}

export const ZERO_BALANCE: ConfidentialBalance = { spendable: { v: 0n, r: 0n }, receiving: { v: 0n, r: 0n } }

/** A deposit of `amount` lands in the receiving balance (no blinding). */
export function afterDeposit(balance: ConfidentialBalance, amount: bigint): ConfidentialBalance {
  return { ...balance, receiving: { v: balance.receiving.v + amount, r: balance.receiving.r } }
}

/** A decrypted incoming transfer adds commit(v_tx, r_tx) to the receiving balance. */
export function afterReceive(balance: ConfidentialBalance, vTx: bigint, rTx: bigint): ConfidentialBalance {
  return { ...balance, receiving: { v: balance.receiving.v + vTx, r: modOrder(balance.receiving.r + rTx) } }
}

/** Merge folds receiving into spendable, summing both value and blinding. */
export function afterMerge(balance: ConfidentialBalance): ConfidentialBalance {
  return {
    spendable: { v: balance.spendable.v + balance.receiving.v, r: modOrder(balance.spendable.r + balance.receiving.r) },
    receiving: { v: 0n, r: 0n },
  }
}

/** A spend of `amount` (withdraw or outgoing transfer) re-blinds spendable to `newR`. */
export function afterSpend(balance: ConfidentialBalance, amount: bigint, newR: bigint): ConfidentialBalance {
  return { ...balance, spendable: { v: balance.spendable.v - amount, r: newR } }
}

export function serializeBalance(balance: ConfidentialBalance): string {
  const c = (s: CommitmentState) => ({ v: s.v.toString(), r: s.r.toString() })
  return JSON.stringify({ spendable: c(balance.spendable), receiving: c(balance.receiving) })
}

export function deserializeBalance(raw: string): ConfidentialBalance {
  const parsed = JSON.parse(raw) as {
    spendable: { v: string; r: string }
    receiving?: { v: string; r: string }
    receivingV?: string // v1 format
  }
  const receiving = parsed.receiving
    ? { v: BigInt(parsed.receiving.v), r: BigInt(parsed.receiving.r) }
    : { v: BigInt(parsed.receivingV ?? '0'), r: 0n }
  return { spendable: { v: BigInt(parsed.spendable.v), r: BigInt(parsed.spendable.r) }, receiving }
}

function storageKey(network: string, tokenId: string, account: string): string {
  return `${STORAGE_PREFIX}:${network}:${tokenId}:${account}`
}

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStore(): KeyValueStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

/** Load the wallet's tracked balance, defaulting to zero. */
export function loadConfidentialBalance(
  network: string,
  tokenId: string,
  account: string,
  store: KeyValueStore | null = browserStore(),
): ConfidentialBalance {
  const raw = store?.getItem(storageKey(network, tokenId, account))
  if (!raw) return ZERO_BALANCE
  try {
    return deserializeBalance(raw)
  } catch {
    return ZERO_BALANCE
  }
}

export function saveConfidentialBalance(
  network: string,
  tokenId: string,
  account: string,
  balance: ConfidentialBalance,
  store: KeyValueStore | null = browserStore(),
): void {
  store?.setItem(storageKey(network, tokenId, account), serializeBalance(balance))
}

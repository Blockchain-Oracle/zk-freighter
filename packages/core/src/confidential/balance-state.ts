// Local confidential-balance bookkeeping. To PROVE a withdraw/transfer the
// wallet must know the plaintext spendable value `v` and its blinding `r` — the
// chain only holds the commitment v·G + r·H. We can't recover r from chain (it's
// derived from vk + a per-op random sigma the wallet chooses), so the wallet
// tracks (v, r) itself across its own ops.
//
// Invariant tie to the contract:
//   - deposit adds amount·G to the RECEIVING balance (no blinding) → receivingV += amount
//   - merge folds receiving into spendable homomorphically, leaving r unchanged → v += receivingV
//   - withdraw/transfer replace spendable with commit(v−x, r') where r' = derive_spend_r(vk, sigma)
//
// This mirrors only the wallet's OWN operations. Incoming transfers (scanning +
// decrypting C_tx into receivingV) and cross-device sync are not handled here.

const STORAGE_PREFIX = 'zkf:confidential:balance:v1'

export interface SpendableState {
  /** Plaintext spendable value in underlying base units. */
  readonly v: bigint
  /** Pedersen blinding of the on-chain spendable commitment (0 until first spend). */
  readonly r: bigint
}

export interface ConfidentialBalance {
  readonly spendable: SpendableState
  /** Plaintext value sitting in the receiving balance, awaiting a merge. */
  readonly receivingV: bigint
}

export const ZERO_BALANCE: ConfidentialBalance = { spendable: { v: 0n, r: 0n }, receivingV: 0n }

/** A deposit of `amount` lands in the receiving balance (no blinding). */
export function afterDeposit(balance: ConfidentialBalance, amount: bigint): ConfidentialBalance {
  return { ...balance, receivingV: balance.receivingV + amount }
}

/** Merge folds the receiving value into spendable; the blinding `r` is preserved. */
export function afterMerge(balance: ConfidentialBalance): ConfidentialBalance {
  return {
    spendable: { v: balance.spendable.v + balance.receivingV, r: balance.spendable.r },
    receivingV: 0n,
  }
}

/** A spend of `amount` (withdraw or outgoing transfer) re-blinds spendable to `newR`. */
export function afterSpend(balance: ConfidentialBalance, amount: bigint, newR: bigint): ConfidentialBalance {
  return { ...balance, spendable: { v: balance.spendable.v - amount, r: newR } }
}

export function serializeBalance(balance: ConfidentialBalance): string {
  return JSON.stringify({
    spendable: { v: balance.spendable.v.toString(), r: balance.spendable.r.toString() },
    receivingV: balance.receivingV.toString(),
  })
}

export function deserializeBalance(raw: string): ConfidentialBalance {
  const parsed = JSON.parse(raw) as { spendable: { v: string; r: string }; receivingV: string }
  return {
    spendable: { v: BigInt(parsed.spendable.v), r: BigInt(parsed.spendable.r) },
    receivingV: BigInt(parsed.receivingV),
  }
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

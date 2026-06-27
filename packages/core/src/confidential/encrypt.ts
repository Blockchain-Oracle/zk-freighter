import { BN254_SCALAR_MODULUS } from '../bytes'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'
import { confidentialPoseidon2 } from './prover'

// Amount/balance encryption: an additive Poseidon2 mask over the BN254 scalar
// field. The mask key is an ECDH-derived shared value (s for transfer amounts, the
// viewing key vk for balances) plus the per-op nonce sigma — so the recipient and
// the two auditor channels can each recompute the mask and subtract it to recover
// plaintext, while it stays hidden on-chain. Pinned to the reference by KAT.

function mod(value: bigint): bigint {
  const reduced = value % BN254_SCALAR_MODULUS
  return reduced < 0n ? reduced + BN254_SCALAR_MODULUS : reduced
}

/** v_tilde = v_tx + Poseidon2(TX_AMOUNT, s, sigma). */
export async function encryptAmount(vTx: bigint, s: bigint, sigma: bigint): Promise<bigint> {
  return mod(vTx + (await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.TX_AMOUNT, s, sigma])))
}

/** v_tx = v_tilde - Poseidon2(TX_AMOUNT, s, sigma) — the recipient/auditor recovery. */
export async function decryptAmount(vTilde: bigint, s: bigint, sigma: bigint): Promise<bigint> {
  return mod(vTilde - (await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.TX_AMOUNT, s, sigma])))
}

/** b_tilde = v_new + Poseidon2(ENCRYPTED_BALANCE, vk, sigma). */
export async function encryptBalance(vNew: bigint, vk: bigint, sigma: bigint): Promise<bigint> {
  return mod(vNew + (await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.ENCRYPTED_BALANCE, vk, sigma])))
}

/** v_new = b_tilde - Poseidon2(ENCRYPTED_BALANCE, vk, sigma) — the balance recovery. */
export async function decryptBalance(bTilde: bigint, vk: bigint, sigma: bigint): Promise<bigint> {
  return mod(bTilde - (await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.ENCRYPTED_BALANCE, vk, sigma])))
}

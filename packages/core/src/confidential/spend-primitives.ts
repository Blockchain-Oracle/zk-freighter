// Deterministic blinding + auditor-mask primitives shared by the withdraw and
// transfer witness builders. Each mirrors a gadget in circuits/lib/src/lib.nr
// exactly (same domain tag, same Poseidon2), and is KAT-pinned against the
// circuit testdata in spend-primitives.test.ts.

import { BN254_SCALAR_MODULUS } from '../bytes'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'
import { confidentialPoseidon2, confidentialPoseidon2Permutation } from './prover'

// iv = (rate) * 2^64; the auditor sponge absorbs one rate-3 block.
const POSEIDON2_IV_BASE = 1n << 64n
const SPONGE_IV = 3n * POSEIDON2_IV_BASE

function mod(value: bigint): bigint {
  const reduced = value % BN254_SCALAR_MODULUS
  return reduced < 0n ? reduced + BN254_SCALAR_MODULUS : reduced
}

/** r' = Poseidon2(SPEND_RANDOMNESS, vk, sigma) — blinding for the new spendable balance. */
export async function deriveSpendR(vk: bigint, sigma: bigint): Promise<bigint> {
  return confidentialPoseidon2([CONFIDENTIAL_DOMAIN.SPEND_RANDOMNESS, vk, sigma])
}

/** r_tx = Poseidon2(TX_BLINDING, s, sigma) — ECDH-derived blinding for C_tx. */
export async function deriveTxBlind(s: bigint, sigma: bigint): Promise<bigint> {
  return confidentialPoseidon2([CONFIDENTIAL_DOMAIN.TX_BLINDING, s, sigma])
}

/** b_tilde_aud_s = v_new + Poseidon2(AUDITOR_SENDER, s_a_s_x, sigma) — single-squeeze sender checkpoint (withdraw). */
export async function encryptAuditorSenderBalance(vNew: bigint, sAS: bigint, sigma: bigint): Promise<bigint> {
  return mod(vNew + (await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.AUDITOR_SENDER, sAS, sigma])))
}

/**
 * SpongeSqueeze_2(d, s_x, sigma): one Poseidon2 permutation of (d, s_x, sigma, iv),
 * returning [state[0], state[1]] — the amount mask then the balance/randomness
 * mask. Used by transfer's recipient- and sender-auditor channels.
 */
export async function spongeSqueeze2(d: bigint, sx: bigint, sigma: bigint): Promise<[bigint, bigint]> {
  const state = await confidentialPoseidon2Permutation([d, sx, sigma, SPONGE_IV])
  return [state[0], state[1]]
}

export { CONFIDENTIAL_DOMAIN }

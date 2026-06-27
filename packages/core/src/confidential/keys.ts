import { sha512 } from '@noble/hashes/sha2.js'
import { concatBytes } from '@noble/hashes/utils.js'
import { GRUMPKIN_GENERATORS, GRUMPKIN_ORDER, grumpkinScalarMul, type GrumpkinAffine } from './grumpkin'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'
import { confidentialPoseidon2 } from './prover'

// Confidential-account key model (register circuit, design doc Section 7.2):
//   R1  Y   = sk * H                          spending public key
//   R2  vk  = Poseidon2(VIEWING_KEY, sk, addr_f)  contract-bound viewing key
//   R3  PVK = vk * H                          public viewing key
// The spending scalar sk is seed-derived here, domain-separated and reduced into
// the Grumpkin scalar field — fully isolated from the shielded pool's BN254
// note-keys (different curve, different domain prefix).

// Distinct domain prefix so the confidential spending key can never collide with
// any other seed-derived key material.
const CONFIDENTIAL_SPEND_DOMAIN = new TextEncoder().encode('zkf:confidential:spend:v1')

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let value = 0n
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte)
  }
  return value
}

export interface ConfidentialAccountKeys {
  readonly sk: bigint
  readonly Y: GrumpkinAffine
  readonly vk: bigint
  readonly PVK: GrumpkinAffine
}

/**
 * Seed-derived Grumpkin spending scalar. Hashes a domain-separated secret to 512
 * bits and reduces mod the curve order (bias negligible), guaranteeing a nonzero,
 * in-range scalar isolated from the BN254 note-key path.
 */
export function deriveConfidentialSpendingKey(secret: Uint8Array): bigint {
  const wide = sha512(concatBytes(CONFIDENTIAL_SPEND_DOMAIN, secret))
  const reduced = bytesToBigIntBE(wide) % GRUMPKIN_ORDER
  return reduced === 0n ? 1n : reduced
}

/** R1: spending public key Y = sk * H. */
export function spendingPublicKey(sk: bigint): GrumpkinAffine {
  return grumpkinScalarMul(sk, GRUMPKIN_GENERATORS.H)
}

/** R2: contract-bound viewing key vk = Poseidon2(VIEWING_KEY, sk, addr_f). */
export async function viewingKeyFromSpendingKey(sk: bigint, addrF: bigint): Promise<bigint> {
  return confidentialPoseidon2([CONFIDENTIAL_DOMAIN.VIEWING_KEY, sk, addrF])
}

/** R3: public viewing key PVK = vk * H (the recipient's long-term ECDH key). */
export function publicViewingKey(vk: bigint): GrumpkinAffine {
  return grumpkinScalarMul(vk, GRUMPKIN_GENERATORS.H)
}

/**
 * Full confidential account for a given token instance. `addrF` is the confidential
 * token contract address compressed to a field (Poseidon2(ADDRESS, lo, hi)) — it
 * binds the viewing key to that specific contract, so the same seed yields a
 * distinct vk/PVK per token.
 */
export async function deriveConfidentialAccount(secret: Uint8Array, addrF: bigint): Promise<ConfidentialAccountKeys> {
  const sk = deriveConfidentialSpendingKey(secret)
  const Y = spendingPublicKey(sk)
  const vk = await viewingKeyFromSpendingKey(sk, addrF)
  const PVK = publicViewingKey(vk)
  return { sk, Y, vk, PVK }
}

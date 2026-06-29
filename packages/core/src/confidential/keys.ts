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

// A Stellar strkey (G… account / C… contract) is 56 ASCII chars; the address is
// compressed to a single field as Poseidon2(ADDRESS, lo, hi) over two 28-byte
// little-endian limbs of that strkey. This MUST match the contract's on-chain
// `address_to_field` so a proof's addr_f equals the bound ContractField.
const STRKEY_LEN = 56
const STRKEY_LIMB_LEN = 28

function leBytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    value = (value << 8n) | BigInt(bytes[i])
  }
  return value
}

/**
 * Compress a Stellar address (strkey) into the BN254 field element used as a
 * confidential token's `addr_f` — the per-instance binding every proof commits
 * to. `Poseidon2(ADDRESS, lo, hi)` over the strkey's two little-endian 28-byte
 * limbs, mirroring the contract's on-chain derivation.
 */
export async function addressToField(address: string): Promise<bigint> {
  const buf = new TextEncoder().encode(address)
  if (buf.length !== STRKEY_LEN) {
    throw new Error(`expected a ${STRKEY_LEN}-char strkey, got ${buf.length}`)
  }
  const lo = leBytesToBigInt(buf.subarray(0, STRKEY_LIMB_LEN))
  const hi = leBytesToBigInt(buf.subarray(STRKEY_LIMB_LEN, STRKEY_LEN))
  return confidentialPoseidon2([CONFIDENTIAL_DOMAIN.ADDRESS, lo, hi])
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

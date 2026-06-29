// Field/point encoding + randomness shared by the proof-gated confidential ops.

import { xdr } from '@stellar/stellar-sdk'
import { BN254_SCALAR_MODULUS } from '../bytes'
import { GRUMPKIN_ORDER, type GrumpkinAffine } from './grumpkin'

const FIELD_BYTES = 32

/** Big-endian 32-byte encoding of a BN254 field element. */
export function fieldTo32BE(value: bigint): Uint8Array {
  let v = value
  const out = new Uint8Array(FIELD_BYTES)
  for (let i = FIELD_BYTES - 1; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

/** Grumpkin affine point as the contract's 64-byte `be(x) || be(y)` encoding. */
export function pointTo64BE(point: GrumpkinAffine): Uint8Array {
  const out = new Uint8Array(2 * FIELD_BYTES)
  out.set(fieldTo32BE(point.x), 0)
  out.set(fieldTo32BE(point.y), FIELD_BYTES)
  return out
}

/** Decode a 64-byte `be(x) || be(y)` blob (e.g. an auditor key) into an affine point. */
export function pointFrom64BE(bytes: Uint8Array): GrumpkinAffine {
  return {
    x: bytesToBigIntBE(bytes.subarray(0, FIELD_BYTES)),
    y: bytesToBigIntBE(bytes.subarray(FIELD_BYTES, 2 * FIELD_BYTES)),
  }
}

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)
  return value
}

// js-xdr's scvBytes takes a Uint8Array directly; the cast keeps us off the Node
// `Buffer` global (Vite externalizes it). Mirrors cctp-stellar.ts.
export function asScvBytes(bytes: Uint8Array): xdr.ScVal {
  return xdr.ScVal.scvBytes(bytes as Parameters<typeof xdr.ScVal.scvBytes>[0])
}

function randomFieldBytes(): bigint {
  const buf = new Uint8Array(FIELD_BYTES)
  globalThis.crypto.getRandomValues(buf)
  return bytesToBigIntBE(buf)
}

/** A uniformly random BN254 field element (per-op nonce `sigma`). */
export function randomSigma(): bigint {
  return randomFieldBytes() % BN254_SCALAR_MODULUS
}

/** A random NON-ZERO Grumpkin scalar (ephemeral `r_e`; r_e != 0 is asserted in-circuit). */
export function randomGrumpkinScalar(): bigint {
  const reduced = randomFieldBytes() % GRUMPKIN_ORDER
  return reduced === 0n ? 1n : reduced
}

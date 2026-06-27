import { weierstrass } from '@noble/curves/abstract/weierstrass.js'
import { BN254_SCALAR_MODULUS } from '../bytes'

// Grumpkin: y^2 = x^3 - 17. Its BASE field equals BN254's SCALAR field, and its
// ORDER equals BN254's BASE field (the BN254/Grumpkin 2-cycle). The confidential
// token uses Grumpkin for confidential-account keys + ECDH auditor channels.
// Independent reimplementation; pinned to the reference circuit by KAT.

const GRUMPKIN_BASE_FIELD = BN254_SCALAR_MODULUS
// BN254 base-field modulus = Grumpkin curve order. Spending/viewing scalars must be
// reduced into [1, GRUMPKIN_ORDER).
export const GRUMPKIN_ORDER = 21888242871839275222246405745257275088696311157297823662689037894645226208583n
const GRUMPKIN_B = GRUMPKIN_BASE_FIELD - 17n

export interface GrumpkinAffine {
  readonly x: bigint
  readonly y: bigint
}

/**
 * Barretenberg DEFAULT_DOMAIN_SEPARATOR Pedersen generators (indices 0, 1),
 * matching the reference circuit's `G` and `H`. No known discrete-log relation.
 */
export const GRUMPKIN_GENERATORS = {
  G: {
    x: 0x083e7911d835097629f0067531fc15cafd79a89beecb39903f69572c636f4a5an,
    y: 0x1a7f5efaad7f315c25a918f30cc8d7333fccab7ad7c90f14de81bcc528f9935dn,
  },
  H: {
    x: 0x054aa86a73cb8a34525e5bbed6e43ba1198e860f5f3950268f71df4591bde402n,
    y: 0x209dcfbf2cfb57f9f6046f44d71ac6faf87254afc7407c04eb621a6287cac126n,
  },
} as const satisfies Record<string, GrumpkinAffine>

const GrumpkinPoint = weierstrass({
  p: GRUMPKIN_BASE_FIELD,
  n: GRUMPKIN_ORDER,
  h: 1n,
  a: 0n,
  b: GRUMPKIN_B,
  Gx: GRUMPKIN_GENERATORS.G.x,
  Gy: GRUMPKIN_GENERATORS.G.y,
})

// fromAffine alone does not check membership in noble v2 — assert it explicitly so
// an off-curve point is rejected rather than silently producing garbage.
function toPoint(point: GrumpkinAffine) {
  const candidate = GrumpkinPoint.fromAffine({ x: point.x, y: point.y })
  candidate.assertValidity()
  return candidate
}

/** Scalar-multiply an on-curve Grumpkin point. Throws on an off-curve input. */
export function grumpkinScalarMul(scalar: bigint, point: GrumpkinAffine): GrumpkinAffine {
  const result = toPoint(point).multiply(scalar).toAffine()
  return { x: result.x, y: result.y }
}

/** ECDH shared-secret x-coordinate: (scalar * point).x. */
export function grumpkinEcdhSharedX(scalar: bigint, point: GrumpkinAffine): bigint {
  return grumpkinScalarMul(scalar, point).x
}

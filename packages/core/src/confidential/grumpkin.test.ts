import { describe, expect, it } from 'vitest'
import { GRUMPKIN_GENERATORS, grumpkinCommit, grumpkinEcdhSharedX, grumpkinScalarMul } from './grumpkin'

// Grumpkin is the curve whose base field is BN254's scalar field (y^2 = x^3 - 17).
// KAT from the reference circuit testdata (lib/testdata/ecdh.json), reproduced as a
// fixture. The reference is study-only; this pins our independent implementation.
describe('Grumpkin (BN254 embedded curve)', () => {
  it('matches the reference ECDH KAT: (0xfeedface * H).x', () => {
    const x = grumpkinEcdhSharedX(0xfeedfacen, GRUMPKIN_GENERATORS.H)
    expect(x).toBe(0x114ed4fcf2c57014eb678c577aa02f30ef590b713d7a6a5e87702d1c7f71957fn)
  })

  it('treats H as a valid on-curve generator: 1*H == H', () => {
    const oneH = grumpkinScalarMul(1n, GRUMPKIN_GENERATORS.H)
    expect(oneH).toEqual({ x: GRUMPKIN_GENERATORS.H.x, y: GRUMPKIN_GENERATORS.H.y })
  })

  it('rejects an off-curve point', () => {
    expect(() => grumpkinScalarMul(2n, { x: 1n, y: 1n })).toThrow()
  })

  it('matches the reference Pedersen commit KAT: 1000*G + 42*H', () => {
    const c = grumpkinCommit(0x3e8n, 0x2an)
    expect(c.x).toBe(0x195a5d8ecd032fe1696054b28f0852b5f03a613681991ace823245ab2f97ed05n)
    expect(c.y).toBe(0x0e67489ecfee0e581dce7db22a383c635886cfb616c3b3bb033bff0c46e9789en)
  })

  it('commits value 0 as randomness*H (zero scalar -> identity)', () => {
    expect(grumpkinCommit(0n, 5n)).toEqual(grumpkinScalarMul(5n, GRUMPKIN_GENERATORS.H))
  })
})

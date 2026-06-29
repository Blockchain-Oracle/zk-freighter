import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { deriveSpendR, deriveTxBlind, spongeSqueeze2 } from './spend-primitives'

// Pin the JS primitives to the circuit gadgets via the committed KAT vectors —
// any drift from circuits/lib would make a generated witness unsatisfiable.
function kat(name: string) {
  const path = fileURLToPath(new URL(`../../../../circuits/lib/testdata/${name}.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as { vectors: { inputs: Record<string, string>; output: string | string[] }[] }
}

describe('spend primitives match circuit KATs', () => {
  it('deriveTxBlind = Poseidon2(TX_BLINDING, s, sigma)', async () => {
    const { inputs, output } = kat('derive_tx_blind').vectors[0]
    const got = await deriveTxBlind(BigInt(inputs.s), BigInt(inputs.sigma))
    expect(got).toBe(BigInt(output as string))
  })

  it('deriveSpendR = Poseidon2(SPEND_RANDOMNESS, vk, sigma)', async () => {
    const { inputs, output } = kat('derive_spend_r').vectors[0]
    const got = await deriveSpendR(BigInt(inputs.vk), BigInt(inputs.sigma))
    expect(got).toBe(BigInt(output as string))
  })

  it('spongeSqueeze2 returns both masks for each auditor channel', async () => {
    for (const { inputs, output } of kat('sponge_squeeze_2').vectors) {
      const got = await spongeSqueeze2(BigInt(inputs.d), BigInt(inputs.s_x), BigInt(inputs.sigma))
      const expected = (output as string[]).map((value) => BigInt(value))
      expect(got).toEqual([expected[0], expected[1]])
    }
  })
})

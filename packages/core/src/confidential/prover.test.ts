import { describe, expect, it } from 'vitest'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'
import { confidentialPoseidon2 } from './prover'

// Confirms the bb.js-backed runtime produces circuit-identical Poseidon2 output:
// the reference vk_from_sk vector (Poseidon2(VIEWING_KEY, sk, wrap)). bb.js loads
// real WASM, hence the extended timeout.
describe('confidential bb-backed Poseidon2 (Noir-stdlib t4 sponge)', () => {
  it('matches the vk_from_sk KAT', async () => {
    const out = await confidentialPoseidon2([CONFIDENTIAL_DOMAIN.VIEWING_KEY, 0xdeadn, 0xbeefn])
    expect(out).toBe(0x208fbdb70d2faacf04f987b54f12aeeaeb432acc29d650c86ce0f6275b958eb8n)
  }, 60_000)
})

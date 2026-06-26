import { describe, expect, it } from 'vitest'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'

// The domain-separation tag values are a cross-language contract with the
// reference circuits (design doc Section 13) — pin them so a drift is caught.
describe('confidential domain-separation tags', () => {
  it('matches the design-doc Section 13 ordinals', () => {
    expect(CONFIDENTIAL_DOMAIN.ADDRESS).toBe(1n)
    expect(CONFIDENTIAL_DOMAIN.VIEWING_KEY).toBe(2n)
    expect(CONFIDENTIAL_DOMAIN.SPEND_RANDOMNESS).toBe(4n)
    expect(CONFIDENTIAL_DOMAIN.AUDITOR_SENDER).toBe(11n)
    expect(CONFIDENTIAL_DOMAIN.AUDITOR_RECIPIENT).toBe(12n)
  })
})

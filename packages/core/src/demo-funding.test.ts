import { describe, expect, it } from 'vitest'
import { requestDemoFunding } from './demo-funding'
import { deriveWalletIdentity } from './identity'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('demo funding', () => {
  it('does not expose demo funding on mainnet', async () => {
    const report = await requestDemoFunding({ identity: deriveWalletIdentity(mnemonic, 'mainnet'), network: 'mainnet' })
    expect(report.status).toBe('unavailable')
    expect(report.blockers[0]).toMatch(/testnet/i)
  })
})

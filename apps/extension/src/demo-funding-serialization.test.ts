import { describe, expect, it } from 'vitest'
import { serializeDemoFundingStatusReport } from './demo-funding-serialization'

describe('demo funding serialization', () => {
  it('converts bigint public balances into runtime-message-safe strings', () => {
    const report = serializeDemoFundingStatusReport({
      status: 'needs-funding',
      network: 'testnet',
      userAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      balances: {
        status: 'loaded',
        network: 'testnet',
        userAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        balances: { XLM: 1n, USDC: 2n },
      },
      blockers: ['needs USDC'],
    })

    expect(report.balances?.balances).toEqual({ XLM: '1', USDC: '2' })
    expect(() => JSON.stringify(report)).not.toThrow()
  })
})

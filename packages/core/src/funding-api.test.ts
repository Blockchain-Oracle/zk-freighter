import { describe, expect, it } from 'vitest'

import { requestHostedFunding } from './funding-api'

const address = 'GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ'

describe('funding api client', () => {
  it('reports offline hosted funding as unavailable instead of throwing', async () => {
    const report = await requestHostedFunding({
      network: 'testnet',
      address,
      fundingApiUrl: 'https://funding.invalid',
      fetch: async () => {
        throw new Error('connection refused')
      },
    })

    expect(report.status).toBe('unavailable')
    expect(report.blockers[0]).toContain('connection refused')
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('wxt/browser', () => ({
  browser: { storage: { local: { get: vi.fn(), set: vi.fn() } } },
}))

import type { DemoFundingRequestReport } from '@zk-fighter/core'
import { fundingTxEvidence } from './dappRuntime-flows'

const baseReport = {
  network: 'testnet',
  userAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  blockers: [],
} satisfies Pick<DemoFundingRequestReport, 'network' | 'userAddress' | 'blockers'>

describe('funding tx evidence', () => {
  it('records hosted funding hashes even when the final report is already ready', () => {
    const evidence = fundingTxEvidence({
      ...baseReport,
      status: 'ready',
      hostedFunding: {
        status: 'ready',
        network: 'testnet',
        userAddress: baseReport.userAddress,
        blockers: [],
        assets: [{ asset: 'USDC', status: 'ready', txHash: 'hosted-usdc', explorerUrl: 'https://stellar.expert/tx/hosted-usdc' }],
      },
    })

    expect(evidence).toEqual({ asset: 'USDC', txHash: 'hosted-usdc', explorerUrl: 'https://stellar.expert/tx/hosted-usdc' })
  })

  it('falls back to trustline transaction evidence', () => {
    const evidence = fundingTxEvidence({
      ...baseReport,
      status: 'funded',
      trustline: { status: 'created', network: 'testnet', userAddress: baseReport.userAddress, txHash: 'trustline-tx', explorerUrl: 'https://stellar.expert/tx/trustline-tx' },
      hostedFunding: { status: 'ready', network: 'testnet', userAddress: baseReport.userAddress, blockers: [], assets: [] },
    })

    expect(evidence).toEqual({ asset: 'USDC', txHash: 'trustline-tx', explorerUrl: 'https://stellar.expert/tx/trustline-tx' })
  })
})

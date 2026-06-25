import { describe, expect, it } from 'vitest'
import { usdcReceiveErrorText, usdcReceiveLabel } from './usdcReceiveSetupCopy'

describe('USDC receive setup copy', () => {
  it('uses plain user-facing labels for missing and created setup', () => {
    expect(usdcReceiveLabel(null)).toContain('receiving or bridging USDC')
    expect(usdcReceiveLabel({
      status: 'created',
      network: 'testnet',
      userAddress: 'GABC',
      txHash: 'a'.repeat(64),
    })).toContain('USDC receiving enabled')
  })

  it('maps low-level setup failures to plain copy', () => {
    expect(usdcReceiveErrorText(new Error('Stellar account GABC is not funded on mainnet.'))).toContain('Fund')
    expect(usdcReceiveErrorText(new Error('tx_insufficient_balance'))).toContain('0.5 XLM')
    expect(usdcReceiveErrorText(new Error('trustline was not visible after changeTrust'))).not.toContain('trustline')
  })
})

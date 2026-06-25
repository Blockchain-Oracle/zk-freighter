import { afterEach, describe, expect, it } from 'vitest'

import { postBridgeShieldAmountAtomic } from './cctp-bridge-source-flow.ts'
import { parseSourceKey } from './cctp-bridge-source-support.ts'
import { inspectStellarDestinationReadiness } from './stellar-destination-readiness.ts'

const originalSource = process.env.ZKF_CCTP_SOURCE

afterEach(() => {
  process.env.ZKF_CCTP_SOURCE = originalSource
})

describe('parseSourceKey', () => {
  it('uses the configured source key when valid', () => {
    process.env.ZKF_CCTP_SOURCE = 'arbitrum'

    expect(parseSourceKey('testnet')).toBe('arbitrum')
  })

  it('fails closed for an invalid configured source key', () => {
    process.env.ZKF_CCTP_SOURCE = 'arbitrum-sepolia'

    expect(() => parseSourceKey('testnet')).toThrow(/Invalid ZKF_CCTP_SOURCE/)
  })

  it('uses the network default only when the env var is absent', () => {
    delete process.env.ZKF_CCTP_SOURCE

    expect(parseSourceKey('testnet')).toBe('base')
  })
})

describe('inspectStellarDestinationReadiness', () => {
  it('blocks when the account is not funded', async () => {
    const report = await inspectStellarDestinationReadiness({
      destinationAddress: 'GDESTINATION',
      network: 'mainnet',
      fetcher: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    })

    expect(report.status).toBe('blocked')
    expect(report.hasAccount).toBe(false)
    expect(report.blockers.join(' ')).toContain('not funded')
  })

  it('blocks when the account has no USDC trustline', async () => {
    const report = await inspectStellarDestinationReadiness({
      destinationAddress: 'GDESTINATION',
      network: 'mainnet',
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ balances: [{ asset_type: 'native' }] }),
      }),
    })

    expect(report.status).toBe('blocked')
    expect(report.hasAccount).toBe(true)
    expect(report.hasUsdcTrustline).toBe(false)
  })

  it('passes when the account has a mainnet USDC trustline', async () => {
    const report = await inspectStellarDestinationReadiness({
      destinationAddress: 'GDESTINATION',
      network: 'mainnet',
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          balances: [{
            asset_code: 'USDC',
            asset_issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
          }],
        }),
      }),
    })

    expect(report.status).toBe('ready')
    expect(report.hasUsdcTrustline).toBe(true)
  })
})

describe('postBridgeShieldAmountAtomic', () => {
  it('shields the actual bridged USDC amount', () => {
    expect(postBridgeShieldAmountAtomic(1_000_000n)).toBe(1_000_000n)
  })
})

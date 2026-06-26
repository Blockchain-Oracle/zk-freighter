import { describe, expect, it } from 'vitest'
import { loadPublicStellarBalances } from './stellar-balance'

const address = 'GA3DTEST7AOO'
const testnetUsdcIssuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'

interface TestBalanceLine {
  asset_type: string
  balance: string
  asset_code?: string
  asset_issuer?: string
}

function horizonReturning(balances: readonly TestBalanceLine[]) {
  return () => ({
    loadAccount: async () => ({ balances }),
  })
}

describe('loadPublicStellarBalances', () => {
  it('loads native XLM and canonical USDC balances as 7-decimal stroops', async () => {
    const report = await loadPublicStellarBalances({
      address,
      network: 'testnet',
      horizonFactory: horizonReturning([
        { asset_type: 'native', balance: '85.0000000' },
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: testnetUsdcIssuer,
          balance: '50.0000000',
        },
      ]),
    })

    expect(report.status).toBe('loaded')
    expect(report.balances.XLM).toBe(850_000_000n)
    expect(report.balances.USDC).toBe(500_000_000n)
  })

  it('ignores a USDC line from a non-canonical issuer (anti-spoofing)', async () => {
    const report = await loadPublicStellarBalances({
      address,
      network: 'testnet',
      horizonFactory: horizonReturning([
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GSPOOFEDISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          balance: '999.0000000',
        },
      ]),
    })

    expect(report.status).toBe('loaded')
    expect(report.balances.USDC).toBe(0n)
  })

  it('reports unfunded with zero balances when the account is not found', async () => {
    const notFound = Object.assign(new Error('Not Found'), { response: { status: 404 } })
    const report = await loadPublicStellarBalances({
      address,
      network: 'testnet',
      horizonFactory: () => ({
        loadAccount: async () => {
          throw notFound
        },
      }),
    })

    expect(report.status).toBe('unfunded')
    expect(report.balances.XLM).toBe(0n)
    expect(report.balances.USDC).toBe(0n)
    expect(report.error).toBeUndefined()
  })

  it('reports failed (not zeroed) on a generic Horizon error', async () => {
    const report = await loadPublicStellarBalances({
      address,
      network: 'testnet',
      horizonFactory: () => ({
        loadAccount: async () => {
          throw new Error('horizon 500')
        },
      }),
    })

    expect(report.status).toBe('failed')
    expect(report.error).toContain('horizon 500')
  })
})

import { afterEach, describe, expect, it } from 'vitest'

import { getCctpSource } from '../packages/core/src/index.ts'
import { cctpUsdcAtomicToStellarStroops, postBridgeShieldAmountAtomic } from './cctp-bridge-source-flow.ts'
import {
  gasLimitForSourceTransaction,
  opApprovalGasLimit,
  opCctpBurnGasLimit,
  parseSourceKey,
} from './cctp-bridge-source-support.ts'
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
  it('converts bridged USDC atomics into Stellar stroops', () => {
    expect(postBridgeShieldAmountAtomic(1_000_000n)).toBe(10_000_000n)
    expect(cctpUsdcAtomicToStellarStroops(900_000n)).toBe(9_000_000n)
  })
})

describe('gasLimitForSourceTransaction', () => {
  it('uses OP gas fallbacks for approval and burn transactions', () => {
    const source = getCctpSource('testnet', 'optimism')
    expect(source).toBeDefined()

    expect(gasLimitForSourceTransaction({
      network: 'testnet',
      sourceKey: 'optimism',
      to: source!.usdcContract,
      source: source!,
    })).toBe(opApprovalGasLimit)
    expect(gasLimitForSourceTransaction({
      network: 'testnet',
      sourceKey: 'optimism',
      to: source!.tokenMessenger,
      source: source!,
    })).toBe(opCctpBurnGasLimit)
  })

  it('leaves non-OP routes on viem gas estimation by default', () => {
    const source = getCctpSource('testnet', 'arbitrum')
    expect(source).toBeDefined()

    expect(gasLimitForSourceTransaction({
      network: 'testnet',
      sourceKey: 'arbitrum',
      to: source!.usdcContract,
      source: source!,
    })).toBeUndefined()
  })

  it('keeps OP mainnet on estimation unless explicit limits are provided', () => {
    const source = getCctpSource('mainnet', 'optimism')
    expect(source).toBeDefined()

    expect(gasLimitForSourceTransaction({
      network: 'mainnet',
      sourceKey: 'optimism',
      to: source!.usdcContract,
      source: source!,
    })).toBeUndefined()
  })

  it('allows explicit gas overrides for any source route', () => {
    const source = getCctpSource('testnet', 'base')
    expect(source).toBeDefined()

    expect(gasLimitForSourceTransaction({
      network: 'testnet',
      sourceKey: 'base',
      to: source!.tokenMessenger,
      source: source!,
      burnGasLimit: 777_000n,
    })).toBe(777_000n)
  })
})

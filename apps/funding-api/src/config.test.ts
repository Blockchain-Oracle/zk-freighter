import { describe, expect, it } from 'vitest'

import { readConfig } from './config.js'

describe('funding API config', () => {
  it('treats blank optional env values as missing', () => {
    const config = readConfig({
      PORT: '',
      DATABASE_URL: '',
      ZKF_TESTNET_FUNDER_SECRET: '',
      STELLAR_TESTNET_FUNDER_SECRET: '',
      ZKF_TESTNET_FUND_XLM: '',
      ZKF_TESTNET_FUND_USDC: '',
    })

    expect(config.port).toBe(8787)
    expect(config.databaseUrl).toBeUndefined()
    expect(config.funderSecret).toBeUndefined()
    expect(config.xlmAmountStroops).toBe(250_000_000n)
    expect(config.usdcAmountStroops).toBe(50_000_000n)
  })

  it('accepts explicit funding and rate-limit values', () => {
    const config = readConfig({
      PORT: '9001',
      DATABASE_URL: 'postgres://db.example/zkf',
      STELLAR_TESTNET_FUNDER_SECRET: 'SA_TEST_ONLY',
      ZKF_TESTNET_FUND_XLM: '1.5',
      ZKF_TESTNET_FUND_USDC: '2',
      ZKF_FUNDING_ADDRESS_WINDOW_MS: '1000',
      ZKF_FUNDING_IP_WINDOW_MS: '2000',
      ZKF_FUNDING_ADDRESS_LIMIT: '4',
      ZKF_FUNDING_IP_LIMIT: '5',
    })

    expect(config).toMatchObject({
      port: 9001,
      databaseUrl: 'postgres://db.example/zkf',
      funderSecret: 'SA_TEST_ONLY',
      xlmAmountStroops: 15_000_000n,
      usdcAmountStroops: 20_000_000n,
      addressWindowMs: 1000,
      ipWindowMs: 2000,
      addressLimit: 4,
      ipLimit: 5,
    })
  })
})

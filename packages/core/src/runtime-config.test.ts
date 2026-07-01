import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveRuntimeEndpoints } from './runtime-config'

describe('resolveRuntimeEndpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses localhost funding and bootnode endpoints for local testnet builds', () => {
    vi.stubGlobal('location', { hostname: 'localhost' })

    expect(resolveRuntimeEndpoints('testnet', {})).toEqual({
      fundingApiUrl: 'http://127.0.0.1:8787',
      bootnodeUrl: 'http://127.0.0.1:8788/rpc',
    })
  })

  it('trims configured endpoint URLs', () => {
    expect(resolveRuntimeEndpoints('testnet', {
      VITE_ZKF_TESTNET_FUNDING_API_URL: 'https://api.example.test/',
      VITE_ZKF_TESTNET_BOOTNODE_URL: 'https://boot.example.test/rpc/',
    })).toEqual({
      fundingApiUrl: 'https://api.example.test',
      bootnodeUrl: 'https://boot.example.test/rpc',
    })
  })

  it('uses the local mainnet bootnode endpoint without enabling mainnet funding', () => {
    vi.stubGlobal('location', { hostname: 'localhost' })

    expect(resolveRuntimeEndpoints('mainnet', {})).toEqual({
      bootnodeUrl: 'http://127.0.0.1:8789/rpc',
      fundingApiUrl: undefined,
    })
  })
})

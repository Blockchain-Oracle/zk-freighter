import { describe, expect, it } from 'vitest'

import {
  freighterNetworkDetails,
  freighterRequestSource,
  freighterResponseSource,
  freighterServiceTypes,
  zkFreighterRequestSource,
  zkFreighterResponseSource,
} from './dapp-bridge'

describe('dApp bridge constants', () => {
  it('keeps ZK Freighter and Freighter message sources distinct', () => {
    expect(zkFreighterRequestSource).toBe('ZKFIGHTER_EXTENSION_REQUEST')
    expect(zkFreighterResponseSource).toBe('ZKFIGHTER_EXTENSION_RESPONSE')
    expect(freighterRequestSource).toBe('FREIGHTER_EXTERNAL_MSG_REQUEST')
    expect(freighterResponseSource).toBe('FREIGHTER_EXTERNAL_MSG_RESPONSE')
  })
})

describe('Freighter-style detection constants', () => {
  it('returns testnet network details with the exact Stellar passphrase', () => {
    const details = freighterNetworkDetails('testnet')

    expect(details).toMatchObject({
      network: 'TESTNET',
      networkName: 'Test Net',
      networkPassphrase: 'Test SDF Network ; September 2015',
      networkUrl: 'https://horizon-testnet.stellar.org',
      sorobanRpcUrl: 'https://soroban-testnet.stellar.org/',
    })
  })

  it('returns mainnet network details without enabling mainnet shield claims', () => {
    const details = freighterNetworkDetails('mainnet')

    expect(details).toMatchObject({
      network: 'PUBLIC',
      networkName: 'Main Net',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    })
    expect(details).not.toHaveProperty('friendbotUrl')
  })

  it('knows current Freighter-style signing message types', () => {
    expect(freighterServiceTypes.submitAuthEntry).toBe('SUBMIT_AUTH_ENTRY')
    expect(freighterServiceTypes.submitBlob).toBe('SUBMIT_BLOB')
  })
})

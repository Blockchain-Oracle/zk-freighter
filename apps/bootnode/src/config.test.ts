import { describe, expect, it } from 'vitest'

import { NETWORKS } from '@zk-fighter/core'
import { readConfig } from './config.js'

describe('bootnode config', () => {
  it('falls back to configured network RPC when env overrides are blank', () => {
    const config = readConfig({
      PORT: '',
      DATABASE_URL: '',
      ZKF_BOOTNODE_NETWORK: 'testnet',
      ZKF_BOOTNODE_UPSTREAM_RPC_URL: '',
      ZKF_BOOTNODE_ALLOWED_CONTRACTS: '',
    })

    expect(config.port).toBe(8788)
    expect(config.databaseUrl).toBeUndefined()
    expect(config.upstreamRpcUrl).toBe(NETWORKS.testnet.rpcUrl)
    expect(config.allowedContracts).toEqual([
      NETWORKS.testnet.assets.XLM.poolId,
      NETWORKS.testnet.assets.USDC.poolId,
    ])
  })

  it('accepts explicit port, upstream, and contract allowlist values', () => {
    const config = readConfig({
      PORT: '9000',
      DATABASE_URL: 'postgres://db.example/zkf',
      ZKF_BOOTNODE_NETWORK: 'mainnet',
      ZKF_BOOTNODE_UPSTREAM_RPC_URL: 'https://rpc.example',
      ZKF_BOOTNODE_ALLOWED_CONTRACTS: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA, CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    })

    expect(config).toMatchObject({
      port: 9000,
      databaseUrl: 'postgres://db.example/zkf',
      upstreamRpcUrl: 'https://rpc.example',
      network: 'mainnet',
      allowedContracts: [
        'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      ],
    })
  })
})

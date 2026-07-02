import { describe, expect, it } from 'vitest'

import { NETWORKS, privateAspMembershipContractId } from '@zk-freighter/core'
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
      privateAspMembershipContractId('testnet'),
    ])
    expect(config.indexerStartLedger).toBe(3_368_685)
    expect(config.indexerEnabled).toBe(true)
  })

  it('accepts explicit port, upstream, and contract allowlist values', () => {
    const config = readConfig({
      PORT: '9000',
      DATABASE_URL: 'postgres://db.example/zkf',
      ZKF_BOOTNODE_NETWORK: 'mainnet',
      ZKF_BOOTNODE_UPSTREAM_RPC_URL: 'https://rpc.example',
      ZKF_BOOTNODE_ALLOWED_CONTRACTS: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA, CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      ZKF_BOOTNODE_START_LEDGER: '63191069',
      ZKF_BOOTNODE_PAGE_SIZE: '50',
      ZKF_BOOTNODE_MAX_PAGES_PER_ROUND: '3',
      ZKF_BOOTNODE_INDEXER_INTERVAL_MS: '5000',
      ZKF_BOOTNODE_INDEXER_ENABLED: 'false',
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
      indexerStartLedger: 63191069,
      indexerPageSize: 50,
      indexerMaxPagesPerRound: 3,
      indexerIntervalMs: 5000,
      indexerEnabled: false,
    })
  })

  it('does not enable mainnet warming by default against the short-window public RPC', () => {
    const config = readConfig({
      PORT: '8789',
      ZKF_BOOTNODE_NETWORK: 'mainnet',
      ZKF_BOOTNODE_UPSTREAM_RPC_URL: '',
    })

    expect(config.network).toBe('mainnet')
    expect(config.indexerStartLedger).toBe(63_190_069)
    expect(config.indexerEnabled).toBe(false)
  })

  it('enables mainnet warming when an explicit upstream is provided', () => {
    const config = readConfig({
      ZKF_BOOTNODE_NETWORK: 'mainnet',
      ZKF_BOOTNODE_UPSTREAM_RPC_URL: 'https://archive-rpc.example',
    })

    expect(config.indexerEnabled).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { NETWORKS, getCctpSource, getEnabledCctpSources, getNetworkConfig, isShieldedAssetEnabled, maxShieldDepositStroops } from './networks'
import { privateEventContractIds } from './privacy-contracts'

describe('NETWORKS', () => {
  it('records verified testnet and mainnet SAC IDs', () => {
    expect(NETWORKS.testnet.assets.XLM.sacId).toBe(
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    )
    expect(NETWORKS.testnet.assets.USDC.sacId).toBe(
      'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    )
    expect(NETWORKS.mainnet.assets.XLM.sacId).toBe(
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
    )
    expect(NETWORKS.mainnet.assets.USDC.sacId).toBe(
      'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
    )
  })

  it('uses explicit RPC URLs for both configured networks', () => {
    expect(getNetworkConfig('testnet').rpcUrl).toBe('https://soroban-testnet.stellar.org/')
    expect(getNetworkConfig('testnet').horizonUrl).toBe('https://horizon-testnet.stellar.org')
    expect(getNetworkConfig('mainnet').rpcUrl).toBe('https://mainnet.sorobanrpc.com')
    expect(getNetworkConfig('mainnet').horizonUrl).toBe('https://horizon.stellar.org')
  })

  it('gates shielded assets until pools are proven', () => {
    expect(isShieldedAssetEnabled('testnet', 'XLM')).toBe(true)
    expect(isShieldedAssetEnabled('testnet', 'USDC')).toBe(true)
    expect(NETWORKS.testnet.assets.USDC.poolId).toBe(
      'CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK',
    )
    expect(isShieldedAssetEnabled('mainnet', 'XLM')).toBe(true)
    expect(isShieldedAssetEnabled('mainnet', 'USDC')).toBe(true)
    expect(NETWORKS.mainnet.assets.XLM.poolId).toBe(
      'CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE',
    )
    expect(NETWORKS.mainnet.assets.USDC.poolId).toBe(
      'CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7',
    )
  })

  it('records private event contract sets for bootnode indexing', () => {
    expect(privateEventContractIds('testnet')).toEqual([
      NETWORKS.testnet.assets.XLM.poolId,
      NETWORKS.testnet.assets.USDC.poolId,
      'CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2',
    ])
    expect(privateEventContractIds('mainnet')).toEqual([
      NETWORKS.mainnet.assets.XLM.poolId,
      NETWORKS.mainnet.assets.USDC.poolId,
      'CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP',
    ])
  })

  it('records the deployed pool per-deposit limits', () => {
    expect(maxShieldDepositStroops('testnet', 'XLM')).toBe(1_000_000_000n)
    expect(maxShieldDepositStroops('testnet', 'USDC')).toBe(1_000_000_000n)
    expect(maxShieldDepositStroops('mainnet', 'XLM')).toBe(1_000_000_000n)
    expect(maxShieldDepositStroops('mainnet', 'USDC')).toBe(1_000_000_000n)
  })

  it('records current Stellar CCTP V2 config', () => {
    expect(NETWORKS.testnet.cctp?.domain).toBe(27)
    expect(NETWORKS.testnet.cctp?.tokenMessengerMinter).toBe(
      'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
    )
    expect(NETWORKS.testnet.cctp?.messageTransmitter).toBe(
      'CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY',
    )
    expect(NETWORKS.testnet.cctp?.cctpForwarder).toBe(
      'CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ',
    )
    expect(NETWORKS.testnet.cctp?.defaultSource).toBe('base')
    expect(NETWORKS.mainnet.cctp?.defaultSource).toBe('base')
  })

  it('records verified EVM CCTP source chains', () => {
    expect(getEnabledCctpSources('testnet').map((source) => source.key)).toEqual([
      'base',
      'optimism',
      'ethereum',
      'arbitrum',
    ])
    expect(getEnabledCctpSources('mainnet').map((source) => source.key)).toEqual([
      'base',
      'optimism',
      'ethereum',
      'arbitrum',
    ])
    expect(getCctpSource('testnet', 'ethereum')?.domain).toBe(0)
    expect(getCctpSource('testnet', 'ethereum')?.chainIdHex).toBe('0xaa36a7')
    expect(getCctpSource('testnet', 'base')?.domain).toBe(6)
    expect(getCctpSource('testnet', 'base')?.chainIdHex).toBe('0x14a34')
    expect(getCctpSource('testnet', 'arbitrum')?.usdcContract).toBe('0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d')
    expect(getCctpSource('testnet', 'optimism')?.chainIdHex).toBe('0xaa37dc')
    expect(getCctpSource('mainnet', 'ethereum')?.usdcContract).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
    expect(getCctpSource('mainnet', 'base')?.usdcContract).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(getCctpSource('mainnet', 'arbitrum')?.chainIdHex).toBe('0xa4b1')
    expect(getCctpSource('mainnet', 'optimism')?.domain).toBe(2)
  })
})

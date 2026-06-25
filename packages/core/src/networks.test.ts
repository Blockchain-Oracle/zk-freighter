import { describe, expect, it } from 'vitest'
import { NETWORKS, getNetworkConfig, isShieldedAssetEnabled } from './networks'

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
      'CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY',
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

  it('records current CCTP V2 testnet bridge config', () => {
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
    expect(NETWORKS.testnet.cctp?.evmSource?.domain).toBe(0)
    expect(NETWORKS.testnet.cctp?.evmSource?.chainIdHex).toBe('0xaa36a7')
    expect(NETWORKS.testnet.cctp?.evmSource?.usdcContract).toBe('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')
    expect(NETWORKS.mainnet.cctp?.evmSource?.domain).toBe(0)
    expect(NETWORKS.mainnet.cctp?.evmSource?.chainIdHex).toBe('0x1')
    expect(NETWORKS.mainnet.cctp?.evmSource?.usdcContract).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
    expect(NETWORKS.mainnet.cctp?.evmSource?.tokenMessenger).toBe('0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d')
    expect(NETWORKS.mainnet.cctp?.evmSource?.messageTransmitter).toBe('0x81D40F21F12A8F0E3252Bccb954D722d4c464B64')
  })
})

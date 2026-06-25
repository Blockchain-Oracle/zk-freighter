import type { AssetCode } from './assets'

export type NetworkKey = 'testnet' | 'mainnet'
export type CctpSourceKey = 'ethereum' | 'base' | 'arbitrum' | 'optimism'

export type FeatureGate = 'enabled' | 'disabled' | 'pending-deployment'

export interface EvmCctpSourceConfig {
  readonly key: CctpSourceKey
  readonly label: string
  readonly domain: number
  readonly chainId: number
  readonly chainIdHex: string
  readonly gasToken: string
  readonly usdcContract: string
  readonly tokenMessenger: string
  readonly messageTransmitter: string
  readonly explorerTxUrl: string
}

export interface NetworkAssetConfig {
  readonly code: AssetCode
  readonly issuer?: string
  readonly sacId: string
  readonly poolId?: string
  readonly shieldedPool: FeatureGate
}

export interface CctpConfig {
  readonly domain: number
  readonly irisUrl: string
  readonly tokenMessengerMinter?: string
  readonly messageTransmitter?: string
  readonly cctpForwarder?: string
  readonly defaultSource: CctpSourceKey
  readonly evmSources: Record<CctpSourceKey, EvmCctpSourceConfig>
}

export interface NetworkConfig {
  readonly key: NetworkKey
  readonly label: string
  readonly passphrase: string
  readonly rpcUrl: string
  readonly horizonUrl: string
  readonly explorerTxUrl: string
  readonly assets: Record<AssetCode, NetworkAssetConfig>
  readonly cctp?: CctpConfig
}

export const NETWORKS = {
  testnet: {
    key: 'testnet',
    label: 'Stellar Testnet',
    passphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org/',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    explorerTxUrl: 'https://stellar.expert/explorer/testnet/tx',
    assets: {
      XLM: {
        code: 'XLM',
        sacId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        poolId: 'CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY',
        shieldedPool: 'enabled',
      },
      USDC: {
        code: 'USDC',
        issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        sacId: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        poolId: 'CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY',
        shieldedPool: 'enabled',
      },
    },
    cctp: {
      domain: 27,
      irisUrl: 'https://iris-api-sandbox.circle.com',
      tokenMessengerMinter: 'CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP',
      messageTransmitter: 'CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY',
      cctpForwarder: 'CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ',
      defaultSource: 'base',
      evmSources: {
        ethereum: {
          key: 'ethereum',
          label: 'Ethereum Sepolia',
          domain: 0,
          chainId: 11155111,
          chainIdHex: '0xaa36a7',
          gasToken: 'Sepolia ETH',
          usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
          messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
          explorerTxUrl: 'https://sepolia.etherscan.io/tx',
        },
        base: {
          key: 'base',
          label: 'Base Sepolia',
          domain: 6,
          chainId: 84532,
          chainIdHex: '0x14a34',
          gasToken: 'Base Sepolia ETH',
          usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
          messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
          explorerTxUrl: 'https://sepolia.basescan.org/tx',
        },
        arbitrum: {
          key: 'arbitrum',
          label: 'Arbitrum Sepolia',
          domain: 3,
          chainId: 421614,
          chainIdHex: '0x66eee',
          gasToken: 'Arbitrum Sepolia ETH',
          usdcContract: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
          tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
          messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
          explorerTxUrl: 'https://sepolia.arbiscan.io/tx',
        },
        optimism: {
          key: 'optimism',
          label: 'OP Sepolia',
          domain: 2,
          chainId: 11155420,
          chainIdHex: '0xaa37dc',
          gasToken: 'OP Sepolia ETH',
          usdcContract: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
          tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
          messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
          explorerTxUrl: 'https://sepolia-optimism.etherscan.io/tx',
        },
      },
    },
  },
  mainnet: {
    key: 'mainnet',
    label: 'Stellar Mainnet',
    passphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    horizonUrl: 'https://horizon.stellar.org',
    explorerTxUrl: 'https://stellar.expert/explorer/public/tx',
    assets: {
      XLM: {
        code: 'XLM',
        sacId: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
        poolId: 'CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE',
        shieldedPool: 'enabled',
      },
      USDC: {
        code: 'USDC',
        issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
        sacId: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
        poolId: 'CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7',
        shieldedPool: 'enabled',
      },
    },
    cctp: {
      domain: 27,
      irisUrl: 'https://iris-api.circle.com',
      tokenMessengerMinter: 'CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL',
      messageTransmitter: 'CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV',
      cctpForwarder: 'CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T',
      defaultSource: 'base',
      evmSources: {
        ethereum: {
          key: 'ethereum',
          label: 'Ethereum',
          domain: 0,
          chainId: 1,
          chainIdHex: '0x1',
          gasToken: 'ETH',
          usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
          messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
          explorerTxUrl: 'https://etherscan.io/tx',
        },
        base: {
          key: 'base',
          label: 'Base',
          domain: 6,
          chainId: 8453,
          chainIdHex: '0x2105',
          gasToken: 'ETH',
          usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
          messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
          explorerTxUrl: 'https://basescan.org/tx',
        },
        arbitrum: {
          key: 'arbitrum',
          label: 'Arbitrum One',
          domain: 3,
          chainId: 42161,
          chainIdHex: '0xa4b1',
          gasToken: 'ETH',
          usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
          messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
          explorerTxUrl: 'https://arbiscan.io/tx',
        },
        optimism: {
          key: 'optimism',
          label: 'OP Mainnet',
          domain: 2,
          chainId: 10,
          chainIdHex: '0xa',
          gasToken: 'ETH',
          usdcContract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
          tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
          messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
          explorerTxUrl: 'https://optimistic.etherscan.io/tx',
        },
      },
    },
  },
} as const satisfies Record<NetworkKey, NetworkConfig>

export function getNetworkConfig(key: NetworkKey): NetworkConfig {
  return NETWORKS[key]
}

export function getDefaultCctpSource(network: NetworkKey): EvmCctpSourceConfig | undefined {
  const cctp = NETWORKS[network].cctp
  return cctp ? cctp.evmSources[cctp.defaultSource] : undefined
}

export function getCctpSource(
  network: NetworkKey,
  sourceKey?: CctpSourceKey,
): EvmCctpSourceConfig | undefined {
  const cctp = NETWORKS[network].cctp
  const key = sourceKey ?? cctp?.defaultSource
  return key && cctp ? cctp.evmSources[key] : undefined
}

export function getEnabledCctpSources(network: NetworkKey): readonly EvmCctpSourceConfig[] {
  const cctp = NETWORKS[network].cctp
  return cctp ? Object.values(cctp.evmSources) : []
}

export function isCctpSourceKey(value: string | undefined): value is CctpSourceKey {
  return value === 'ethereum' || value === 'base' || value === 'arbitrum' || value === 'optimism'
}

export function isShieldedAssetEnabled(network: NetworkKey, asset: AssetCode): boolean {
  return NETWORKS[network].assets[asset].shieldedPool === 'enabled'
}

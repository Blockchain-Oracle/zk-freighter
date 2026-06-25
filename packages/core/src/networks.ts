import type { AssetCode } from './assets'

export type NetworkKey = 'testnet' | 'mainnet'

export type FeatureGate = 'enabled' | 'disabled' | 'pending-deployment'

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
  readonly evmSource?: {
    readonly label: string
    readonly domain: number
    readonly chainId: number
    readonly chainIdHex: string
    readonly usdcContract: string
    readonly tokenMessenger: string
    readonly messageTransmitter: string
    readonly explorerTxUrl: string
  }
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
      evmSource: {
        label: 'Ethereum Sepolia',
        domain: 0,
        chainId: 11155111,
        chainIdHex: '0xaa36a7',
        usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
        messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
        explorerTxUrl: 'https://sepolia.etherscan.io/tx',
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
      evmSource: {
        label: 'Ethereum',
        domain: 0,
        chainId: 1,
        chainIdHex: '0x1',
        usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
        messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
        explorerTxUrl: 'https://etherscan.io/tx',
      },
    },
  },
} as const satisfies Record<NetworkKey, NetworkConfig>

export function getNetworkConfig(key: NetworkKey): NetworkConfig {
  return NETWORKS[key]
}

export function isShieldedAssetEnabled(network: NetworkKey, asset: AssetCode): boolean {
  return NETWORKS[network].assets[asset].shieldedPool === 'enabled'
}

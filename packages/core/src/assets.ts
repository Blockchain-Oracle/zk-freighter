export type AssetCode = 'XLM' | 'USDC'

export type AssetKind = 'native' | 'stellar-classic'

export interface AssetConfig {
  readonly code: AssetCode
  readonly kind: AssetKind
  readonly displayName: string
  readonly decimals: number
}

export const SUPPORTED_ASSETS = {
  XLM: {
    code: 'XLM',
    kind: 'native',
    displayName: 'Stellar Lumens',
    decimals: 7,
  },
  USDC: {
    code: 'USDC',
    kind: 'stellar-classic',
    displayName: 'USD Coin',
    decimals: 7,
  },
} as const satisfies Record<AssetCode, AssetConfig>

export function getAssetConfig(code: AssetCode): AssetConfig {
  return SUPPORTED_ASSETS[code]
}

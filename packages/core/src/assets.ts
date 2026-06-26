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
    // 7 decimals is correct for USDC as a Stellar classic asset (every Stellar asset
    // uses 7 dp / stroops). This intentionally differs from USDC's 6 decimals on EVM
    // chains — do not "fix" it to 6.
    decimals: 7,
  },
} as const satisfies Record<AssetCode, AssetConfig>

export function getAssetConfig(code: AssetCode): AssetConfig {
  return SUPPORTED_ASSETS[code]
}

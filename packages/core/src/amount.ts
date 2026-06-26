import { getAssetConfig, type AssetCode } from './assets'

export type ParseAmountResult =
  | { readonly ok: true; readonly stroops: bigint }
  | { readonly ok: false; readonly error: string }

/**
 * Parses a user-entered decimal amount into integer stroops for the given asset
 * (both XLM and USDC use 7 decimals). Validates format and positivity so callers
 * never submit a malformed or zero amount on-chain.
 */
export function parseAssetAmountToStroops(input: string, asset: AssetCode): ParseAmountResult {
  const decimals = getAssetConfig(asset).decimals
  const trimmed = input.trim()

  if (trimmed === '') {
    return { ok: false, error: 'Enter an amount.' }
  }

  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`)
  if (!pattern.test(trimmed)) {
    return { ok: false, error: `Enter an ${asset} amount with up to ${decimals} decimal places.` }
  }

  const [intPart, fracPart = ''] = trimmed.split('.')
  const stroops = BigInt(intPart + fracPart.padEnd(decimals, '0'))

  if (stroops === 0n) {
    return { ok: false, error: 'Amount must be greater than zero.' }
  }

  return { ok: true, stroops }
}

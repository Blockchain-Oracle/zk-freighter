import type { AssetCode } from '@zk-fighter/core'

export const defaultShieldAmounts = {
  XLM: 1_000_000n,
  USDC: 10_000_000n,
} as const satisfies Record<AssetCode, bigint>

const rawUnitsPerDisplayUnit = 10_000_000

export function shorten(value: string, head = 8, tail = 6): string {
  return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function amountLabel(rawUnits: string | bigint, asset: AssetCode): string {
  const value = Number(rawUnits) / rawUnitsPerDisplayUnit
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${asset}`
}

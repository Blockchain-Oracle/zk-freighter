import type { AssetCode } from '@zk-fighter/core'

export const defaultShieldAmounts = {
  XLM: 1_000_000n,
  USDC: 10_000_000n,
} as const satisfies Record<AssetCode, bigint>

const rawUnitsPerDisplayUnitBigInt = 10_000_000n

export function shorten(value: string, head = 8, tail = 6): string {
  return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function amountLabel(rawUnits: string | bigint, asset: AssetCode): string {
  return `${formatStroops(BigInt(rawUnits), 7)} ${asset}`
}

export function formatStroops(rawUnits: string | bigint, decimals = 2): string {
  const value = BigInt(rawUnits)
  const negative = value < 0n
  const abs = negative ? -value : value
  const whole = abs / rawUnitsPerDisplayUnitBigInt
  const fraction = (abs % rawUnitsPerDisplayUnitBigInt).toString().padStart(7, '0').slice(0, decimals)
  return `${negative ? '-' : ''}${whole.toLocaleString('en-US')}${decimals > 0 ? `.${fraction}` : ''}`
}

export function stroopsToAmountInput(rawUnits: string | bigint): string {
  return atomicToAmountInput(rawUnits, 7)
}

export function formatAtomic(rawUnits: string | bigint, unitDecimals: number, displayDecimals: number): string {
  const divisor = 10n ** BigInt(unitDecimals)
  const value = BigInt(rawUnits)
  const negative = value < 0n
  const abs = negative ? -value : value
  const whole = abs / divisor
  const fraction = (abs % divisor).toString().padStart(unitDecimals, '0').slice(0, displayDecimals)
  return `${negative ? '-' : ''}${whole.toLocaleString('en-US')}${displayDecimals > 0 ? `.${fraction}` : ''}`
}

export function atomicToAmountInput(rawUnits: string | bigint, unitDecimals: number): string {
  const value = BigInt(rawUnits)
  const negative = value < 0n
  const abs = negative ? -value : value
  const divisor = 10n ** BigInt(unitDecimals)
  const whole = abs / divisor
  const fraction = (abs % divisor).toString().padStart(unitDecimals, '0').replace(/0+$/u, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

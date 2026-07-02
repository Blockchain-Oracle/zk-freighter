import type { AssetCode } from '@zk-freighter/core'

const stroopsPerUnit = 10_000_000n

export function truncateMiddle(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function formatStroops(stroops: bigint, decimals = 2): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / stroopsPerUnit
  const frac = (abs % stroopsPerUnit).toString().padStart(7, '0').slice(0, decimals)
  return `${negative ? '-' : ''}${whole.toLocaleString('en-US')}${decimals ? `.${frac}` : ''}`
}

export function formatAssetAmount(stroops: bigint, asset: AssetCode): string {
  return `${formatStroops(stroops, asset === 'XLM' ? 3 : 2)} ${asset}`
}

export function summarizeError(error?: string): string {
  if (!error) return 'No details available.'
  if (/Storage Worker Communication Error: operation timed out/iu.test(error)) {
    return 'Private engine timed out while preparing proof inputs.'
  }
  if (/transaction simulation failed/iu.test(error)) {
    return 'Transaction simulation failed. Open evidence for the full diagnostic log.'
  }
  const line = error.split('\n').find((entry) => entry.trim())?.trim() ?? error.trim()
  const compact = line.replace(/\s+/gu, ' ')
  return compact.length > 118 ? `${compact.slice(0, 115)}...` : compact
}

export function noteBalance(report: { readonly status: string; readonly notes?: readonly { readonly amountStroops: string; readonly spent: boolean }[] } | null): bigint | null {
  if (!report || report.status !== 'loaded' || !report.notes) return null
  return report.notes.reduce((total, note) => note.spent ? total : total + BigInt(note.amountStroops), 0n)
}

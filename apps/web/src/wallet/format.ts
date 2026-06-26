import type { XlmShieldedNote } from '@zk-fighter/core'

const STROOPS_PER_UNIT = 10_000_000n

/** Sum of unspent note amounts (in stroops). Spendable shielded balance. */
export function sumSpendableStroops(notes: readonly XlmShieldedNote[]): bigint {
  return notes.reduce((acc, note) => (note.spent ? acc : acc + BigInt(note.amountStroops)), 0n)
}

/**
 * Render stroops as a plain (comma-free, trailing-zero-trimmed) decimal string
 * suitable for an amount input value — e.g. for the "Max" affordance.
 */
export function stroopsToAmountInput(stroops: bigint): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / STROOPS_PER_UNIT
  const frac = (abs % STROOPS_PER_UNIT).toString().padStart(7, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}

/** Format a stroop amount (7 decimals on Stellar) for display with grouping. */
export function formatStroops(stroops: bigint, decimals = 2): string {
  const negative = stroops < 0n
  const abs = negative ? -stroops : stroops
  const whole = abs / STROOPS_PER_UNIT
  const frac = abs % STROOPS_PER_UNIT
  const fracStr = frac.toString().padStart(7, '0').slice(0, decimals)
  const wholeStr = whole.toLocaleString('en-US')
  return `${negative ? '-' : ''}${wholeStr}${decimals > 0 ? `.${fracStr}` : ''}`
}

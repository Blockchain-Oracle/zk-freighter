import { describe, expect, it } from 'vitest'
import { stroopsToAmountInput } from './format'

describe('stroopsToAmountInput', () => {
  it('renders a whole amount with no decimals or grouping commas', () => {
    expect(stroopsToAmountInput(500_000_000n)).toBe('50')
    expect(stroopsToAmountInput(12_345_000_000_000n)).toBe('1234500')
  })

  it('renders a fractional amount with trailing zeros trimmed', () => {
    expect(stroopsToAmountInput(15_000_000n)).toBe('1.5')
    expect(stroopsToAmountInput(1n)).toBe('0.0000001')
  })

  it('renders zero as "0"', () => {
    expect(stroopsToAmountInput(0n)).toBe('0')
  })
})

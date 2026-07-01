import { describe, expect, it } from 'vitest'
import { amountLabel, atomicToAmountInput, formatAtomic, formatStroops, stroopsToAmountInput } from './extension-format'

describe('extension balance formatting', () => {
  it('formats Stellar stroops without converting through Number', () => {
    expect(formatStroops(12_345_678_901_234_567n, 7)).toBe('1,234,567,890.1234567')
    expect(amountLabel('10000000', 'USDC')).toBe('1.0000000 USDC')
  })

  it('renders max amount inputs without grouping', () => {
    expect(stroopsToAmountInput(15_000_000n)).toBe('1.5')
    expect(atomicToAmountInput(1_250_000n, 6)).toBe('1.25')
  })

  it('formats EVM atomic balances safely', () => {
    expect(formatAtomic(1_234_567_890_000_000_000n, 18, 4)).toBe('1.2345')
  })
})

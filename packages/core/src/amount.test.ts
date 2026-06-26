import { describe, expect, it } from 'vitest'
import { parseAssetAmountToStroops } from './amount'

describe('parseAssetAmountToStroops', () => {
  it('parses a whole-unit amount to 7-decimal stroops', () => {
    const result = parseAssetAmountToStroops('1', 'XLM')
    expect(result).toEqual({ ok: true, stroops: 10_000_000n })
  })

  it('parses a fractional amount to stroops', () => {
    const result = parseAssetAmountToStroops('1.5', 'USDC')
    expect(result).toEqual({ ok: true, stroops: 15_000_000n })
  })

  it('parses the smallest representable unit (1 stroop)', () => {
    const result = parseAssetAmountToStroops('0.0000001', 'XLM')
    expect(result).toEqual({ ok: true, stroops: 1n })
  })

  it('trims surrounding whitespace before parsing', () => {
    const result = parseAssetAmountToStroops('  2  ', 'XLM')
    expect(result).toEqual({ ok: true, stroops: 20_000_000n })
  })

  it('rejects an empty amount', () => {
    expect(parseAssetAmountToStroops('', 'XLM')).toEqual({ ok: false, error: 'Enter an amount.' })
    expect(parseAssetAmountToStroops('   ', 'XLM')).toEqual({ ok: false, error: 'Enter an amount.' })
  })

  it('rejects zero', () => {
    expect(parseAssetAmountToStroops('0', 'USDC')).toEqual({
      ok: false,
      error: 'Amount must be greater than zero.',
    })
    expect(parseAssetAmountToStroops('0.0000000', 'USDC')).toEqual({
      ok: false,
      error: 'Amount must be greater than zero.',
    })
  })

  it('rejects more than 7 decimal places', () => {
    expect(parseAssetAmountToStroops('1.12345678', 'XLM')).toEqual({
      ok: false,
      error: 'Enter an XLM amount with up to 7 decimal places.',
    })
  })

  it('rejects non-numeric and malformed input', () => {
    for (const bad of ['abc', '-1', '1.5.5', '1,5', '1e3', '.5']) {
      expect(parseAssetAmountToStroops(bad, 'USDC').ok).toBe(false)
    }
  })
})

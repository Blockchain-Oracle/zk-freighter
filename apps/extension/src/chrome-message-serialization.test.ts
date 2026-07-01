import { describe, expect, it } from 'vitest'
import { serializeChromeMessage } from './chrome-message-serialization'

describe('serializeChromeMessage', () => {
  it('converts nested bigint values to strings for Chrome runtime messages', () => {
    expect(serializeChromeMessage({
      amount: 1n,
      nested: [{ balance: 2n }],
    })).toEqual({
      amount: '1',
      nested: [{ balance: '2' }],
    })
  })
})

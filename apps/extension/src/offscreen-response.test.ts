import { describe, expect, it } from 'vitest'

import { assertOffscreenSuccess } from './offscreen-response'

describe('assertOffscreenSuccess', () => {
  it('rejects offscreen error responses before callers cast them as reports', () => {
    expect(() => assertOffscreenSuccess({ ok: false, error: 'offscreen failed' })).toThrow('offscreen failed')
  })

  it('returns successful report-shaped responses unchanged', () => {
    const report = { status: 'submitted', txHash: 'abc' }
    expect(assertOffscreenSuccess(report)).toBe(report)
  })
})

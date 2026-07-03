import { describe, expect, it } from 'vitest'
import {
  autoShieldFloorStroops,
  DEFAULT_AUTO_SHIELD_SETTINGS,
  parseAutoShieldSettings,
  serializeAutoShieldSettings,
} from './auto-shield-settings'

describe('auto-shield settings', () => {
  it('returns defaults for empty input', () => {
    expect(parseAutoShieldSettings(null)).toEqual(DEFAULT_AUTO_SHIELD_SETTINGS)
    expect(parseAutoShieldSettings(undefined)).toEqual(DEFAULT_AUTO_SHIELD_SETTINGS)
    expect(parseAutoShieldSettings('')).toEqual(DEFAULT_AUTO_SHIELD_SETTINGS)
  })

  it('round-trips serialize/parse', () => {
    const settings = { enabled: true, floors: { XLM: '70000000', USDC: '20000000' } }
    expect(parseAutoShieldSettings(serializeAutoShieldSettings(settings))).toEqual(settings)
  })

  it('falls back to defaults for malformed JSON', () => {
    expect(parseAutoShieldSettings('{not json')).toEqual(DEFAULT_AUTO_SHIELD_SETTINGS)
  })

  it('repairs individual malformed fields', () => {
    const parsed = parseAutoShieldSettings(
      JSON.stringify({ enabled: 'yes', floors: { XLM: 'abc' } }),
    )
    expect(parsed).toEqual({
      enabled: false,
      floors: { XLM: '50000000', USDC: '10000000' },
    })
  })

  it('resolves floor stroops per asset', () => {
    const settings = { enabled: true, floors: { XLM: '70000000', USDC: '20000000' } }
    expect(autoShieldFloorStroops(settings, 'XLM')).toBe(70_000_000n)
    expect(autoShieldFloorStroops(settings, 'USDC')).toBe(20_000_000n)
  })
})

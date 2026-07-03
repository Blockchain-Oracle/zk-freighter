import type { AssetCode } from './assets'

/** Storage key shared across web localStorage, extension + mobile key/value stores. */
export const AUTO_SHIELD_STORAGE_KEY = 'zkf.autoShield.v1'

export interface AutoShieldSettings {
  readonly enabled: boolean
  /** Per-asset floors in stroops, as decimal strings. */
  readonly floors: Record<AssetCode, string>
}

export const DEFAULT_AUTO_SHIELD_SETTINGS: AutoShieldSettings = {
  enabled: false,
  floors: { XLM: '50000000', USDC: '10000000' },
}

function isValidStroopString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return BigInt(value) >= 0n
  } catch {
    return false
  }
}

/** Parses stored settings, falling back to defaults for any missing or malformed field. */
export function parseAutoShieldSettings(raw: string | null | undefined): AutoShieldSettings {
  if (!raw) return DEFAULT_AUTO_SHIELD_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<AutoShieldSettings>
    const floors: Partial<Record<AssetCode, unknown>> = parsed.floors ?? {}
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUTO_SHIELD_SETTINGS.enabled,
      floors: {
        XLM: isValidStroopString(floors.XLM) ? floors.XLM : DEFAULT_AUTO_SHIELD_SETTINGS.floors.XLM,
        USDC: isValidStroopString(floors.USDC) ? floors.USDC : DEFAULT_AUTO_SHIELD_SETTINGS.floors.USDC,
      },
    }
  } catch {
    return DEFAULT_AUTO_SHIELD_SETTINGS
  }
}

export function serializeAutoShieldSettings(settings: AutoShieldSettings): string {
  return JSON.stringify(settings)
}

/** Resolves the configured floor for an asset as stroops, defaulting on parse failure. */
export function autoShieldFloorStroops(settings: AutoShieldSettings, asset: AssetCode): bigint {
  try {
    return BigInt(settings.floors[asset])
  } catch {
    return BigInt(DEFAULT_AUTO_SHIELD_SETTINGS.floors[asset])
  }
}

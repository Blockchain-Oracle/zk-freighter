import { browser } from 'wxt/browser'
import {
  AUTO_SHIELD_STORAGE_KEY,
  parseAutoShieldSettings,
  serializeAutoShieldSettings,
  type AutoShieldSettings,
} from '@zk-freighter/core'

/** Reads shared auto-shield settings from extension storage (popup writer, background reader). */
export async function readAutoShieldSettings(): Promise<AutoShieldSettings> {
  const value = (await browser.storage.local.get(AUTO_SHIELD_STORAGE_KEY))[AUTO_SHIELD_STORAGE_KEY]
  return parseAutoShieldSettings(typeof value === 'string' ? value : null)
}

export async function writeAutoShieldSettings(settings: AutoShieldSettings): Promise<void> {
  await browser.storage.local.set({ [AUTO_SHIELD_STORAGE_KEY]: serializeAutoShieldSettings(settings) })
}

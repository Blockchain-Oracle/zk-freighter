import { browser } from 'wxt/browser'

// Shared across popup + onboarding tab. All extension pages share one origin, so
// this localStorage flag written on the onboarding tab is readable in the popup.
export const extensionOnboardingKey = 'zkf.onboarding.extension.v2'

export function hasExtensionOnboarded(): boolean {
  try {
    return Boolean(localStorage.getItem(extensionOnboardingKey))
  } catch {
    return false
  }
}

export function markExtensionOnboarded(): void {
  try {
    localStorage.setItem(extensionOnboardingKey, String(Date.now()))
  } catch {
    // storage unavailable (rare in extension pages); the popup will re-nudge
  }
}

/** The full-tab intro v2 page (WXT builds entrypoints/onboarding → onboarding.html). */
export function openOnboardingTab(): void {
  void browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') })
}

import type { URLOpenListenerEvent } from '@capacitor/app'
import type { MobileRoute } from './mobile-storage'
import type { MobileRouteParams } from './MobileFlowPrimitives'

const linkRoutes = new Set<MobileRoute>(['home', 'receive', 'activity', 'more', 'settings', 'send', 'shield', 'discover', 'disclosure', 'confidential', 'bridge', 'scan'])

export function parseMobileDeepLink(event: URLOpenListenerEvent): { route: MobileRoute; params?: MobileRouteParams } | null {
  try {
    const url = new URL(event.url)
    const rawRoute = url.pathname.split('/').filter(Boolean).at(-1) ?? url.host
    if (!linkRoutes.has(rawRoute as MobileRoute)) return null
    const route = rawRoute as MobileRoute
    if (route === 'send') {
      return { route, params: { sendCode: url.searchParams.get('code') ?? undefined, sendMode: url.searchParams.get('mode') === 'public' ? 'public' : 'private' } }
    }
    if (route === 'shield') {
      return { route, params: { shieldMode: url.searchParams.get('mode') === 'unshield' ? 'unshield' : 'shield' } }
    }
    return { route }
  } catch {
    return null
  }
}

export function isSheetRoute(route: MobileRoute): boolean {
  return route === 'more' || route === 'send' || route === 'shield' || route === 'bridge'
}

export function vaultErrorText(error: string): string {
  return {
    'corrupt-vault': 'The saved vault cannot be read.',
    'crypto-unavailable': 'Browser crypto is unavailable.',
    'invalid-mnemonic': 'Enter a valid 12-word recovery phrase.',
    'invalid-password': 'Password did not unlock this vault.',
    'unsupported-vault': 'This vault version is not supported.',
  }[error] ?? 'Vault operation failed.'
}

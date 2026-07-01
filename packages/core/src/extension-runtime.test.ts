import { describe, expect, it } from 'vitest'

import { extensionReadinessDigest, phase11ExtensionReadiness } from './extension-runtime'

describe('phase11ExtensionReadiness', () => {
  it('keeps unproven extension claims gated while marking proven runtime checks ready', () => {
    expect(phase11ExtensionReadiness.status).toBe('in-progress')
    expect(phase11ExtensionReadiness.judgedSurface).toBe('web + extension popup')
    expect(phase11ExtensionReadiness.capabilities).toContainEqual(
      expect.objectContaining({
        id: 'dapp-profile',
        status: 'ready',
      }),
    )
    expect(phase11ExtensionReadiness.capabilities).toContainEqual(
      expect.objectContaining({ id: 'external-signing', status: 'deferred' }),
    )
    expect(phase11ExtensionReadiness.capabilities).toContainEqual(
      expect.objectContaining({ id: 'quickshield-bridge', status: 'ready' }),
    )
    expect(phase11ExtensionReadiness.capabilities).toContainEqual(
      expect.objectContaining({ id: 'passkey-runtime', status: 'deferred' }),
    )
    expect(phase11ExtensionReadiness.capabilities).toContainEqual(
      expect.objectContaining({
        id: 'prover-runtime',
        status: 'ready',
      }),
    )
  })

  it('produces a submission-safe digest without compatibility overclaims', () => {
    const digest = extensionReadinessDigest()

    expect(digest).toContain('Status: in-progress')
    expect(digest).toContain('External dApp signing: deferred')
    expect(digest).toContain('QuickShield and bridge companion')
    expect(digest).toContain('extension-native bridge route renders')
    expect(digest).toContain('public-key access and signing fail closed')
    expect(digest).toContain('dry XLM deposit proof')
    expect(digest).not.toContain('signed a valid transaction XDR')
    expect(digest).not.toMatch(/complete Freighter-compatible provider/i)
    expect(digest).not.toMatch(/passkey-supported extension/i)
  })
})

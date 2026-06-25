import { afterEach, describe, expect, it, vi } from 'vitest'

import { bridgeHandoffNotice, bridgeResumeBurnHashFromUrl, bridgeSourceChainFromUrl } from './bridge-handoff'

const destination = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
const resumeBurnHash = `0x${'b'.repeat(64)}`

describe('bridge handoff URL parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts matching extension handoff context', () => {
    installLocation(`?zkfAction=bridge&network=testnet&destination=${destination}&sourceChain=base&resumeBurnHash=${resumeBurnHash}`)

    expect(bridgeResumeBurnHashFromUrl('testnet', destination)).toBe(resumeBurnHash)
    expect(bridgeSourceChainFromUrl('testnet', destination)).toBe('base')
    expect(bridgeHandoffNotice('testnet', destination)).toContain('Opened from the extension')
  })

  it('warns when the unlocked wallet is not the handoff destination', () => {
    installLocation(`?zkfAction=bridge&network=testnet&destination=${destination}`)

    expect(bridgeResumeBurnHashFromUrl('testnet', 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYX')).toBeUndefined()
    expect(bridgeHandoffNotice('testnet', 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBYX')).toContain(
      'does not match',
    )
  })
})

function installLocation(search: string): void {
  vi.stubGlobal('window', {
    location: {
      search,
    },
  })
}

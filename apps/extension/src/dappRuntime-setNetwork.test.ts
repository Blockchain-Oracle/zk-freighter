import { beforeEach, describe, expect, it, vi } from 'vitest'

const { setNetworkFlow, readStoredDappWallet } = vi.hoisted(() => ({
  setNetworkFlow: vi.fn(async () => undefined),
  readStoredDappWallet: vi.fn(async () => ({ network: 'mainnet' })),
}))

vi.mock('./dappRuntime-wallet', () => ({
  setNetworkFlow,
  passkeyCreateFlow: vi.fn(),
  passkeyPrepareCreateFlow: vi.fn(),
  passkeyRemoveFlow: vi.fn(),
  passkeySupportFlow: vi.fn(),
  passkeyUnlockFlow: vi.fn(),
}))
vi.mock('./dappRuntimeState', () => ({
  readStoredDappWallet,
  identityForMnemonic: vi.fn(() => undefined),
  requireUnlockedDappWallet: vi.fn(),
  writeStoredDappWallet: vi.fn(),
}))

import { ExtensionDappRuntime } from './dappRuntime'
import { dappMessageTypes } from './dappMessages'

describe('setNetwork dispatch', () => {
  beforeEach(() => {
    setNetworkFlow.mockClear()
  })

  it('wipes the private engine STORAGE (not just the runtime) on every switch', async () => {
    const calls: string[] = []
    const resetPrivateRuntime = vi.fn(async () => {
      calls.push('runtime')
    })
    const resetPrivateStorage = vi.fn(async () => {
      calls.push('storage')
      return { ok: true as const, cleared: true }
    })
    const runtime = new ExtensionDappRuntime(
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      resetPrivateRuntime,
      resetPrivateStorage,
    )

    const response = await runtime.handle({ type: dappMessageTypes.setNetwork, network: 'mainnet' } as never)

    expect(setNetworkFlow).toHaveBeenCalledWith('mainnet')
    // The OPFS scan cache is not network-keyed — a switch MUST run the full
    // storage wipe, or the other network's scan reads poisoned files.
    expect(resetPrivateStorage).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['storage'])
    expect(response).not.toBeNull()
  })
})

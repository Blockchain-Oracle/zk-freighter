import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearNethermindWebClientCache, loadNethermindWebClient, restartNethermindWebClientCache, runWithNethermindWebClient, type NethermindWebClient, type NethermindWebModule } from './nethermind-runtime'

const expectedRpcUrl = 'https://soroban-testnet.stellar.org/'
const originalNavigator = globalThis.navigator

describe('loadNethermindWebClient', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  })

  afterEach(() => {
    clearNethermindWebClientCache()
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator })
  })

  it('disables the Nethermind background event listener for explicit app-managed sync', async () => {
    const client = {} as NethermindWebClient
    const configs: unknown[] = []

    class TestConfig {
      constructor(
        readonly rpcUrl: string,
        readonly bootnodeUrl?: string,
        readonly backgroundEvents?: boolean,
      ) {
        configs.push(this)
      }
    }

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: TestConfig,
      mainThread: async () => ({ webClient: client }),
    })

    const loaded = await loadNethermindWebClient('testnet', importer)

    expect(loaded).toBe(client)
    expect(configs).toHaveLength(1)
    expect(configs[0]).toMatchObject({
      rpcUrl: expectedRpcUrl,
      bootnodeUrl: undefined,
      backgroundEvents: false,
    })
  })

  it('does not reuse a cached client across network changes', async () => {
    const configs: unknown[] = []
    let clientFreed = 0
    let handleFreed = 0

    class TestConfig {
      constructor(readonly rpcUrl: string) {
        configs.push(this)
      }
    }

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: TestConfig,
      mainThread: async () => ({
        webClient: { free: () => { clientFreed += 1 } } as NethermindWebClient,
        free: () => { handleFreed += 1 },
      }),
    })

    await loadNethermindWebClient('testnet', importer)
    await loadNethermindWebClient('mainnet', importer)

    expect(configs).toHaveLength(2)
    expect(configs[0]).toMatchObject({ rpcUrl: expectedRpcUrl })
    expect(configs[1]).toMatchObject({ rpcUrl: 'https://mainnet.sorobanrpc.com' })
    expect(clientFreed).toBe(1)
    expect(handleFreed).toBe(1)
  })

  it('reports a friendly busy error when another browser tab holds the runtime lock', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        locks: {
          request: async (_name: string, _options: unknown, callback: (lock: null) => Promise<void>) => callback(null),
        },
      },
    })

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: {} as NethermindWebClient }),
    })

    await expect(loadNethermindWebClient('testnet', importer)).rejects.toThrow('ZKF_RUNTIME_BUSY')
  })

  it('does not rerun module initialization when only the client cache is cleared', async () => {
    let initCount = 0

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => {
        initCount += 1
      },
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: {} as NethermindWebClient }),
    })

    await loadNethermindWebClient('testnet', importer)
    clearNethermindWebClientCache()
    await loadNethermindWebClient('mainnet', importer)

    expect(initCount).toBe(1)
  })

  it('serializes Nethermind client operations through the shared queue', async () => {
    let active = 0
    let maxActive = 0
    let releaseFirst!: () => void
    let markFirstStarted!: () => void
    const firstCanFinish = new Promise<void>((resolve) => { releaseFirst = resolve })
    const firstStarted = new Promise<void>((resolve) => { markFirstStarted = resolve })
    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: {} as NethermindWebClient }),
    })

    const first = runWithNethermindWebClient('testnet', async () => {
      active += 1
      markFirstStarted()
      maxActive = Math.max(maxActive, active)
      await firstCanFinish
      active -= 1
      return 'first'
    }, importer)
    const second = runWithNethermindWebClient('testnet', async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      active -= 1
      return 'second'
    }, importer)

    await firstStarted
    expect(active).toBe(1)
    releaseFirst()
    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    expect(maxActive).toBe(1)
  })

  it('preempts active scans when the runtime is restarted', async () => {
    let releaseFirst!: () => void
    let markFirstStarted!: () => void
    const firstCanFinish = new Promise<void>((resolve) => { releaseFirst = resolve })
    const firstStarted = new Promise<void>((resolve) => { markFirstStarted = resolve })
    let clientFreed = 0
    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: { free: () => { clientFreed += 1 } } as NethermindWebClient }),
    })

    const first = runWithNethermindWebClient('testnet', async () => {
      markFirstStarted()
      await firstCanFinish
      return 'first'
    }, importer)

    await firstStarted
    await restartNethermindWebClientCache()
    expect(clientFreed).toBe(1)

    await expect(runWithNethermindWebClient('mainnet', async () => 'second', importer)).resolves.toBe('second')

    releaseFirst()
    await expect(first).resolves.toBe('first')
  })
})

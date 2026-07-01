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

  it('enables the Nethermind background event listener for bootnode-backed indexing', async () => {
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
      backgroundEvents: true,
    })
  })

  it('does not reuse a cached client across network changes', async () => {
    const configs: unknown[] = []

    class TestConfig {
      constructor(readonly rpcUrl: string) {
        configs.push(this)
      }
    }

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: TestConfig,
      mainThread: async () => ({
        webClient: {} as NethermindWebClient,
      }),
    })

    await loadNethermindWebClient('testnet', importer)
    await loadNethermindWebClient('mainnet', importer)

    expect(configs).toHaveLength(2)
    expect(configs[0]).toMatchObject({ rpcUrl: expectedRpcUrl })
    expect(configs[1]).toMatchObject({ rpcUrl: 'https://mainnet.sorobanrpc.com' })
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

  it('suppresses the benign Nethermind logger double-init console error', async () => {
    const originalError = console.error
    const messages: string[] = []
    console.error = (...args: unknown[]) => {
      messages.push(args.map((arg) => String(arg)).join(' '))
    }

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => {
        console.error('attempted to set a logger after the logging system was already initialized')
        return { webClient: {} as NethermindWebClient }
      },
    })

    try {
      await loadNethermindWebClient('testnet', importer)
      expect(messages).toEqual([])
    } finally {
      console.error = originalError
    }
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
    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: {} as NethermindWebClient }),
    })

    const first = runWithNethermindWebClient('testnet', async () => {
      markFirstStarted()
      await firstCanFinish
      return 'first'
    }, importer)

    await firstStarted
    await restartNethermindWebClientCache()

    await expect(runWithNethermindWebClient('mainnet', async () => 'second', importer)).resolves.toBe('second')

    releaseFirst()
    await expect(first).resolves.toBe('first')
  })

  it('terminates Nethermind workers when the runtime is restarted', async () => {
    const originalWorker = (globalThis as typeof globalThis & { Worker?: unknown }).Worker
    let terminated = 0

    class TestWorker {
      constructor(readonly url: string) {}
      terminate() {
        terminated += 1
      }
    }

    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: TestWorker })

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: class TestConfig {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => {
        const WorkerCtor = (globalThis as typeof globalThis & { Worker: new (url: string) => TestWorker }).Worker
        new WorkerCtor('/js/storage-worker.js')
        new WorkerCtor('/js/prover-worker.js')
        return { webClient: {} as NethermindWebClient }
      },
    })

    try {
      await loadNethermindWebClient('testnet', importer)
      await restartNethermindWebClientCache()
      expect(terminated).toBe(2)
    } finally {
      Object.defineProperty(globalThis, 'Worker', { configurable: true, value: originalWorker })
    }
  })
})

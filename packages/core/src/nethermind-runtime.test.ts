import { afterEach, describe, expect, it } from 'vitest'
import { clearNethermindWebClientCache, loadNethermindWebClient, type NethermindWebClient, type NethermindWebModule } from './nethermind-runtime'

const expectedRpcUrl = 'https://soroban-testnet.stellar.org/'

describe('loadNethermindWebClient', () => {
  afterEach(() => {
    clearNethermindWebClientCache()
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

    class TestConfig {
      constructor(readonly rpcUrl: string) {
        configs.push(this)
      }
    }

    const importer = async (): Promise<NethermindWebModule> => ({
      default: async () => undefined,
      Config: TestConfig,
      mainThread: async () => ({ webClient: {} as NethermindWebClient }),
    })

    await loadNethermindWebClient('testnet', importer)
    await loadNethermindWebClient('mainnet', importer)

    expect(configs).toHaveLength(2)
    expect(configs[0]).toMatchObject({ rpcUrl: expectedRpcUrl })
    expect(configs[1]).toMatchObject({ rpcUrl: 'https://mainnet.sorobanrpc.com' })
  })

  it('reports a friendly busy error when another browser tab holds the runtime lock', async () => {
    const original = globalThis.navigator
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
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: original })
  })
})

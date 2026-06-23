import { describe, expect, it } from 'vitest'
import { loadNethermindWebClient, type NethermindWebClient, type NethermindWebModule } from './nethermind-runtime'

const expectedRpcUrl = 'https://soroban-testnet.stellar.org/'

describe('loadNethermindWebClient', () => {
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
})

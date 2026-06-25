import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import { submitXlmShieldDeposit } from './xlm-shield'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function moduleForClient(client: unknown): NethermindWebModule {
  return {
    Config: class {
      constructor(_rpcUrl: string) {}
    },
    default: async () => undefined,
    mainThread: async () => ({ webClient: client }),
  } as NethermindWebModule
}

describe('XLM shield submit', () => {
  it('reports ASP/indexer blockers when Nethermind returns no prepared transaction', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    let poolId = ''
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      executeDeposit: async (
        nextPool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        _submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        poolId = nextPool
        onStatus({ flow: 'deposit', message: 'Waiting to sync 1 ledger(s) from the chain...' })
        return null
      },
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
    }

    const report = await submitXlmShieldDeposit({
      asset: 'USDC',
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
    })

    expect(report.status).toBe('blocked')
    expect(report.asset).toBe('USDC')
    expect(poolId).toBe('CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY')
    expect(report.proofGenerated).toBe(false)
    expect(report.transactionSubmitted).toBe(false)
    expect(report.blockers[0]).toContain('ASP membership/indexer')
    expect(report.blockers[0]).toContain('1')
  })

  it('uses the configured mainnet pool once deployed', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'mainnet')
    let poolId = ''
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      executeDeposit: async (
        nextPool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        _submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        poolId = nextPool
        onStatus({ flow: 'deposit', message: 'Fetching on-chain state...' })
        return null
      },
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
    }

    const report = await submitXlmShieldDeposit({
      identity,
      network: 'mainnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
    })

    expect(report.status).toBe('blocked')
    expect(poolId).toBe('CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE')
    expect(report.transactionSubmitted).toBe(false)
    expect(report.blockers[0]).toContain('Nethermind returned no executable')
  })
})

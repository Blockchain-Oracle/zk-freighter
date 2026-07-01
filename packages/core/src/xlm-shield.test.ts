import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import { submitXlmShieldDeposit, type XlmShieldProgressEvent } from './xlm-shield'

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
    expect(poolId).toBe('CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK')
    expect(report.proofGenerated).toBe(false)
    expect(report.transactionSubmitted).toBe(false)
    expect(report.blockers[0]).toContain('ASP membership/indexer')
    expect(report.blockers[0]).toContain('1')
  })

  it('streams nethermind status events to onStatus as they happen', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const seen: XlmShieldProgressEvent[] = []
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      executeDeposit: async (
        _pool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        _submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        onStatus({ flow: 'deposit', stage: 'sync_wait', message: 'Waiting to sync 1 ledger(s) from the chain...' })
        onStatus({ flow: 'deposit', stage: 'fetch_chain_state', message: 'Fetching on-chain state' })
        return null
      },
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
    }

    const report = await submitXlmShieldDeposit({
      asset: 'XLM',
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
      onStatus: (event) => seen.push(event),
    })

    expect(seen.map((event) => event.step)).toEqual(['sync_wait', 'fetch_chain_state'])
    expect(seen.every((event) => event.source === 'nethermind')).toBe(true)
    // The streamed events are exactly the events accumulated into the final report.
    expect(seen).toEqual([...report.statusEvents])
  })

  it('does not abort the deposit when an onStatus listener throws', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      executeDeposit: async (
        _pool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        _submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        onStatus({ flow: 'deposit', step: 'sync_wait', message: 'Waiting to sync 1 ledger(s) from the chain...' })
        return null
      },
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
    }

    const report = await submitXlmShieldDeposit({
      asset: 'XLM',
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
      onStatus: () => {
        throw new Error('listener blew up')
      },
    })

    // A buggy listener must not convert a legitimate blocked precondition into a failure,
    // and the event must still be recorded on the report.
    expect(report.status).toBe('blocked')
    expect(report.statusEvents).toHaveLength(1)
    expect(report.error).toBeUndefined()
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

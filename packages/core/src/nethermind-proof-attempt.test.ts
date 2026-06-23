import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import { runNethermindDryDepositProofAttempt } from './nethermind-proof-attempt'
import type { NethermindWebModule } from './nethermind-runtime'

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

function baseClient(overrides: Record<string, unknown> = {}) {
  return {
    deriveAndSaveUserKeys: async () => undefined,
    getASPSecret: async () => ({ membershipBlinding: '0x01' }),
    getUserKeys: async () => ({ noteKeypair: { public: '0x02' } }),
    ...overrides,
  }
}

describe('Nethermind dry deposit proof attempt', () => {
  it('reports ASP/indexer blockers without claiming proof generation', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const client = baseClient({
      executeDeposit: async (
        _pool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        _submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        onStatus({ flow: 'deposit', message: 'Waiting to sync 42 ledger(s) from the chain...' })
        return null
      },
    })

    const report = await runNethermindDryDepositProofAttempt({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
    })

    expect(report.status).toBe('blocked')
    expect(report.proofGenerated).toBe(false)
    expect(report.submitReached).toBe(false)
    expect(report.blockers[0]).toContain('42')
  })

  it('treats dry-run submit rejection as proof generated but not submitted', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const client = baseClient({
      executeDeposit: async (
        _pool: string,
        _address: string,
        _amount: bigint,
        _outputs: readonly bigint[],
        submit: () => Promise<string>,
        onStatus: (event: unknown) => void,
      ) => {
        onStatus({ flow: 'deposit', message: 'Proving...' })
        onStatus({ flow: 'deposit', message: 'Simulating transaction...', step: 'prepare_tx' })
        await submit()
        return ['unreachable']
      },
    })

    const report = await runNethermindDryDepositProofAttempt({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      now: () => 1,
    })

    expect(report.status).toBe('proof-generated')
    expect(report.proofGenerated).toBe(true)
    expect(report.submitReached).toBe(true)
    expect(report.blockers).toHaveLength(0)
  })
})

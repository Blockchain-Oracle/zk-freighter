import { describe, expect, it } from 'vitest'
import type { WalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import { encodeReceiveCode } from './receive-code'
import { loadXlmShieldedNotes, submitXlmPrivateTransfer } from './xlm-private'

const identity: WalletIdentity = {
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  stellarPublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  derivationPath: "m/44'/148'/0'",
  keyDerivationSignature: new Uint8Array(64).fill(1),
  privateReceive: {
    notePrivateKey: new Uint8Array(32).fill(2),
    notePublicKey: new Uint8Array(32).fill(3),
    encryptionPrivateKey: new Uint8Array(32).fill(4),
    encryptionPublicKey: new Uint8Array(32).fill(5),
    membershipBlinding: new Uint8Array(32).fill(6),
  },
}

function receiveCode(network: 'testnet' | 'mainnet' = 'testnet'): string {
  return encodeReceiveCode({
    version: 1,
    network,
    notePublicKey: new Uint8Array(32).fill(7),
    encryptionPublicKey: new Uint8Array(32).fill(8),
  })
}

function importer(client: Record<string, unknown>) {
  return async () =>
    ({
      default: async () => undefined,
      Config: class {
        constructor(readonly rpcUrl: string) {}
      },
      mainThread: async () => ({ webClient: client }),
    }) as unknown as NethermindWebModule
}

describe('XLM private actions', () => {
  it('loads typed shielded notes from the Nethermind client', async () => {
    const report = await loadXlmShieldedNotes({
      identity,
      network: 'testnet',
      now: () => 10,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        getUserNotes: async () => [
          {
            id: '0xabc',
            amount: '1000000',
            spent: false,
            leafIndex: 12,
            createdAtLedger: 3238230,
          },
        ],
      }),
    })

    expect(report.status).toBe('loaded')
    expect(report.asset).toBe('XLM')
    expect(report.notes).toEqual([
      {
        id: '0xabc',
        amountStroops: '1000000',
        spent: false,
        leafIndex: 12,
        createdAtLedger: 3238230,
      },
    ])
  })

  it('syncs pool events before reading notes when the runtime exposes sync', async () => {
    const calls: string[] = []
    await loadXlmShieldedNotes({
      identity,
      network: 'testnet',
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        syncPoolEvents: async () => {
          calls.push('sync')
        },
        getUserNotes: async () => {
          calls.push('notes')
          return []
        },
      }),
    })

    expect(calls).toEqual(['sync', 'notes'])
  })

  it('fails closed when a receive code targets another network', async () => {
    const report = await submitXlmPrivateTransfer({
      identity,
      network: 'testnet',
      receiveCode: receiveCode('mainnet'),
      amountStroops: 500_000n,
      now: () => 10,
    })

    expect(report.status).toBe('failed')
    expect(report.submitReached).toBe(false)
    expect(report.blockers[0]).toContain('Receive code is for mainnet')
  })

  it('passes 0x-prefixed recipient keys and returns all transaction hashes', async () => {
    let noteKey = ''
    let encryptionKey = ''
    let poolId = ''
    const report = await submitXlmPrivateTransfer({
      asset: 'USDC',
      identity,
      network: 'testnet',
      receiveCode: receiveCode(),
      amountStroops: 500_000n,
      now: () => 10,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        executeTransfer: async (
          nextPool: string,
          _user: string,
          _amount: bigint,
          nextNoteKey: string,
          nextEncryptionKey: string,
        ) => {
          poolId = nextPool
          noteKey = nextNoteKey
          encryptionKey = nextEncryptionKey
          return ['hash-a', 'hash-b']
        },
      }),
    })

    expect(noteKey).toMatch(/^0x/)
    expect(encryptionKey).toMatch(/^0x/)
    expect(poolId).toBe('CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY')
    expect(report.asset).toBe('USDC')
    expect(report.status).toBe('submitted')
    expect(report.txHashes).toEqual(['hash-a', 'hash-b'])
  })

  it('uses the configured mainnet pool for private transfers', async () => {
    let poolId = ''
    const report = await submitXlmPrivateTransfer({
      identity,
      network: 'mainnet',
      receiveCode: receiveCode('mainnet'),
      amountStroops: 500_000n,
      now: () => 10,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        executeTransfer: async (nextPool: string) => {
          poolId = nextPool
          return ['mainnet-hash']
        },
      }),
    })

    expect(poolId).toBe('CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE')
    expect(report.status).toBe('submitted')
    expect(report.txHashes).toEqual(['mainnet-hash'])
  })

  it('reports null engine results as blocked, not submitted', async () => {
    const report = await submitXlmPrivateTransfer({
      identity,
      network: 'testnet',
      receiveCode: receiveCode(),
      amountStroops: 500_000n,
      now: () => 10,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        executeTransfer: async (
          _pool: string,
          _user: string,
          _amount: bigint,
          _note: string,
          _enc: string,
          _submit: unknown,
          onStatus: (event: unknown) => void,
        ) => {
          onStatus({
            flow: 'transfer',
            stage: 'sync_wait',
            message: 'Waiting to sync 4 ledger(s) from the chain...',
          })
          return null
        },
      }),
    })

    expect(report.status).toBe('blocked')
    expect(report.transactionSubmitted).toBe(false)
    expect(report.blockers[0]).toContain('sync gap was 4')
  })
})

import { describe, expect, it } from 'vitest'
import type { WalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import { encodeReceiveCode } from './receive-code'
import { loadXlmShieldedNotes, submitXlmPrivateTransfer } from './xlm-private'
import type { XlmPrivateProgressEvent } from './xlm-private-types'

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
    let poolId = ''
    let userAddress = ''
    const report = await loadXlmShieldedNotes({
      identity,
      network: 'testnet',
      now: () => 10,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        getUnspentUserNotes: async (nextPoolId: string, nextUserAddress: string) => {
          poolId = nextPoolId
          userAddress = nextUserAddress
          return [
            {
              id: '0xabc',
              amount: '1000000',
              spent: false,
              leafIndex: 12,
              createdAtLedger: 3238230,
            },
          ]
        },
      }),
    })

    expect(report.status).toBe('loaded')
    expect(report.asset).toBe('XLM')
    expect(poolId).toBe('CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ')
    expect(userAddress).toBe(identity.stellarPublicKey)
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

  it('syncs pool events before reading notes when explicitly requested', async () => {
    const calls: string[] = []
    await loadXlmShieldedNotes({
      identity,
      network: 'testnet',
      syncBeforeRead: true,
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        syncPoolEvents: async () => {
          calls.push('sync')
        },
        getUnspentUserNotes: async () => {
          calls.push('notes')
          return []
        },
      }),
    })

    expect(calls).toEqual(['sync', 'notes'])
  })

  it('fails closed when the runtime cannot load notes by pool', async () => {
    const report = await loadXlmShieldedNotes({
      asset: 'USDC',
      identity,
      network: 'testnet',
      importWebModule: importer({
        deriveAndSaveUserKeys: async () => undefined,
        getUserNotes: async () => [],
      }),
    })

    expect(report.status).toBe('failed')
    expect(report.blockers[0]).toContain('pool-filtered note loading')
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
    expect(poolId).toBe('CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK')
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

  it('streams private-action status events to onStatus as they happen', async () => {
    const seen: XlmPrivateProgressEvent[] = []
    const report = await submitXlmPrivateTransfer({
      identity,
      network: 'testnet',
      receiveCode: receiveCode(),
      amountStroops: 500_000n,
      now: () => 10,
      onStatus: (event) => seen.push(event),
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
          onStatus({ flow: 'transfer', stage: 'sync_wait', message: 'Waiting to sync 1 ledger(s) from the chain...' })
          onStatus({ flow: 'transfer', stage: 'prove', message: 'Generating proof' })
          return null
        },
      }),
    })

    expect(seen.map((event) => event.step)).toEqual(['sync_wait', 'prove'])
    expect(seen.every((event) => event.source === 'nethermind')).toBe(true)
    expect(seen).toEqual([...report.statusEvents])
  })

  it('does not abort a private action when an onStatus listener throws', async () => {
    const report = await submitXlmPrivateTransfer({
      identity,
      network: 'testnet',
      receiveCode: receiveCode(),
      amountStroops: 500_000n,
      now: () => 10,
      onStatus: () => {
        throw new Error('listener blew up')
      },
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
          onStatus({ flow: 'transfer', stage: 'sync_wait', message: 'Waiting to sync 2 ledger(s) from the chain...' })
          return null
        },
      }),
    })

    expect(report.status).toBe('blocked')
    expect(report.statusEvents).toHaveLength(1)
    expect(report.error).toBeUndefined()
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

import { describe, expect, it, vi } from 'vitest'
import type { WalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import { loadXlmShieldedNotes } from './xlm-private'

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

describe('XLM shielded note load timeouts', () => {
  it('does not run foreground pool sync for passive note reads by default', async () => {
    const calls: string[] = []
    await loadXlmShieldedNotes({
      identity,
      network: 'testnet',
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

    expect(calls).toEqual(['notes'])
  })

  it('fails closed when a shielded note scan stalls', async () => {
    vi.useFakeTimers()
    try {
      const reportPromise = loadXlmShieldedNotes({
        identity,
        network: 'testnet',
        syncBeforeRead: true,
        timeoutMs: 25,
        importWebModule: importer({
          deriveAndSaveUserKeys: async () => undefined,
          syncPoolEvents: async () => new Promise(() => undefined),
          getUnspentUserNotes: async () => [],
        }),
      })

      await vi.advanceTimersByTimeAsync(25)
      const report = await reportPromise

      expect(report.status).toBe('failed')
      expect(report.blockers[0]).toContain('ZKF_RUNTIME_TIMEOUT')
    } finally {
      vi.useRealTimers()
    }
  })
})

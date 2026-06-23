import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import {
  deriveAspMembershipLeaf,
  runAspMembershipPreflight,
} from './asp-membership'
import { insertAspMembershipLeaf } from './asp-membership-insert'
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

function clientFor(referenceLeafHex: string, adminInsertOnly = true) {
  return {
    aspState: async () => ({
      aspMembership: {
        admin: 'GASPADMIN',
        adminInsertOnly,
        capacity: 1024,
        contractId: 'CASPMEMBER',
        levels: 10,
        nextIndex: '12',
        root: '0x01',
      },
    }),
    deriveAndSaveUserKeys: async () => undefined,
    deriveAspUserLeaf: async () => referenceLeafHex,
    getASPSecret: async () => ({ membershipBlinding: '0x01' }),
    getUserKeys: async () => ({ noteKeypair: { public: '0x02' } }),
  }
}

describe('ASP membership preflight', () => {
  it('derives a stable membership leaf from Phase 1 identity material', () => {
    const first = deriveAspMembershipLeaf(deriveWalletIdentity(mnemonic, 'testnet'))
    const second = deriveAspMembershipLeaf(deriveWalletIdentity(mnemonic, 'testnet'))

    expect(first).toEqual(second)
    expect(first.notePublicKeyHex).toMatch(/^0x[0-9a-f]{64}$/)
    expect(first.encryptionPublicKeyHex).toMatch(/^0x[0-9a-f]{64}$/)
    expect(first.membershipLeafHex).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('blocks cleanly when the active network has no XLM pool', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'mainnet')
    const report = await runAspMembershipPreflight({ identity, network: 'mainnet' })

    expect(report.status).toBe('blocked')
    expect(report.poolContractId).toBeUndefined()
    expect(report.transactionSubmitted).toBe(false)
    expect(report.proofGenerated).toBe(false)
  })

  it('derives keys, reads ASP state, and reports admin insertion requirements', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const leaf = deriveAspMembershipLeaf(identity)
    const report = await runAspMembershipPreflight({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(clientFor(leaf.membershipLeafHex)),
    })

    expect(report.status).toBe('needs-registration')
    expect(report.userKeysStored).toBe(true)
    expect(report.aspSecretStored).toBe(true)
    expect(report.referenceLeafMatches).toBe(true)
    expect(report.canInsertWithoutAdmin).toBe(false)
    expect(report.blockers.join(' ')).toContain('requires admin auth')
    expect(report.membershipOnChainVerified).toBe(false)
  })

  it('reports permissionless insertion when admin-only mode is disabled', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const leaf = deriveAspMembershipLeaf(identity)
    const report = await runAspMembershipPreflight({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(clientFor(leaf.membershipLeafHex, false)),
    })

    expect(report.status).toBe('needs-registration')
    expect(report.canInsertWithoutAdmin).toBe(true)
    expect(report.blockers.join(' ')).not.toContain('requires admin auth')
  })

  it('fails closed when local and Nethermind leaf derivation disagree', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const report = await runAspMembershipPreflight({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(clientFor(`0x${'0'.repeat(64)}`)),
    })

    expect(report.status).toBe('failed')
    expect(report.referenceLeafMatches).toBe(false)
    expect(report.transactionSubmitted).toBe(false)
  })

  it('blocks insert when the ASP contract still requires admin auth', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const leaf = deriveAspMembershipLeaf(identity)
    const report = await insertAspMembershipLeaf({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(clientFor(leaf.membershipLeafHex, true)),
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('admin auth')
    expect(report.txHash).toBeUndefined()
  })

  it('blocks insert when ASP contract state is unavailable', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const client = {
      aspState: async () => ({}),
      deriveAndSaveUserKeys: async () => undefined,
      deriveAspUserLeaf: async () => deriveAspMembershipLeaf(identity).membershipLeafHex,
      getASPSecret: async () => ({ membershipBlinding: '0x01' }),
      getUserKeys: async () => ({ noteKeypair: { public: '0x02' } }),
    }
    const report = await insertAspMembershipLeaf({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('contract state')
  })
})

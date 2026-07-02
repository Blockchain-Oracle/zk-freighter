import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeMemoryAspAccessStore } from './asp-access-state'
import { deriveWalletIdentity } from './identity'
import { submitShieldWithPrerequisites } from './shield-orchestration'

const mocks = vi.hoisted(() => ({
  loadPublicStellarBalances: vi.fn(),
  checkAspAccessIndexed: vi.fn(),
  insertAspMembershipLeaf: vi.fn(),
  submitXlmShieldDeposit: vi.fn(),
}))

vi.mock('./stellar-balance', () => ({
  loadPublicStellarBalances: mocks.loadPublicStellarBalances,
}))

vi.mock('./asp-membership-insert', () => ({
  insertAspMembershipLeaf: mocks.insertAspMembershipLeaf,
}))

vi.mock('./asp-access-indexing', () => ({
  checkAspAccessIndexed: mocks.checkAspAccessIndexed,
}))

vi.mock('./xlm-shield', () => ({
  submitXlmShieldDeposit: mocks.submitXlmShieldDeposit,
}))

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('submitShieldWithPrerequisites in-run access polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits shield access and blocks only after the in-run confirm budget is spent', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const aspAccessStore = makeMemoryAspAccessStore()
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 5_000_000n, USDC: 0n },
    })
    mocks.insertAspMembershipLeaf.mockResolvedValue({
      status: 'submitted',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      leaf: { membershipLeafHex: '0xabc' },
      txHash: 'abc123',
      ledger: 3383119,
      explorerUrl: 'https://example.test/tx/abc123',
      blockers: [],
      statusEvents: [],
    })
    mocks.checkAspAccessIndexed.mockResolvedValue({
      status: 'pending',
      network: 'testnet',
      contractId: 'C',
      leafHex: '0xabc',
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 0,
      aspAccessNow: () => 1_000,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('Shield access is confirming')
    expect(report.prerequisites.aspInsert?.txHash).toBe('abc123')
    expect(report.prerequisites.aspAccess?.submittedLedger).toBe(3383119)
    expect(mocks.checkAspAccessIndexed).toHaveBeenCalledTimes(1)
    expect(mocks.submitXlmShieldDeposit).not.toHaveBeenCalled()
  })

  it('completes a first-time shield in one continuous run once the leaf indexes', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const aspAccessStore = makeMemoryAspAccessStore()
    const sleeps: number[] = []
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 5_000_000n, USDC: 0n },
    })
    mocks.insertAspMembershipLeaf.mockResolvedValue({
      status: 'submitted',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      leaf: { membershipLeafHex: '0xabc' },
      txHash: 'abc123',
      explorerUrl: 'https://example.test/tx/abc123',
      blockers: [],
      statusEvents: [],
    })
    mocks.checkAspAccessIndexed
      .mockResolvedValueOnce({ status: 'pending', network: 'testnet', contractId: 'C', leafHex: '0xabc' })
      .mockResolvedValueOnce({ status: 'indexed', network: 'testnet', contractId: 'C', leafHex: '0xabc', ledger: 3383120, leafIndex: '40', root: '123' })
    mocks.submitXlmShieldDeposit.mockResolvedValue({
      status: 'submitted',
      asset: 'XLM',
      durationMs: 10,
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      amountStroops: '1000000',
      proofGenerated: true,
      submitReached: true,
      transactionSubmitted: true,
      txHash: 'shield123',
      signedAuthEntryCount: 1,
      statusEvents: [],
      blockers: [],
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 60_000,
      aspAccessNow: () => 1_000,
      aspAccessSleep: async (ms) => { sleeps.push(ms) },
    })

    expect(report.status).toBe('submitted')
    expect(mocks.insertAspMembershipLeaf).toHaveBeenCalledTimes(1)
    expect(mocks.checkAspAccessIndexed).toHaveBeenCalledTimes(2)
    expect(mocks.submitXlmShieldDeposit).toHaveBeenCalledTimes(1)
    expect(sleeps).toEqual([6_000])
    expect(report.prerequisites.aspAccess?.status).toBe('ready')
  })

})

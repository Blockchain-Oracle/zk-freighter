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

describe('submitShieldWithPrerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not start the shield deposit when ASP setup is blocked', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 5_000_000n, USDC: 0n },
    })
    mocks.insertAspMembershipLeaf.mockResolvedValue({
      status: 'blocked',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      leaf: {},
      blockers: ['ASP membership insertion requires admin auth.'],
      statusEvents: [],
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('ASP membership')
    expect(mocks.submitXlmShieldDeposit).not.toHaveBeenCalled()
  })

  it('blocks deposits over the deployed pool limit before setup or proving', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 2_000_000_000n, USDC: 0n },
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000_001n,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('1000000000 raw units')
    expect(mocks.insertAspMembershipLeaf).not.toHaveBeenCalled()
    expect(mocks.submitXlmShieldDeposit).not.toHaveBeenCalled()
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

  it('waits for the submitted shield access leaf to be indexed before proving', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const aspAccessStore = makeMemoryAspAccessStore()
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 5_000_000n, USDC: 0n },
    })
    mocks.insertAspMembershipLeaf.mockResolvedValueOnce({
      status: 'submitted',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      leaf: { membershipLeafHex: '0xabc' },
      txHash: 'abc123',
      explorerUrl: 'https://example.test/tx/abc123',
      blockers: [],
      statusEvents: [],
    })
    mocks.checkAspAccessIndexed.mockResolvedValue({
      status: 'pending',
      network: 'testnet',
      contractId: 'C',
      leafHex: '0xabc',
      blocker: 'Shield access setup is confirmed, but its ASP leaf is not indexed by the bootnode yet.',
    })

    await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 0,
      aspAccessNow: () => 1_000,
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 0,
      aspAccessNow: () => 120_000,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('not indexed')
    expect(mocks.insertAspMembershipLeaf).toHaveBeenCalledTimes(1)
    expect(mocks.checkAspAccessIndexed).toHaveBeenCalledTimes(2)
    expect(mocks.submitXlmShieldDeposit).not.toHaveBeenCalled()
  })

  it('reuses indexed shield access instead of inserting again on retry', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const aspAccessStore = makeMemoryAspAccessStore()
    mocks.loadPublicStellarBalances.mockResolvedValue({
      status: 'loaded',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      balances: { XLM: 5_000_000n, USDC: 0n },
    })
    mocks.insertAspMembershipLeaf.mockResolvedValueOnce({
      status: 'submitted',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
      leaf: { membershipLeafHex: '0xabc' },
      txHash: 'abc123',
      explorerUrl: 'https://example.test/tx/abc123',
      blockers: [],
      statusEvents: [],
    })
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

    await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 0,
      aspAccessNow: () => 1_000,
    })
    mocks.checkAspAccessIndexed.mockResolvedValue({
      status: 'indexed',
      network: 'testnet',
      contractId: 'C',
      leafHex: '0xabc',
      ledger: 3383120,
      leafIndex: '40',
      root: '123',
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessConfirmWaitMs: 0,
      aspAccessNow: () => 120_000,
    })

    expect(mocks.insertAspMembershipLeaf).toHaveBeenCalledTimes(1)
    expect(mocks.checkAspAccessIndexed).toHaveBeenCalledTimes(2)
    expect(mocks.submitXlmShieldDeposit).toHaveBeenCalledTimes(1)
    expect(report.status).toBe('submitted')
    expect(report.prerequisites.aspAccess?.status).toBe('ready')
    expect(report.prerequisites.aspIndex?.status).toBe('indexed')
  })
})

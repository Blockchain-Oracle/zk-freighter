import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeMemoryAspAccessStore } from './asp-access-state'
import { deriveWalletIdentity } from './identity'
import { submitShieldWithPrerequisites } from './shield-orchestration'

const mocks = vi.hoisted(() => ({
  loadPublicStellarBalances: vi.fn(),
  insertAspMembershipLeaf: vi.fn(),
  submitXlmShieldDeposit: vi.fn(),
}))

vi.mock('./stellar-balance', () => ({
  loadPublicStellarBalances: mocks.loadPublicStellarBalances,
}))

vi.mock('./asp-membership-insert', () => ({
  insertAspMembershipLeaf: mocks.insertAspMembershipLeaf,
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

  it('submits shield access once and waits before proving', async () => {
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
      explorerUrl: 'https://example.test/tx/abc123',
      blockers: [],
      statusEvents: [],
    })

    const report = await submitShieldWithPrerequisites({
      asset: 'XLM',
      identity,
      network: 'testnet',
      amountStroops: 1_000_000n,
      aspAccessStore,
      aspAccessNow: () => 1_000,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('Shield access is confirming')
    expect(report.prerequisites.aspInsert?.txHash).toBe('abc123')
    expect(mocks.submitXlmShieldDeposit).not.toHaveBeenCalled()
  })

  it('reuses submitted shield access instead of inserting again on retry', async () => {
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

    expect(mocks.insertAspMembershipLeaf).toHaveBeenCalledTimes(1)
    expect(mocks.submitXlmShieldDeposit).toHaveBeenCalledTimes(1)
    expect(report.status).toBe('submitted')
    expect(report.prerequisites.aspAccess?.status).toBe('ready')
  })
})

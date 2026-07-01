import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})

import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './../identity'
import {
  submitConfidentialDeposit,
  submitConfidentialMerge,
  type ConfidentialSubmitOptions,
} from './soroban'

// These cover the deterministic pre-network guards. The full
// simulate→assemble→sign→submit→confirm happy path is proven against real
// testnet (no-fakes ethos: we don't stub Soroban simulation responses).

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const identity = deriveWalletIdentity(mnemonic, 'testnet')

const baseOptions = (overrides: Partial<ConfidentialSubmitOptions> = {}): ConfidentialSubmitOptions => ({
  identity,
  network: 'testnet',
  ...overrides,
})

describe('confidential soroban client guards', () => {
  it('blocks confidential ops on mainnet (testnet-only product rule)', async () => {
    const report = await submitConfidentialMerge(baseOptions({ network: 'mainnet' }))
    expect(report.status).toBe('blocked')
    expect(report.op).toBe('merge')
    expect(report.blockers[0]).toMatch(/testnet only/i)
    expect(report.txHash).toBeUndefined()
  })

  it('rejects a negative deposit amount before touching the network', async () => {
    const report = await submitConfidentialDeposit({ ...baseOptions(), amount: -1n })
    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toMatch(/non-negative/i)
    expect(report.txHash).toBeUndefined()
  })

  it('exposes the deployed testnet contract id on a blocked report', async () => {
    const report = await submitConfidentialDeposit({ ...baseOptions(), amount: -1n })
    expect(report.contractId).toBe('CDNN7XDLNAHE6BPS3CV3VJQLMUDBFULCEJFOKDGEGQ5N3O7QZ4YMLEF7')
  })
})

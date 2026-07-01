import { Account, Keypair } from '@stellar/stellar-sdk'
import { describe, expect, it, vi } from 'vitest'
import { deriveWalletIdentity } from './identity'
import { getNetworkConfig } from './networks'
import { submitPublicStellarPayment } from './stellar-payment'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function account(publicKey: string, balances: readonly unknown[], subentryCount = 0): Account {
  const value = new Account(publicKey, '1') as Account & {
    balances?: readonly unknown[]
    subentry_count?: number
  }
  value.balances = balances
  value.subentry_count = subentryCount
  return value
}

describe('submitPublicStellarPayment', () => {
  it('blocks invalid public recipients before loading Horizon', async () => {
    const report = await submitPublicStellarPayment({
      identity: deriveWalletIdentity(mnemonic, 'testnet'),
      network: 'testnet',
      asset: 'XLM',
      amountStroops: 1_000_000n,
      recipientAddress: 'not-a-stellar-address',
      horizonFactory: () => {
        throw new Error('should not load horizon')
      },
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('valid public Stellar address')
  })

  it('blocks USDC sends when the recipient lacks the canonical trustline', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const recipient = Keypair.random().publicKey()
    const canonicalIssuer = getNetworkConfig('testnet').assets.USDC.issuer
    const horizon = {
      loadAccount: vi.fn(async (address: string) => address === identity.stellarPublicKey
        ? account(address, [
          { asset_type: 'native', balance: '20.0000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: canonicalIssuer, balance: '5.0000000' },
        ], 1)
        : account(address, [{ asset_type: 'native', balance: '5.0000000' }])),
      fetchBaseFee: vi.fn(async () => 100),
      submitTransaction: vi.fn(async () => ({ hash: 'should-not-submit' })),
    }

    const report = await submitPublicStellarPayment({
      identity,
      network: 'testnet',
      asset: 'USDC',
      amountStroops: 1_000_000n,
      recipientAddress: recipient,
      horizonFactory: () => horizon,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('USDC trustline')
    expect(horizon.submitTransaction).not.toHaveBeenCalled()
  })

  it('does not count noncanonical USDC source balances', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const recipient = Keypair.random().publicKey()
    const canonicalIssuer = getNetworkConfig('testnet').assets.USDC.issuer
    const horizon = {
      loadAccount: vi.fn(async (address: string) => address === identity.stellarPublicKey
        ? account(address, [
          { asset_type: 'native', balance: '20.0000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: Keypair.random().publicKey(), balance: '5.0000000' },
        ], 1)
        : account(address, [
          { asset_type: 'native', balance: '5.0000000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: canonicalIssuer, balance: '0.0000000' },
        ])),
      fetchBaseFee: vi.fn(async () => 100),
      submitTransaction: vi.fn(async () => ({ hash: 'should-not-submit' })),
    }

    const report = await submitPublicStellarPayment({
      identity,
      network: 'testnet',
      asset: 'USDC',
      amountStroops: 1_000_000n,
      recipientAddress: recipient,
      horizonFactory: () => horizon,
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('Public USDC balance')
    expect(horizon.submitTransaction).not.toHaveBeenCalled()
  })

  it('submits a valid XLM payment with a real signed transaction', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const recipient = Keypair.random().publicKey()
    const horizon = {
      loadAccount: vi.fn(async (address: string) => account(address, [{ asset_type: 'native', balance: '20.0000000' }])),
      fetchBaseFee: vi.fn(async () => 100),
      submitTransaction: vi.fn(async () => ({ hash: 'public-payment-hash' })),
    }

    const report = await submitPublicStellarPayment({
      identity,
      network: 'testnet',
      asset: 'XLM',
      amountStroops: 1_000_000n,
      recipientAddress: recipient,
      horizonFactory: () => horizon,
    })

    expect(report.status).toBe('submitted')
    expect(report.txHash).toBe('public-payment-hash')
    expect(horizon.submitTransaction).toHaveBeenCalledOnce()
  })
})

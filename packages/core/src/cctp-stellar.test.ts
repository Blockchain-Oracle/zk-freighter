import { Account, Transaction } from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { ensureCctpDestinationReady, ensureStellarUsdcTrustline } from './cctp-stellar'
import { deriveWalletIdentity } from './identity'
import { NETWORKS } from './networks'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const identity = deriveWalletIdentity(mnemonic, 'testnet')
const usdc = NETWORKS.testnet.assets.USDC

interface TestBalance {
  readonly asset_type: string
  readonly asset_code?: string
  readonly asset_issuer?: string
  readonly balance?: string
}

function horizonAccount(balances: readonly TestBalance[], sequence = '1') {
  return Object.assign(new Account(identity.stellarPublicKey, sequence), { balances })
}

describe('CCTP Stellar destination readiness', () => {
  it('does not submit a trustline transaction when USDC is already trusted', async () => {
    let submits = 0
    await ensureCctpDestinationReady({
      identity,
      network: 'testnet',
      attestation: { message: '0x12', attestation: '0x34', status: 'complete' },
      horizonFactory: () => ({
        loadAccount: async () =>
          horizonAccount([{ asset_type: 'credit_alphanum4', asset_code: usdc.code, asset_issuer: usdc.issuer ?? '' }]),
        fetchBaseFee: async () => 100,
        submitTransaction: async () => {
          submits += 1
          return { hash: 'unexpected' }
        },
      }),
    })

    expect(submits).toBe(0)
  })

  it('signs changeTrust when the funded account lacks a USDC trustline', async () => {
    let loads = 0
    let submitted: Transaction | undefined
    await ensureCctpDestinationReady({
      identity,
      network: 'testnet',
      attestation: { message: '0x12', attestation: '0x34', status: 'complete' },
      horizonFactory: () => ({
        loadAccount: async () => {
          loads += 1
          return loads === 1
            ? horizonAccount([{ asset_type: 'native', balance: '10000.0000000' }])
            : horizonAccount([
                { asset_type: 'native', balance: '9999.5000000' },
                { asset_type: 'credit_alphanum4', asset_code: usdc.code, asset_issuer: usdc.issuer ?? '' },
              ])
        },
        fetchBaseFee: async () => 100,
        submitTransaction: async (transaction) => {
          submitted = transaction
          return { hash: 'trustline-hash' }
        },
      }),
    })

    expect(loads).toBe(2)
    expect(submitted).toBeDefined()
  })

  it('returns trustline setup evidence for direct USDC receive preparation', async () => {
    let loads = 0
    const report = await ensureStellarUsdcTrustline({
      identity,
      network: 'testnet',
      horizonFactory: () => ({
        loadAccount: async () => {
          loads += 1
          return loads === 1
            ? horizonAccount([{ asset_type: 'native', balance: '10000.0000000' }])
            : horizonAccount([
                { asset_type: 'native', balance: '9999.5000000' },
                { asset_type: 'credit_alphanum4', asset_code: usdc.code, asset_issuer: usdc.issuer ?? '' },
              ])
        },
        fetchBaseFee: async () => 100,
        submitTransaction: async () => ({ hash: 'trustline-hash' }),
      }),
    })

    expect(report).toMatchObject({
      status: 'created',
      network: 'testnet',
      txHash: 'trustline-hash',
      userAddress: identity.stellarPublicKey,
    })
    expect(report.explorerUrl).toContain('trustline-hash')
  })

  it('returns ready when direct USDC receive preparation sees an existing trustline', async () => {
    const report = await ensureStellarUsdcTrustline({
      identity,
      network: 'testnet',
      horizonFactory: () => ({
        loadAccount: async () =>
          horizonAccount([{ asset_type: 'credit_alphanum4', asset_code: usdc.code, asset_issuer: usdc.issuer ?? '' }]),
        fetchBaseFee: async () => 100,
        submitTransaction: async () => ({ hash: 'unexpected' }),
      }),
    })

    expect(report.status).toBe('ready')
    expect(report.txHash).toBeUndefined()
  })

  it('uses Friendbot before trustline setup when the testnet account is missing', async () => {
    const fetched: string[] = []
    let loads = 0
    await ensureCctpDestinationReady({
      identity,
      network: 'testnet',
      attestation: { message: '0x12', attestation: '0x34', status: 'complete' },
      fetch: async (input) => {
        fetched.push(String(input))
        return Response.json({ hash: 'friendbot-hash' })
      },
      friendbotUrl: 'https://friendbot.example',
      horizonFactory: () => ({
        loadAccount: async () => {
          loads += 1
          if (loads === 1) {
            throw new Error('not found')
          }
          return loads === 2
            ? horizonAccount([{ asset_type: 'native', balance: '10000.0000000' }])
            : horizonAccount([
                { asset_type: 'native', balance: '9999.5000000' },
                { asset_type: 'credit_alphanum4', asset_code: usdc.code, asset_issuer: usdc.issuer ?? '' },
              ])
        },
        fetchBaseFee: async () => 100,
        submitTransaction: async () => ({ hash: 'trustline-hash' }),
      }),
    })

    expect(fetched[0]).toContain('https://friendbot.example?addr=')
    expect(loads).toBe(3)
  })
})

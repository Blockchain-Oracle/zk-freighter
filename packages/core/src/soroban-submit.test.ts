import {
  Account,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import { getNetworkConfig } from './networks'
import {
  bumpInclusionFee,
  signTransactionXdrWithWallet,
  submitPreparedSorobanTx,
  type SorobanSubmitStatus,
} from './soroban-submit'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const hash = 'a'.repeat(64)

function unsignedTransactionXdr(identity = deriveWalletIdentity(mnemonic, 'testnet')): string {
  const network = getNetworkConfig('testnet')
  const account = new Account(identity.stellarPublicKey, '123')
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.passphrase,
  })
    .addOperation(Operation.manageData({ name: 'zkf-test', value: 'submit' }))
    .setTimeout(30)
    .build()

  return transaction.toEnvelope().toXDR('base64')
}

describe('Soroban submit helpers', () => {
  it('signs transaction envelopes with the seed wallet key', () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const network = getNetworkConfig('testnet')
    const signed = signTransactionXdrWithWallet(unsignedTransactionXdr(identity), identity, network.passphrase)
    const envelope = new Transaction(signed, network.passphrase).toEnvelope()

    expect(envelope.v1().signatures()).toHaveLength(1)
  })

  it('submits prepared transactions through an injectable RPC server', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const statuses: SorobanSubmitStatus[] = []
    let submittedEnvelope = ''
    const result = await submitPreparedSorobanTx(
      {
        txXdr: unsignedTransactionXdr(identity),
        authEntries: [],
        latestLedger: 123,
      },
      {
        identity,
        network: 'testnet',
        onStatus: (event) => statuses.push(event),
        sleep: async () => undefined,
        confirmationPolls: 1,
        serverFactory: () => ({
          sendTransaction: async (transaction) => {
            submittedEnvelope = transaction.toEnvelope().toXDR('base64')
            return { hash }
          },
          getLatestLedger: async () => ({ sequence: 123 }),
          getTransaction: async () => ({ status: 'SUCCESS' }),
        }),
      },
    )

    expect(result.hash).toBe(hash)
    expect(result.signedAuthEntryCount).toBe(0)
    expect(submittedEnvelope).not.toBe('')
    expect(statuses.map((event) => event.stage)).toEqual(['sign_tx', 'submit', 'confirm'])
  })

  it('retries RPC submit responses that ask the client to try again later', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const statuses: SorobanSubmitStatus[] = []
    let submitAttempts = 0
    const result = await submitPreparedSorobanTx(
      {
        txXdr: unsignedTransactionXdr(identity),
        authEntries: [],
        latestLedger: 123,
      },
      {
        identity,
        network: 'testnet',
        onStatus: (event) => statuses.push(event),
        sleep: async () => undefined,
        serverFactory: () => ({
          sendTransaction: async () => {
            submitAttempts += 1
            return { hash, status: submitAttempts === 1 ? 'TRY_AGAIN_LATER' : 'PENDING' }
          },
          getLatestLedger: async () => ({ sequence: 123 }),
          getTransaction: async () => ({ status: 'SUCCESS' }),
        }),
      },
    )

    expect(result.hash).toBe(hash)
    expect(submitAttempts).toBe(2)
    expect(statuses.filter((event) => event.stage === 'submit')).toHaveLength(2)
  })

  it('bumps the tx inclusion fee before signing and is a no-op for zero/negative', () => {
    const base = Number(BASE_FEE)
    const bumped = new Transaction(bumpInclusionFee(unsignedTransactionXdr(), 1_000_000), getNetworkConfig('testnet').passphrase)
    expect(Number(bumped.fee)).toBe(base + 1_000_000)

    const original = unsignedTransactionXdr()
    expect(bumpInclusionFee(original, 0)).toBe(original)
    expect(bumpInclusionFee(original, -5)).toBe(original)
  })

  it('fails closed for malformed prepared transactions', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')

    await expect(
      submitPreparedSorobanTx(
        {
          txXdr: '',
          authEntries: [],
          latestLedger: 123,
        },
        { identity, network: 'testnet' },
      ),
    ).rejects.toThrow('Invalid prepared txXdr')
  })
})

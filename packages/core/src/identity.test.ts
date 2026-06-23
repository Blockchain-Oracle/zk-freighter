import { describe, expect, it } from 'vitest'
import { bytesToHex } from './bytes'
import {
  KEY_DERIVATION_MESSAGE,
  STELLAR_DERIVATION_PATH,
  deriveWalletKeypair,
  deriveWalletIdentity,
  generateSeedPhrase,
  validateSeedPhrase,
} from './identity'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const otherMnemonic =
  'legal winner thank year wave sausage worth useful legal winner thank yellow'

describe('wallet identity', () => {
  it('generates valid 12-word seed phrases', () => {
    const phrase = generateSeedPhrase()

    expect(phrase.split(' ')).toHaveLength(12)
    expect(validateSeedPhrase(phrase)).toBe(true)
  })

  it('derives the same Stellar account and receive identity from the same seed', () => {
    const first = deriveWalletIdentity(mnemonic, 'testnet')
    const second = deriveWalletIdentity(mnemonic, 'testnet')
    const keypair = deriveWalletKeypair(mnemonic)

    expect(first.stellarPublicKey).toBe(second.stellarPublicKey)
    expect(keypair.publicKey()).toBe(first.stellarPublicKey)
    expect(first.derivationPath).toBe(STELLAR_DERIVATION_PATH)
    expect(second.derivationPath).toBe(STELLAR_DERIVATION_PATH)
    expect(bytesToHex(first.privateReceive.notePublicKey)).toBe(
      bytesToHex(second.privateReceive.notePublicKey),
    )
    expect(first.keyDerivationSignature).toHaveLength(64)
    expect(KEY_DERIVATION_MESSAGE).toBe('Privacy Pool Key Derivation [v1]')
  })

  it('derives different receive identities from different seeds', () => {
    const first = deriveWalletIdentity(mnemonic, 'testnet')
    const second = deriveWalletIdentity(otherMnemonic, 'testnet')

    expect(first.stellarPublicKey).not.toBe(second.stellarPublicKey)
    expect(bytesToHex(first.privateReceive.notePublicKey)).not.toBe(
      bytesToHex(second.privateReceive.notePublicKey),
    )
  })

  it('network-scopes ASP membership blinding without changing receive keys', () => {
    const testnet = deriveWalletIdentity(mnemonic, 'testnet')
    const mainnet = deriveWalletIdentity(mnemonic, 'mainnet')

    expect(bytesToHex(testnet.privateReceive.notePublicKey)).toBe(
      bytesToHex(mainnet.privateReceive.notePublicKey),
    )
    expect(bytesToHex(testnet.privateReceive.encryptionPublicKey)).toBe(
      bytesToHex(mainnet.privateReceive.encryptionPublicKey),
    )
    expect(bytesToHex(testnet.privateReceive.membershipBlinding)).not.toBe(
      bytesToHex(mainnet.privateReceive.membershipBlinding),
    )
  })
})

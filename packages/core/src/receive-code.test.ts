import { describe, expect, it } from 'vitest'
import { bytesToHex } from './bytes'
import { deriveWalletIdentity } from './identity'
import { NETWORKS, isShieldedAssetEnabled } from './networks'
import { decodeReceiveCode, encodeReceiveCode } from './receive-code'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('receive code', () => {
  it('roundtrips zkf bech32m payloads', () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const code = encodeReceiveCode({
      version: 1,
      network: 'testnet',
      notePublicKey: identity.privateReceive.notePublicKey,
      encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
    })
    const decoded = decodeReceiveCode(code)

    expect(code.startsWith('zkf1')).toBe(true)
    expect(decoded.ok).toBe(true)

    if (decoded.ok) {
      expect(decoded.value.network).toBe('testnet')
      expect(bytesToHex(decoded.value.notePublicKey)).toBe(
        bytesToHex(identity.privateReceive.notePublicKey),
      )
      expect(bytesToHex(decoded.value.encryptionPublicKey)).toBe(
        bytesToHex(identity.privateReceive.encryptionPublicKey),
      )
    }
  })

  it('imports and reloads the same phrase to the same receive code', () => {
    const first = deriveWalletIdentity(mnemonic, 'testnet')
    const second = deriveWalletIdentity(mnemonic, 'testnet')

    expect(
      encodeReceiveCode({
        version: 1,
        network: 'testnet',
        notePublicKey: first.privateReceive.notePublicKey,
        encryptionPublicKey: first.privateReceive.encryptionPublicKey,
      }),
    ).toBe(
      encodeReceiveCode({
        version: 1,
        network: 'testnet',
        notePublicKey: second.privateReceive.notePublicKey,
        encryptionPublicKey: second.privateReceive.encryptionPublicKey,
      }),
    )
  })

  it('fails closed for malformed receive codes', () => {
    expect(decodeReceiveCode('zkf1not-a-real-code').ok).toBe(false)
    expect(decodeReceiveCode('abc1qqqqqq').ok).toBe(false)
  })

  it('keeps network gates correct for testnet and mainnet', () => {
    expect(NETWORKS.testnet.passphrase).toBe('Test SDF Network ; September 2015')
    expect(NETWORKS.mainnet.passphrase).toBe('Public Global Stellar Network ; September 2015')
    expect(isShieldedAssetEnabled('testnet', 'XLM')).toBe(true)
    expect(isShieldedAssetEnabled('testnet', 'USDC')).toBe(true)
    expect(isShieldedAssetEnabled('mainnet', 'XLM')).toBe(false)
    expect(isShieldedAssetEnabled('mainnet', 'USDC')).toBe(false)
  })
})

import { x25519 } from '@noble/curves/ed25519.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { generateMnemonic as generateBip39Mnemonic, mnemonicToSeedSync, validateMnemonic as validateBip39Mnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { Keypair } from '@stellar/stellar-sdk'
import type { NetworkKey } from './networks'
import {
  BYTE_LENGTH_16,
  BYTE_LENGTH_64,
  assertByteLength,
  bytesToHex,
  concatBytes,
  normalizeMnemonic,
  reduceBytesToBn254ScalarLE,
  utf8ToBytes,
} from './bytes'
import { deriveNotePublicKeyFromPrivateKey } from './poseidon2-bn254'

export const STELLAR_ACCOUNT_INDEX = 0
export const STELLAR_DERIVATION_PATH = "m/44'/148'/0'"
export const KEY_DERIVATION_MESSAGE = 'Privacy Pool Key Derivation [v1]'
export const SEED_PHRASE_WORD_COUNT = 12

const MNEMONIC_ENTROPY_BITS = 128
const HARDENED_OFFSET = 0x80000000
const ED25519_SEED_DOMAIN = utf8ToBytes('ed25519 seed')
const STELLAR_HD_PATH_SEGMENTS = [44, 148, 0] as const
const NOTE_KEY_DOMAIN = utf8ToBytes('privacy-pool/note-key/v1')
const ENCRYPTION_KEY_DOMAIN = utf8ToBytes('privacy-pool/encryption-key/v1')
const MEMBERSHIP_BLINDING_DOMAIN = utf8ToBytes('privacy-pool/asp-secret/v1')
const contextSeparator = new Uint8Array([0])

export interface PrivateReceiveIdentity {
  readonly notePrivateKey: Uint8Array
  readonly notePublicKey: Uint8Array
  readonly encryptionPrivateKey: Uint8Array
  readonly encryptionPublicKey: Uint8Array
  readonly membershipBlinding: Uint8Array
}

export interface WalletIdentity {
  readonly mnemonic: string
  readonly stellarPublicKey: string
  readonly derivationPath: typeof STELLAR_DERIVATION_PATH
  readonly keyDerivationSignature: Uint8Array
  readonly privateReceive: PrivateReceiveIdentity
}

export interface WalletPublicView {
  readonly stellarPublicKey: string
  readonly derivationPath: typeof STELLAR_DERIVATION_PATH
  readonly notePublicKeyHex: string
  readonly encryptionPublicKeyHex: string
}

function signatureHash(domain: Uint8Array, signature: Uint8Array): Uint8Array {
  return sha256(concatBytes(domain, signature))
}

function signatureHashWithContext(
  domain: Uint8Array,
  context: string,
  signature: Uint8Array,
): Uint8Array {
  return sha256(concatBytes(domain, contextSeparator, utf8ToBytes(context), contextSeparator, signature))
}

function uint32BE(value: number): Uint8Array {
  const out = new Uint8Array(4)
  out[0] = value >>> 24
  out[1] = value >>> 16
  out[2] = value >>> 8
  out[3] = value
  return out
}

function deriveHardenedChild(key: Uint8Array, chainCode: Uint8Array, segment: number) {
  const index = segment + HARDENED_OFFSET
  const seed = concatBytes(new Uint8Array([0]), key, uint32BE(index))
  const digest = hmac(sha512, chainCode, seed)

  return {
    key: digest.slice(0, 32),
    chainCode: digest.slice(32),
  }
}

function deriveStellarAccountSeed(mnemonic: string): Uint8Array {
  const root = hmac(sha512, ED25519_SEED_DOMAIN, mnemonicToSeedSync(mnemonic))
  let key = root.slice(0, 32)
  let chainCode = root.slice(32)

  for (const segment of STELLAR_HD_PATH_SEGMENTS) {
    const child = deriveHardenedChild(key, chainCode, segment)
    key = child.key
    chainCode = child.chainCode
  }

  return key
}

export function deriveWalletKeypair(mnemonic: string): Keypair {
  const normalized = normalizeMnemonic(mnemonic)

  if (!validateSeedPhrase(normalized)) {
    throw new Error('Invalid 12-word seed phrase')
  }

  return Keypair.fromRawEd25519Seed(
    deriveStellarAccountSeed(normalized) as Parameters<typeof Keypair.fromRawEd25519Seed>[0],
  )
}

export function generateSeedPhrase(): string {
  return generateBip39Mnemonic(wordlist, MNEMONIC_ENTROPY_BITS)
}

export function validateSeedPhrase(mnemonic: string): boolean {
  const normalized = normalizeMnemonic(mnemonic)
  const wordCount = normalized.split(' ').filter(Boolean).length
  return wordCount === SEED_PHRASE_WORD_COUNT && validateBip39Mnemonic(normalized, wordlist)
}

export function derivePrivateReceiveIdentity(
  signature: Uint8Array,
  network: NetworkKey,
): PrivateReceiveIdentity {
  assertByteLength(signature, BYTE_LENGTH_64, 'key derivation signature')

  const notePrivateKey = reduceBytesToBn254ScalarLE(signatureHash(NOTE_KEY_DOMAIN, signature))
  const notePublicKey = deriveNotePublicKeyFromPrivateKey(notePrivateKey)
  const encryptionPrivateKey = signatureHash(ENCRYPTION_KEY_DOMAIN, signature)
  const encryptionPublicKey = x25519.getPublicKey(encryptionPrivateKey)
  const membershipBlinding = reduceBytesToBn254ScalarLE(
    signatureHashWithContext(MEMBERSHIP_BLINDING_DOMAIN, network, signature),
  )

  return {
    notePrivateKey,
    notePublicKey,
    encryptionPrivateKey,
    encryptionPublicKey,
    membershipBlinding,
  }
}

export function deriveWalletIdentity(mnemonic: string, network: NetworkKey): WalletIdentity {
  const normalized = normalizeMnemonic(mnemonic)

  if (!validateSeedPhrase(normalized)) {
    throw new Error('Invalid 12-word seed phrase')
  }

  const keypair = deriveWalletKeypair(normalized)
  const signature = new Uint8Array(
    keypair.sign(utf8ToBytes(KEY_DERIVATION_MESSAGE) as Parameters<typeof keypair.sign>[0]),
  )

  return {
    mnemonic: normalized,
    stellarPublicKey: keypair.publicKey(),
    derivationPath: STELLAR_DERIVATION_PATH,
    keyDerivationSignature: signature,
    privateReceive: derivePrivateReceiveIdentity(signature, network),
  }
}

export function getWalletPublicView(identity: WalletIdentity): WalletPublicView {
  return {
    stellarPublicKey: identity.stellarPublicKey,
    derivationPath: identity.derivationPath,
    notePublicKeyHex: bytesToHex(identity.privateReceive.notePublicKey),
    encryptionPublicKeyHex: bytesToHex(identity.privateReceive.encryptionPublicKey),
  }
}

export function createRandomVaultSalt(): Uint8Array {
  const salt = new Uint8Array(BYTE_LENGTH_16)
  globalThis.crypto.getRandomValues(salt)
  return salt
}

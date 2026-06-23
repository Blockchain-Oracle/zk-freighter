import { BYTE_LENGTH_12, BYTE_LENGTH_16, bytesToUtf8, utf8ToBytes } from './bytes'
import { validateSeedPhrase } from './identity'
import { createErr, createOk, type Result } from './result'

export const VAULT_VERSION = 1

const AES_KEY_BITS = 256
const GCM_IV_BYTES = 12
const KDF_ITERATIONS = 210_000
const kdfName = 'PBKDF2'
const kdfHash = 'SHA-256'
const cipherName = 'AES-GCM'

export type VaultError =
  | 'corrupt-vault'
  | 'crypto-unavailable'
  | 'invalid-mnemonic'
  | 'invalid-password'
  | 'unsupported-vault'

export interface EncryptedVault {
  readonly version: typeof VAULT_VERSION
  readonly createdAt: string
  readonly kdf: {
    readonly name: typeof kdfName
    readonly hash: typeof kdfHash
    readonly iterations: number
    readonly salt: string
  }
  readonly cipher: {
    readonly name: typeof cipherName
    readonly iv: string
  }
  readonly payload: string
}

function requireSubtleCrypto(): Result<SubtleCrypto, VaultError> {
  const subtle = globalThis.crypto?.subtle
  return subtle ? createOk(subtle) : createErr('crypto-unavailable')
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return globalThis.btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  if (!/^[+/=0-9A-Za-z]+$/.test(value)) {
    throw new Error('Invalid base64')
  }

  const binary = globalThis.atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy.buffer
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  subtle: SubtleCrypto,
): Promise<CryptoKey> {
  const material = await subtle.importKey('raw', toArrayBuffer(utf8ToBytes(password)), kdfName, false, [
    'deriveKey',
  ])

  return subtle.deriveKey(
    { name: kdfName, salt: toArrayBuffer(salt), iterations: KDF_ITERATIONS, hash: kdfHash },
    material,
    { name: cipherName, length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function createEncryptedVault(
  mnemonic: string,
  password: string,
): Promise<Result<EncryptedVault, VaultError>> {
  if (!validateSeedPhrase(mnemonic)) {
    return createErr('invalid-mnemonic')
  }

  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) {
    return cryptoResult
  }

  const salt = randomBytes(BYTE_LENGTH_16)
  const iv = randomBytes(GCM_IV_BYTES)
  const key = await deriveAesKey(password, salt, cryptoResult.value)
  const encrypted = await cryptoResult.value.encrypt(
    { name: cipherName, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(utf8ToBytes(mnemonic)),
  )

  return createOk({
    version: VAULT_VERSION,
    createdAt: new Date().toISOString(),
    kdf: {
      name: kdfName,
      hash: kdfHash,
      iterations: KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: cipherName,
      iv: bytesToBase64(iv),
    },
    payload: bytesToBase64(new Uint8Array(encrypted)),
  })
}

export async function unlockEncryptedVault(
  vault: EncryptedVault,
  password: string,
): Promise<Result<string, VaultError>> {
  if (vault.version !== VAULT_VERSION || vault.kdf.name !== kdfName || vault.cipher.name !== cipherName) {
    return createErr('unsupported-vault')
  }

  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) {
    return cryptoResult
  }

  let salt: Uint8Array
  let iv: Uint8Array
  let payload: Uint8Array

  try {
    salt = base64ToBytes(vault.kdf.salt)
    iv = base64ToBytes(vault.cipher.iv)
    payload = base64ToBytes(vault.payload)
  } catch {
    return createErr('corrupt-vault')
  }

  if (salt.length !== BYTE_LENGTH_16 || iv.length !== GCM_IV_BYTES || payload.length <= BYTE_LENGTH_12) {
    return createErr('corrupt-vault')
  }

  try {
    const key = await deriveAesKey(password, salt, cryptoResult.value)
    const decrypted = await cryptoResult.value.decrypt(
      { name: cipherName, iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(payload),
    )
    const mnemonic = bytesToUtf8(new Uint8Array(decrypted))
    return validateSeedPhrase(mnemonic) ? createOk(mnemonic) : createErr('corrupt-vault')
  } catch {
    return createErr('invalid-password')
  }
}

export function parseEncryptedVault(value: string): Result<EncryptedVault, VaultError> {
  try {
    const parsed = JSON.parse(value) as EncryptedVault

    if (!parsed || typeof parsed !== 'object' || typeof parsed.payload !== 'string') {
      return createErr('corrupt-vault')
    }

    return createOk(parsed)
  } catch {
    return createErr('corrupt-vault')
  }
}

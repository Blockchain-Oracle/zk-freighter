import { BYTE_LENGTH_12, BYTE_LENGTH_32, bytesToUtf8, utf8ToBytes } from './bytes'
import { PASSKEY_ENVELOPE_VERSION, type PasskeyEnvelope, type PasskeyError, type WebAuthnPrfClient } from './passkey'
import { createErr, createOk, type Result } from './result'
import { validateSeedPhrase } from './identity'

const aesKeyBits = 256
const cipherName = 'AES-GCM'
const kdfName = 'HKDF'
const kdfHash = 'SHA-256'
const publicKeyType = 'public-key'
const coseEs256Alg = -7
const coseRs256Alg = -257
const userVerification = 'required'
const passkeyInfo = 'ZK Freighter passkey vault v1'
const defaultRpName = 'ZK Freighter'
const challengeBytes = BYTE_LENGTH_32
const userHandleBytes = BYTE_LENGTH_32
const prfSaltBytes = BYTE_LENGTH_32

export interface PasskeyCreateMaterial {
  readonly credentialId: string
  readonly userHandle: string
  readonly rpId?: string
  readonly prfSalt: string
  readonly prfOutput: string
}

export interface PasskeyUnlockMaterial {
  readonly credentialId: string
  readonly rpId?: string
  readonly prfSalt: string
  readonly prfOutput: string
}

export interface CreatePasskeyMaterialOptions {
  readonly userName: string
  readonly displayName?: string
  readonly rpId?: string
  readonly rpName?: string
  readonly client?: WebAuthnPrfClient
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy.buffer
}

function sourceToBytes(value: BufferSource): Uint8Array {
  const view = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value)
  const copy = new Uint8Array(view.length)
  copy.set(view)
  return copy
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[\w-]+$/u.test(value)) throw new Error('Invalid base64url')
  const padded = `${value.replace(/-/g, '+').replace(/_/g, '/')}${'='.repeat((4 - (value.length % 4)) % 4)}`
  const binary = globalThis.atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function browserClient(): Result<WebAuthnPrfClient, PasskeyError> {
  const credentials = globalThis.navigator?.credentials
  if (!credentials?.create || !credentials.get || !globalThis.PublicKeyCredential) return createErr('webauthn-unavailable')
  return createOk({
    create: (options) => credentials.create(options) as Promise<PublicKeyCredential | null>,
    get: (options) => credentials.get(options) as Promise<PublicKeyCredential | null>,
  })
}

function ceremonyError(error: unknown): PasskeyError {
  return error instanceof DOMException && error.name === 'SecurityError' ? 'webauthn-unavailable' : 'ceremony-cancelled'
}

function requireSubtleCrypto(): Result<SubtleCrypto, PasskeyError> {
  return globalThis.crypto?.subtle ? createOk(globalThis.crypto.subtle) : createErr('crypto-unavailable')
}

function prfResult(credential: PublicKeyCredential): Result<Uint8Array, PasskeyError> {
  const first = credential.getClientExtensionResults().prf?.results?.first
  if (!first) return createErr('prf-unsupported')
  const bytes = sourceToBytes(first)
  return bytes.length === BYTE_LENGTH_32 ? createOk(bytes) : createErr('prf-unsupported')
}

async function deriveAesKey(prfOutput: Uint8Array, salt: Uint8Array, subtle: SubtleCrypto): Promise<CryptoKey> {
  const material = await subtle.importKey('raw', toArrayBuffer(prfOutput), kdfName, false, ['deriveKey'])
  return subtle.deriveKey(
    { name: kdfName, hash: kdfHash, salt: toArrayBuffer(salt), info: toArrayBuffer(utf8ToBytes(passkeyInfo)) },
    material,
    { name: cipherName, length: aesKeyBits },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function getPrfOutput(client: WebAuthnPrfClient, credentialId: string, salt: Uint8Array, rpId?: string): Promise<Result<Uint8Array, PasskeyError>> {
  try {
    const credential = await client.get({
      publicKey: {
        challenge: toArrayBuffer(randomBytes(challengeBytes)),
        allowCredentials: [{ id: toArrayBuffer(base64UrlToBytes(credentialId)), type: publicKeyType }],
        rpId,
        userVerification,
        extensions: { prf: { evalByCredential: { [credentialId]: { first: toArrayBuffer(salt) } } } },
      },
    })
    return credential ? prfResult(credential) : createErr('ceremony-cancelled')
  } catch (error) {
    return createErr(ceremonyError(error))
  }
}

export async function createPasskeyMaterial(options: CreatePasskeyMaterialOptions): Promise<Result<PasskeyCreateMaterial, PasskeyError>> {
  const clientResult = options.client ? createOk(options.client) : browserClient()
  if (!clientResult.ok) return clientResult
  const prfSalt = randomBytes(prfSaltBytes)
  const userHandle = randomBytes(userHandleBytes)
  let credential: PublicKeyCredential | null
  try {
    credential = await clientResult.value.create({
      publicKey: {
        challenge: toArrayBuffer(randomBytes(challengeBytes)),
        rp: { id: options.rpId, name: options.rpName ?? defaultRpName },
        user: { id: toArrayBuffer(userHandle), name: options.userName, displayName: options.displayName ?? options.userName },
        pubKeyCredParams: [{ alg: coseEs256Alg, type: publicKeyType }, { alg: coseRs256Alg, type: publicKeyType }],
        authenticatorSelection: { residentKey: 'preferred', userVerification },
        extensions: { prf: { eval: { first: toArrayBuffer(prfSalt) } } },
      },
    })
  } catch (error) {
    return createErr(ceremonyError(error))
  }
  if (!credential) return createErr('ceremony-cancelled')
  if (credential.getClientExtensionResults().prf?.enabled !== true) return createErr('prf-unsupported')
  const credentialId = bytesToBase64Url(sourceToBytes(credential.rawId))
  const prfOutput = prfResult(credential)
  const output = prfOutput.ok ? prfOutput : await getPrfOutput(clientResult.value, credentialId, prfSalt, options.rpId)
  if (!output.ok) return output
  return createOk({ credentialId, userHandle: bytesToBase64Url(userHandle), rpId: options.rpId, prfSalt: bytesToBase64Url(prfSalt), prfOutput: bytesToBase64Url(output.value) })
}

export async function createPasskeyEnvelopeFromMaterial(options: { readonly mnemonic: string; readonly material: PasskeyCreateMaterial }): Promise<Result<PasskeyEnvelope, PasskeyError>> {
  if (!validateSeedPhrase(options.mnemonic)) return createErr('invalid-mnemonic')
  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) return cryptoResult
  const iv = randomBytes(BYTE_LENGTH_12)
  const key = await deriveAesKey(base64UrlToBytes(options.material.prfOutput), base64UrlToBytes(options.material.prfSalt), cryptoResult.value)
  const encrypted = await cryptoResult.value.encrypt({ name: cipherName, iv: toArrayBuffer(iv) }, key, toArrayBuffer(utf8ToBytes(options.mnemonic)))
  return createOk({
    version: PASSKEY_ENVELOPE_VERSION,
    createdAt: new Date().toISOString(),
    credentialId: options.material.credentialId,
    userHandle: options.material.userHandle,
    rpId: options.material.rpId,
    prfSalt: options.material.prfSalt,
    kdf: { name: kdfName, hash: kdfHash, info: passkeyInfo },
    cipher: { name: cipherName, iv: bytesToBase64Url(iv) },
    payload: bytesToBase64Url(new Uint8Array(encrypted)),
  })
}

export async function getPasskeyUnlockMaterial(options: { readonly envelope: PasskeyEnvelope; readonly client?: WebAuthnPrfClient }): Promise<Result<PasskeyUnlockMaterial, PasskeyError>> {
  const clientResult = options.client ? createOk(options.client) : browserClient()
  if (!clientResult.ok) return clientResult
  const salt = base64UrlToBytes(options.envelope.prfSalt)
  const output = await getPrfOutput(clientResult.value, options.envelope.credentialId, salt, options.envelope.rpId)
  if (!output.ok) return output
  return createOk({ credentialId: options.envelope.credentialId, rpId: options.envelope.rpId, prfSalt: options.envelope.prfSalt, prfOutput: bytesToBase64Url(output.value) })
}

export async function unlockPasskeyEnvelopeFromMaterial(options: { readonly envelope: PasskeyEnvelope; readonly material: PasskeyUnlockMaterial }): Promise<Result<string, PasskeyError>> {
  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) return cryptoResult
  try {
    if (options.material.credentialId !== options.envelope.credentialId || options.material.prfSalt !== options.envelope.prfSalt) return createErr('passkey-mismatch')
    const key = await deriveAesKey(base64UrlToBytes(options.material.prfOutput), base64UrlToBytes(options.envelope.prfSalt), cryptoResult.value)
    const decrypted = await cryptoResult.value.decrypt(
      { name: cipherName, iv: toArrayBuffer(base64UrlToBytes(options.envelope.cipher.iv)) },
      key,
      toArrayBuffer(base64UrlToBytes(options.envelope.payload)),
    )
    const mnemonic = bytesToUtf8(new Uint8Array(decrypted))
    return validateSeedPhrase(mnemonic) ? createOk(mnemonic) : createErr('passkey-mismatch')
  } catch {
    return createErr('passkey-mismatch')
  }
}

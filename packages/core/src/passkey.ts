import { BYTE_LENGTH_12, BYTE_LENGTH_32, bytesToUtf8, utf8ToBytes } from './bytes'
import { validateSeedPhrase } from './identity'
import { createErr, createOk, type Result } from './result'

export const PASSKEY_ENVELOPE_VERSION = 1

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

export type PasskeyError =
  | 'ceremony-cancelled'
  | 'corrupt-passkey'
  | 'crypto-unavailable'
  | 'invalid-mnemonic'
  | 'passkey-mismatch'
  | 'prf-unsupported'
  | 'webauthn-unavailable'

export interface PasskeyEnvelope {
  readonly version: typeof PASSKEY_ENVELOPE_VERSION
  readonly createdAt: string
  readonly credentialId: string
  readonly userHandle: string
  readonly rpId?: string
  readonly prfSalt: string
  readonly kdf: {
    readonly name: typeof kdfName
    readonly hash: typeof kdfHash
    readonly info: typeof passkeyInfo
  }
  readonly cipher: {
    readonly name: typeof cipherName
    readonly iv: string
  }
  readonly payload: string
}

export interface PasskeySupportReport {
  readonly webauthnAvailable: boolean
  readonly publicKeyCredentialAvailable: boolean
  readonly platformAuthenticatorAvailable: boolean | null
  readonly clientCapabilities: Readonly<Record<string, boolean>> | null
  readonly userAgent: string
}

export interface WebAuthnPrfClient {
  readonly create: (options: CredentialCreationOptions) => Promise<PublicKeyCredential | null>
  readonly get: (options: CredentialRequestOptions) => Promise<PublicKeyCredential | null>
}

export interface CreatePasskeyEnvelopeOptions {
  readonly mnemonic: string
  readonly userName: string
  readonly displayName?: string
  readonly rpId?: string
  readonly rpName?: string
  readonly client?: WebAuthnPrfClient
}

export interface UnlockPasskeyEnvelopeOptions {
  readonly envelope: PasskeyEnvelope
  readonly client?: WebAuthnPrfClient
}

function requireSubtleCrypto(): Result<SubtleCrypto, PasskeyError> {
  const subtle = globalThis.crypto?.subtle
  return subtle ? createOk(subtle) : createErr('crypto-unavailable')
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
  const view = ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : new Uint8Array(value)
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
  if (!credentials?.create || !credentials.get || !globalThis.PublicKeyCredential) {
    return createErr('webauthn-unavailable')
  }
  return createOk({
    create: (options) => credentials.create(options) as Promise<PublicKeyCredential | null>,
    get: (options) => credentials.get(options) as Promise<PublicKeyCredential | null>,
  })
}

function ceremonyError(error: unknown): PasskeyError {
  return error instanceof DOMException && error.name === 'SecurityError' ? 'webauthn-unavailable' : 'ceremony-cancelled'
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

async function getPrfOutput(
  client: WebAuthnPrfClient,
  credentialId: string,
  salt: Uint8Array,
  rpId?: string,
): Promise<Result<Uint8Array, PasskeyError>> {
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

export async function getPasskeySupportReport(): Promise<PasskeySupportReport> {
  const credentialClass = globalThis.PublicKeyCredential
  const credentials = globalThis.navigator?.credentials as Partial<CredentialsContainer> | undefined
  const webauthnAvailable = Boolean(
    typeof credentials?.create === 'function' && typeof credentials.get === 'function',
  )
  const platformAuthenticatorAvailable = credentialClass?.isUserVerifyingPlatformAuthenticatorAvailable
    ? await credentialClass.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => null)
    : null
  const clientCapabilities = credentialClass?.getClientCapabilities
    ? await credentialClass.getClientCapabilities().catch(() => null)
    : null

  return {
    webauthnAvailable,
    publicKeyCredentialAvailable: Boolean(credentialClass),
    platformAuthenticatorAvailable,
    clientCapabilities,
    userAgent: globalThis.navigator?.userAgent ?? 'unknown',
  }
}

export async function createPasskeyEnvelope(
  options: CreatePasskeyEnvelopeOptions,
): Promise<Result<PasskeyEnvelope, PasskeyError>> {
  if (!validateSeedPhrase(options.mnemonic)) return createErr('invalid-mnemonic')
  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) return cryptoResult
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
        user: {
          id: toArrayBuffer(userHandle),
          name: options.userName,
          displayName: options.displayName ?? options.userName,
        },
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
  const createPrf = prfResult(credential)
  const prfOutput = createPrf.ok
    ? createPrf
    : await getPrfOutput(clientResult.value, credentialId, prfSalt, options.rpId)
  if (!prfOutput.ok) return prfOutput

  const iv = randomBytes(BYTE_LENGTH_12)
  const key = await deriveAesKey(prfOutput.value, prfSalt, cryptoResult.value)
  const encrypted = await cryptoResult.value.encrypt(
    { name: cipherName, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(utf8ToBytes(options.mnemonic)),
  )

  return createOk({
    version: PASSKEY_ENVELOPE_VERSION,
    createdAt: new Date().toISOString(),
    credentialId,
    userHandle: bytesToBase64Url(userHandle),
    rpId: options.rpId,
    prfSalt: bytesToBase64Url(prfSalt),
    kdf: { name: kdfName, hash: kdfHash, info: passkeyInfo },
    cipher: { name: cipherName, iv: bytesToBase64Url(iv) },
    payload: bytesToBase64Url(new Uint8Array(encrypted)),
  })
}

export async function unlockPasskeyEnvelope(
  options: UnlockPasskeyEnvelopeOptions,
): Promise<Result<string, PasskeyError>> {
  if (
    options.envelope.version !== PASSKEY_ENVELOPE_VERSION ||
    options.envelope.kdf.name !== kdfName ||
    options.envelope.kdf.info !== passkeyInfo ||
    options.envelope.cipher.name !== cipherName
  ) {
    return createErr('corrupt-passkey')
  }
  const cryptoResult = requireSubtleCrypto()
  if (!cryptoResult.ok) return cryptoResult
  const clientResult = options.client ? createOk(options.client) : browserClient()
  if (!clientResult.ok) return clientResult

  try {
    const salt = base64UrlToBytes(options.envelope.prfSalt)
    const iv = base64UrlToBytes(options.envelope.cipher.iv)
    const payload = base64UrlToBytes(options.envelope.payload)
    const prfOutput = await getPrfOutput(clientResult.value, options.envelope.credentialId, salt, options.envelope.rpId)
    if (!prfOutput.ok) return prfOutput
    const key = await deriveAesKey(prfOutput.value, salt, cryptoResult.value)
    const decrypted = await cryptoResult.value.decrypt({ name: cipherName, iv: toArrayBuffer(iv) }, key, toArrayBuffer(payload))
    const mnemonic = bytesToUtf8(new Uint8Array(decrypted))
    return validateSeedPhrase(mnemonic) ? createOk(mnemonic) : createErr('passkey-mismatch')
  } catch {
    return createErr('passkey-mismatch')
  }
}

export function parsePasskeyEnvelope(value: string): Result<PasskeyEnvelope, PasskeyError> {
  try {
    const parsed = JSON.parse(value) as PasskeyEnvelope
    return parsed && typeof parsed === 'object' && typeof parsed.credentialId === 'string'
      ? createOk(parsed)
      : createErr('corrupt-passkey')
  } catch {
    return createErr('corrupt-passkey')
  }
}

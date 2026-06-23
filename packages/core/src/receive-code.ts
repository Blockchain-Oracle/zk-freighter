import { bech32m } from 'bech32'
import type { NetworkKey } from './networks'
import { BYTE_LENGTH_32, assertByteLength } from './bytes'
import { createErr, createOk, type Result } from './result'

export const RECEIVE_CODE_HRP = 'zkf'
export const RECEIVE_CODE_VERSION = 1

const RECEIVE_CODE_LIMIT = 180
const VERSION_BYTES = 1
const NETWORK_BYTES = 1
const RECEIVE_PAYLOAD_BYTES = VERSION_BYTES + NETWORK_BYTES + BYTE_LENGTH_32 + BYTE_LENGTH_32
const networkToByte = { testnet: 0, mainnet: 1 } as const satisfies Record<NetworkKey, number>
const byteToNetwork = { 0: 'testnet', 1: 'mainnet' } as const

export type ReceiveCodeError =
  | 'invalid-format'
  | 'invalid-prefix'
  | 'invalid-version'
  | 'invalid-network'
  | 'invalid-payload'

export interface ReceiveCodePayload {
  readonly version: typeof RECEIVE_CODE_VERSION
  readonly network: NetworkKey
  readonly notePublicKey: Uint8Array
  readonly encryptionPublicKey: Uint8Array
}

export function encodeReceiveCode(payload: ReceiveCodePayload): string {
  if (payload.version !== RECEIVE_CODE_VERSION) {
    throw new Error('Unsupported receive code version')
  }

  assertByteLength(payload.notePublicKey, BYTE_LENGTH_32, 'note public key')
  assertByteLength(payload.encryptionPublicKey, BYTE_LENGTH_32, 'encryption public key')

  const bytes = new Uint8Array(RECEIVE_PAYLOAD_BYTES)
  bytes[0] = payload.version
  bytes[1] = networkToByte[payload.network]
  bytes.set(payload.notePublicKey, VERSION_BYTES + NETWORK_BYTES)
  bytes.set(payload.encryptionPublicKey, VERSION_BYTES + NETWORK_BYTES + BYTE_LENGTH_32)

  return bech32m.encode(RECEIVE_CODE_HRP, bech32m.toWords(bytes), RECEIVE_CODE_LIMIT)
}

export function decodeReceiveCode(code: string): Result<ReceiveCodePayload, ReceiveCodeError> {
  let decoded: { prefix: string; words: number[] }

  try {
    decoded = bech32m.decode(code, RECEIVE_CODE_LIMIT)
  } catch {
    return createErr('invalid-format')
  }

  if (decoded.prefix !== RECEIVE_CODE_HRP) {
    return createErr('invalid-prefix')
  }

  let payload: number[]

  try {
    payload = bech32m.fromWords(decoded.words)
  } catch {
    return createErr('invalid-payload')
  }

  if (payload.length !== RECEIVE_PAYLOAD_BYTES) {
    return createErr('invalid-payload')
  }

  if (payload[0] !== RECEIVE_CODE_VERSION) {
    return createErr('invalid-version')
  }

  const network = byteToNetwork[payload[1] as keyof typeof byteToNetwork]

  if (!network) {
    return createErr('invalid-network')
  }

  return createOk({
    version: RECEIVE_CODE_VERSION,
    network,
    notePublicKey: new Uint8Array(payload.slice(2, 34)),
    encryptionPublicKey: new Uint8Array(payload.slice(34)),
  })
}


export const BYTE_LENGTH_12 = 12
export const BYTE_LENGTH_16 = 16
export const BYTE_LENGTH_32 = 32
export const BYTE_LENGTH_64 = 64
export const BN254_SCALAR_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n

const hexAlphabet = '0123456789abcdef'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function utf8ToBytes(value: string): Uint8Array {
  return textEncoder.encode(value)
}

export function bytesToUtf8(value: Uint8Array): string {
  return textDecoder.decode(value)
}

export function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const out = new Uint8Array(size)
  let offset = 0

  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }

  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = ''

  for (const byte of bytes) {
    out += hexAlphabet[byte >> 4]
    out += hexAlphabet[byte & 15]
  }

  return out
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex

  if (normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    throw new Error('Invalid hex string')
  }

  const out = new Uint8Array(normalized.length / 2)

  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16)
  }

  return out
}

export function assertByteLength(bytes: Uint8Array, expected: number, label: string): void {
  if (bytes.length !== expected) {
    throw new Error(`${label} must be ${expected} bytes, got ${bytes.length}`)
  }
}

export function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let value = 0n

  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(bytes[index])
  }

  return value
}

export function bigIntToBytesLE(value: bigint, length = BYTE_LENGTH_32): Uint8Array {
  if (value < 0n) {
    throw new Error('Cannot encode a negative bigint')
  }

  const out = new Uint8Array(length)
  let remaining = value

  for (let index = 0; index < length; index += 1) {
    out[index] = Number(remaining & 255n)
    remaining >>= 8n
  }

  if (remaining !== 0n) {
    throw new Error(`Bigint does not fit in ${length} bytes`)
  }

  return out
}

export function reduceBytesToBn254ScalarLE(bytes: Uint8Array): Uint8Array {
  return bigIntToBytesLE(bytesToBigIntLE(bytes) % BN254_SCALAR_MODULUS)
}

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
}


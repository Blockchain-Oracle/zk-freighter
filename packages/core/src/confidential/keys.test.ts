import { sha512 } from '@noble/hashes/sha2.js'
import { describe, expect, it } from 'vitest'
import { GRUMPKIN_ORDER } from './grumpkin'
import {
  deriveConfidentialAccount,
  deriveConfidentialSpendingKey,
  publicViewingKey,
  spendingPublicKey,
  viewingKeyFromSpendingKey,
} from './keys'

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)
  return value
}

describe('confidential key derivation (register relations)', () => {
  it('viewing key matches the reference vk_from_sk KAT', async () => {
    // R2: vk = Poseidon2(VIEWING_KEY, sk, addr_f); testdata sk=0xdead, addr_f=0xbeef.
    const vk = await viewingKeyFromSpendingKey(0xdeadn, 0xbeefn)
    expect(vk).toBe(0x208fbdb70d2faacf04f987b54f12aeeaeb432acc29d650c86ce0f6275b958eb8n)
  }, 60_000)

  it('derives a deterministic, nonzero, in-range Grumpkin spending scalar', () => {
    const secret = new Uint8Array(32).fill(7)
    const sk = deriveConfidentialSpendingKey(secret)
    expect(deriveConfidentialSpendingKey(secret)).toBe(sk) // deterministic
    expect(sk).toBeGreaterThan(0n)
    expect(sk).toBeLessThan(GRUMPKIN_ORDER)
  })

  it('is domain-separated (not a raw hash of the secret) — isolated from note-keys', () => {
    const secret = new Uint8Array(32).fill(7)
    const raw = bytesToBigIntBE(sha512(secret)) % GRUMPKIN_ORDER
    expect(deriveConfidentialSpendingKey(secret)).not.toBe(raw)
  })

  it('composes Y = sk*H, vk = vk_from_sk(sk, addr_f), PVK = vk*H', async () => {
    const secret = new Uint8Array(32).fill(1)
    const account = await deriveConfidentialAccount(secret, 0xbeefn)
    const sk = deriveConfidentialSpendingKey(secret)
    expect(account.sk).toBe(sk)
    expect(account.Y).toEqual(spendingPublicKey(sk))
    expect(account.vk).toBe(await viewingKeyFromSpendingKey(sk, 0xbeefn))
    expect(account.PVK).toEqual(publicViewingKey(account.vk))
  }, 60_000)
})

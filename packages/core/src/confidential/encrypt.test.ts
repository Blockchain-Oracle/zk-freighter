import { describe, expect, it } from 'vitest'
import { decryptAmount, decryptBalance, encryptAmount, encryptBalance } from './encrypt'

// KATs from the reference circuit testdata (encrypt_amount.json / encrypt_balance.json).
// These are the masks the auditor + recipient channels invert to recover plaintext.
const VK = 0x208fbdb70d2faacf04f987b54f12aeeaeb432acc29d650c86ce0f6275b958eb8n

describe('confidential amount/balance encryption (bb-backed Poseidon2 masks)', () => {
  it('encrypts a transfer amount: v_tilde = v_tx + Poseidon2(TX_AMOUNT, s, sigma)', async () => {
    const vTilde = await encryptAmount(0x64n, 0x12345n, 0x01n)
    expect(vTilde).toBe(0x2a07070eb651b03ecc22453ad1cc69a39567ca27fb4224e8727a5fbc83091526n)
  }, 60_000)

  it('encrypts a balance scalar: b_tilde = v_new + Poseidon2(ENC_BAL, vk, sigma)', async () => {
    const bTilde = await encryptBalance(0x3e8n, VK, 0x01n)
    expect(bTilde).toBe(0x04d1659db899a50a94dcfc54a18b8adaf6e9e8e3046bd11893fbd4a86a7c579cn)
  }, 60_000)

  it('round-trips amount encryption (the recipient/auditor recovery)', async () => {
    const vTilde = await encryptAmount(0x64n, 0x12345n, 0x01n)
    expect(await decryptAmount(vTilde, 0x12345n, 0x01n)).toBe(0x64n)
  }, 60_000)

  it('round-trips balance encryption (the sender-auditor recovery)', async () => {
    const bTilde = await encryptBalance(0x3e8n, VK, 0x01n)
    expect(await decryptBalance(bTilde, VK, 0x01n)).toBe(0x3e8n)
  }, 60_000)
})

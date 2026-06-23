import { describe, expect, it } from 'vitest'
import { createEncryptedVault, parseEncryptedVault, unlockEncryptedVault } from './vault'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('encrypted vault', () => {
  it('encrypts and unlocks a mnemonic', async () => {
    const vault = await createEncryptedVault(mnemonic, 'correct horse battery staple')

    expect(vault.ok).toBe(true)

    if (vault.ok) {
      expect(JSON.stringify(vault.value)).not.toContain('abandon')
      await expect(unlockEncryptedVault(vault.value, 'correct horse battery staple')).resolves.toEqual({
        ok: true,
        value: mnemonic,
      })
    }
  })

  it('rejects wrong passwords explicitly', async () => {
    const vault = await createEncryptedVault(mnemonic, 'correct horse battery staple')

    expect(vault.ok).toBe(true)

    if (vault.ok) {
      await expect(unlockEncryptedVault(vault.value, 'wrong password')).resolves.toEqual({
        ok: false,
        error: 'invalid-password',
      })
    }
  })

  it('rejects corrupt vault JSON explicitly', () => {
    expect(parseEncryptedVault('{')).toEqual({ ok: false, error: 'corrupt-vault' })
  })

  it('rejects unsupported vault versions explicitly', async () => {
    const vault = await createEncryptedVault(mnemonic, 'correct horse battery staple')

    expect(vault.ok).toBe(true)

    if (vault.ok) {
      await expect(
        unlockEncryptedVault({ ...vault.value, version: 99 as typeof vault.value.version }, 'pw'),
      ).resolves.toEqual({ ok: false, error: 'unsupported-vault' })
    }
  })
})


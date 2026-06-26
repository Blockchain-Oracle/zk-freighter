import { describe, expect, it } from 'vitest'
import { deriveEvmAccount, deriveEvmAddress } from './evm-identity'

// Canonical Anvil/Hardhat test mnemonic → account 0 at m/44'/60'/0'/0/0.
const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

describe('deriveEvmAddress', () => {
  it('derives the canonical EVM account 0 from a mnemonic', () => {
    expect(deriveEvmAddress(TEST_MNEMONIC)).toBe(TEST_ADDRESS)
  })

  it('is deterministic for the same mnemonic', () => {
    expect(deriveEvmAddress(TEST_MNEMONIC)).toBe(deriveEvmAddress(TEST_MNEMONIC))
  })

  it('returns a viem account that can sign, with a matching address', () => {
    const account = deriveEvmAccount(TEST_MNEMONIC)
    expect(account.address).toBe(TEST_ADDRESS)
    expect(typeof account.signTransaction).toBe('function')
  })
})

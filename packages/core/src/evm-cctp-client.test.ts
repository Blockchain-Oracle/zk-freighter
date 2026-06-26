import { describe, expect, it } from 'vitest'
import { chainForHex, createSeedEvmClient } from './evm-cctp-client'

const TEST_MNEMONIC = 'test test test test test test test test test test test junk'
const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

describe('chainForHex', () => {
  it('maps the configured testnet + mainnet CCTP source chain hexes', () => {
    expect(chainForHex('0x14a34').id).toBe(84532) // base sepolia
    expect(chainForHex('0xaa36a7').id).toBe(11155111) // ethereum sepolia
    expect(chainForHex('0x2105').id).toBe(8453) // base mainnet
    expect(chainForHex('0x1').id).toBe(1) // ethereum mainnet
  })

  it('throws on an unsupported chain', () => {
    expect(() => chainForHex('0xdead')).toThrow(/unsupported/i)
  })
})

describe('createSeedEvmClient', () => {
  it('signs from the seed-derived EVM address (no external wallet)', async () => {
    const client = await createSeedEvmClient({ mnemonic: TEST_MNEMONIC, chainIdHex: '0x14a34' })
    expect(client.accountAddress).toBe(TEST_ADDRESS)
    expect(typeof client.sendTransaction).toBe('function')
    expect(typeof client.waitForTransaction).toBe('function')
  })
})

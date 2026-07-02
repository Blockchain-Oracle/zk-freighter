import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CctpBridgeReport } from '@zk-freighter/core'
import {
  bridgeResumeStorageKey,
  loadBridgeResumeBurnHash,
  loadBridgeResumeSourceChain,
  loadCompletedBridgeResumeReport,
  saveBridgeResumeReport,
} from './bridge-storage'

const destinationAddress = 'GB4PZPDDY7EB4FF6RYAJYBRG6JZ3AA2JUQKE577VVUFJRHASVHIMCCBH'
const evmApproveTxHash = `0x${'a'.repeat(64)}`
const evmBurnTxHash = `0x${'b'.repeat(64)}`
const stellarMintTxHash = '3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790'
const baseCctpDomain = 6

describe('bridge resume storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores a completed public bridge report after reload', () => {
    installStorage()

    saveBridgeResumeReport(completedReport())
    const restored = loadCompletedBridgeResumeReport('testnet', destinationAddress)

    expect(loadBridgeResumeBurnHash('testnet', destinationAddress)).toBe(evmBurnTxHash)
    expect(loadBridgeResumeSourceChain('testnet', destinationAddress)).toBe('base')
    expect(restored?.status).toBe('completed')
    expect(restored?.sourceChainKey).toBe('base')
    expect(restored?.sourceDomain).toBe(baseCctpDomain)
    expect(restored?.evmApproveTxHash).toBe(evmApproveTxHash)
    expect(restored?.evmBurnTxHash).toBe(evmBurnTxHash)
    expect(restored?.stellarMintTxHash).toBe(stellarMintTxHash)
    expect(restored?.shieldPrompt).toBe(true)
    expect(restored?.stellarMintExplorerUrl).toContain(stellarMintTxHash)
  })

  it('does not fabricate completed bridge state without a mint hash', () => {
    const storage = installStorage()
    storage.setItem(
      bridgeResumeStorageKey('testnet', destinationAddress),
      JSON.stringify({
        version: 1,
        network: 'testnet',
        destinationAddress,
        sourceChainKey: 'base',
        evmBurnTxHash,
      }),
    )

    expect(loadBridgeResumeBurnHash('testnet', destinationAddress)).toBe(evmBurnTxHash)
    expect(loadCompletedBridgeResumeReport('testnet', destinationAddress)).toBeNull()
  })

  it('does not resume a stored burn against the wrong source domain', () => {
    installStorage()

    saveBridgeResumeReport(completedReport())

    expect(loadBridgeResumeBurnHash('testnet', destinationAddress, 'arbitrum')).toBe('')
    expect(loadCompletedBridgeResumeReport('testnet', destinationAddress, 'arbitrum')).toBeNull()
  })
})

function completedReport(): CctpBridgeReport {
  return {
    status: 'completed',
    network: 'testnet',
    destinationAddress,
    sourceChainKey: 'base',
    sourceChain: 'Base Sepolia',
    sourceDomain: baseCctpDomain,
    sourceChainId: 84532,
    sourceGasToken: 'Base Sepolia ETH',
    amountAtomic: '1000000',
    amountDisplay: '1 USDC',
    maxFeeAtomic: '500',
    finalityThreshold: 2_000,
    evmApproveTxHash,
    evmBurnTxHash,
    stellarMintTxHash,
    publicUsdcArrived: true,
    shieldPrompt: true,
    statusEvents: [],
    blockers: [],
  }
}

function installStorage(): Storage {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }

  vi.stubGlobal('window', { localStorage: storage })
  return storage
}

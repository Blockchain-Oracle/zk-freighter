import { describe, expect, it, vi } from 'vitest'
import type {
  CctpBridgeReport,
  EvmCctpSourceClient,
  EvmCctpSourceConfig,
  StellarUsdcTrustlineReport,
  WalletIdentity,
} from '@zk-freighter/core'
import { runBridgeAfterDestinationSetup } from './bridgePanelActions'

const identity = { stellarPublicKey: 'GABC' } as WalletIdentity
const evmSource = {
  key: 'base',
  label: 'Base Sepolia',
  domain: 6,
  chainId: 84532,
  chainIdHex: '0x14a34',
  gasToken: 'Base Sepolia ETH',
  usdcContract: '0xUSDC',
  tokenMessenger: '0xMESSENGER',
  messageTransmitter: '0xTRANSMITTER',
  explorerTxUrl: 'https://sepolia.basescan.org/tx',
} satisfies EvmCctpSourceConfig

describe('bridge panel actions', () => {
  it('prepares Stellar USDC receiving before requesting source-chain approval', async () => {
    const events: string[] = []
    const receiveReport: StellarUsdcTrustlineReport = {
      status: 'ready',
      network: 'testnet',
      userAddress: identity.stellarPublicKey,
    }
    const bridgeReport = completedBridgeReport()
    const evmClient = fakeEvmClient()
    const ensureDestinationReady = vi.fn(async () => {
      events.push('stellar-ready')
      return receiveReport
    })
    const createEvmClient = vi.fn(async () => {
      events.push('evm-request')
      return evmClient
    })
    const runBridge = vi.fn(async () => {
      events.push('bridge-run')
      return bridgeReport
    })
    const onDestinationReady = vi.fn((report: StellarUsdcTrustlineReport) => {
      events.push(`receive-${report.status}`)
    })
    const onWalletApprovalPending = vi.fn((pending: boolean) => {
      events.push(`wallet-${pending}`)
    })

    await expect(
      runBridgeAfterDestinationSetup({
        identity,
        network: 'testnet',
        evmSource,
        ensureDestinationReady,
        createEvmClient,
        runBridge,
        onDestinationReady,
        onWalletApprovalPending,
        onProgress: vi.fn(),
      }),
    ).resolves.toBe(bridgeReport)

    expect(events).toEqual(['stellar-ready', 'receive-ready', 'wallet-true', 'evm-request', 'bridge-run', 'wallet-false'])
    expect(runBridge).toHaveBeenCalledWith(expect.objectContaining({
      identity,
      network: 'testnet',
      sourceChainKey: 'base',
      evmClient,
    }))
  })

  it('does not request an EVM wallet when Stellar USDC setup fails', async () => {
    const createEvmClient = vi.fn()
    const runBridge = vi.fn()
    const onWalletApprovalPending = vi.fn()

    await expect(
      runBridgeAfterDestinationSetup({
        identity,
        network: 'mainnet',
        evmSource,
        ensureDestinationReady: async () => {
          throw new Error('Stellar account is not funded on mainnet.')
        },
        createEvmClient,
        runBridge,
        onDestinationReady: vi.fn(),
        onWalletApprovalPending,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('not funded')

    expect(createEvmClient).not.toHaveBeenCalled()
    expect(runBridge).not.toHaveBeenCalled()
    expect(onWalletApprovalPending).not.toHaveBeenCalled()
  })

  it('cancels before EVM approval if the bridge request becomes stale after setup', async () => {
    const createEvmClient = vi.fn()
    const runBridge = vi.fn()
    const onDestinationReady = vi.fn()
    const onWalletApprovalPending = vi.fn()

    await expect(
      runBridgeAfterDestinationSetup({
        identity,
        network: 'testnet',
        evmSource,
        ensureDestinationReady: async () => ({
          status: 'created',
          network: 'testnet',
          userAddress: identity.stellarPublicKey,
          txHash: 'a'.repeat(64),
        }),
        createEvmClient,
        runBridge,
        shouldContinue: () => false,
        onDestinationReady,
        onWalletApprovalPending,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('changed before source-chain approval')

    expect(onDestinationReady).not.toHaveBeenCalled()
    expect(createEvmClient).not.toHaveBeenCalled()
    expect(runBridge).not.toHaveBeenCalled()
    expect(onWalletApprovalPending).not.toHaveBeenCalled()
  })

  it('cancels before bridge submission if the request becomes stale after wallet approval', async () => {
    const evmClient = fakeEvmClient()
    const runBridge = vi.fn()
    let current = true

    await expect(
      runBridgeAfterDestinationSetup({
        identity,
        network: 'testnet',
        evmSource,
        ensureDestinationReady: async () => ({
          status: 'ready',
          network: 'testnet',
          userAddress: identity.stellarPublicKey,
        }),
        createEvmClient: async () => {
          current = false
          return evmClient
        },
        runBridge,
        shouldContinue: () => current,
        onDestinationReady: vi.fn(),
        onWalletApprovalPending: vi.fn(),
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('changed before source-chain submission')

    expect(runBridge).not.toHaveBeenCalled()
  })
})

function fakeEvmClient(): EvmCctpSourceClient {
  return {
    sendTransaction: vi.fn(),
    waitForTransaction: vi.fn(),
  }
}

function completedBridgeReport(): CctpBridgeReport {
  return {
    status: 'completed',
    network: 'testnet',
    destinationAddress: identity.stellarPublicKey,
    sourceChainKey: 'base',
    sourceChain: 'Base Sepolia',
    sourceDomain: 6,
    sourceChainId: 84532,
    sourceGasToken: 'Base Sepolia ETH',
    amountAtomic: '1000000',
    amountDisplay: '1 USDC',
    maxFeeAtomic: '500',
    finalityThreshold: 2_000,
    publicUsdcArrived: true,
    shieldPrompt: true,
    statusEvents: [],
    blockers: [],
  }
}

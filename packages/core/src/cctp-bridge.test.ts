import { describe, expect, it } from 'vitest'
import { bytesToUtf8, hexToBytes } from './bytes'
import {
  bridgeAmountDisplay,
  buildCctpForwarderHookData,
  encodeDepositForBurnWithHookData,
  stellarContractStrkeyToBytes32,
} from './cctp-encoding'
import { pollCctpAttestation } from './cctp-iris'
import { getCctpBridgeBlockers, resumeCctpBridgeToStellar, runCctpBridgeToStellar } from './cctp-bridge'
import { deriveWalletIdentity } from './identity'
import { getCctpSource, NETWORKS } from './networks'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const identity = deriveWalletIdentity(mnemonic, 'testnet')
const completeAttestation = {
  messages: [{ status: 'complete', message: '0x12', attestation: '0x34', eventNonce: '42' }],
}

describe('CCTP bridge helpers', () => {
  it('encodes the Stellar CCTP forwarder as bytes32', () => {
    const forwarder = NETWORKS.testnet.cctp?.cctpForwarder
    expect(forwarder).toBeDefined()
    const encoded = stellarContractStrkeyToBytes32(forwarder ?? '')

    expect(encoded).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('builds forwarder hook data with the recipient strkey as UTF-8 bytes', () => {
    const hookData = hexToBytes(buildCctpForwarderHookData(identity.stellarPublicKey))
    const recipientLength = new DataView(hookData.buffer).getUint32(28)
    const recipient = bytesToUtf8(hookData.slice(32))

    expect(hookData).toHaveLength(32 + identity.stellarPublicKey.length)
    expect(new DataView(hookData.buffer).getUint32(24)).toBe(0)
    expect(recipientLength).toBe(identity.stellarPublicKey.length)
    expect(recipient).toBe(identity.stellarPublicKey)
  })

  it('encodes depositForBurnWithHook with the Stellar forwarder in both dangerous address fields', () => {
    const forwarder = stellarContractStrkeyToBytes32(NETWORKS.testnet.cctp?.cctpForwarder ?? '')
    const data = encodeDepositForBurnWithHookData({
      amountAtomic: 1_000_000n,
      destinationDomain: 27,
      cctpForwarderBytes32: forwarder,
      burnToken: getCctpSource('testnet', 'ethereum')?.usdcContract ?? '',
      maxFeeAtomic: 500n,
      finalityThreshold: 2_000,
      hookData: buildCctpForwarderHookData(identity.stellarPublicKey),
    })
    const occurrences = data.split(forwarder.slice(2).toLowerCase()).length - 1

    expect(data.startsWith('0x')).toBe(true)
    expect(occurrences).toBe(2)
  })

  it('formats EVM USDC atomic amounts with six decimals', () => {
    expect(bridgeAmountDisplay(1_230_000n)).toBe('1.23 USDC')
  })
})

describe('CCTP bridge flow', () => {
  it('blocks before bridge execution when no Ethereum signer is available', async () => {
    const report = await runCctpBridgeToStellar({ identity, network: 'testnet', sourceChainKey: 'base' })

    expect(report.status).toBe('blocked')
    expect(report.blockers.join(' ')).toContain('Base Sepolia wallet')
    expect(report.publicUsdcArrived).toBe(false)
    expect(report.evmBurnTxHash).toBeUndefined()
  })

  it('does not block mainnet bridge by configuration once pools and CCTP addresses are present', () => {
    expect(getCctpBridgeBlockers('mainnet')).toEqual([])
  })

  it('polls Circle Iris until an attestation is complete', async () => {
    const statuses: string[] = []
    let calls = 0
    const attestation = await pollCctpAttestation({
      irisUrl: 'https://iris-api-sandbox.circle.com',
      sourceDomain: 0,
      burnTxHash: '0xburn',
      sleep: async () => undefined,
      fetch: async () => {
        calls += 1
        return calls === 1 ? new Response('', { status: 404 }) : Response.json(completeAttestation)
      },
      onStatus: (event) => statuses.push(event.message),
    })

    expect(calls).toBe(2)
    expect(statuses).toEqual(['Waiting for Circle Iris attestation'])
    expect(attestation.eventNonce).toBe('42')
  })

  it('runs the injected real-step contract without fabricating bridge hashes', async () => {
    const sent: { to: string; data: string; chainIdHex: string }[] = []
    const progress: string[] = []
    const report = await runCctpBridgeToStellar({
      identity,
      network: 'testnet',
      sourceChainKey: 'base',
      sleep: async () => undefined,
      fetch: async () => Response.json(completeAttestation),
      submitMintAndForward: async ({ onStatus }) => {
        onStatus?.({ stage: 'mint', elapsedMs: 0, message: 'mint called' })
        return { hash: 'stellar-mint-hash' }
      },
      onProgress: (nextReport) => progress.push(nextReport.statusEvents.at(-1)?.message ?? ''),
      evmClient: {
        sendTransaction: async (transaction) => {
          sent.push(transaction)
          return sent.length === 1 ? '0xapprove' : '0xburn'
        },
        waitForTransaction: async () => undefined,
      },
    })

    expect(report.status).toBe('completed')
    expect(report.sourceChainKey).toBe('base')
    expect(report.sourceDomain).toBe(6)
    expect(report.evmApproveTxHash).toBe('0xapprove')
    expect(report.evmBurnTxHash).toBe('0xburn')
    expect(report.stellarMintTxHash).toBe('stellar-mint-hash')
    expect(report.shieldPrompt).toBe(true)
    expect(sent.map((transaction) => transaction.to)).toEqual([
      getCctpSource('testnet', 'base')?.usdcContract,
      getCctpSource('testnet', 'base')?.tokenMessenger,
    ])
    expect(sent.every((transaction) => transaction.chainIdHex === '0x14a34')).toBe(true)
    expect(progress).toContain('Base Sepolia USDC approval submitted')
    expect(progress).toContain('Base Sepolia CCTP burn submitted')
  })

  it('keeps submitted public hashes when a later bridge step fails', async () => {
    const report = await runCctpBridgeToStellar({
      identity,
      network: 'testnet',
      sourceChainKey: 'ethereum',
      sleep: async () => undefined,
      fetch: async () => Response.json(completeAttestation),
      submitMintAndForward: async () => {
        throw new Error('mint failed')
      },
      evmClient: {
        sendTransaction: async (transaction) => (transaction.to.includes('1c7D4B') ? '0xapprove' : '0xburn'),
        waitForTransaction: async () => undefined,
      },
    })

    expect(report.status).toBe('failed')
    expect(report.evmApproveTxHash).toBe('0xapprove')
    expect(report.evmBurnTxHash).toBe('0xburn')
    expect(report.blockers[0]).toBe('mint failed')
  })

  it('resumes from a public burn hash without a new Ethereum signer', async () => {
    const progress: string[] = []
    const report = await resumeCctpBridgeToStellar({
      identity,
      network: 'testnet',
      sourceChainKey: 'arbitrum',
      evmApproveTxHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      evmBurnTxHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      sleep: async () => undefined,
      fetch: async () => Response.json(completeAttestation),
      submitMintAndForward: async ({ onStatus }) => {
        onStatus?.({ stage: 'mint', elapsedMs: 0, message: 'mint called' })
        return { hash: 'stellar-resumed-mint-hash' }
      },
      onProgress: (nextReport) => progress.push(nextReport.statusEvents.at(-1)?.message ?? ''),
    })

    expect(report.status).toBe('completed')
    expect(report.sourceChainKey).toBe('arbitrum')
    expect(report.sourceDomain).toBe(3)
    expect(report.evmApproveTxHash).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    expect(report.evmBurnTxHash).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    expect(report.stellarMintTxHash).toBe('stellar-resumed-mint-hash')
    expect(progress).toContain('Resuming from Arbitrum Sepolia CCTP burn')
    expect(progress).toContain('Circle Iris attestation complete')
  })

  it('blocks resume on malformed burn hashes', async () => {
    const report = await resumeCctpBridgeToStellar({
      identity,
      network: 'testnet',
      sourceChainKey: 'base',
      evmBurnTxHash: 'not-a-hash',
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers).toContain('Enter a valid Base Sepolia CCTP burn transaction hash.')
    expect(report.stellarMintTxHash).toBeUndefined()
  })
})

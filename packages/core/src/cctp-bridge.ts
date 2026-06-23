import {
  bridgeAmountDisplay,
  buildCctpForwarderHookData,
  encodeApproveUsdcData,
  encodeDepositForBurnWithHookData,
  stellarContractStrkeyToBytes32,
} from './cctp-encoding'
import { pollCctpAttestation } from './cctp-iris'
import { submitCctpMintAndForward } from './cctp-stellar'
import type {
  CctpAttestationMessage,
  CctpBridgeProgressEvent,
  CctpBridgeReport,
  CctpBridgeStatus,
  ResumeCctpBridgeOptions,
  RunCctpBridgeOptions,
} from './cctp-types'
import { getNetworkConfig, isShieldedAssetEnabled, type NetworkKey } from './networks'

const defaultBridgeAmountAtomic = 1_000_000n
const defaultMaxFeeAtomic = 500n
const standardFinalityThreshold = 2_000
const evmTxHashHexChars = 64
const evmTxHashPattern = new RegExp(`^0x[0-9a-fA-F]{${evmTxHashHexChars}}$`)

export function getCctpBridgeBlockers(network: NetworkKey): readonly string[] {
  const config = getNetworkConfig(network)
  const blockers: string[] = []

  if (network !== 'testnet') {
    blockers.push('CCTP bridge-to-shield is enabled only on testnet until a mainnet USDC pool is deployed.')
  }
  if (!isShieldedAssetEnabled(network, 'USDC') || !config.assets.USDC.poolId) {
    blockers.push('USDC shielding is not enabled for this network, so bridged funds cannot complete the Phase 8 flow.')
  }
  if (!config.cctp?.cctpForwarder || !config.cctp.messageTransmitter || !config.cctp.tokenMessengerMinter) {
    blockers.push('Stellar CCTP contracts are not fully configured for this network.')
  }
  if (!config.cctp?.evmSource) {
    blockers.push('Ethereum source CCTP config is not available for this network.')
  }

  return blockers
}

export async function runCctpBridgeToStellar(options: RunCctpBridgeOptions): Promise<CctpBridgeReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const events: CctpBridgeProgressEvent[] = []
  const network = getNetworkConfig(options.network)
  const amount = options.amountAtomic ?? defaultBridgeAmountAtomic
  const maxFee = options.maxFeeAtomic ?? defaultMaxFeeAtomic
  const finalityThreshold = options.finalityThreshold ?? standardFinalityThreshold
  const blockers = [...getCctpBridgeBlockers(options.network)]
  let approveTx: string | undefined
  let burnTx: string | undefined
  let attestation: CctpAttestationMessage | undefined
  let mintTx: string | undefined
  const emit = (event: Omit<CctpBridgeProgressEvent, 'elapsedMs'>) => {
    events.push({ ...event, elapsedMs: Math.round(now() - started) })
    options.onProgress?.(report('running', []))
  }

  if (amount <= 0n) {
    blockers.push('Bridge amount must be greater than zero.')
  }
  const evmClient = options.evmClient
  if (!evmClient) {
    blockers.push('Connect an Ethereum Sepolia wallet before starting the public bridge leg.')
  }
  if (blockers.length > 0) {
    return report('blocked', blockers)
  }
  if (!evmClient) {
    return report('blocked', ['Connect an Ethereum Sepolia wallet before starting the public bridge leg.'])
  }

  try {
    const cctp = network.cctp
    const evmSource = cctp?.evmSource
    if (!cctp?.cctpForwarder || !evmSource) {
      throw new Error('CCTP config disappeared during bridge preparation.')
    }

    const forwarderBytes32 = stellarContractStrkeyToBytes32(cctp.cctpForwarder)
    const hookData = buildCctpForwarderHookData(options.identity.stellarPublicKey)
    emit({ stage: 'approve', message: 'Submitting Ethereum USDC approval' })
    approveTx = await evmClient.sendTransaction({
      to: evmSource.usdcContract,
      data: encodeApproveUsdcData(evmSource.tokenMessenger, amount),
      chainIdHex: evmSource.chainIdHex,
    })
    emit({ stage: 'approve', message: 'Ethereum USDC approval submitted', txHash: approveTx })
    await evmClient.waitForTransaction(approveTx)
    emit({ stage: 'approve', message: 'Ethereum USDC approval confirmed', txHash: approveTx })

    emit({ stage: 'burn', message: 'Submitting Ethereum CCTP burn with Stellar forwarder hook', txHash: approveTx })
    burnTx = await evmClient.sendTransaction({
      to: evmSource.tokenMessenger,
      data: encodeDepositForBurnWithHookData({
        amountAtomic: amount,
        destinationDomain: cctp.domain,
        cctpForwarderBytes32: forwarderBytes32,
        burnToken: evmSource.usdcContract,
        maxFeeAtomic: maxFee,
        finalityThreshold,
        hookData,
      }),
      chainIdHex: evmSource.chainIdHex,
    })
    emit({ stage: 'burn', message: 'Ethereum CCTP burn submitted', txHash: burnTx })
    await evmClient.waitForTransaction(burnTx)
    emit({ stage: 'burn', message: 'Ethereum CCTP burn confirmed', txHash: burnTx })

    attestation = await pollCctpAttestation({
      irisUrl: cctp.irisUrl,
      sourceDomain: evmSource.domain,
      burnTxHash: burnTx,
      fetch: options.fetch,
      sleep: options.sleep,
      pollIntervalMs: options.attestationPollIntervalMs,
      maxPolls: options.attestationMaxPolls,
      onStatus: emit,
    })
    emit({ stage: 'attestation', message: 'Circle Iris attestation complete' })
    const mint = await (options.submitMintAndForward ?? submitCctpMintAndForward)({
      identity: options.identity,
      network: options.network,
      attestation,
      onStatus: emit,
    })
    mintTx = mint.hash
    emit({ stage: 'mint', message: 'Stellar mint_and_forward confirmed', txHash: mintTx })

    return report('completed', [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CCTP bridge failed'
    return report('failed', [message], message)
  }

  function report(
    status: CctpBridgeStatus,
    nextBlockers: readonly string[],
    error?: string,
  ): CctpBridgeReport {
    const evmSource = network.cctp?.evmSource
    return {
      status,
      network: options.network,
      destinationAddress: options.identity.stellarPublicKey,
      sourceChain: evmSource?.label,
      amountAtomic: amount.toString(),
      amountDisplay: bridgeAmountDisplay(amount),
      maxFeeAtomic: maxFee.toString(),
      finalityThreshold,
      evmApproveTxHash: approveTx,
      evmApproveExplorerUrl: approveTx && evmSource ? `${evmSource.explorerTxUrl}/${approveTx}` : undefined,
      evmBurnTxHash: burnTx,
      evmBurnExplorerUrl: burnTx && evmSource ? `${evmSource.explorerTxUrl}/${burnTx}` : undefined,
      irisUrl: network.cctp?.irisUrl,
      attestationStatus: attestation?.status,
      attestationEventNonce: attestation?.eventNonce,
      stellarMintTxHash: mintTx,
      stellarMintExplorerUrl: mintTx ? `${network.explorerTxUrl}/${mintTx}` : undefined,
      publicUsdcArrived: status === 'completed',
      shieldPrompt: status === 'completed',
      statusEvents: events,
      blockers: nextBlockers,
      error,
    }
  }
}

export async function resumeCctpBridgeToStellar(options: ResumeCctpBridgeOptions): Promise<CctpBridgeReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const events: CctpBridgeProgressEvent[] = []
  const network = getNetworkConfig(options.network)
  const amount = options.amountAtomic ?? defaultBridgeAmountAtomic
  const maxFee = options.maxFeeAtomic ?? defaultMaxFeeAtomic
  const finalityThreshold = options.finalityThreshold ?? standardFinalityThreshold
  const blockers = [...getCctpBridgeBlockers(options.network)]
  const approveTx = normalizeOptionalTxHash(options.evmApproveTxHash)
  const burnTx = normalizeOptionalTxHash(options.evmBurnTxHash)
  let attestation: CctpAttestationMessage | undefined
  let mintTx: string | undefined
  const emit = (event: Omit<CctpBridgeProgressEvent, 'elapsedMs'>) => {
    events.push({ ...event, elapsedMs: Math.round(now() - started) })
    options.onProgress?.(report('running', []))
  }

  if (!burnTx) {
    blockers.push('Enter a valid Ethereum CCTP burn transaction hash.')
  }
  if (blockers.length > 0) {
    return report('blocked', blockers)
  }
  if (!burnTx) {
    throw new Error('CCTP burn hash validation failed.')
  }

  try {
    const cctp = network.cctp
    const evmSource = cctp?.evmSource
    if (!cctp || !evmSource) {
      throw new Error('CCTP config disappeared during bridge resume.')
    }

    emit({ stage: 'attestation', message: 'Resuming from Ethereum CCTP burn', txHash: burnTx })
    attestation = await pollCctpAttestation({
      irisUrl: cctp.irisUrl,
      sourceDomain: evmSource.domain,
      burnTxHash: burnTx,
      fetch: options.fetch,
      sleep: options.sleep,
      pollIntervalMs: options.attestationPollIntervalMs,
      maxPolls: options.attestationMaxPolls,
      onStatus: emit,
    })
    emit({ stage: 'attestation', message: 'Circle Iris attestation complete' })
    const mint = await (options.submitMintAndForward ?? submitCctpMintAndForward)({
      identity: options.identity,
      network: options.network,
      attestation,
      onStatus: emit,
    })
    mintTx = mint.hash
    emit({ stage: 'mint', message: 'Stellar mint_and_forward confirmed', txHash: mintTx })

    return report('completed', [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CCTP bridge resume failed'
    return report('failed', [message], message)
  }

  function report(
    status: CctpBridgeStatus,
    nextBlockers: readonly string[],
    error?: string,
  ): CctpBridgeReport {
    const evmSource = network.cctp?.evmSource
    return {
      status,
      network: options.network,
      destinationAddress: options.identity.stellarPublicKey,
      sourceChain: evmSource?.label,
      amountAtomic: amount.toString(),
      amountDisplay: bridgeAmountDisplay(amount),
      maxFeeAtomic: maxFee.toString(),
      finalityThreshold,
      evmApproveTxHash: approveTx,
      evmApproveExplorerUrl: approveTx && evmSource ? `${evmSource.explorerTxUrl}/${approveTx}` : undefined,
      evmBurnTxHash: burnTx,
      evmBurnExplorerUrl: burnTx && evmSource ? `${evmSource.explorerTxUrl}/${burnTx}` : undefined,
      irisUrl: network.cctp?.irisUrl,
      attestationStatus: attestation?.status,
      attestationEventNonce: attestation?.eventNonce,
      stellarMintTxHash: mintTx,
      stellarMintExplorerUrl: mintTx ? `${network.explorerTxUrl}/${mintTx}` : undefined,
      publicUsdcArrived: status === 'completed',
      shieldPrompt: status === 'completed',
      statusEvents: events,
      blockers: nextBlockers,
      error,
    }
  }
}

function normalizeOptionalTxHash(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  return evmTxHashPattern.test(trimmed) ? trimmed : undefined
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

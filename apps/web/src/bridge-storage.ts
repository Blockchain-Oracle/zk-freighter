import { getNetworkConfig, type CctpBridgeReport, type NetworkKey } from '@zk-fighter/core'

const bridgeResumeStorageVersion = 1
const bridgeResumeStoragePrefix = 'zk-fighter:cctp-bridge-resume:v1'
const txHashHexChars = 64
const txHashPattern = new RegExp(`^0x[0-9a-fA-F]{${txHashHexChars}}$`)
const stellarTxPattern = new RegExp(`^[0-9a-fA-F]{${txHashHexChars}}$`)
const defaultBridgeAmountAtomic = '1000000'
const defaultBridgeAmountDisplay = '1 USDC'
const defaultBridgeMaxFeeAtomic = '500'
const defaultBridgeFinalityThreshold = 2_000

interface StoredBridgeResume {
  readonly version: typeof bridgeResumeStorageVersion
  readonly network: NetworkKey
  readonly destinationAddress: string
  readonly evmApproveTxHash?: string
  readonly evmBurnTxHash: string
  readonly stellarMintTxHash?: string
}

export function bridgeResumeStorageKey(network: NetworkKey, destinationAddress: string): string {
  return `${bridgeResumeStoragePrefix}:${network}:${destinationAddress}`
}

export function loadBridgeResumeBurnHash(network: NetworkKey, destinationAddress: string): string {
  const parsed = loadStoredBridgeResume(network, destinationAddress)
  return isTxHash(parsed?.evmBurnTxHash) ? parsed.evmBurnTxHash : ''
}

export function loadCompletedBridgeResumeReport(
  network: NetworkKey,
  destinationAddress: string,
): CctpBridgeReport | null {
  const parsed = loadStoredBridgeResume(network, destinationAddress)
  if (!parsed || !isTxHash(parsed.evmBurnTxHash) || !isStellarTxHash(parsed.stellarMintTxHash)) {
    return null
  }

  const config = getNetworkConfig(network)
  const evmSource = config.cctp?.evmSource
  return {
    status: 'completed',
    network,
    destinationAddress,
    sourceChain: evmSource?.label,
    amountAtomic: defaultBridgeAmountAtomic,
    amountDisplay: defaultBridgeAmountDisplay,
    maxFeeAtomic: defaultBridgeMaxFeeAtomic,
    finalityThreshold: defaultBridgeFinalityThreshold,
    evmApproveTxHash: isTxHash(parsed.evmApproveTxHash) ? parsed.evmApproveTxHash : undefined,
    evmApproveExplorerUrl:
      isTxHash(parsed.evmApproveTxHash) && evmSource ? `${evmSource.explorerTxUrl}/${parsed.evmApproveTxHash}` : undefined,
    evmBurnTxHash: parsed.evmBurnTxHash,
    evmBurnExplorerUrl: evmSource ? `${evmSource.explorerTxUrl}/${parsed.evmBurnTxHash}` : undefined,
    irisUrl: config.cctp?.irisUrl,
    attestationStatus: 'complete',
    stellarMintTxHash: parsed.stellarMintTxHash,
    stellarMintExplorerUrl: `${config.explorerTxUrl}/${parsed.stellarMintTxHash}`,
    publicUsdcArrived: true,
    shieldPrompt: true,
    statusEvents: [
      {
        stage: 'mint',
        elapsedMs: 0,
        message: 'Stellar mint_and_forward already confirmed',
        txHash: parsed.stellarMintTxHash,
      },
    ],
    blockers: [],
  }
}

export function saveBridgeResumeReport(report: CctpBridgeReport): void {
  if (!isTxHash(report.evmBurnTxHash)) {
    return
  }

  const stored: StoredBridgeResume = {
    version: bridgeResumeStorageVersion,
    network: report.network,
    destinationAddress: report.destinationAddress,
    evmApproveTxHash: isTxHash(report.evmApproveTxHash) ? report.evmApproveTxHash : undefined,
    evmBurnTxHash: report.evmBurnTxHash,
    stellarMintTxHash: isStellarTxHash(report.stellarMintTxHash) ? report.stellarMintTxHash : undefined,
  }
  window.localStorage.setItem(bridgeResumeStorageKey(report.network, report.destinationAddress), JSON.stringify(stored))
}

function loadStoredBridgeResume(network: NetworkKey, destinationAddress: string): Partial<StoredBridgeResume> | null {
  const stored = window.localStorage.getItem(bridgeResumeStorageKey(network, destinationAddress))
  if (!stored) {
    return null
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredBridgeResume>
    const matchesWallet = parsed.network === network && parsed.destinationAddress === destinationAddress
    return matchesWallet ? parsed : null
  } catch {
    return null
  }
}

function isTxHash(value: string | undefined): value is string {
  return Boolean(value && txHashPattern.test(value))
}

function isStellarTxHash(value: string | undefined): value is string {
  return Boolean(value && stellarTxPattern.test(value))
}

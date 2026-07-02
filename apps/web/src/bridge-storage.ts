import {
  getCctpSource,
  getNetworkConfig,
  isCctpSourceKey,
  type CctpBridgeReport,
  type CctpSourceKey,
  type NetworkKey,
} from '@zk-freighter/core'

const bridgeResumeStorageVersion = 2
const bridgeResumeStoragePrefix = 'zk-freighter:cctp-bridge-resume:v2'
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
  readonly sourceChainKey: CctpSourceKey
  readonly evmApproveTxHash?: string
  readonly evmBurnTxHash: string
  readonly stellarMintTxHash?: string
}

export function bridgeResumeStorageKey(network: NetworkKey, destinationAddress: string): string {
  return `${bridgeResumeStoragePrefix}:${network}:${destinationAddress}`
}

export function loadBridgeResumeSourceChain(network: NetworkKey, destinationAddress: string): CctpSourceKey | undefined {
  const parsed = loadStoredBridgeResume(network, destinationAddress)
  return isCctpSourceKey(parsed?.sourceChainKey) ? parsed.sourceChainKey : undefined
}

export function loadBridgeResumeBurnHash(
  network: NetworkKey,
  destinationAddress: string,
  sourceChainKey?: CctpSourceKey,
): string {
  const parsed = loadStoredBridgeResume(network, destinationAddress)
  if (!resumeSourceMatches(parsed, sourceChainKey)) {
    return ''
  }
  return isTxHash(parsed?.evmBurnTxHash) ? parsed.evmBurnTxHash : ''
}

export function loadCompletedBridgeResumeReport(
  network: NetworkKey,
  destinationAddress: string,
  sourceChainKey?: CctpSourceKey,
): CctpBridgeReport | null {
  const parsed = loadStoredBridgeResume(network, destinationAddress)
  if (
    !parsed ||
    !resumeSourceMatches(parsed, sourceChainKey) ||
    !isTxHash(parsed.evmBurnTxHash) ||
    !isStellarTxHash(parsed.stellarMintTxHash)
  ) {
    return null
  }

  const evmSource = getCctpSource(network, parsed.sourceChainKey)
  if (!evmSource) {
    return null
  }
  const config = getNetworkConfig(network)
  return {
    status: 'completed',
    network,
    destinationAddress,
    sourceChainKey: evmSource.key,
    sourceChain: evmSource.label,
    sourceDomain: evmSource.domain,
    sourceChainId: evmSource.chainId,
    sourceGasToken: evmSource.gasToken,
    amountAtomic: defaultBridgeAmountAtomic,
    amountDisplay: defaultBridgeAmountDisplay,
    maxFeeAtomic: defaultBridgeMaxFeeAtomic,
    finalityThreshold: defaultBridgeFinalityThreshold,
    evmApproveTxHash: isTxHash(parsed.evmApproveTxHash) ? parsed.evmApproveTxHash : undefined,
    evmApproveExplorerUrl:
      isTxHash(parsed.evmApproveTxHash) ? `${evmSource.explorerTxUrl}/${parsed.evmApproveTxHash}` : undefined,
    evmBurnTxHash: parsed.evmBurnTxHash,
    evmBurnExplorerUrl: `${evmSource.explorerTxUrl}/${parsed.evmBurnTxHash}`,
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
    sourceChainKey: report.sourceChainKey,
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

function resumeSourceMatches(
  parsed: Partial<StoredBridgeResume> | null,
  sourceChainKey: CctpSourceKey | undefined,
): parsed is Partial<StoredBridgeResume> & { readonly sourceChainKey: CctpSourceKey } {
  if (!parsed || !isCctpSourceKey(parsed.sourceChainKey)) {
    return false
  }
  return sourceChainKey === undefined || parsed.sourceChainKey === sourceChainKey
}

function isTxHash(value: string | undefined): value is string {
  return Boolean(value && txHashPattern.test(value))
}

function isStellarTxHash(value: string | undefined): value is string {
  return Boolean(value && stellarTxPattern.test(value))
}

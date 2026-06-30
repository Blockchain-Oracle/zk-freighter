import type {
  CctpBridgeReport,
  EvmCctpSourceClient,
  EvmCctpSourceConfig,
  NetworkKey,
  RunCctpBridgeOptions,
  StellarUsdcTrustlineReport,
  WalletIdentity,
} from '@zk-fighter/core'

interface RunBridgeAfterDestinationSetupOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly evmSource: EvmCctpSourceConfig
  readonly ensureDestinationReady: (options: {
    readonly identity: WalletIdentity
    readonly network: NetworkKey
  }) => Promise<StellarUsdcTrustlineReport>
  readonly createEvmClient: (chainIdHex: string, sourceLabel: string) => Promise<EvmCctpSourceClient>
  readonly runBridge: (options: RunCctpBridgeOptions) => Promise<CctpBridgeReport>
  readonly amountAtomic?: bigint
  readonly shouldContinue?: () => boolean
  readonly onDestinationReady?: (report: StellarUsdcTrustlineReport) => void
  readonly onWalletApprovalPending?: (pending: boolean) => void
  readonly onProgress: (report: CctpBridgeReport) => void
}

export async function runBridgeAfterDestinationSetup(
  options: RunBridgeAfterDestinationSetupOptions,
): Promise<CctpBridgeReport> {
  const receiveReport = await options.ensureDestinationReady({
    identity: options.identity,
    network: options.network,
  })
  if (options.shouldContinue && !options.shouldContinue()) {
    throw new Error('Bridge request changed before source-chain approval.')
  }
  options.onDestinationReady?.(receiveReport)
  options.onWalletApprovalPending?.(true)

  try {
    const evmClient = await options.createEvmClient(options.evmSource.chainIdHex, options.evmSource.label)
    if (options.shouldContinue && !options.shouldContinue()) {
      throw new Error('Bridge request changed before source-chain submission.')
    }
    const bridgeReport = await options.runBridge({
      identity: options.identity,
      network: options.network,
      sourceChainKey: options.evmSource.key,
      evmClient,
      amountAtomic: options.amountAtomic,
      onProgress: options.onProgress,
    })
    if (options.shouldContinue && !options.shouldContinue()) {
      throw new Error('Bridge request changed before completion.')
    }
    return bridgeReport
  } finally {
    options.onWalletApprovalPending?.(false)
  }
}

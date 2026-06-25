import {
  deriveWalletIdentity,
  ensureStellarUsdcTrustline,
  insertAspMembershipLeaf,
  resumeCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type CctpBridgeReport,
  type CctpSourceKey,
  type NetworkKey,
} from '../packages/core/src/index.ts'
import {
  bridgeTimeoutMs,
  maxShieldAttempts,
  retryDelayMs,
  sleep,
} from './cctp-bridge-source-support.ts'
import { inspectStellarDestinationReadiness } from './stellar-destination-readiness.ts'

type RunnerIdentity = ReturnType<typeof deriveWalletIdentity>
type DestinationReadiness = Awaited<ReturnType<typeof prepareDestination>>

export async function runResume(options: {
  readonly identity: RunnerIdentity
  readonly network: NetworkKey
  readonly sourceKey: CctpSourceKey
  readonly sourceLabel: string
  readonly burnHash: string
  readonly approveHash?: string
  readonly amountAtomic: bigint
  readonly maxFeeAtomic: bigint
}) {
  const destinationReadiness = await prepareDestination(options.identity, options.network)
  if (destinationReadiness.status === 'blocked') {
    console.log(JSON.stringify({
      ok: false,
      status: 'blocked',
      network: options.network,
      sourceChainKey: options.sourceKey,
      sourceChain: options.sourceLabel,
      destinationAddress: options.identity.stellarPublicKey,
      destinationReadiness,
    }, null, 2))
    return
  }

  const bridge = await resumeCctpBridgeToStellar({
    identity: options.identity,
    network: options.network,
    sourceChainKey: options.sourceKey,
    evmBurnTxHash: options.burnHash,
    evmApproveTxHash: options.approveHash,
    amountAtomic: options.amountAtomic,
    maxFeeAtomic: options.maxFeeAtomic,
    attestationPollIntervalMs: 15_000,
    attestationMaxPolls: 80,
  })
  if (bridge.status !== 'completed') {
    console.log(JSON.stringify({
      ok: false,
      status: bridge.status,
      network: options.network,
      sourceChainKey: options.sourceKey,
      sourceChain: options.sourceLabel,
      destinationAddress: options.identity.stellarPublicKey,
      destinationReadiness,
      bridge: summarizeBridge(bridge),
    }, null, 2))
    return
  }
  await completeShield({
    bridge,
    identity: options.identity,
    network: options.network,
    sourceKey: options.sourceKey,
    sourceLabel: options.sourceLabel,
    destinationReadiness,
  })
}

export async function completeShield(options: {
  readonly bridge: CctpBridgeReport
  readonly identity: RunnerIdentity
  readonly network: NetworkKey
  readonly sourceKey: CctpSourceKey
  readonly sourceLabel: string
  readonly destinationReadiness: DestinationReadiness
  readonly funding?: unknown
  readonly sourceAddress?: string
}) {
  await completeUsdcShield({
    ...options,
    amountAtomic: BigInt(options.bridge.amountAtomic),
  })
}

export async function completeShieldOnly(options: {
  readonly identity: RunnerIdentity
  readonly network: NetworkKey
  readonly sourceKey: CctpSourceKey
  readonly sourceLabel: string
  readonly destinationReadiness: DestinationReadiness
  readonly amountAtomic: bigint
}) {
  await completeUsdcShield(options)
}

async function completeUsdcShield(options: {
  readonly identity: RunnerIdentity
  readonly network: NetworkKey
  readonly sourceKey: CctpSourceKey
  readonly sourceLabel: string
  readonly destinationReadiness: DestinationReadiness
  readonly amountAtomic: bigint
  readonly bridge?: CctpBridgeReport
  readonly funding?: unknown
  readonly sourceAddress?: string
}) {
  const asp = await insertAspMembershipLeaf({ identity: options.identity, network: options.network })
  if (asp.status !== 'submitted') {
    console.log(JSON.stringify({
      ok: false,
      status: asp.status,
      network: options.network,
      sourceChainKey: options.sourceKey,
      destinationAddress: options.identity.stellarPublicKey,
      destinationReadiness: options.destinationReadiness,
      bridge: options.bridge ? summarizeBridge(options.bridge) : undefined,
      asp: summarizeAsp(asp),
    }, null, 2))
    return
  }

  const shield = await runShieldWithRetries(
    options.identity,
    options.network,
    postBridgeShieldAmountAtomic(options.amountAtomic),
  )
  console.log(JSON.stringify({
    ok: shield.status === 'submitted',
    status: shield.status,
    network: options.network,
    sourceChainKey: options.sourceKey,
    sourceChain: options.sourceLabel,
    sourceAddress: options.sourceAddress,
    destinationAddress: options.identity.stellarPublicKey,
    funding: options.funding,
    destinationReadiness: options.destinationReadiness,
    bridge: options.bridge ? summarizeBridge(options.bridge) : undefined,
    asp: summarizeAsp(asp),
    shield: summarizeShield(shield),
  }, null, 2))
}

export async function prepareDestination(identity: RunnerIdentity, network: NetworkKey) {
  if (network === 'mainnet') {
    return inspectStellarDestinationReadiness({
      destinationAddress: identity.stellarPublicKey,
      network,
    })
  }

  try {
    const report = await ensureStellarUsdcTrustline({ identity, network })
    return {
      status: 'ready' as const,
      network,
      destinationAddress: identity.stellarPublicKey,
      trustlineStatus: report.status,
      txHash: report.txHash,
      explorerUrl: report.explorerUrl,
      friendbotHash: report.friendbotHash,
      blockers: [],
    }
  } catch (error) {
    return {
      status: 'blocked' as const,
      network,
      destinationAddress: identity.stellarPublicKey,
      blockers: [error instanceof Error ? error.message : 'Stellar destination readiness failed.'],
    }
  }
}

export function summarizeBridge(report: CctpBridgeReport) {
  return {
    status: report.status,
    amountDisplay: report.amountDisplay,
    evmApproveTxHash: report.evmApproveTxHash,
    evmApproveExplorerUrl: report.evmApproveExplorerUrl,
    evmBurnTxHash: report.evmBurnTxHash,
    evmBurnExplorerUrl: report.evmBurnExplorerUrl,
    attestationStatus: report.attestationStatus,
    attestationEventNonce: report.attestationEventNonce,
    stellarMintTxHash: report.stellarMintTxHash,
    stellarMintExplorerUrl: report.stellarMintExplorerUrl,
    blockers: report.blockers,
  }
}

export function postBridgeShieldAmountAtomic(bridgedAmountAtomic: bigint): bigint {
  return bridgedAmountAtomic
}

async function runShieldWithRetries(identity: RunnerIdentity, network: NetworkKey, amountStroops: bigint) {
  let latest = await submitXlmShieldDeposit({ asset: 'USDC', identity, network, amountStroops, timeoutMs: bridgeTimeoutMs })
  for (let attempt = 1; attempt < maxShieldAttempts && shouldRetryShield(latest); attempt += 1) {
    await sleep(retryDelayMs)
    latest = await submitXlmShieldDeposit({ asset: 'USDC', identity, network, amountStroops, timeoutMs: bridgeTimeoutMs })
  }
  return latest
}

function shouldRetryShield(report: Awaited<ReturnType<typeof submitXlmShieldDeposit>>): boolean {
  return report.status === 'blocked' && report.blockers.some((blocker) => /ASP membership|indexer|sync|wait/i.test(blocker))
}

function summarizeAsp(report: Awaited<ReturnType<typeof insertAspMembershipLeaf>>) {
  return {
    status: report.status,
    contractId: report.contractId,
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
    blockers: report.blockers,
  }
}

function summarizeShield(report: Awaited<ReturnType<typeof submitXlmShieldDeposit>>) {
  return {
    status: report.status,
    poolContractId: report.poolContractId,
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
    proofGenerated: report.proofGenerated,
    transactionSubmitted: report.transactionSubmitted,
    durationMs: report.durationMs,
    blockers: report.blockers,
  }
}

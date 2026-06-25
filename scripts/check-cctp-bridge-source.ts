import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem'

import {
  deriveWalletIdentity,
  getCctpSource,
  insertAspMembershipLeaf,
  runCctpBridgeToStellar,
  submitXlmShieldDeposit,
  type EvmCctpSourceClient,
  type NetworkKey,
} from '../packages/core/src/index.ts'
import {
  bridgeTimeoutMs,
  chainFor,
  defaultAmountAtomic,
  defaultMinGasWei,
  faucetHints,
  inspectFunding,
  loadOrCreateDestinationMnemonic,
  loadOrCreateEvmAccount,
  maxShieldAttempts,
  parseBigIntEnv,
  parseNetwork,
  parseSourceKey,
  retryDelayMs,
  rpcUrlFor,
  shieldAmountMultiplier,
  sleep,
} from './cctp-bridge-source-support.ts'

async function main() {
  const network = parseNetwork()
  const sourceKey = parseSourceKey(network)
  const source = getCctpSource(network, sourceKey)
  const chain = chainFor(network, sourceKey)
  const rpcUrl = rpcUrlFor(network, sourceKey)
  const amountAtomic = parseBigIntEnv('ZKF_CCTP_AMOUNT_ATOMIC', defaultAmountAtomic)
  const minGasWei = parseBigIntEnv('ZKF_CCTP_MIN_GAS_WEI', defaultMinGasWei)

  if (!source) {
    throw new Error(`CCTP source ${sourceKey} is not configured on ${network}.`)
  }

  const account = await loadOrCreateEvmAccount(network, sourceKey)
  const identity = deriveWalletIdentity(await loadOrCreateDestinationMnemonic(), network)
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const funding = await inspectFunding({
    account,
    publicClient,
    source,
    amountAtomic,
    minGasWei,
  })

  if (funding.blockers.length > 0) {
    console.log(JSON.stringify({
      ok: false,
      status: 'blocked',
      network,
      sourceChainKey: sourceKey,
      sourceChain: source.label,
      rpcUrl,
      destinationAddress: identity.stellarPublicKey,
      funding,
      faucetHints: faucetHints(network, sourceKey),
    }, null, 2))
    return
  }

  const evmClient: EvmCctpSourceClient = {
    accountAddress: account.address,
    async sendTransaction(transaction) {
      if (transaction.chainIdHex.toLowerCase() !== source.chainIdHex.toLowerCase()) {
        throw new Error(`Refusing ${source.label} transaction for chain ${transaction.chainIdHex}.`)
      }
      return walletClient.sendTransaction({
        account,
        chain,
        to: transaction.to as Address,
        data: transaction.data,
      })
    },
    async waitForTransaction(txHash) {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as Hex,
        confirmations: 1,
        timeout: bridgeTimeoutMs,
      })
      if (receipt.status !== 'success') {
        throw new Error(`${source.label} transaction ${txHash} did not succeed.`)
      }
    },
  }

  const bridge = await runCctpBridgeToStellar({
    identity,
    network,
    sourceChainKey: sourceKey,
    evmClient,
    amountAtomic,
    attestationPollIntervalMs: 15_000,
    attestationMaxPolls: 80,
  })
  if (bridge.status !== 'completed') {
    console.log(JSON.stringify({
      ok: false,
      status: bridge.status,
      network,
      sourceChainKey: sourceKey,
      sourceChain: source.label,
      destinationAddress: identity.stellarPublicKey,
      bridge: summarizeBridge(bridge),
    }, null, 2))
    return
  }

  const asp = await insertAspMembershipLeaf({ identity, network })
  if (asp.status !== 'submitted') {
    console.log(JSON.stringify({
      ok: false,
      status: asp.status,
      network,
      sourceChainKey: sourceKey,
      destinationAddress: identity.stellarPublicKey,
      bridge: summarizeBridge(bridge),
      asp: summarizeAsp(asp),
    }, null, 2))
    return
  }

  const shield = await runShieldWithRetries(identity, network, amountAtomic * shieldAmountMultiplier)
  console.log(JSON.stringify({
    ok: shield.status === 'submitted',
    status: shield.status,
    network,
    sourceChainKey: sourceKey,
    sourceChain: source.label,
    sourceAddress: account.address,
    destinationAddress: identity.stellarPublicKey,
    funding,
    bridge: summarizeBridge(bridge),
    asp: summarizeAsp(asp),
    shield: summarizeShield(shield),
  }, null, 2))
}

async function runShieldWithRetries(identity: ReturnType<typeof deriveWalletIdentity>, network: NetworkKey, amountStroops: bigint) {
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

function summarizeBridge(report: Awaited<ReturnType<typeof runCctpBridgeToStellar>>) {
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

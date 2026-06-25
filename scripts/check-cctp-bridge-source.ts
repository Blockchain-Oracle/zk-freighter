import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem'

import {
  deriveWalletIdentity,
  getCctpSource,
  runCctpBridgeToStellar,
  type EvmCctpSourceClient,
} from '../packages/core/src/index.ts'
import {
  bridgeTimeoutMs,
  chainFor,
  defaultAmountAtomic,
  defaultMaxFeeAtomic,
  defaultMinGasWei,
  faucetHints,
  inspectFunding,
  loadOrCreateDestinationMnemonic,
  loadOrCreateEvmAccount,
  parseBigIntEnv,
  parseNetwork,
  parseSourceKey,
  rpcUrlFor,
} from './cctp-bridge-source-support.ts'
import { completeShield, completeShieldOnly, prepareDestination, runResume, summarizeBridge } from './cctp-bridge-source-flow.ts'

async function main() {
  const network = parseNetwork()
  const sourceKey = parseSourceKey(network)
  const source = getCctpSource(network, sourceKey)
  const chain = chainFor(network, sourceKey)
  const rpcUrl = rpcUrlFor(network, sourceKey)
  const amountAtomic = parseBigIntEnv('ZKF_CCTP_AMOUNT_ATOMIC', defaultAmountAtomic)
  const maxFeeAtomic = parseBigIntEnv('ZKF_CCTP_MAX_FEE_ATOMIC', defaultMaxFeeAtomic)
  const minGasWei = parseBigIntEnv('ZKF_CCTP_MIN_GAS_WEI', defaultMinGasWei)
  const resumeBurnHash = process.env.ZKF_CCTP_RESUME_BURN_HASH?.trim()
  const resumeApproveHash = process.env.ZKF_CCTP_RESUME_APPROVE_HASH?.trim()
  const shieldOnly = process.env.ZKF_CCTP_SHIELD_ONLY === '1'

  if (!source) {
    throw new Error(`CCTP source ${sourceKey} is not configured on ${network}.`)
  }

  const identity = deriveWalletIdentity(await loadOrCreateDestinationMnemonic(), network)
  if (shieldOnly) {
    const destinationReadiness = await prepareDestination(identity, network)
    if (destinationReadiness.status === 'blocked') {
      console.log(JSON.stringify({
        ok: false,
        status: 'blocked',
        network,
        sourceChainKey: sourceKey,
        sourceChain: source.label,
        destinationAddress: identity.stellarPublicKey,
        destinationReadiness,
      }, null, 2))
      return
    }
    await completeShieldOnly({
      identity,
      network,
      sourceKey,
      sourceLabel: source.label,
      destinationReadiness,
      amountAtomic,
    })
    return
  }

  if (resumeBurnHash) {
    await runResume({
      identity,
      network,
      sourceKey,
      sourceLabel: source.label,
      burnHash: resumeBurnHash,
      approveHash: resumeApproveHash,
      amountAtomic,
      maxFeeAtomic,
    })
    return
  }

  const account = await loadOrCreateEvmAccount(network, sourceKey)
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const earlyReadiness = network === 'mainnet' ? await prepareDestination(identity, network) : undefined
  const funding = await inspectFunding({
    account,
    publicClient,
    source,
    requiredUsdcAtomic: amountAtomic + maxFeeAtomic,
    minGasWei,
  })

  if (funding.blockers.length > 0 || earlyReadiness?.status === 'blocked') {
    console.log(JSON.stringify({
      ok: false,
      status: 'blocked',
      network,
      sourceChainKey: sourceKey,
      sourceChain: source.label,
      rpcUrl,
      destinationAddress: identity.stellarPublicKey,
      funding,
      destinationReadiness: earlyReadiness,
      faucetHints: faucetHints(network, sourceKey),
    }, null, 2))
    return
  }

  const destinationReadiness = earlyReadiness ?? await prepareDestination(identity, network)
  if (destinationReadiness.status === 'blocked') {
    console.log(JSON.stringify({
      ok: false,
      status: 'blocked',
      network,
      sourceChainKey: sourceKey,
      sourceChain: source.label,
      rpcUrl,
      destinationAddress: identity.stellarPublicKey,
      funding,
      destinationReadiness,
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
    maxFeeAtomic,
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
      destinationReadiness,
      bridge: summarizeBridge(bridge),
    }, null, 2))
    return
  }

  await completeShield({ bridge, identity, network, sourceKey, sourceLabel: source.label, destinationReadiness, funding, sourceAddress: account.address })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

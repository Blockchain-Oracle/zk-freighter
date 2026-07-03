import { createPublicClient, createWalletClient, erc20Abi, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, optimismSepolia } from 'viem/chains'

import { getCctpSource } from '@zk-freighter/core'
import type { FundingConfig } from './config.js'

export type EvmFaucetChain = 'base' | 'optimism'
export const EVM_FAUCET_CHAINS: readonly EvmFaucetChain[] = ['base', 'optimism']

export interface EvmFundingAssetReport {
  readonly asset: 'USDC' | 'GAS'
  readonly status: 'ready' | 'needs-funding' | 'funded' | 'failed' | 'unavailable'
  readonly balance?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly blocker?: string
}

export interface EvmFundingProvider {
  status(address: `0x${string}`, chain: EvmFaucetChain, config: FundingConfig): Promise<readonly EvmFundingAssetReport[]>
  fund(address: `0x${string}`, chain: EvmFaucetChain, config: FundingConfig): Promise<readonly EvmFundingAssetReport[]>
}

const viemChains = { base: baseSepolia, optimism: optimismSepolia } as const

function chainContext(chain: EvmFaucetChain, config: FundingConfig) {
  const source = getCctpSource('testnet', chain)
  if (!source) throw new Error(`No testnet CCTP source configured for ${chain}.`)
  const transport = http(config.evmRpcUrls[chain])
  return {
    source,
    publicClient: createPublicClient({ chain: viemChains[chain], transport }),
    transport,
  }
}

async function readBalances(address: `0x${string}`, chain: EvmFaucetChain, config: FundingConfig) {
  const { source, publicClient } = chainContext(chain, config)
  const [gasWei, usdc] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: source.usdcContract as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
  ])
  return { gasWei, usdc, source }
}

export async function evmFundingStatus(
  address: `0x${string}`,
  chain: EvmFaucetChain,
  config: FundingConfig,
): Promise<readonly EvmFundingAssetReport[]> {
  try {
    const { gasWei, usdc } = await readBalances(address, chain, config)
    return [
      { asset: 'USDC', status: usdc >= config.evmUsdcAmount ? 'ready' : 'needs-funding', balance: usdc.toString() },
      { asset: 'GAS', status: gasWei >= config.evmGasAmountWei ? 'ready' : 'needs-funding', balance: gasWei.toString() },
    ]
  } catch (cause) {
    const blocker = cause instanceof Error ? cause.message : 'EVM balance read failed.'
    return [{ asset: 'USDC', status: 'failed', blocker }, { asset: 'GAS', status: 'failed', blocker }]
  }
}

export async function fundEvmAddress(
  address: `0x${string}`,
  chain: EvmFaucetChain,
  config: FundingConfig,
): Promise<readonly EvmFundingAssetReport[]> {
  if (!config.evmFunderPrivateKey) {
    const blocker = 'EVM funder is not configured.'
    return [{ asset: 'USDC', status: 'unavailable', blocker }, { asset: 'GAS', status: 'unavailable', blocker }]
  }
  const current = await evmFundingStatus(address, chain, config)
  if (current.some((asset) => asset.status === 'failed')) return current

  const { source, publicClient } = chainContext(chain, config)
  const account = privateKeyToAccount(config.evmFunderPrivateKey as `0x${string}`)
  const wallet = createWalletClient({ account, chain: viemChains[chain], transport: http(config.evmRpcUrls[chain]) })
  const reports: EvmFundingAssetReport[] = []

  for (const asset of current) {
    if (asset.status !== 'needs-funding') {
      reports.push(asset)
      continue
    }
    try {
      const hash = asset.asset === 'USDC'
        ? await wallet.writeContract({
            address: source.usdcContract as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [address, config.evmUsdcAmount],
          })
        : await wallet.sendTransaction({ to: address, value: config.evmGasAmountWei })
      await publicClient.waitForTransactionReceipt({ hash })
      reports.push({ ...asset, status: 'funded', txHash: hash, explorerUrl: `${source.explorerTxUrl}/${hash}` })
    } catch (cause) {
      reports.push({ ...asset, status: 'failed', blocker: cause instanceof Error ? cause.message : 'EVM funding transfer failed.' })
    }
  }
  return reports
}

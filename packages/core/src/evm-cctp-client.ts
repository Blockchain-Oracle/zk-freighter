import { createPublicClient, createWalletClient, erc20Abi, http, type Chain, type Hex } from 'viem'
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from 'viem/chains'
import { deriveEvmAccount } from './evm-identity'
import type { EvmCctpSourceClient } from './cctp-types'

const SUPPORTED_CHAINS: readonly Chain[] = [
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
]

const CHAINS_BY_ID = new Map<number, Chain>(SUPPORTED_CHAINS.map((chain) => [chain.id, chain]))

/** Resolves a configured CCTP source `chainIdHex` to its viem chain definition. */
export function chainForHex(chainIdHex: string): Chain {
  const chain = CHAINS_BY_ID.get(Number(BigInt(chainIdHex)))
  if (!chain) {
    throw new Error(`Unsupported EVM chain ${chainIdHex}`)
  }
  return chain
}

export interface CreateSeedEvmClientOptions {
  readonly mnemonic: string
  readonly chainIdHex: string
  /** Override the public RPC (defaults to the viem chain's public endpoint). */
  readonly rpcUrl?: string
}

/**
 * EvmCctpSourceClient backed by the wallet's own seed-derived EVM key. It signs the
 * CCTP approve + burn transactions itself over a public RPC — no MetaMask/WalletConnect.
 */
export async function createSeedEvmClient(options: CreateSeedEvmClientOptions): Promise<EvmCctpSourceClient> {
  const chain = chainForHex(options.chainIdHex)
  const account = deriveEvmAccount(options.mnemonic)
  const transport = http(options.rpcUrl)
  const wallet = createWalletClient({ account, chain, transport })
  const publicClient = createPublicClient({ chain, transport })

  return {
    accountAddress: account.address,
    sendTransaction: async (transaction) => {
      if (transaction.chainIdHex.toLowerCase() !== options.chainIdHex.toLowerCase()) {
        throw new Error('Bridge transaction targeted a different chain than the EVM signer.')
      }
      return wallet.sendTransaction({ to: transaction.to as Hex, data: transaction.data })
    },
    waitForTransaction: async (txHash) => {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex })
      if (receipt.status !== 'success') {
        throw new Error(`EVM transaction ${txHash} reverted.`)
      }
    },
  }
}

export interface EvmBalances {
  readonly address: string
  readonly nativeWei: bigint
  readonly usdcAtomic: bigint
}

export interface LoadEvmBalancesOptions {
  readonly mnemonic: string
  readonly chainIdHex: string
  readonly usdcContract: string
  readonly rpcUrl?: string
}

/** Reads the seed EVM address's native (gas) + USDC balances on the source chain. */
export async function loadEvmBalances(options: LoadEvmBalancesOptions): Promise<EvmBalances> {
  const chain = chainForHex(options.chainIdHex)
  const address = deriveEvmAccount(options.mnemonic).address
  const publicClient = createPublicClient({ chain, transport: http(options.rpcUrl) })

  const [nativeWei, usdcAtomic] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: options.usdcContract as Hex,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
  ])

  return { address, nativeWei, usdcAtomic }
}

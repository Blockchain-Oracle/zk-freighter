import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { erc20Abi, formatUnits, type Address, type Chain, type PublicClient } from 'viem'
import { privateKeyToAccount, generatePrivateKey, type PrivateKeyAccount } from 'viem/accounts'
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, optimism, optimismSepolia, sepolia } from 'viem/chains'

import {
  generateSeedPhrase,
  getCctpSource,
  getDefaultCctpSource,
  isCctpSourceKey,
  type CctpSourceKey,
  type NetworkKey,
} from '../packages/core/src/index.ts'

export const defaultAmountAtomic = 1_000_000n
export const defaultMaxFeeAtomic = 500n
export const defaultMinGasWei = 50_000_000_000_000n
export const bridgeTimeoutMs = 240_000
export const retryDelayMs = 20_000
export const maxShieldAttempts = 3
export const opApprovalGasLimit = 120_000n
export const opCctpBurnGasLimit = 1_500_000n

const configDir = path.join(os.homedir(), '.config', 'zk-fighter')
const evmWalletPath = path.join(configDir, 'cctp-evm-wallets.json')
const evmWalletLockPath = path.join(configDir, 'cctp-evm-wallets.lock')
const destinationWalletPath = path.join(configDir, 'cctp-bridge-destination.json')
const lockRetryMs = 100
const lockAttempts = 100

const chains = {
  testnet: {
    ethereum: sepolia,
    base: baseSepolia,
    arbitrum: arbitrumSepolia,
    optimism: optimismSepolia,
  },
  mainnet: {
    ethereum: mainnet,
    base,
    arbitrum,
    optimism,
  },
} satisfies Record<NetworkKey, Record<CctpSourceKey, Chain>>

const rpcUrls = {
  testnet: {
    ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
    base: 'https://sepolia.base.org',
    arbitrum: 'https://sepolia-rollup.arbitrum.io/rpc',
    optimism: 'https://sepolia.optimism.io',
  },
  mainnet: {
    ethereum: 'https://ethereum-rpc.publicnode.com',
    base: 'https://mainnet.base.org',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
  },
} satisfies Record<NetworkKey, Record<CctpSourceKey, string>>

type StoredNetworkWallets = Partial<Record<CctpSourceKey, string>> & { readonly shared?: string }
type StoredEvmWallets = Partial<Record<NetworkKey, StoredNetworkWallets>>

interface StoredDestinationWallet {
  readonly mnemonic: string
}

export interface FundingSnapshot {
  readonly sourceAddress: Address
  readonly nativeBalanceWei: string
  readonly nativeBalanceDisplay: string
  readonly usdcBalanceAtomic: string
  readonly usdcBalanceDisplay: string
  readonly blockers: readonly string[]
}

const cctpSourceKeys: readonly CctpSourceKey[] = ['ethereum', 'base', 'arbitrum', 'optimism']

export function parseNetwork(): NetworkKey {
  return process.env.ZKF_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
}

export function parseSourceKey(network: NetworkKey): CctpSourceKey {
  const configured = process.env.ZKF_CCTP_SOURCE?.trim()
  if (configured && isCctpSourceKey(configured)) {
    return configured
  }
  if (configured) {
    throw new Error(`Invalid ZKF_CCTP_SOURCE "${configured}". Allowed values: ${cctpSourceKeys.join(', ')}.`)
  }
  const fallback = getDefaultCctpSource(network)?.key
  if (!fallback) {
    throw new Error(`No default CCTP source configured for ${network}.`)
  }
  return fallback
}

export function parseBigIntEnv(name: string, fallback: bigint): bigint {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }
  const parsed = BigInt(raw)
  if (parsed <= 0n) {
    throw new Error(`${name} must be greater than zero.`)
  }
  return parsed
}

export function chainFor(network: NetworkKey, sourceKey: CctpSourceKey): Chain {
  return chains[network][sourceKey]
}

export function rpcUrlFor(network: NetworkKey, sourceKey: CctpSourceKey): string {
  return process.env.ZKF_CCTP_RPC_URL ?? rpcUrls[network][sourceKey]
}

export function gasLimitForSourceTransaction(options: {
  readonly network: NetworkKey
  readonly sourceKey: CctpSourceKey
  readonly to: string
  readonly source: NonNullable<ReturnType<typeof getCctpSource>>
  readonly approveGasLimit?: bigint
  readonly burnGasLimit?: bigint
}): bigint | undefined {
  const lowerTo = options.to.toLowerCase()
  const usdcContract = options.source.usdcContract.toLowerCase()
  const tokenMessenger = options.source.tokenMessenger.toLowerCase()
  if (lowerTo === usdcContract && options.approveGasLimit) {
    return options.approveGasLimit
  }
  if (lowerTo === tokenMessenger && options.burnGasLimit) {
    return options.burnGasLimit
  }
  if (options.network !== 'testnet' || options.sourceKey !== 'optimism') {
    return undefined
  }
  if (lowerTo === usdcContract) {
    return opApprovalGasLimit
  }
  if (lowerTo === tokenMessenger) {
    return opCctpBurnGasLimit
  }
  return undefined
}

export async function loadOrCreateEvmAccount(
  network: NetworkKey,
  sourceKey: CctpSourceKey,
): Promise<PrivateKeyAccount> {
  const fromEnv = process.env.ZKF_CCTP_EVM_PRIVATE_KEY
  if (fromEnv) {
    return privateKeyToAccount(fromEnv as `0x${string}`)
  }

  return withWalletLock(async () => {
    const wallets = await readJson<StoredEvmWallets>(evmWalletPath, {})
    const privateKey = wallets[network]?.shared ?? wallets[network]?.[sourceKey] ?? generatePrivateKey()
    await writeJson(evmWalletPath, {
      ...wallets,
      [network]: {
        ...wallets[network],
        shared: privateKey,
        [sourceKey]: privateKey,
      },
    })
    return privateKeyToAccount(privateKey as `0x${string}`)
  })
}

export async function loadOrCreateDestinationMnemonic(): Promise<string> {
  const stored = await readJson<StoredDestinationWallet | undefined>(destinationWalletPath, undefined)
  if (stored?.mnemonic) {
    return stored.mnemonic
  }
  const phrase = generateSeedPhrase()
  await writeJson(destinationWalletPath, { mnemonic: phrase })
  return phrase
}

export async function inspectFunding(options: {
  readonly account: PrivateKeyAccount
  readonly publicClient: PublicClient
  readonly source: NonNullable<ReturnType<typeof getCctpSource>>
  readonly requiredUsdcAtomic: bigint
  readonly minGasWei: bigint
}): Promise<FundingSnapshot> {
  const [nativeBalance, usdcBalance] = await Promise.all([
    options.publicClient.getBalance({ address: options.account.address }),
    options.publicClient.readContract({
      address: options.source.usdcContract as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [options.account.address],
    }),
  ])
  const blockers: string[] = []
  if (nativeBalance < options.minGasWei) {
    blockers.push(`Fund ${options.account.address} with at least ${formatUnits(options.minGasWei, 18)} ${options.source.gasToken}.`)
  }
  if (usdcBalance < options.requiredUsdcAtomic) {
    blockers.push(`Fund ${options.account.address} with at least ${formatUnits(options.requiredUsdcAtomic, 6)} USDC on ${options.source.label}.`)
  }
  return {
    sourceAddress: options.account.address,
    nativeBalanceWei: nativeBalance.toString(),
    nativeBalanceDisplay: `${formatUnits(nativeBalance, 18)} ${options.source.gasToken}`,
    usdcBalanceAtomic: usdcBalance.toString(),
    usdcBalanceDisplay: `${formatUnits(usdcBalance, 6)} USDC`,
    blockers,
  }
}

export function faucetHints(network: NetworkKey, sourceKey: CctpSourceKey): readonly string[] {
  if (network === 'mainnet') {
    return ['Mainnet requires real source-chain gas and native USDC. Do not use this script until spend is intentional.']
  }
  const gasHint = sourceKey === 'base'
    ? 'Base Sepolia ETH faucet: https://portal.cdp.coinbase.com/products/faucet'
    : sourceKey === 'arbitrum'
      ? 'Arbitrum Sepolia ETH faucet: https://faucet.quicknode.com/arbitrum/sepolia'
      : sourceKey === 'optimism'
        ? 'OP Sepolia ETH faucet: https://console.optimism.io/faucet'
        : 'Sepolia ETH faucet: https://www.alchemy.com/faucets/ethereum-sepolia'
  return [gasHint, 'Circle testnet USDC faucet: https://faucet.circle.com/']
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function withWalletLock<T>(task: () => Promise<T>): Promise<T> {
  await mkdir(configDir, { recursive: true })
  for (let attempt = 0; attempt < lockAttempts; attempt += 1) {
    try {
      const handle = await open(evmWalletLockPath, 'wx')
      try {
        return await task()
      } finally {
        await handle.close()
        await rm(evmWalletLockPath, { force: true })
      }
    } catch (error) {
      if (!isLockConflict(error)) {
        throw error
      }
      await sleep(lockRetryMs)
    }
  }
  throw new Error('Timed out waiting for the CCTP EVM wallet lock.')
}

function isLockConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T
  } catch {
    return fallback
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk'

import { getNetworkConfig, type AssetCode, type FundingAssetReport, type NetworkKey } from '@zk-freighter/core'
import type { FundingConfig } from './config.js'

const txTimeoutSeconds = 30
const stroopsPerUnit = 10_000_000n

interface HorizonBalanceLine {
  readonly asset_type: string
  readonly balance: string
  readonly asset_code?: string
  readonly asset_issuer?: string
}

interface HorizonAccount {
  readonly balances?: readonly HorizonBalanceLine[]
}

export async function fundingStatus(address: string, network: NetworkKey, assets: readonly AssetCode[], config: FundingConfig): Promise<readonly FundingAssetReport[]> {
  if (network !== 'testnet') {
    return assets.map((asset) => ({ asset, status: 'unavailable', blocker: 'Demo funding is testnet-only.' }))
  }
  if (!config.funderSecret) {
    return assets.map((asset) => ({ asset, status: 'unavailable', blocker: 'Testnet funding wallet is not configured.' }))
  }
  const account = await loadDestination(address, network)
  return assets.map((asset) => statusForAsset(asset, account, config))
}

export async function fundAddress(address: string, network: NetworkKey, assets: readonly AssetCode[], config: FundingConfig): Promise<readonly FundingAssetReport[]> {
  if (network !== 'testnet') {
    return assets.map((asset) => ({ asset, status: 'unavailable', blocker: 'Demo funding is testnet-only.' }))
  }
  if (!config.funderSecret) {
    return assets.map((asset) => ({ asset, status: 'unavailable', blocker: 'Testnet funding wallet is not configured.' }))
  }

  const keypair = Keypair.fromSecret(config.funderSecret)
  const reports: FundingAssetReport[] = []
  for (const asset of assets) {
    reports.push(await fundAsset({ asset, address, keypair, config }))
  }
  return reports
}

async function fundAsset(options: {
  readonly asset: AssetCode
  readonly address: string
  readonly keypair: Keypair
  readonly config: FundingConfig
}): Promise<FundingAssetReport> {
  const current = await loadDestination(options.address, 'testnet')
  const status = statusForAsset(options.asset, current, options.config)
  if (status.status === 'ready' || status.status === 'needs-trustline') return status

  try {
    const txHash = options.asset === 'XLM'
      ? await submitXlmFunding(options.address, current.exists, options.keypair, options.config.xlmAmountStroops)
      : await submitUsdcFunding(options.address, options.keypair, options.config.usdcAmountStroops)
    return {
      asset: options.asset,
      status: 'funded',
      txHash,
      explorerUrl: `${getNetworkConfig('testnet').explorerTxUrl}/${txHash}`,
    }
  } catch (error) {
    return {
      asset: options.asset,
      status: 'failed',
      blocker: error instanceof Error ? error.message : `Could not fund ${options.asset}.`,
    }
  }
}

async function submitXlmFunding(destination: string, exists: boolean, keypair: Keypair, amountStroops: bigint): Promise<string> {
  const network = getNetworkConfig('testnet')
  const server = new Horizon.Server(network.horizonUrl)
  const source = await server.loadAccount(keypair.publicKey())
  const fee = await server.fetchBaseFee()
  const operation = exists
    ? Operation.payment({ destination, asset: Asset.native(), amount: stellarAmount(amountStroops) })
    : Operation.createAccount({ destination, startingBalance: stellarAmount(amountStroops) })
  const tx = new TransactionBuilder(source, { fee: String(fee), networkPassphrase: network.passphrase })
    .addOperation(operation)
    .setTimeout(txTimeoutSeconds)
    .build()
  tx.sign(keypair)
  const result = await server.submitTransaction(tx)
  if (!result.hash) throw new Error('XLM funding submitted without a transaction hash.')
  return result.hash
}

async function submitUsdcFunding(destination: string, keypair: Keypair, amountStroops: bigint): Promise<string> {
  const network = getNetworkConfig('testnet')
  const issuer = network.assets.USDC.issuer
  if (!issuer) throw new Error('Testnet USDC issuer is not configured.')
  const server = new Horizon.Server(network.horizonUrl)
  const source = await server.loadAccount(keypair.publicKey())
  const sourceBalance = balanceFor('USDC', source)
  if ((sourceBalance ?? 0n) < amountStroops) {
    throw new Error(`Funding wallet has only ${stellarAmount(sourceBalance ?? 0n)} USDC; lower ZKF_TESTNET_FUND_USDC or top up the funder.`)
  }
  const fee = await server.fetchBaseFee()
  const tx = new TransactionBuilder(source, { fee: String(fee), networkPassphrase: network.passphrase })
    .addOperation(Operation.payment({ destination, asset: new Asset('USDC', issuer), amount: stellarAmount(amountStroops) }))
    .setTimeout(txTimeoutSeconds)
    .build()
  tx.sign(keypair)
  const result = await server.submitTransaction(tx)
  if (!result.hash) throw new Error('USDC funding submitted without a transaction hash.')
  return result.hash
}

async function loadDestination(address: string, network: NetworkKey): Promise<{ readonly exists: boolean; readonly account?: HorizonAccount }> {
  try {
    const account = await new Horizon.Server(getNetworkConfig(network).horizonUrl).loadAccount(address)
    return { exists: true, account }
  } catch (error) {
    if (isNotFound(error)) return { exists: false }
    throw error
  }
}

function statusForAsset(asset: AssetCode, destination: { readonly exists: boolean; readonly account?: HorizonAccount }, config: FundingConfig): FundingAssetReport {
  if (!destination.exists) {
    return asset === 'XLM'
      ? { asset, status: 'needs-funding', blocker: 'Account is not funded yet.' }
      : { asset, status: 'needs-trustline', blocker: 'Create the canonical USDC trustline before USDC can be delivered.' }
  }
  const balance = balanceFor(asset, destination.account)
  const target = asset === 'XLM' ? config.xlmAmountStroops : config.usdcAmountStroops
  if (asset === 'USDC' && balance === null) {
    return { asset, status: 'needs-trustline', blocker: 'Create the canonical USDC trustline before USDC can be delivered.' }
  }
  if ((balance ?? 0n) >= target) return { asset, status: 'ready', balanceStroops: (balance ?? 0n).toString() }
  return { asset, status: 'needs-funding', balanceStroops: (balance ?? 0n).toString() }
}

function balanceFor(asset: AssetCode, account: HorizonAccount | undefined): bigint | null {
  if (asset === 'XLM') {
    const line = account?.balances?.find((balance) => balance.asset_type === 'native')
    return line?.balance ? parseStellarAmount(line.balance) : 0n
  }
  const issuer = getNetworkConfig('testnet').assets.USDC.issuer
  const line = account?.balances?.find((balance) => balance.asset_code === 'USDC' && balance.asset_issuer === issuer)
  return line?.balance ? parseStellarAmount(line.balance) : null
}

function stellarAmount(stroops: bigint): string {
  const whole = stroops / stroopsPerUnit
  const fractional = (stroops % stroopsPerUnit).toString().padStart(7, '0')
  return `${whole}.${fractional}`
}

function parseStellarAmount(value: string): bigint {
  const [whole = '0', fractional = ''] = value.split('.')
  return BigInt(whole) * stroopsPerUnit + BigInt(fractional.padEnd(7, '0').slice(0, 7))
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { response?: { status?: number } }).response?.status === 404
}

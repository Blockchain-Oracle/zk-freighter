import { Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import type { AssetCode } from './assets'
import { deriveWalletKeypair, type WalletIdentity } from './identity'
import { getNetworkConfig, type NetworkKey } from './networks'

const classicTxTimeoutSeconds = 30
const stellarDecimals = 7
const baseReserveStroops = 5_000_000n
const stellarPublicKeyPattern = /^G[A-Z2-7]{55}$/

export type PublicStellarPaymentStatus = 'submitted' | 'blocked' | 'failed'

export interface PublicStellarPaymentReport {
  readonly status: PublicStellarPaymentStatus
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly fromAddress: string
  readonly recipientAddress: string
  readonly amountStroops: string
  readonly feeStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly blockers: readonly string[]
  readonly error?: string
}

interface HorizonBalanceLine {
  readonly asset_type: string
  readonly balance: string
  readonly asset_code?: string
  readonly asset_issuer?: string
}

type HorizonAccount = ConstructorParameters<typeof TransactionBuilder>[0] & {
  readonly balances?: readonly HorizonBalanceLine[]
  readonly subentry_count?: string | number
}

interface PaymentHorizonServer {
  loadAccount(publicKey: string): Promise<HorizonAccount>
  fetchBaseFee(): Promise<number | string>
  submitTransaction(transaction: ReturnType<TransactionBuilder['build']>): Promise<{ readonly hash?: string }>
}

export interface SubmitPublicStellarPaymentOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops: bigint
  readonly recipientAddress: string
  readonly horizonFactory?: (horizonUrl: string) => PaymentHorizonServer
}

export async function submitPublicStellarPayment(
  options: SubmitPublicStellarPaymentOptions,
): Promise<PublicStellarPaymentReport> {
  const recipientAddress = options.recipientAddress.trim()
  const config = getNetworkConfig(options.network)
  const base = {
    network: options.network,
    asset: options.asset,
    fromAddress: options.identity.stellarPublicKey,
    recipientAddress,
    amountStroops: options.amountStroops.toString(),
  } as const

  if (!stellarPublicKeyPattern.test(recipientAddress)) {
    return { ...base, status: 'blocked', blockers: ['Enter a valid public Stellar address.'] }
  }
  if (options.amountStroops <= 0n) {
    return { ...base, status: 'blocked', blockers: ['Amount must be greater than zero.'] }
  }

  try {
    const horizon = (options.horizonFactory ?? defaultHorizonFactory)(config.horizonUrl)
    const [source, recipient, fee] = await Promise.all([
      horizon.loadAccount(options.identity.stellarPublicKey),
      horizon.loadAccount(recipientAddress).catch(() => null),
      horizon.fetchBaseFee(),
    ])
    const feeStroops = BigInt(fee)
    if (!recipient) {
      return { ...base, status: 'blocked', feeStroops: feeStroops.toString(), blockers: ['Recipient account is not funded on Stellar.'] }
    }

    const blockers = blockersForPayment(source, recipient, options, feeStroops)
    if (blockers.length > 0) {
      return { ...base, status: 'blocked', feeStroops: feeStroops.toString(), blockers }
    }

    const asset = paymentAsset(options.asset, config.assets.USDC.issuer)
    const tx = new TransactionBuilder(source, {
      fee: feeStroops.toString(),
      networkPassphrase: config.passphrase,
    })
      .addOperation(Operation.payment({ destination: recipientAddress, asset, amount: stroopsToDecimal(options.amountStroops) }))
      .setTimeout(classicTxTimeoutSeconds)
      .build()

    tx.sign(deriveWalletKeypair(options.identity.mnemonic))
    const sent = await horizon.submitTransaction(tx)
    if (!sent.hash) throw new Error('Horizon did not return a transaction hash.')
    return {
      ...base,
      status: 'submitted',
      feeStroops: feeStroops.toString(),
      txHash: sent.hash,
      explorerUrl: `${config.explorerTxUrl}/${sent.hash}`,
      blockers: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Public Stellar payment failed.'
    return { ...base, status: 'failed', blockers: [message], error: message }
  }
}

function blockersForPayment(
  source: HorizonAccount,
  recipient: HorizonAccount,
  options: SubmitPublicStellarPaymentOptions,
  feeStroops: bigint,
): readonly string[] {
  const sourceXlm = balanceFor(source, 'XLM')
  const usdcIssuer = getNetworkConfig(options.network).assets.USDC.issuer
  const available = balanceFor(source, options.asset, options.asset === 'USDC' ? usdcIssuer : undefined)
  const minimumXlm = minimumNativeBalance(source)

  if (available < options.amountStroops) return [`Public ${options.asset} balance is lower than the send amount.`]
  if (options.asset === 'XLM' && sourceXlm - options.amountStroops < minimumXlm + feeStroops) {
    return ['XLM send would drop the account below Stellar reserve plus network fee.']
  }
  if (options.asset === 'USDC') {
    if (!usdcIssuer) return ['Canonical USDC is not configured for this network.']
    if (sourceXlm < minimumXlm + feeStroops) return ['Not enough XLM to pay the Stellar network fee.']
    if (!hasTrustline(recipient, 'USDC', usdcIssuer)) return ['Recipient does not have the canonical USDC trustline.']
  }
  return []
}

function paymentAsset(asset: AssetCode, usdcIssuer: string | undefined): Asset {
  if (asset === 'XLM') return Asset.native()
  if (!usdcIssuer) throw new Error('Canonical USDC is not configured for this network.')
  return new Asset('USDC', usdcIssuer)
}

function hasTrustline(account: HorizonAccount, code: string, issuer: string): boolean {
  return account.balances?.some((line) => line.asset_code === code && line.asset_issuer === issuer) === true
}

function balanceFor(account: HorizonAccount, asset: AssetCode, issuer?: string): bigint {
  const line = asset === 'XLM'
    ? account.balances?.find((entry) => entry.asset_type === 'native')
    : account.balances?.find((entry) => entry.asset_code === asset && (!issuer || entry.asset_issuer === issuer))
  return line ? decimalToStroops(line.balance) : 0n
}

function minimumNativeBalance(account: HorizonAccount): bigint {
  const subentries = BigInt(Number(account.subentry_count ?? 0))
  return baseReserveStroops * (2n + subentries)
}

function decimalToStroops(value: string): bigint {
  const [whole, frac = ''] = value.trim().split('.')
  return BigInt(`${whole || '0'}${frac.slice(0, stellarDecimals).padEnd(stellarDecimals, '0')}`)
}

function stroopsToDecimal(value: bigint): string {
  const sign = value < 0n ? '-' : ''
  const raw = (value < 0n ? -value : value).toString().padStart(stellarDecimals + 1, '0')
  const whole = raw.slice(0, -stellarDecimals)
  const fraction = raw.slice(-stellarDecimals)
  return `${sign}${whole}.${fraction}`
}

function defaultHorizonFactory(horizonUrl: string): PaymentHorizonServer {
  return new Horizon.Server(horizonUrl)
}

import { Horizon } from '@stellar/stellar-sdk'
import type { AssetCode } from './assets'
import { getNetworkConfig, type NetworkKey } from './networks'

// Stellar balances are always expressed with 7 decimal places (one stroop = 1e-7),
// which matches our internal stroop convention for both XLM and USDC.
const STELLAR_DECIMALS = 7

export type PublicBalancesStatus = 'loaded' | 'unfunded' | 'failed'

export interface PublicBalancesReport {
  readonly status: PublicBalancesStatus
  readonly network: NetworkKey
  readonly userAddress: string
  /** Raw public balances in stroops, keyed by asset. 0n when no line / no trustline. */
  readonly balances: Record<AssetCode, bigint>
  readonly error?: string
}

interface HorizonBalanceEntry {
  readonly asset_type: string
  readonly balance: string
  readonly asset_code?: string
  readonly asset_issuer?: string
}

interface BalancesHorizonServer {
  loadAccount(publicKey: string): Promise<{ readonly balances?: readonly HorizonBalanceEntry[] }>
}

export interface LoadPublicStellarBalancesOptions {
  readonly address: string
  readonly network: NetworkKey
  readonly horizonFactory?: (horizonUrl: string) => BalancesHorizonServer
}

function defaultHorizonFactory(horizonUrl: string): BalancesHorizonServer {
  return new Horizon.Server(horizonUrl)
}

/** Converts a Stellar decimal balance string (e.g. "85.0000000") to stroops. */
function decimalToStroops(value: string): bigint {
  const [intPart, fracPart = ''] = value.trim().split('.')
  const frac = fracPart.slice(0, STELLAR_DECIMALS).padEnd(STELLAR_DECIMALS, '0')
  return BigInt(`${intPart || '0'}${frac}`)
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const response = (error as { response?: { status?: number } }).response
  return response?.status === 404 || (error as { name?: string }).name === 'NotFoundError'
}

/**
 * Reads the user's real public Stellar balances (native XLM + canonical USDC) from
 * Horizon. USDC is matched only against the network's canonical issuer so a
 * spoofed-issuer token can never inflate the figure. Never throws — a missing
 * account is reported as `unfunded` (zeroed), any other failure as `failed`.
 */
export async function loadPublicStellarBalances(
  options: LoadPublicStellarBalancesOptions,
): Promise<PublicBalancesReport> {
  const config = getNetworkConfig(options.network)
  const usdcIssuer = config.assets.USDC.issuer
  const balances: Record<AssetCode, bigint> = { XLM: 0n, USDC: 0n }

  try {
    const horizon = (options.horizonFactory ?? defaultHorizonFactory)(config.horizonUrl)
    const account = await horizon.loadAccount(options.address)

    for (const line of account.balances ?? []) {
      if (line.asset_type === 'native') {
        balances.XLM = decimalToStroops(line.balance)
      } else if (line.asset_code === 'USDC' && line.asset_issuer === usdcIssuer) {
        balances.USDC = decimalToStroops(line.balance)
      }
    }

    return { status: 'loaded', network: options.network, userAddress: options.address, balances }
  } catch (error) {
    if (isNotFound(error)) {
      return { status: 'unfunded', network: options.network, userAddress: options.address, balances }
    }

    const message = error instanceof Error ? error.message : 'failed to load public balances'
    return {
      status: 'failed',
      network: options.network,
      userAddress: options.address,
      balances,
      error: message,
    }
  }
}

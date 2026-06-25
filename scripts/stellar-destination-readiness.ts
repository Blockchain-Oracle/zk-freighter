import { getNetworkConfig, type NetworkKey } from '../packages/core/src/index.ts'

export interface StellarDestinationReadiness {
  readonly status: 'ready' | 'blocked'
  readonly network: NetworkKey
  readonly destinationAddress: string
  readonly hasAccount: boolean
  readonly hasUsdcTrustline: boolean
  readonly blockers: readonly string[]
}

interface HorizonAccountResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

type ReadonlyFetch = (url: string) => Promise<HorizonAccountResponse>

export async function inspectStellarDestinationReadiness(options: {
  readonly destinationAddress: string
  readonly network: NetworkKey
  readonly fetcher?: ReadonlyFetch
}): Promise<StellarDestinationReadiness> {
  const network = getNetworkConfig(options.network)
  const usdc = network.assets.USDC
  const fetcher = options.fetcher ?? globalThis.fetch
  const blockers: string[] = []
  if (!fetcher) {
    return report(false, false, ['Fetch is unavailable for Stellar destination readiness preflight.'])
  }

  const response = await fetcher(`${network.horizonUrl}/accounts/${encodeURIComponent(options.destinationAddress)}`)
  if (response.status === 404) {
    return report(false, false, [
      `Stellar destination ${options.destinationAddress} is not funded on ${network.label}. Fund it and create a USDC trustline before source-chain burn.`,
    ])
  }
  if (!response.ok) {
    return report(false, false, [`Horizon account lookup failed with HTTP ${response.status}.`])
  }

  const account = await response.json()
  const hasTrustline = hasUsdcTrustline(account, usdc.code, usdc.issuer)
  if (!hasTrustline) {
    blockers.push(`Stellar destination ${options.destinationAddress} has no ${usdc.code} trustline on ${network.label}. Create it before source-chain burn.`)
  }
  return report(true, hasTrustline, blockers)

  function report(
    hasAccount: boolean,
    hasUsdcTrustline: boolean,
    nextBlockers: readonly string[],
  ): StellarDestinationReadiness {
    return {
      status: nextBlockers.length > 0 ? 'blocked' : 'ready',
      network: options.network,
      destinationAddress: options.destinationAddress,
      hasAccount,
      hasUsdcTrustline,
      blockers: nextBlockers,
    }
  }
}

function hasUsdcTrustline(account: unknown, code: string, issuer: string | undefined): boolean {
  if (!issuer || typeof account !== 'object' || account === null || !('balances' in account)) {
    return !issuer
  }
  const balances = Array.isArray(account.balances) ? account.balances : []
  return balances.some((balance) => {
    if (typeof balance !== 'object' || balance === null) {
      return false
    }
    return 'asset_code' in balance &&
      'asset_issuer' in balance &&
      balance.asset_code === code &&
      balance.asset_issuer === issuer
  })
}

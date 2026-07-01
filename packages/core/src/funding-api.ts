import type { AssetCode } from './assets'
import type { NetworkKey, NetworkConfig } from './networks'
import { getNetworkConfig } from './networks'

export type FundingAssetStatus = 'ready' | 'funded' | 'needs-funding' | 'needs-trustline' | 'skipped' | 'unavailable' | 'failed'
export type FundingRequestStatus = 'ready' | 'funded' | 'needs-funding' | 'unavailable' | 'failed'

export interface FundingAssetReport {
  readonly asset: AssetCode
  readonly status: FundingAssetStatus
  readonly balanceStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly blocker?: string
}

export interface FundingApiReport {
  readonly status: FundingRequestStatus
  readonly network: NetworkKey
  readonly userAddress: string
  readonly assets: readonly FundingAssetReport[]
  readonly blockers: readonly string[]
  readonly cooldownUntil?: string
}

export interface FundingApiOptions {
  readonly network: NetworkKey
  readonly address: string
  readonly assets?: readonly AssetCode[]
  readonly fundingApiUrl?: string
  readonly fetch?: typeof fetch
  readonly networkConfig?: NetworkConfig
}

export async function loadHostedFundingStatus(options: FundingApiOptions): Promise<FundingApiReport> {
  return fundingApiGet(options)
}

export async function requestHostedFunding(options: FundingApiOptions): Promise<FundingApiReport> {
  return fundingApiPost(options)
}

function apiUrl(options: FundingApiOptions): string | undefined {
  return options.fundingApiUrl ?? options.networkConfig?.fundingApiUrl ?? getNetworkConfig(options.network).fundingApiUrl
}

async function fundingApiGet(options: FundingApiOptions): Promise<FundingApiReport> {
  const base = apiUrl(options)
  if (!base) return unavailable(options, 'Demo funding service is not configured for this build.')
  const url = `${base}/v1/funding/status?network=${encodeURIComponent(options.network)}&address=${encodeURIComponent(options.address)}`
  try {
    return readFundingResponse(options, await fetcher(options)(url, { method: 'GET' }))
  } catch (error) {
    return unavailable(options, error instanceof Error ? error.message : 'Demo funding service is unavailable.')
  }
}

async function fundingApiPost(options: FundingApiOptions): Promise<FundingApiReport> {
  const base = apiUrl(options)
  if (!base) return unavailable(options, 'Demo funding service is not configured for this build.')
  try {
    return readFundingResponse(
      options,
      await fetcher(options)(`${base}/v1/funding/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          network: options.network,
          address: options.address,
          assets: options.assets ?? ['XLM', 'USDC'],
        }),
      }),
    )
  } catch (error) {
    return unavailable(options, error instanceof Error ? error.message : 'Demo funding service is unavailable.')
  }
}

function fetcher(options: FundingApiOptions): typeof fetch {
  const found = options.fetch ?? globalThis.fetch
  if (!found) throw new Error('Fetch is unavailable for hosted funding.')
  return found
}

async function readFundingResponse(options: FundingApiOptions, response: Response): Promise<FundingApiReport> {
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `Demo funding service returned HTTP ${response.status}.`
    return unavailable(options, message)
  }
  if (!isFundingReport(payload)) return unavailable(options, 'Demo funding service returned an unexpected response.')
  return payload
}

function unavailable(options: FundingApiOptions, blocker: string): FundingApiReport {
  return {
    status: 'unavailable',
    network: options.network,
    userAddress: options.address,
    assets: [],
    blockers: [blocker],
  }
}

function isFundingReport(value: unknown): value is FundingApiReport {
  return isRecord(value) &&
    isFundingStatus(value.status) &&
    (value.network === 'testnet' || value.network === 'mainnet') &&
    typeof value.userAddress === 'string' &&
    Array.isArray(value.assets) &&
    Array.isArray(value.blockers)
}

function isFundingStatus(value: unknown): value is FundingRequestStatus {
  return value === 'ready' || value === 'funded' || value === 'needs-funding' || value === 'unavailable' || value === 'failed'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

import { getNetworkConfig, type NetworkConfig, type NetworkKey } from './networks'

/** EVM faucet chains — Sepolia testnets only. */
export type EvmFaucetChain = 'base' | 'optimism'
export type EvmFundingAssetCode = 'USDC' | 'GAS'
export type EvmFundingStatus = 'ready' | 'needs-funding' | 'funded' | 'failed' | 'unavailable'

export interface EvmFundingAssetReport {
  readonly asset: EvmFundingAssetCode
  readonly status: EvmFundingStatus
  readonly balance?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly blocker?: string
}

export interface EvmFundingReport {
  readonly status: EvmFundingStatus
  readonly chain: EvmFaucetChain
  readonly userAddress: string
  readonly assets: readonly EvmFundingAssetReport[]
  readonly blockers: readonly string[]
  readonly cooldownUntil?: string
}

export interface EvmFundingOptions {
  readonly chain: EvmFaucetChain
  readonly address: string
  readonly network: NetworkKey
  readonly fundingApiUrl?: string
  readonly fetch?: typeof fetch
  readonly networkConfig?: NetworkConfig
}

export function isEvmFaucetChain(value: string): value is EvmFaucetChain {
  return value === 'base' || value === 'optimism'
}

export async function evmFundingStatus(options: EvmFundingOptions): Promise<EvmFundingReport> {
  const guard = testnetGuard(options)
  if (guard) return guard
  const base = apiUrl(options)
  if (!base) return unavailable(options, 'EVM faucet service is not configured for this build.')
  const url = `${base}/v1/evm-funding/status?chain=${encodeURIComponent(options.chain)}&address=${encodeURIComponent(options.address)}`
  try {
    return readResponse(options, await fetcher(options)(url, { method: 'GET' }))
  } catch (error) {
    return unavailable(options, error instanceof Error ? error.message : 'EVM faucet service is unavailable.')
  }
}

export async function requestEvmFunding(options: EvmFundingOptions): Promise<EvmFundingReport> {
  const guard = testnetGuard(options)
  if (guard) return guard
  const base = apiUrl(options)
  if (!base) return unavailable(options, 'EVM faucet service is not configured for this build.')
  try {
    return readResponse(
      options,
      await fetcher(options)(`${base}/v1/evm-funding/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chain: options.chain, address: options.address }),
      }),
    )
  } catch (error) {
    return unavailable(options, error instanceof Error ? error.message : 'EVM faucet service is unavailable.')
  }
}

function testnetGuard(options: EvmFundingOptions): EvmFundingReport | null {
  if (options.network === 'testnet') return null
  return unavailable(options, 'The EVM faucet only funds Sepolia testnets.')
}

function apiUrl(options: EvmFundingOptions): string | undefined {
  return options.fundingApiUrl ?? options.networkConfig?.fundingApiUrl ?? getNetworkConfig(options.network).fundingApiUrl
}

function fetcher(options: EvmFundingOptions): typeof fetch {
  const found = options.fetch ?? globalThis.fetch
  if (!found) throw new Error('Fetch is unavailable for EVM faucet requests.')
  return found
}

async function readResponse(options: EvmFundingOptions, response: Response): Promise<EvmFundingReport> {
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `EVM faucet service returned HTTP ${response.status}.`
    return unavailable(options, message)
  }
  if (!isEvmFundingReport(payload)) return unavailable(options, 'EVM faucet service returned an unexpected response.')
  return payload
}

function unavailable(options: EvmFundingOptions, blocker: string): EvmFundingReport {
  return { status: 'unavailable', chain: options.chain, userAddress: options.address, assets: [], blockers: [blocker] }
}

function isEvmFundingReport(value: unknown): value is EvmFundingReport {
  return isRecord(value) &&
    isEvmFundingStatus(value.status) &&
    isEvmFaucetChain(String(value.chain)) &&
    typeof value.userAddress === 'string' &&
    Array.isArray(value.assets) &&
    Array.isArray(value.blockers)
}

function isEvmFundingStatus(value: unknown): value is EvmFundingStatus {
  return value === 'ready' || value === 'needs-funding' || value === 'funded' || value === 'unavailable' || value === 'failed'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

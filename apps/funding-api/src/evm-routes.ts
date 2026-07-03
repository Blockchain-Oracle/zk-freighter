import { isAddress, getAddress } from 'viem'

import type { FundingConfig } from './config.js'
import { EVM_FAUCET_CHAINS, evmFundingStatus, fundEvmAddress, type EvmFaucetChain, type EvmFundingAssetReport, type EvmFundingProvider } from './evm.js'
import { ipFor, isRecord, json } from './http.js'
import type { FundingStore } from './store.js'

export interface EvmFundingReport {
  readonly status: 'ready' | 'needs-funding' | 'funded' | 'failed' | 'unavailable'
  readonly chain: EvmFaucetChain
  readonly userAddress: string
  readonly assets: readonly EvmFundingAssetReport[]
  readonly blockers: readonly string[]
  readonly cooldownUntil?: string
}

const defaultProvider: EvmFundingProvider = { status: evmFundingStatus, fund: fundEvmAddress }

/** Handles /v1/evm-funding/* routes; returns null when the request is not ours. */
export async function handleEvmFundingRoutes(
  request: Request,
  url: URL,
  config: FundingConfig,
  store: FundingStore,
  provider: EvmFundingProvider = defaultProvider,
): Promise<Response | null> {
  if (request.method === 'GET' && url.pathname === '/v1/evm-funding/status') {
    const parsed = parseEvmInput(url.searchParams.get('chain'), url.searchParams.get('address'))
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)
    const assets = await provider.status(parsed.address, parsed.chain, config)
    return json(reportFor(parsed.chain, parsed.address, assets))
  }

  if (request.method === 'POST' && url.pathname === '/v1/evm-funding/request') {
    const body = await request.json().catch(() => undefined)
    if (!isRecord(body)) return json({ ok: false, error: 'Expected JSON body.' }, 400)
    const parsed = parseEvmInput(String(body.chain ?? ''), String(body.address ?? ''))
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)

    const ip = ipFor(request)
    const current = await provider.status(parsed.address, parsed.chain, config)
    if (!current.some((asset) => asset.status === 'needs-funding')) {
      return json(reportFor(parsed.chain, parsed.address, current))
    }

    const limited = await rateLimit(parsed.chain, parsed.address, ip, config, store)
    if (limited) return json(limited, 429)

    // Record the rate-limit slot BEFORE dispensing: recording after the (slow)
    // on-chain transfers leaves a seconds-wide window where concurrent requests
    // all pass the count check. Record-first shrinks it to milliseconds; a failed
    // dispense consumes the slot (acceptable for a testnet faucet), and the
    // authoritative outcome lives on-chain via the returned tx hashes.
    await store.recordRequest({ network: networkKeyFor(parsed.chain), address: parsed.address, ip, assets: ['USDC', 'GAS'], response: { dispatched: true } })
    const assets = await provider.fund(parsed.address, parsed.chain, config)
    return json(reportFor(parsed.chain, parsed.address, assets))
  }

  return null
}

function networkKeyFor(chain: EvmFaucetChain): string {
  return `${chain}-sepolia`
}

async function rateLimit(chain: EvmFaucetChain, address: string, ip: string, config: FundingConfig, store: FundingStore): Promise<EvmFundingReport | null> {
  const [addressCount, ipCount] = await Promise.all([
    store.countAddressRequests(networkKeyFor(chain), address, new Date(Date.now() - config.addressWindowMs)),
    store.countIpRequests(ip, new Date(Date.now() - config.ipWindowMs)),
  ])
  if (addressCount >= config.addressLimit || ipCount >= config.ipLimit) {
    return {
      status: 'unavailable',
      chain,
      userAddress: address,
      assets: [],
      cooldownUntil: new Date(Date.now() + Math.min(config.addressWindowMs, config.ipWindowMs)).toISOString(),
      blockers: ['Funding cooldown is active for this address or network location.'],
    }
  }
  return null
}

function reportFor(chain: EvmFaucetChain, address: string, assets: readonly EvmFundingAssetReport[]): EvmFundingReport {
  const statuses = new Set(assets.map((asset) => asset.status))
  const status = statuses.has('failed') ? 'failed'
    : statuses.has('unavailable') ? 'unavailable'
      : statuses.has('needs-funding') ? 'needs-funding'
        : statuses.has('funded') ? 'funded'
          : 'ready'
  return {
    status,
    chain,
    userAddress: address,
    assets,
    blockers: assets.flatMap((asset) => (asset.blocker ? [asset.blocker] : [])),
  }
}

function parseEvmInput(chain: string | null, address: string | null):
  | { readonly ok: true; readonly chain: EvmFaucetChain; readonly address: `0x${string}` }
  | { readonly ok: false; readonly error: string } {
  if (!chain || !EVM_FAUCET_CHAINS.includes(chain as EvmFaucetChain)) {
    return { ok: false, error: 'Unsupported chain. Expected base or optimism (Sepolia testnets only).' }
  }
  if (!address || !isAddress(address)) return { ok: false, error: 'Expected a valid EVM address (0x…).' }
  return { ok: true, chain: chain as EvmFaucetChain, address: getAddress(address) }
}

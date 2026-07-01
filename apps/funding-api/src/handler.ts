import { Keypair, StrKey } from '@stellar/stellar-sdk'

import type { AssetCode, FundingApiReport, FundingAssetReport, NetworkKey } from '@zk-fighter/core'
import type { FundingConfig } from './config.js'
import { fundAddress, fundingStatus } from './stellar.js'
import type { FundingStore } from './store.js'

const allowedAssets: readonly AssetCode[] = ['XLM', 'USDC']

interface FundingProvider {
  status(address: string, network: NetworkKey, assets: readonly AssetCode[], config: FundingConfig): Promise<readonly FundingAssetReport[]>
  fund(address: string, network: NetworkKey, assets: readonly AssetCode[], config: FundingConfig): Promise<readonly FundingAssetReport[]>
}

const defaultProvider: FundingProvider = {
  status: fundingStatus,
  fund: fundAddress,
}

export function createHandler(config: FundingConfig, store: FundingStore, provider: FundingProvider = defaultProvider): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') return empty(204)
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, fundingConfigured: Boolean(config.funderSecret), database: config.databaseUrl ? 'postgres' : 'memory' })
    }
    if (request.method === 'GET' && url.pathname === '/v1/funding/status') {
      return status(request, config, provider, url)
    }
    if (request.method === 'POST' && url.pathname === '/v1/funding/request') {
      return fundingRequest(request, config, store, provider)
    }
    return json({ ok: false, error: 'Not found.' }, 404)
  }
}

async function status(request: Request, config: FundingConfig, provider: FundingProvider, url: URL): Promise<Response> {
  const parsed = parseInput(url.searchParams.get('network'), url.searchParams.get('address'), allowedAssets)
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)
  const assets = await provider.status(parsed.address, parsed.network, parsed.assets, config)
  return json(reportFor(parsed.network, parsed.address, assets, ipFor(request)))
}

async function fundingRequest(request: Request, config: FundingConfig, store: FundingStore, provider: FundingProvider): Promise<Response> {
  const body = await request.json().catch(() => undefined)
  if (!isRecord(body)) return json({ ok: false, error: 'Expected JSON body.' }, 400)
  const parsed = parseInput(String(body.network ?? ''), String(body.address ?? ''), assetList(body.assets))
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400)
  const ip = ipFor(request)
  const currentAssets = await provider.status(parsed.address, parsed.network, parsed.assets, config)
  const currentReport = reportFor(parsed.network, parsed.address, currentAssets, ip)
  if (!needsFundingSpend(currentAssets)) return json(currentReport)
  const limited = await rateLimit(parsed.network, parsed.address, ip, config, store)
  if (limited) return json(limited, 429)
  const assets = await provider.fund(parsed.address, parsed.network, parsed.assets, config)
  const report = reportFor(parsed.network, parsed.address, assets, ip)
  await store.recordRequest({ network: parsed.network, address: parsed.address, ip, assets: parsed.assets, response: report })
  return json(report)
}

async function rateLimit(network: NetworkKey, address: string, ip: string, config: FundingConfig, store: FundingStore): Promise<FundingApiReport | null> {
  const addressSince = new Date(Date.now() - config.addressWindowMs)
  const ipSince = new Date(Date.now() - config.ipWindowMs)
  const [addressCount, ipCount] = await Promise.all([
    store.countAddressRequests(network, address, addressSince),
    store.countIpRequests(ip, ipSince),
  ])
  if (addressCount >= config.addressLimit || ipCount >= config.ipLimit) {
    return {
      status: 'unavailable',
      network,
      userAddress: address,
      assets: [],
      cooldownUntil: new Date(Date.now() + Math.min(config.addressWindowMs, config.ipWindowMs)).toISOString(),
      blockers: ['Funding cooldown is active for this address or network location.'],
    }
  }
  return null
}

function reportFor(network: NetworkKey, address: string, assets: readonly FundingAssetReport[], ip: string): FundingApiReport {
  void ip
  const blockers = assets.flatMap((asset) => asset.blocker ? [asset.blocker] : [])
  const statuses = new Set(assets.map((asset) => asset.status))
  const status = statuses.has('failed') ? 'failed'
      : statuses.has('unavailable') ? 'unavailable'
      : statuses.has('needs-trustline') || statuses.has('needs-funding') ? 'needs-funding'
        : statuses.has('funded') ? 'funded'
          : 'ready'
  return { status, network, userAddress: address, assets, blockers }
}

function needsFundingSpend(assets: readonly FundingAssetReport[]): boolean {
  return assets.some((asset) => asset.status === 'needs-funding')
}

function parseInput(network: string | null, address: string | null, assets: readonly AssetCode[]): { readonly ok: true; readonly network: NetworkKey; readonly address: string; readonly assets: readonly AssetCode[] } | { readonly ok: false; readonly error: string } {
  if (network !== 'testnet' && network !== 'mainnet') return { ok: false, error: 'Unsupported network.' }
  if (!address || !StrKey.isValidEd25519PublicKey(address)) return { ok: false, error: 'Expected a valid Stellar public key.' }
  if (network === 'mainnet') return { ok: false, error: 'Demo funding is not available on mainnet.' }
  if (assets.length === 0) return { ok: false, error: 'Select at least one asset.' }
  if (assets.some((asset) => !allowedAssets.includes(asset))) return { ok: false, error: 'Unsupported funding asset.' }
  return { ok: true, network, address: Keypair.fromPublicKey(address).publicKey(), assets }
}

function assetList(value: unknown): readonly AssetCode[] {
  return Array.isArray(value) ? value.filter((asset): asset is AssetCode => asset === 'XLM' || asset === 'USDC') : allowedAssets
}

function ipFor(request: Request): string {
  return request.headers.get('x-zkf-client-ip') || 'local'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'content-type': 'application/json; charset=utf-8' },
  })
}

function empty(status: number): Response {
  return new Response(null, { status, headers: cors() })
}

function cors(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

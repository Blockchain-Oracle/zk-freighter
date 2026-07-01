import type { BootnodeConfig } from './config.js'
import type { BootnodeStore, CachedRpcResponse } from './store.js'

const allowedMethods = new Set(['getEvents', 'getLatestLedger'])

interface JsonRpcRequest {
  readonly jsonrpc?: string
  readonly id?: unknown
  readonly method?: string
  readonly params?: unknown
}

export function createHandler(config: BootnodeConfig, store: BootnodeStore): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') return empty(204)
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, network: config.network, database: config.databaseUrl ? 'postgres' : 'memory' })
    }
    if (request.method !== 'POST' || url.pathname !== '/rpc') return json({ ok: false, error: 'Not found.' }, 404)
    const body = await request.json().catch(() => undefined)
    if (!isRpcRequest(body)) return rpcError(null, -32600, 'Invalid JSON-RPC request.')
    if (!body.method || !allowedMethods.has(body.method)) return rpcError(body.id, -32601, 'Method not allowed by ZK Fighter bootnode.')
    if (body.method === 'getEvents' && !paramsUseAllowedContracts(body.params, config.allowedContracts)) {
      return rpcError(body.id, -32602, 'Event request must filter by ZK Fighter pool contracts only.')
    }
    return proxyWithCache(body, config, store)
  }
}

async function proxyWithCache(body: JsonRpcRequest, config: BootnodeConfig, store: BootnodeStore): Promise<Response> {
  const key = cacheKey(body)
  let upstream: Response
  try {
    upstream = await fetch(config.upstreamRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    return cachedFallback(body, key, store, error instanceof Error ? error.message : 'upstream request failed')
  }

  const payload = await upstream.json().catch(() => undefined)
  if (body.method === 'getEvents' && !upstream.ok) return cachedFallback(body, key, store, `upstream returned ${upstream.status}`)
  const response: CachedRpcResponse = { status: upstream.status, body: payload }
  if (body.method === 'getEvents' && upstream.ok && !isRpcError(payload)) await store.write(key, response)
  return json(payload, upstream.status)
}

function paramsUseAllowedContracts(params: unknown, allowedContracts: readonly string[]): boolean {
  const filters = isRecord(params) && Array.isArray(params.filters) ? params.filters : []
  if (filters.length === 0) return false
  return filters.every((filter) => {
    if (!isRecord(filter) || !Array.isArray(filter.contractIds) || filter.contractIds.length === 0) return false
    return filter.contractIds.every((contractId) => typeof contractId === 'string' && allowedContracts.includes(contractId))
  })
}

function cacheKey(body: JsonRpcRequest): string {
  return stableJson({ method: body.method, params: body.params })
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function rpcError(id: unknown, code: number, message: string): Response {
  return json({ jsonrpc: '2.0', id, error: { code, message } })
}

function cachedMiss(id: unknown, reason: string): Response {
  return json({ jsonrpc: '2.0', id, error: { code: -32004, message: 'Bootnode cache miss and upstream unavailable.', data: { reason } } }, 503)
}

async function cachedFallback(body: JsonRpcRequest, key: string, store: BootnodeStore, reason: string): Promise<Response> {
  const cached = body.method === 'getEvents' ? await store.read(key) : null
  return cached ? json(cached.body, cached.status) : cachedMiss(body.id, reason)
}

function isRpcRequest(value: unknown): value is JsonRpcRequest {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRpcError(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && 'error' in value)
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

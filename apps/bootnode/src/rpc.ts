import type { BootnodeConfig } from './config.js'
import { cacheKey } from './rpc-cache.js'
import type { GetEventsParams, GetEventsResult, JsonRpcRequest } from './rpc-types.js'
import type { BootnodeIndexerState, BootnodeStore, CachedRpcResponse } from './store.js'

const allowedMethods = new Set(['getEvents', 'getLatestLedger'])

export function createHandler(config: BootnodeConfig, store: BootnodeStore): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') return empty(204)
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json(health(config, await store.readIndexerState()))
    }
    if (request.method !== 'POST' || url.pathname !== '/rpc') return json({ ok: false, error: 'Not found.' }, 404)
    const body = await request.json().catch(() => undefined)
    if (!isRpcRequest(body)) return rpcError(null, -32600, 'Invalid JSON-RPC request.')
    if (!body.method || !allowedMethods.has(body.method)) return rpcError(body.id, -32601, 'Method not allowed by ZK Fighter bootnode.')
    if (body.method === 'getEvents' && !paramsUseAllowedContracts(body.params, config.allowedContracts)) {
      return rpcError(body.id, -32602, 'Event request must filter by ZK Fighter private index contracts only.')
    }
    if (body.method === 'getEvents') {
      const warmed = await warmedEvents(body, store)
      if (warmed) return warmed
    }
    if (body.method === 'getLatestLedger') {
      const warmed = await warmedLatestLedger(body, store)
      if (warmed) return warmed
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
  if (body.method === 'getEvents' && upstream.ok && !isRpcError(payload)) {
    await store.write(key, response)
    await writeEventsFromPayload(payload, store)
  }
  return json(payload, upstream.status)
}

async function warmedEvents(body: JsonRpcRequest, store: BootnodeStore): Promise<Response | null> {
  const params = getEventsParams(body.params)
  if (!params) return null
  const state = await store.readIndexerState()
  if (state.caughtUpLedger === null || state.caughtUpCursor === null || !topicsAreUnfiltered(params)) return null
  const cursor = params.pagination?.cursor
  const startLedger = typeof params.startLedger === 'number' ? params.startLedger : undefined
  if (!cursor && (startLedger === undefined || startLedger > state.caughtUpLedger)) return null
  if (cursor && cursor > state.caughtUpCursor) return null
  const limit = boundedLimit(params.pagination?.limit)
  const contractIds = contractIdsFromParams(params)
  const events = await store.readEvents({ contractIds, startLedger, cursor, throughLedger: state.caughtUpLedger, limit })
  const cursorOut = events.length > 0 ? events.at(-1)!.pagingToken : state.caughtUpCursor
  return json({
    jsonrpc: '2.0',
    id: body.id,
    result: {
      events: events.map((event) => event.body),
      cursor: cursorOut,
      latestLedger: state.caughtUpLedger,
      latestLedgerCloseTime: closeTime(events.at(-1)?.body, state.updatedAt),
      oldestLedger: state.oldestLedger ?? events[0]?.ledger ?? state.caughtUpLedger,
      oldestLedgerCloseTime: closeTime(events[0]?.body, state.updatedAt),
    },
  })
}

async function warmedLatestLedger(body: JsonRpcRequest, store: BootnodeStore): Promise<Response | null> {
  const state = await store.readIndexerState()
  const sequence = state.caughtUpLedger ?? state.latestLedger
  if (sequence === null) return null
  return json({
    jsonrpc: '2.0',
    id: body.id,
    result: {
      id: `zkf-bootnode-${sequence}`,
      protocolVersion: 0,
      sequence,
      bootnodeCached: true,
    },
  })
}

function health(config: BootnodeConfig, state: BootnodeIndexerState) {
  const latest = state.latestLedger
  const caughtUp = state.caughtUpLedger
  const lag = latest !== null && caughtUp !== null ? Math.max(0, latest - caughtUp) : null
  return {
    ok: true,
    ready: Boolean(config.databaseUrl && caughtUp !== null),
    network: config.network,
    database: config.databaseUrl ? 'postgres' : 'memory',
    allowedContracts: config.allowedContracts,
    indexer: {
      enabled: config.indexerEnabled,
      startLedger: config.indexerStartLedger,
      latestLedger: latest,
      oldestLedger: state.oldestLedger,
      caughtUpLedger: caughtUp,
      caughtUpCursor: state.caughtUpCursor,
      lastCursor: state.lastCursor,
      lag,
      updatedAt: state.updatedAt,
    },
  }
}

function paramsUseAllowedContracts(params: unknown, allowedContracts: readonly string[]): boolean {
  const filters = isRecord(params) && Array.isArray(params.filters) ? params.filters : []
  if (filters.length === 0) return false
  return filters.every((filter) => {
    if (!isRecord(filter) || !Array.isArray(filter.contractIds) || filter.contractIds.length === 0) return false
    return filter.contractIds.every((contractId) => typeof contractId === 'string' && allowedContracts.includes(contractId))
  })
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

function getEventsParams(value: unknown): GetEventsParams | null {
  if (!isRecord(value) || !Array.isArray(value.filters)) return null
  return value as unknown as GetEventsParams
}

function contractIdsFromParams(params: GetEventsParams): readonly string[] {
  return params.filters?.flatMap((filter) => Array.isArray(filter.contractIds) ? filter.contractIds.filter((item): item is string => typeof item === 'string') : []) ?? []
}

function topicsAreUnfiltered(params: GetEventsParams): boolean {
  const filters = params.filters ?? []
  return filters.every((filter) => filter.topics === undefined || stableTopicJson(filter.topics) === '[[\"**\"]]')
}

function stableTopicJson(value: unknown): string {
  return JSON.stringify(value)
}

function closeTime(event: unknown, fallback: string | null): string {
  if (isRecord(event) && typeof event.ledgerClosedAt === 'string') return event.ledgerClosedAt
  return fallback ?? new Date(0).toISOString()
}

function boundedLimit(value: unknown): number {
  const limit = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 200
  return Math.min(Math.max(limit, 1), 1_000)
}

async function writeEventsFromPayload(payload: unknown, store: BootnodeStore): Promise<void> {
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.events)) return
  const result = payload.result as unknown as GetEventsResult
  const records = result.events.map((event) => {
    if (!isRecord(event)) return null
    const id = stringValue(event.id) ?? stringValue(event.pagingToken)
    const contractId = stringValue(event.contractId)
    const pagingToken = stringValue(event.pagingToken) ?? id
    const ledger = typeof event.ledger === 'number' ? event.ledger : null
    return id && contractId && pagingToken && ledger !== null ? { id, contractId, pagingToken, ledger, body: event } : null
  }).filter((event): event is NonNullable<typeof event> => event !== null)
  if (records.length > 0) await store.upsertEvents(records)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
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

import type { BootnodeConfig } from './config.js'
import { cacheKey } from './rpc-cache.js'
import type { GetEventsResult, JsonRpcRequest } from './rpc-types.js'
import type { BootnodeEventRecord, BootnodeStore } from './store.js'

export interface IndexerHandle {
  stop(): void
}

export interface IndexerRoundReport {
  readonly pages: number
  readonly events: number
  readonly caughtUp: boolean
  readonly latestLedger: number | null
}

export function startIndexer(config: BootnodeConfig, store: BootnodeStore): IndexerHandle {
  if (!config.indexerEnabled) return { stop() {} }
  let stopped = false
  let running = false
  let timer: NodeJS.Timeout | null = null

  const schedule = (delay: number) => {
    if (!stopped) timer = setTimeout(() => void tick(), delay)
  }

  const tick = async () => {
    if (running) return schedule(config.indexerIntervalMs)
    running = true
    try {
      const report = await runIndexerRound(config, store)
      console.log(`[bootnode:indexer] pages=${report.pages} events=${report.events} caughtUp=${report.caughtUp} latest=${report.latestLedger ?? 'unknown'}`)
    } catch (error) {
      console.error('[bootnode:indexer] round failed', error)
    } finally {
      running = false
      schedule(config.indexerIntervalMs)
    }
  }

  schedule(0)
  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}

export async function runIndexerRound(config: BootnodeConfig, store: BootnodeStore): Promise<IndexerRoundReport> {
  const state = await store.readIndexerState()
  let cursor = state.lastCursor ?? state.caughtUpCursor
  let startLedger = cursor ? undefined : config.indexerStartLedger
  let pages = 0
  let events = 0
  let latestLedger = state.latestLedger
  let oldestLedger = state.oldestLedger
  let caughtUp = false

  for (; pages < config.indexerMaxPagesPerRound;) {
    const request = getEventsRequest(config, startLedger, cursor)
    const response = await fetch(config.upstreamRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    const payload = await response.json().catch(() => undefined)
    if (!response.ok || isRpcError(payload)) throw new Error(rpcFailureMessage(payload, response.status))
    const result = readGetEventsResult(payload)
    pages += 1
    await store.write(cacheKey(request), { status: response.status, body: payload })

    const records = result.events.map(toEventRecord).filter((event): event is BootnodeEventRecord => event !== null)
    if (records.length > 0) await store.upsertEvents(records)
    events += records.length
    latestLedger = result.latestLedger ?? latestLedger
    oldestLedger = result.oldestLedger ?? oldestLedger
    cursor = result.cursor ?? cursor
    startLedger = undefined

    await store.writeIndexerState({
      lastCursor: cursor,
      latestLedger,
      oldestLedger,
      caughtUpLedger: records.length === 0 && latestLedger !== null ? latestLedger : undefined,
      caughtUpCursor: records.length === 0 ? cursor : undefined,
    })

    if (records.length === 0) {
      caughtUp = true
      break
    }
  }

  return { pages, events, caughtUp, latestLedger }
}

function getEventsRequest(config: BootnodeConfig, startLedger: number | undefined, cursor: string | null): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'getEvents',
    params: {
      ...(startLedger ? { startLedger } : {}),
      filters: [{ type: 'contract', contractIds: config.allowedContracts, topics: [['**']] }],
      pagination: { limit: config.indexerPageSize, ...(cursor ? { cursor } : {}) },
    },
  }
}

function readGetEventsResult(payload: unknown): GetEventsResult {
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.events)) {
    throw new Error('Upstream getEvents returned an invalid result.')
  }
  return payload.result as unknown as GetEventsResult
}

function toEventRecord(event: unknown): BootnodeEventRecord | null {
  if (!isRecord(event)) return null
  const id = stringValue(event.id) ?? stringValue(event.pagingToken)
  const contractId = stringValue(event.contractId)
  const pagingToken = stringValue(event.pagingToken) ?? id
  const ledger = typeof event.ledger === 'number' ? event.ledger : null
  if (!id || !contractId || !pagingToken || ledger === null) return null
  return { id, contractId, ledger, pagingToken, body: event }
}

function rpcFailureMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') return payload.error.message
  return `upstream returned ${status}`
}

function isRpcError(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && 'error' in value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

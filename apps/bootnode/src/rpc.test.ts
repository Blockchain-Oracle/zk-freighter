import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BootnodeConfig } from './config.js'
import { createHandler } from './rpc.js'
import type { BootnodeEventRecord, BootnodeIndexerState, BootnodeStore, CachedRpcResponse, ReadEventsOptions } from './store.js'

const config: BootnodeConfig = {
  port: 8788,
  upstreamRpcUrl: 'https://rpc.invalid',
  network: 'testnet',
  allowedContracts: [
    'CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ',
    'CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2',
  ],
  indexerStartLedger: 3_368_685,
  indexerPageSize: 200,
  indexerMaxPagesPerRound: 4,
  indexerIntervalMs: 2_000,
  indexerEnabled: true,
}

class Store implements BootnodeStore {
  cached: CachedRpcResponse | null = null
  events: BootnodeEventRecord[] = []
  state: BootnodeIndexerState = {
    lastCursor: null,
    latestLedger: null,
    oldestLedger: null,
    caughtUpLedger: null,
    caughtUpCursor: null,
    updatedAt: null,
  }
  writes = 0

  async read(): Promise<CachedRpcResponse | null> { return this.cached }
  async write(_key: string, response: CachedRpcResponse): Promise<void> {
    this.cached = response
    this.writes += 1
  }
  async readEvents(options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]> {
    return this.events
      .filter((event) => options.contractIds.includes(event.contractId))
      .filter((event) => options.cursor ? event.pagingToken > options.cursor : event.ledger >= (options.startLedger ?? 0))
      .filter((event) => options.throughLedger === undefined || event.ledger <= options.throughLedger)
      .slice(0, options.limit)
  }
  async upsertEvents(events: readonly BootnodeEventRecord[]): Promise<void> {
    this.events.push(...events)
  }
  async readIndexerState(): Promise<BootnodeIndexerState> { return this.state }
  async writeIndexerState(state: Partial<Omit<BootnodeIndexerState, 'updatedAt'>>): Promise<void> {
    this.state = {
      lastCursor: state.lastCursor === undefined ? this.state.lastCursor : state.lastCursor,
      latestLedger: state.latestLedger === undefined ? this.state.latestLedger : state.latestLedger,
      oldestLedger: state.oldestLedger === undefined ? this.state.oldestLedger : state.oldestLedger,
      caughtUpLedger: state.caughtUpLedger === undefined ? this.state.caughtUpLedger : state.caughtUpLedger,
      caughtUpCursor: state.caughtUpCursor === undefined ? this.state.caughtUpCursor : state.caughtUpCursor,
      updatedAt: new Date().toISOString(),
    }
  }
  async close(): Promise<void> {}
}

describe('bootnode rpc handler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects methods outside the narrow bootnode surface', async () => {
    const handler = createHandler(config, new Store())
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: {} }),
    }))

    await expect(response.json()).resolves.toMatchObject({ error: { code: -32601 } })
  })

  it('rejects event filters for contracts outside the allowlist', async () => {
    const handler = createHandler(config, new Store())
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getEvents',
        params: { filters: [{ contractIds: ['CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK'] }] },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({ error: { code: -32602 } })
  })

  it('accepts Nethermind pool sync filters that include ASP membership events', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 22,
      result: { events: [] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const handler = createHandler(config, new Store())
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 22,
        method: 'getEvents',
        params: {
          filters: [{
            contractIds: config.allowedContracts,
            topics: [['**']],
            type: 'contract',
          }],
          pagination: { limit: 1 },
          startLedger: 3381514,
        },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({ result: { events: [] } })
  })

  it('rejects getEvents requests without explicit pool contract filters', async () => {
    const handler = createHandler(config, new Store())
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'getEvents', params: { startLedger: 1 } }),
    }))

    await expect(response.json()).resolves.toMatchObject({ error: { code: -32602 } })
  })

  it('refreshes upstream before using cache and only falls back when upstream fails', async () => {
    const store = new Store()
    store.cached = { status: 200, body: { jsonrpc: '2.0', id: 4, result: { events: ['old'] } } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      result: { events: ['new'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'getEvents',
        params: { filters: [{ contractIds: config.allowedContracts }] },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({ result: { events: ['new'] } })
    expect(store.writes).toBe(1)
  })

  it('returns cached pool events when upstream is unavailable', async () => {
    const store = new Store()
    store.cached = { status: 200, body: { jsonrpc: '2.0', id: 5, result: { events: ['cached'] } } }
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'getEvents',
        params: { filters: [{ contractIds: config.allowedContracts }] },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({ result: { events: ['cached'] } })
  })

  it('serves warmed event-table results without hitting upstream', async () => {
    const store = new Store()
    store.state = {
      lastCursor: '0000000000000000002-0000000001',
      latestLedger: 3382000,
      oldestLedger: 3368685,
      caughtUpLedger: 3382000,
      caughtUpCursor: '0000000000000000002-0000000001',
      updatedAt: new Date().toISOString(),
    }
    store.events = [{
      id: '0000000000000000001-0000000001',
      contractId: config.allowedContracts[0]!,
      ledger: 3369000,
      pagingToken: '0000000000000000001-0000000001',
      body: { id: '0000000000000000001-0000000001', contractId: config.allowedContracts[0], ledger: 3369000, ledgerClosedAt: '2026-07-02T10:00:00Z' },
    }]
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'getEvents',
        params: {
          filters: [{ contractIds: [config.allowedContracts[0]], topics: [['**']] }],
          pagination: { limit: 10 },
          startLedger: 3368685,
        },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({
      result: {
        events: [{ ledger: 3369000 }],
        latestLedgerCloseTime: '2026-07-02T10:00:00Z',
        oldestLedgerCloseTime: '2026-07-02T10:00:00Z',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not serve warmed data beyond the caught-up cursor', async () => {
    const store = new Store()
    store.state = {
      lastCursor: '0000000000000000003-0000000001',
      latestLedger: 3382100,
      oldestLedger: 3368685,
      caughtUpLedger: 3382000,
      caughtUpCursor: '0000000000000000002-0000000001',
      updatedAt: new Date().toISOString(),
    }
    store.events = [{
      id: '0000000000000000003-0000000001',
      contractId: config.allowedContracts[0]!,
      ledger: 3382050,
      pagingToken: '0000000000000000003-0000000001',
      body: { id: '0000000000000000003-0000000001', ledger: 3382050 },
    }]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      result: { events: ['upstream'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'getEvents',
        params: {
          filters: [{ contractIds: [config.allowedContracts[0]], topics: [['**']] }],
          pagination: { limit: 10, cursor: '0000000000000000003-0000000001' },
        },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({ result: { events: ['upstream'] } })
  })
})

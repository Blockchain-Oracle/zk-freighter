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
  state: BootnodeIndexerState = {
    lastCursor: null,
    latestLedger: null,
    oldestLedger: null,
    caughtUpLedger: null,
    caughtUpCursor: null,
    updatedAt: null,
  }

  async read(): Promise<CachedRpcResponse | null> { return null }
  async write(): Promise<void> {}
  async readEvents(_options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]> { return [] }
  async upsertEvents(_events: readonly BootnodeEventRecord[]): Promise<void> {}
  async readIndexerState(): Promise<BootnodeIndexerState> { return this.state }
  async writeIndexerState(state: Partial<Omit<BootnodeIndexerState, 'updatedAt'>>): Promise<void> {
    this.state = { ...this.state, ...state, updatedAt: new Date().toISOString() }
  }
  async close(): Promise<void> {}
}

function warmedState(): BootnodeIndexerState {
  return {
    lastCursor: '0000000000000000003-0000000001',
    latestLedger: 3382100,
    oldestLedger: 3368685,
    caughtUpLedger: 3382000,
    caughtUpCursor: '0000000000000000003-0000000001',
    updatedAt: '2026-07-02T00:00:00.000Z',
  }
}

describe('bootnode warmed readiness', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('advances an empty warmed page to the caught-up cursor', async () => {
    const store = new Store()
    store.state = { ...warmedState(), caughtUpLedger: 3382100 }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'getEvents',
        params: {
          filters: [{ contractIds: [config.allowedContracts[0]], topics: [['**']] }],
          pagination: { limit: 10, cursor: '0000000000000000002-0000000001' },
        },
      }),
    }))

    await expect(response.json()).resolves.toMatchObject({
      result: {
        events: [],
        cursor: '0000000000000000003-0000000001',
        latestLedger: 3382100,
        latestLedgerCloseTime: '2026-07-02T00:00:00.000Z',
        oldestLedgerCloseTime: '2026-07-02T00:00:00.000Z',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('always emits a numeric oldestLedger even when index state has none', async () => {
    const store = new Store()
    store.state = { ...warmedState(), oldestLedger: null }
    vi.stubGlobal('fetch', vi.fn())

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'getEvents',
        params: {
          filters: [{ contractIds: [config.allowedContracts[0]], topics: [['**']] }],
          pagination: { limit: 10, cursor: '0000000000000000002-0000000001' },
        },
      }),
    }))

    const payload = await response.json() as { result: Record<string, unknown> }
    // The Nethermind WASM client decodes oldestLedger as a required u32; a missing key breaks event sync.
    expect(payload.result.oldestLedger).toBe(3382000)
  })

  it('serves latest ledger from warmed state', async () => {
    const store = new Store()
    store.state = warmedState()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const handler = createHandler(config, store)
    const response = await handler(new Request('http://local/rpc', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'getLatestLedger', params: {} }),
    }))

    await expect(response.json()).resolves.toMatchObject({
      result: { sequence: 3382000, bootnodeCached: true },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports indexer readiness on health', async () => {
    const store = new Store()
    store.state = warmedState()
    const handler = createHandler({ ...config, databaseUrl: 'postgres://local/zkf' }, store)
    const response = await handler(new Request('http://local/health'))

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      ready: true,
      network: 'testnet',
      database: 'postgres',
      allowedContracts: config.allowedContracts,
      indexer: { enabled: true, startLedger: 3368685, latestLedger: 3382100, caughtUpLedger: 3382000, lag: 100 },
    })
  })
})

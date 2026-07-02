import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BootnodeConfig } from './config.js'
import { runIndexerRound } from './indexer.js'
import type { BootnodeEventRecord, BootnodeIndexerState, BootnodeStore, CachedRpcResponse, ReadEventsOptions } from './store.js'

const config: BootnodeConfig = {
  port: 8788,
  upstreamRpcUrl: 'https://rpc.invalid',
  network: 'testnet',
  allowedContracts: ['CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ'],
  indexerStartLedger: 3_368_685,
  indexerPageSize: 2,
  indexerMaxPagesPerRound: 2,
  indexerIntervalMs: 2_000,
  indexerEnabled: true,
}

class Store implements BootnodeStore {
  cached = new Map<string, CachedRpcResponse>()
  events: BootnodeEventRecord[] = []
  state: BootnodeIndexerState = {
    lastCursor: null,
    latestLedger: null,
    oldestLedger: null,
    caughtUpLedger: null,
    caughtUpCursor: null,
    updatedAt: null,
  }

  async read(key: string): Promise<CachedRpcResponse | null> { return this.cached.get(key) ?? null }
  async write(key: string, response: CachedRpcResponse): Promise<void> { this.cached.set(key, response) }
  async readEvents(options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]> {
    return this.events.filter((event) => options.contractIds.includes(event.contractId)).slice(0, options.limit)
  }
  async upsertEvents(events: readonly BootnodeEventRecord[]): Promise<void> { this.events.push(...events) }
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

describe('bootnode indexer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warms event records and marks the range caught up after an empty page', async () => {
    const store = new Store()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          events: [{
            id: '0000000000000000001-0000000001',
            contractId: config.allowedContracts[0],
            ledger: 3_368_690,
            pagingToken: '0000000000000000001-0000000001',
          }],
          cursor: '0000000000000000001-0000000001',
          latestLedger: 3_368_700,
          oldestLedger: 3_368_685,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          events: [],
          cursor: '0000000000000000001-0000000001',
          latestLedger: 3_368_700,
          oldestLedger: 3_368_685,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const report = await runIndexerRound(config, store)

    expect(report).toMatchObject({ events: 1, caughtUp: true, latestLedger: 3_368_700 })
    expect(store.events).toHaveLength(1)
    expect(store.state).toMatchObject({
      lastCursor: '0000000000000000001-0000000001',
      latestLedger: 3_368_700,
      oldestLedger: 3_368_685,
      caughtUpLedger: 3_368_700,
      caughtUpCursor: '0000000000000000001-0000000001',
    })
    expect(store.cached.size).toBe(2)
  })

  it('resumes from caught-up cursor instead of replaying old start ledger', async () => {
    const store = new Store()
    store.state = {
      lastCursor: null,
      latestLedger: 63_291_990,
      oldestLedger: 63_282_047,
      caughtUpLedger: 63_291_990,
      caughtUpCursor: '0271837031443726335-4294967295',
      updatedAt: '2026-07-02T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        events: [],
        cursor: '0271837035738693631-4294967295',
        latestLedger: 63_291_991,
        oldestLedger: 63_282_047,
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const report = await runIndexerRound({ ...config, network: 'mainnet', indexerStartLedger: 63_190_069 }, store)

    expect(report).toMatchObject({ events: 0, caughtUp: true, latestLedger: 63_291_991 })
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { params: { startLedger?: number; pagination: { cursor?: string } } }
    expect(body.params.startLedger).toBeUndefined()
    expect(body.params.pagination.cursor).toBe('0271837031443726335-4294967295')
  })
})

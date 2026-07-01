import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BootnodeConfig } from './config.js'
import { createHandler } from './rpc.js'
import type { BootnodeStore, CachedRpcResponse } from './store.js'

const config: BootnodeConfig = {
  port: 8788,
  upstreamRpcUrl: 'https://rpc.invalid',
  network: 'testnet',
  allowedContracts: ['CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ'],
}

class Store implements BootnodeStore {
  cached: CachedRpcResponse | null = null
  writes = 0

  async read(): Promise<CachedRpcResponse | null> { return this.cached }
  async write(_key: string, response: CachedRpcResponse): Promise<void> {
    this.cached = response
    this.writes += 1
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
})

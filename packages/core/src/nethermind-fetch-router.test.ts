import { afterEach, describe, expect, it, vi } from 'vitest'
import { installNethermindEventFetchRouter } from './nethermind-fetch-router'

const originalFetch = globalThis.fetch
const rpcUrl = 'https://soroban-testnet.stellar.org/'
const bootnodeUrl = 'http://127.0.0.1:8788/rpc'

describe('Nethermind event fetch router', () => {
  const restoreCallbacks: Array<() => void> = []

  afterEach(() => {
    while (restoreCallbacks.length > 0) restoreCallbacks.pop()?.()
    globalThis.fetch = originalFetch
  })

  it('routes event JSON-RPC calls to the configured bootnode', async () => {
    const calls: string[] = []
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(input instanceof Request ? input.url : String(input))
      return new Response('{}')
    }) as typeof fetch

    restoreCallbacks.push(installNethermindEventFetchRouter({ rpcUrl, bootnodeUrl }))
    await fetch(rpcUrl, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEvents', params: {} }),
    })

    expect(calls).toEqual([bootnodeUrl])
  })

  it('keeps transaction JSON-RPC calls on the wallet RPC', async () => {
    const calls: string[] = []
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(input instanceof Request ? input.url : String(input))
      return new Response('{}')
    }) as typeof fetch

    restoreCallbacks.push(installNethermindEventFetchRouter({ rpcUrl, bootnodeUrl }))
    await fetch(rpcUrl, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: {} }),
    })

    expect(calls).toEqual([rpcUrl])
  })

  it('routes Request objects without consuming the original body', async () => {
    const calls: string[] = []
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(input instanceof Request ? input.url : String(input))
      return new Response('{}')
    }) as typeof fetch

    restoreCallbacks.push(installNethermindEventFetchRouter({ rpcUrl, bootnodeUrl }))
    const request = new Request(rpcUrl, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger', params: {} }),
    })
    await fetch(request)

    expect(calls).toEqual([bootnodeUrl])
    await expect(request.text()).resolves.toContain('getLatestLedger')
  })
})

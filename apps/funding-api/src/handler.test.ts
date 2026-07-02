import { describe, expect, it } from 'vitest'

import type { FundingConfig } from './config.js'
import { createHandler } from './handler.js'
import type { FundingStore, FundingRequestRecord } from './store.js'
import type { AssetCode, FundingAssetReport, NetworkKey } from '@zk-freighter/core'

const config: FundingConfig = {
  port: 8787,
  funderSecret: undefined,
  xlmAmountStroops: 25_000_000n,
  usdcAmountStroops: 25_000_000n,
  addressWindowMs: 86_400_000,
  ipWindowMs: 3_600_000,
  addressLimit: 1,
  ipLimit: 20,
}
const address = 'GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ'

class Store implements FundingStore {
  readonly records: FundingRequestRecord[] = []
  addressCount = 0
  ipCount = 0
  lastIp = ''

  async countAddressRequests(): Promise<number> { return this.addressCount }
  async countIpRequests(ip: string): Promise<number> { this.lastIp = ip; return this.ipCount }
  async recordRequest(record: FundingRequestRecord): Promise<void> { this.records.push(record) }
  async close(): Promise<void> {}
}

class Provider {
  fundCalls = 0

  constructor(readonly current: readonly FundingAssetReport[], readonly funded: readonly FundingAssetReport[] = current) {}

  async status(_address: string, _network: NetworkKey, _assets: readonly AssetCode[], _config: FundingConfig): Promise<readonly FundingAssetReport[]> {
    return this.current
  }

  async fund(_address: string, _network: NetworkKey, _assets: readonly AssetCode[], _config: FundingConfig): Promise<readonly FundingAssetReport[]> {
    this.fundCalls += 1
    return this.funded
  }
}

describe('funding API handler', () => {
  it('rejects mainnet funding requests', async () => {
    const handler = createHandler(config, new Store())
    const response = await handler(new Request('http://local/v1/funding/request', {
      method: 'POST',
      body: JSON.stringify({ network: 'mainnet', address }),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/mainnet/i) })
  })

  it('returns cooldown before touching funding when limits are exceeded', async () => {
    const store = new Store()
    store.addressCount = 1
    const provider = new Provider([{ asset: 'XLM', status: 'needs-funding' }])
    const handler = createHandler(config, store, provider)
    const response = await handler(new Request('http://local/v1/funding/request', {
      method: 'POST',
      headers: { 'x-real-ip': '203.0.113.10' },
      body: JSON.stringify({ network: 'testnet', address }),
    }))

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body).toMatchObject({ status: 'unavailable', blockers: [expect.stringMatching(/cooldown/i)] })
    expect(store.records).toHaveLength(0)
    expect(provider.fundCalls).toBe(0)
  })

  it('returns ready without rate limiting or spending when the account is already funded', async () => {
    const store = new Store()
    store.addressCount = 1
    const provider = new Provider([{ asset: 'XLM', status: 'ready', balanceStroops: '25000000' }])
    const handler = createHandler(config, store, provider)
    const response = await handler(new Request('http://local/v1/funding/request', {
      method: 'POST',
      headers: { 'x-zkf-client-ip': '203.0.113.10' },
      body: JSON.stringify({ network: 'testnet', address, assets: ['XLM'] }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ status: 'ready' })
    expect(store.records).toHaveLength(0)
    expect(provider.fundCalls).toBe(0)
  })

  it('returns needs-trustline without rate limiting or spending', async () => {
    const store = new Store()
    store.addressCount = 1
    const provider = new Provider([{ asset: 'USDC', status: 'needs-trustline', blocker: 'Create the canonical USDC trustline before USDC can be delivered.' }])
    const handler = createHandler(config, store, provider)
    const response = await handler(new Request('http://local/v1/funding/request', {
      method: 'POST',
      body: JSON.stringify({ network: 'testnet', address, assets: ['USDC'] }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ status: 'needs-funding', blockers: [expect.stringMatching(/trustline/i)] })
    expect(store.records).toHaveLength(0)
    expect(provider.fundCalls).toBe(0)
  })

  it('ignores spoofable forwarded IP headers inside the handler', async () => {
    const store = new Store()
    const provider = new Provider([{ asset: 'XLM', status: 'needs-funding' }], [{ asset: 'XLM', status: 'funded', txHash: 'abc' }])
    const handler = createHandler(config, store, provider)
    await handler(new Request('http://local/v1/funding/request', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.99' },
      body: JSON.stringify({ network: 'testnet', address, assets: ['XLM'] }),
    }))

    expect(store.lastIp).toBe('local')
  })
})

import { describe, expect, it } from 'vitest'

import type { FundingConfig } from './config.js'
import type { EvmFaucetChain, EvmFundingAssetReport } from './evm.js'
import { createHandler } from './handler.js'
import type { FundingStore, FundingRequestRecord } from './store.js'

const config: FundingConfig = {
  port: 8787,
  funderSecret: undefined,
  xlmAmountStroops: 25_000_000n,
  usdcAmountStroops: 25_000_000n,
  addressWindowMs: 86_400_000,
  ipWindowMs: 3_600_000,
  addressLimit: 1,
  ipLimit: 20,
  evmFunderPrivateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  evmUsdcAmount: 10_000_000n,
  evmGasAmountWei: 2_000_000_000_000_000n,
  evmRpcUrls: { base: 'http://127.0.0.1:1', optimism: 'http://127.0.0.1:1' },
}
const address = '0x8ba1f109551bD432803012645Ac136ddd64DBA72'

class Store implements FundingStore {
  readonly records: FundingRequestRecord[] = []
  addressCount = 0
  lastNetwork = ''

  async countAddressRequests(network: string): Promise<number> {
    this.lastNetwork = network
    return this.addressCount
  }
  async countIpRequests(): Promise<number> { return 0 }
  async recordRequest(record: FundingRequestRecord): Promise<void> { this.records.push(record) }
  async close(): Promise<void> {}
}

class Provider {
  fundCalls = 0

  constructor(readonly current: readonly EvmFundingAssetReport[], readonly funded: readonly EvmFundingAssetReport[] = current) {}

  async status(_address: `0x${string}`, _chain: EvmFaucetChain, _config: FundingConfig): Promise<readonly EvmFundingAssetReport[]> {
    return this.current
  }

  async fund(_address: `0x${string}`, _chain: EvmFaucetChain, _config: FundingConfig): Promise<readonly EvmFundingAssetReport[]> {
    this.fundCalls += 1
    return this.funded
  }
}

const needsFunding: readonly EvmFundingAssetReport[] = [
  { asset: 'USDC', status: 'needs-funding', balance: '0' },
  { asset: 'GAS', status: 'needs-funding', balance: '0' },
]
const funded: readonly EvmFundingAssetReport[] = [
  { asset: 'USDC', status: 'funded', txHash: '0xaaa', explorerUrl: 'https://sepolia.basescan.org/tx/0xaaa' },
  { asset: 'GAS', status: 'funded', txHash: '0xbbb' },
]

function post(body: unknown): Request {
  return new Request('http://local/v1/evm-funding/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('EVM funding routes', () => {
  it('rejects unsupported chains', async () => {
    const handler = createHandler(config, new Store(), undefined, new Provider(needsFunding))
    const response = await handler(post({ chain: 'ethereum', address }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('Unsupported chain')
  })

  it('rejects invalid EVM addresses', async () => {
    const handler = createHandler(config, new Store(), undefined, new Provider(needsFunding))
    const response = await handler(post({ chain: 'base', address: 'GABC' }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('valid EVM address')
  })

  it('reports status without spending', async () => {
    const provider = new Provider(needsFunding)
    const handler = createHandler(config, new Store(), undefined, provider)
    const response = await handler(new Request(`http://local/v1/evm-funding/status?chain=optimism&address=${address}`))
    const body = await response.json()
    expect(body.status).toBe('needs-funding')
    expect(body.chain).toBe('optimism')
    expect(provider.fundCalls).toBe(0)
  })

  it('funds a needs-funding address and records the request under the chain network key', async () => {
    const provider = new Provider(needsFunding, funded)
    const store = new Store()
    const handler = createHandler(config, store, undefined, provider)
    const response = await handler(post({ chain: 'base', address }))
    const body = await response.json()
    expect(body.status).toBe('funded')
    expect(provider.fundCalls).toBe(1)
    expect(store.records[0]?.network).toBe('base-sepolia')
    expect(store.lastNetwork).toBe('base-sepolia')
  })

  it('skips spending when the address is already funded', async () => {
    const provider = new Provider(funded.map((asset) => ({ ...asset, status: 'ready' as const })))
    const store = new Store()
    const handler = createHandler(config, store, undefined, provider)
    const response = await handler(post({ chain: 'base', address }))
    expect((await response.json()).status).toBe('ready')
    expect(provider.fundCalls).toBe(0)
    expect(store.records).toHaveLength(0)
  })

  it('rate limits with 429 and a cooldown', async () => {
    const provider = new Provider(needsFunding)
    const store = new Store()
    store.addressCount = 1
    const handler = createHandler(config, store, undefined, provider)
    const response = await handler(post({ chain: 'base', address }))
    expect(response.status).toBe(429)
    expect((await response.json()).cooldownUntil).toBeTruthy()
    expect(provider.fundCalls).toBe(0)
  })
})

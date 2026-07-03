import { describe, expect, it, vi } from 'vitest'
import { evmFundingStatus, requestEvmFunding, type EvmFundingReport } from './evm-funding'

const address = '0x1111111111111111111111111111111111111111'
const base = 'http://127.0.0.1:8787'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response
}

const fundedReport: EvmFundingReport = {
  status: 'funded',
  chain: 'base',
  userAddress: address,
  assets: [
    { asset: 'USDC', status: 'funded', txHash: '0xabc', explorerUrl: 'https://sepolia.basescan.org/tx/0xabc' },
    { asset: 'GAS', status: 'funded', txHash: '0xdef', explorerUrl: 'https://sepolia.basescan.org/tx/0xdef' },
  ],
  blockers: [],
}

describe('evm faucet client', () => {
  it('requests funding via POST with the chain + address body', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse(fundedReport))
    const report = await requestEvmFunding({ chain: 'base', address, network: 'testnet', fundingApiUrl: base, fetch: fetchMock })
    expect(report).toEqual(fundedReport)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${base}/v1/evm-funding/request`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ chain: 'base', address })
  })

  it('reads status via GET with chain + address query params', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ ...fundedReport, status: 'ready' }))
    const report = await evmFundingStatus({ chain: 'optimism', address, network: 'testnet', fundingApiUrl: base, fetch: fetchMock })
    expect(report.status).toBe('ready')
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${base}/v1/evm-funding/status?chain=optimism&address=${address}`)
  })

  it('reports a connection failure as unavailable instead of throwing', async () => {
    const report = await requestEvmFunding({
      chain: 'base',
      address,
      network: 'testnet',
      fundingApiUrl: base,
      fetch: async () => { throw new Error('connection refused') },
    })
    expect(report.status).toBe('unavailable')
    expect(report.blockers[0]).toContain('connection refused')
  })

  it('surfaces a rate-limit (429) body error honestly', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ ok: false, error: 'Funding cooldown is active.' }, false, 429))
    const report = await requestEvmFunding({ chain: 'base', address, network: 'testnet', fundingApiUrl: base, fetch: fetchMock })
    expect(report.status).toBe('unavailable')
    expect(report.blockers[0]).toBe('Funding cooldown is active.')
  })

  it('refuses non-testnet networks without calling the network', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse(fundedReport))
    const report = await requestEvmFunding({ chain: 'base', address, network: 'mainnet', fundingApiUrl: base, fetch: fetchMock })
    expect(report.status).toBe('unavailable')
    expect(report.blockers[0]).toContain('testnet')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports unavailable when the funding service cannot be reached', async () => {
    const report = await evmFundingStatus({
      chain: 'base',
      address,
      network: 'testnet',
      fundingApiUrl: base,
      fetch: async () => { throw new Error('offline') },
    })
    expect(report.status).toBe('unavailable')
  })
})

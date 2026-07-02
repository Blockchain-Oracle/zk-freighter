import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkAspAccessIndexed } from './asp-access-indexing'
import type { AspAccessRecord } from './asp-access-state'

const leaf = 1599004834793845471076829505071764702877943785651513823333470252736979288608n
const leafHex = `0x${leaf.toString(16).padStart(64, '0')}`
const leafAddedTopic = 'AAAADwAAAAlMZWFmQWRkZWQAAAA='
const leafAddedValue = 'AAAAEQAAAAEAAAADAAAADwAAAAVpbmRleAAAAAAAAAUAAAAAAAAAJAAAAA8AAAAEbGVhZgAAAAsDiQExrpUZIGP4j/NHsjqfpn1S1oV1DHb775A0uMJCIAAAAA8AAAAEcm9vdAAAAAsbUKsKwDaFH76bmtrzZgGz6lDt7Ti5EALZOi+8+BRe+Q=='

const record: AspAccessRecord = {
  network: 'testnet',
  userAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  poolContractId: 'CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ',
  leafHex,
  status: 'submitted',
  submittedLedger: 3383011,
  submittedAt: 1_000,
  updatedAt: 1_000,
}

describe('checkAspAccessIndexed', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('decodes bootnode LeafAdded events and reports indexed access', async () => {
    vi.stubGlobal('__ZKF_CONFIG__', { ZKF_TESTNET_BOOTNODE_URL: 'http://bootnode.test/rpc' })
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: {
        events: [{
          type: 'contract',
          ledger: 3383011,
          contractId: 'CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2',
          txHash: 'setup-tx',
          topic: [leafAddedTopic],
          value: leafAddedValue,
        }],
        cursor: '0014529921607020544-0000000000',
        latestLedger: 3383020,
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    const report = await checkAspAccessIndexed({ record, fetch: fetcher })

    expect(report).toMatchObject({
      status: 'indexed',
      ledger: 3383011,
      txHash: 'setup-tx',
      leafIndex: '36',
      latestLedger: 3383020,
    })
    const init = fetcher.mock.calls[0]?.[1]
    expect(init).toMatchObject({ method: 'POST' })
    expect(String(init?.body)).toContain('"startLedger":3383009')
  })

  it('reports pending when the leaf is not present in warmed events', async () => {
    vi.stubGlobal('__ZKF_CONFIG__', { ZKF_TESTNET_BOOTNODE_URL: 'http://bootnode.test/rpc' })
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { events: [], cursor: 'caught-up', latestLedger: 3383020 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    const report = await checkAspAccessIndexed({ record, fetch: fetcher })

    expect(report.status).toBe('pending')
    expect(report.blocker).toContain('not indexed')
    expect(report.cursor).toBe('caught-up')
  })
})

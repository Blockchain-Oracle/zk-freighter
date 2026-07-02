import { scValToNative, xdr } from '@stellar/stellar-sdk'
import type { AspAccessRecord } from './asp-access-state'
import { getNetworkConfig, type NetworkKey } from './networks'
import { privateAspMembershipContractId, privateEventStartLedger } from './privacy-contracts'

export type AspAccessIndexStatus = 'indexed' | 'pending' | 'unavailable' | 'failed'

export interface AspAccessIndexReport {
  readonly status: AspAccessIndexStatus
  readonly network: NetworkKey
  readonly contractId: string
  readonly leafHex: string
  readonly ledger?: number
  readonly txHash?: string
  readonly leafIndex?: string
  readonly root?: string
  readonly latestLedger?: number
  readonly cursor?: string
  readonly blocker?: string
}

export interface CheckAspAccessIndexedOptions {
  readonly record: AspAccessRecord
  readonly fetch?: typeof fetch
  readonly maxPages?: number
  readonly pageLimit?: number
}

export async function checkAspAccessIndexed(options: CheckAspAccessIndexedOptions): Promise<AspAccessIndexReport> {
  const { record } = options
  const network = getNetworkConfig(record.network)
  const contractId = privateAspMembershipContractId(record.network)
  const bootnodeUrl = network.bootnodeUrl
  if (!bootnodeUrl) {
    return base('unavailable', record, contractId, 'Bootnode URL is not configured for ASP access indexing.')
  }

  const fetcher = options.fetch ?? globalThis.fetch
  if (typeof fetcher !== 'function') {
    return base('unavailable', record, contractId, 'Fetch is not available for ASP access indexing.')
  }

  const targetLeaf = BigInt(record.leafHex)
  let cursor: string | undefined
  let latestLedger: number | undefined
  const startLedger = Math.max(1, (record.submittedLedger ?? privateEventStartLedger(record.network)) - 2)
  const maxPages = options.maxPages ?? 8
  const pageLimit = options.pageLimit ?? 200

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const result = await getEvents(fetcher, bootnodeUrl, {
        contractId,
        cursor,
        pageLimit,
        startLedger: cursor ? undefined : startLedger,
      })
      latestLedger = result.latestLedger ?? latestLedger
      cursor = result.cursor ?? cursor
      for (const event of result.events) {
        const decoded = decodeLeafAddedEvent(event)
        if (decoded?.leaf === targetLeaf) {
          return {
            status: 'indexed',
            network: record.network,
            contractId,
            leafHex: record.leafHex,
            ledger: numberField(event, 'ledger'),
            txHash: stringField(event, 'txHash'),
            leafIndex: decoded.index?.toString(),
            root: decoded.root?.toString(),
            latestLedger,
            cursor,
          }
        }
      }
      if (result.events.length === 0) break
    }
    return {
      status: 'pending',
      network: record.network,
      contractId,
      leafHex: record.leafHex,
      latestLedger,
      cursor,
      blocker: 'Shield access setup is confirmed, but its ASP leaf is not indexed by the bootnode yet.',
    }
  } catch (error) {
    return base('failed', record, contractId, error instanceof Error ? error.message : 'ASP access indexing check failed.')
  }
}

async function getEvents(
  fetcher: typeof fetch,
  bootnodeUrl: string,
  input: { readonly contractId: string; readonly cursor?: string; readonly startLedger?: number; readonly pageLimit: number },
): Promise<{ readonly events: readonly unknown[]; readonly cursor?: string; readonly latestLedger?: number }> {
  const response = await fetcher(bootnodeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params: {
        ...(input.startLedger ? { startLedger: input.startLedger } : {}),
        filters: [{ type: 'contract', contractIds: [input.contractId], topics: [['**']] }],
        pagination: { limit: input.pageLimit, ...(input.cursor ? { cursor: input.cursor } : {}) },
      },
    }),
  })
  const payload = await response.json().catch(() => undefined)
  if (!response.ok || (isRecord(payload) && isRecord(payload.error))) {
    throw new Error(errorMessage(payload, response.status))
  }
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.events)) {
    throw new Error('Bootnode returned an invalid ASP event response.')
  }
  return {
    events: payload.result.events,
    cursor: stringField(payload.result, 'cursor'),
    latestLedger: numberField(payload.result, 'latestLedger'),
  }
}

function decodeLeafAddedEvent(event: unknown): { readonly leaf: bigint; readonly index?: bigint; readonly root?: bigint } | null {
  if (!isRecord(event) || !Array.isArray(event.topic) || !event.topic.some((topic) => decodeScVal(topic) === 'LeafAdded')) return null
  const native = decodeScVal(event.value)
  if (!isRecord(native) || typeof native.leaf !== 'bigint') return null
  return {
    leaf: native.leaf,
    index: typeof native.index === 'bigint' ? native.index : undefined,
    root: typeof native.root === 'bigint' ? native.root : undefined,
  }
}

function decodeScVal(value: unknown): unknown {
  if (typeof value !== 'string') return undefined
  try {
    return scValToNative(xdr.ScVal.fromXDR(value, 'base64'))
  } catch {
    return undefined
  }
}

function base(status: AspAccessIndexStatus, record: AspAccessRecord, contractId: string, blocker: string): AspAccessIndexReport {
  return { status, network: record.network, contractId, leafHex: record.leafHex, blocker }
}

function errorMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') return payload.error.message
  return `Bootnode ASP event lookup failed with HTTP ${status}.`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: unknown, field: string): string | undefined {
  return isRecord(value) && typeof value[field] === 'string' ? value[field] : undefined
}

function numberField(value: unknown, field: string): number | undefined {
  return isRecord(value) && typeof value[field] === 'number' ? value[field] : undefined
}

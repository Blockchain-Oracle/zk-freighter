import { Pool } from 'pg'

import type { FundingApiReport } from '@zk-freighter/core'

export interface FundingRequestRecord {
  readonly network: string
  readonly address: string
  readonly ip: string
  readonly assets: readonly string[]
  readonly response: FundingApiReport
}

export interface FundingStore {
  countAddressRequests(network: string, address: string, since: Date): Promise<number>
  countIpRequests(ip: string, since: Date): Promise<number>
  recordRequest(record: FundingRequestRecord): Promise<void>
  close(): Promise<void>
}

export async function createStore(databaseUrl: string | undefined): Promise<FundingStore> {
  if (!databaseUrl) return new MemoryFundingStore()
  const store = new PostgresFundingStore(databaseUrl)
  await store.init()
  return store
}

class MemoryFundingStore implements FundingStore {
  private readonly records: ({ readonly createdAt: Date } & FundingRequestRecord)[] = []

  async countAddressRequests(network: string, address: string, since: Date): Promise<number> {
    return this.records.filter((record) => record.network === network && record.address === address && record.createdAt > since).length
  }

  async countIpRequests(ip: string, since: Date): Promise<number> {
    return this.records.filter((record) => record.ip === ip && record.createdAt > since).length
  }

  async recordRequest(record: FundingRequestRecord): Promise<void> {
    this.records.push({ ...record, createdAt: new Date() })
  }

  async close(): Promise<void> {}
}

class PostgresFundingStore implements FundingStore {
  private readonly pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      // SSL only when the URL requests it — Coolify's internal Postgres has no
      // SSL, and forcing it crashes the client. See bootnode store for detail.
      ssl: /[?&]sslmode=(require|verify-ca|verify-full)/u.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    })
  }

  async init(): Promise<void> {
    await this.pool.query(`
      create table if not exists funding_requests (
        id bigserial primary key,
        created_at timestamptz not null default now(),
        network text not null,
        address text not null,
        ip text not null,
        assets text[] not null,
        response jsonb not null
      );
      create index if not exists funding_requests_address_idx on funding_requests(network, address, created_at desc);
      create index if not exists funding_requests_ip_idx on funding_requests(ip, created_at desc);
    `)
  }

  async countAddressRequests(network: string, address: string, since: Date): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'select count(*)::text as count from funding_requests where network = $1 and address = $2 and created_at > $3',
      [network, address, since],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async countIpRequests(ip: string, since: Date): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'select count(*)::text as count from funding_requests where ip = $1 and created_at > $2',
      [ip, since],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async recordRequest(record: FundingRequestRecord): Promise<void> {
    await this.pool.query(
      'insert into funding_requests(network, address, ip, assets, response) values ($1, $2, $3, $4, $5)',
      [record.network, record.address, record.ip, [...record.assets], JSON.stringify(record.response)],
    )
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

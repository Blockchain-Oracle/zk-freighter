import { Pool } from 'pg'

export interface CachedRpcResponse {
  readonly status: number
  readonly body: unknown
}

export interface BootnodeStore {
  read(key: string): Promise<CachedRpcResponse | null>
  write(key: string, response: CachedRpcResponse): Promise<void>
  close(): Promise<void>
}

export async function createStore(databaseUrl: string | undefined): Promise<BootnodeStore> {
  if (!databaseUrl) return new MemoryBootnodeStore()
  const store = new PostgresBootnodeStore(databaseUrl)
  await store.init()
  return store
}

class MemoryBootnodeStore implements BootnodeStore {
  private readonly cache = new Map<string, CachedRpcResponse>()

  async read(key: string): Promise<CachedRpcResponse | null> {
    return this.cache.get(key) ?? null
  }

  async write(key: string, response: CachedRpcResponse): Promise<void> {
    this.cache.set(key, response)
  }

  async close(): Promise<void> {}
}

class PostgresBootnodeStore implements BootnodeStore {
  private readonly pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
    })
  }

  async init(): Promise<void> {
    await this.pool.query(`
      create table if not exists bootnode_rpc_cache (
        cache_key text primary key,
        status integer not null,
        body jsonb not null,
        updated_at timestamptz not null default now()
      );
    `)
  }

  async read(key: string): Promise<CachedRpcResponse | null> {
    const result = await this.pool.query<{ status: number; body: unknown }>(
      'select status, body from bootnode_rpc_cache where cache_key = $1',
      [key],
    )
    const row = result.rows[0]
    return row ? { status: row.status, body: row.body } : null
  }

  async write(key: string, response: CachedRpcResponse): Promise<void> {
    await this.pool.query(
      `insert into bootnode_rpc_cache(cache_key, status, body, updated_at)
       values ($1, $2, $3, now())
       on conflict (cache_key) do update set status = excluded.status, body = excluded.body, updated_at = now()`,
      [key, response.status, JSON.stringify(response.body)],
    )
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

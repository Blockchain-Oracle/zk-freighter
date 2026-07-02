import { Pool } from 'pg'

export interface CachedRpcResponse {
  readonly status: number
  readonly body: unknown
}

export interface BootnodeEventRecord {
  readonly id: string
  readonly contractId: string
  readonly ledger: number
  readonly pagingToken: string
  readonly body: unknown
}

export interface BootnodeIndexerState {
  readonly lastCursor: string | null
  readonly latestLedger: number | null
  readonly oldestLedger: number | null
  readonly caughtUpLedger: number | null
  readonly caughtUpCursor: string | null
  readonly updatedAt: string | null
}

export interface ReadEventsOptions {
  readonly contractIds: readonly string[]
  readonly startLedger?: number
  readonly cursor?: string
  readonly throughLedger?: number
  readonly limit: number
}

export interface BootnodeStore {
  read(key: string): Promise<CachedRpcResponse | null>
  write(key: string, response: CachedRpcResponse): Promise<void>
  readEvents(options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]>
  upsertEvents(events: readonly BootnodeEventRecord[]): Promise<void>
  readIndexerState(): Promise<BootnodeIndexerState>
  writeIndexerState(state: Partial<Omit<BootnodeIndexerState, 'updatedAt'>>): Promise<void>
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
  private readonly events = new Map<string, BootnodeEventRecord>()
  private state: BootnodeIndexerState = {
    lastCursor: null,
    latestLedger: null,
    oldestLedger: null,
    caughtUpLedger: null,
    caughtUpCursor: null,
    updatedAt: null,
  }

  async read(key: string): Promise<CachedRpcResponse | null> {
    return this.cache.get(key) ?? null
  }

  async write(key: string, response: CachedRpcResponse): Promise<void> {
    this.cache.set(key, response)
  }

  async readEvents(options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]> {
    return Array.from(this.events.values())
      .filter((event) => options.contractIds.includes(event.contractId))
      .filter((event) => options.cursor ? event.pagingToken > options.cursor : event.ledger >= (options.startLedger ?? 0))
      .filter((event) => options.throughLedger === undefined || event.ledger <= options.throughLedger)
      .sort(compareEvents)
      .slice(0, options.limit)
  }

  async upsertEvents(events: readonly BootnodeEventRecord[]): Promise<void> {
    for (const event of events) this.events.set(event.id, event)
  }

  async readIndexerState(): Promise<BootnodeIndexerState> {
    return this.state
  }

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

class PostgresBootnodeStore implements BootnodeStore {
  private readonly pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      // Enable SSL only when the connection string asks for it. Coolify's
      // internal Postgres doesn't offer SSL, so forcing it crashes the client
      // ("server does not support SSL connections"). Managed cloud Postgres
      // that requires SSL should carry ?sslmode=require in the URL.
      ssl: /[?&]sslmode=(require|verify-ca|verify-full)/u.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
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
      create table if not exists bootnode_events (
        event_id text primary key,
        contract_id text not null,
        ledger integer not null,
        paging_token text not null,
        body jsonb not null
      );
      create index if not exists idx_bootnode_events_contract_ledger
        on bootnode_events(contract_id, ledger, paging_token);
      create table if not exists bootnode_indexer_state (
        id integer primary key check (id = 1),
        last_cursor text,
        latest_ledger integer,
        oldest_ledger integer,
        caught_up_ledger integer,
        caught_up_cursor text,
        updated_at timestamptz not null default now()
      );
      alter table bootnode_indexer_state
        add column if not exists caught_up_cursor text;
      insert into bootnode_indexer_state(id) values (1) on conflict (id) do nothing;
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

  async readEvents(options: ReadEventsOptions): Promise<readonly BootnodeEventRecord[]> {
    const cursorSql = options.cursor ? 'paging_token > $2' : 'ledger >= $2'
    const throughSql = options.throughLedger === undefined ? '' : 'and ledger <= $4'
    const result = await this.pool.query<{
      event_id: string
      contract_id: string
      ledger: number
      paging_token: string
      body: unknown
    }>(
      `select event_id, contract_id, ledger, paging_token, body
       from bootnode_events
       where contract_id = any($1) and ${cursorSql} ${throughSql}
       order by ledger asc, paging_token asc
       limit $3`,
      [options.contractIds, options.cursor ?? options.startLedger ?? 0, options.limit, options.throughLedger],
    )
    return result.rows.map((row) => ({
      id: row.event_id,
      contractId: row.contract_id,
      ledger: row.ledger,
      pagingToken: row.paging_token,
      body: row.body,
    }))
  }

  async upsertEvents(events: readonly BootnodeEventRecord[]): Promise<void> {
    for (const event of events) {
      await this.pool.query(
        `insert into bootnode_events(event_id, contract_id, ledger, paging_token, body)
         values ($1, $2, $3, $4, $5)
         on conflict (event_id) do update set body = excluded.body`,
        [event.id, event.contractId, event.ledger, event.pagingToken, JSON.stringify(event.body)],
      )
    }
  }

  async readIndexerState(): Promise<BootnodeIndexerState> {
    const result = await this.pool.query<{
      last_cursor: string | null
      latest_ledger: number | null
      oldest_ledger: number | null
      caught_up_ledger: number | null
      caught_up_cursor: string | null
      updated_at: Date | null
    }>('select last_cursor, latest_ledger, oldest_ledger, caught_up_ledger, caught_up_cursor, updated_at from bootnode_indexer_state where id = 1')
    const row = result.rows[0]
    return {
      lastCursor: row?.last_cursor ?? null,
      latestLedger: row?.latest_ledger ?? null,
      oldestLedger: row?.oldest_ledger ?? null,
      caughtUpLedger: row?.caught_up_ledger ?? null,
      caughtUpCursor: row?.caught_up_cursor ?? null,
      updatedAt: row?.updated_at?.toISOString() ?? null,
    }
  }

  async writeIndexerState(state: Partial<Omit<BootnodeIndexerState, 'updatedAt'>>): Promise<void> {
    await this.pool.query(
      `update bootnode_indexer_state set
        last_cursor = coalesce($1, last_cursor),
        latest_ledger = coalesce($2, latest_ledger),
        oldest_ledger = coalesce($3, oldest_ledger),
        caught_up_ledger = coalesce($4, caught_up_ledger),
        caught_up_cursor = coalesce($5, caught_up_cursor),
        updated_at = now()
       where id = 1`,
      [state.lastCursor, state.latestLedger, state.oldestLedger, state.caughtUpLedger, state.caughtUpCursor],
    )
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

function compareEvents(left: BootnodeEventRecord, right: BootnodeEventRecord): number {
  return left.ledger - right.ledger || left.pagingToken.localeCompare(right.pagingToken)
}

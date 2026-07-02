export interface JsonRpcRequest {
  readonly jsonrpc?: string
  readonly id?: unknown
  readonly method?: string
  readonly params?: unknown
}

export interface GetEventsParams {
  readonly startLedger?: number
  readonly filters?: readonly GetEventsFilter[]
  readonly pagination?: {
    readonly limit?: number
    readonly cursor?: string
  }
}

export interface GetEventsFilter {
  readonly type?: string
  readonly contractIds?: readonly string[]
  readonly topics?: unknown
}

export interface GetEventsResult {
  readonly events: readonly unknown[]
  readonly latestLedger?: number
  readonly oldestLedger?: number
  readonly cursor?: string
}

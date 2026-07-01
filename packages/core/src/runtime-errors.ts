export type PrivateRuntimeIssueKind = 'busy' | 'rpc-sync-gap' | 'syncing' | 'stalled' | 'network' | 'unknown'

export interface PrivateRuntimeIssue {
  readonly kind: PrivateRuntimeIssueKind
  readonly title: string
  readonly body: string
  readonly retryable: boolean
  readonly raw: string
}

export function classifyPrivateRuntimeIssue(error: unknown): PrivateRuntimeIssue {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const message = raw.trim()

  if (/Another tab|another window|local database|database.*in use|ZKF_RUNTIME_BUSY|IndexedDB.*lock/i.test(message)) {
    return {
      kind: 'busy',
      title: 'ZK engine is already open.',
      body: 'Another ZK Fighter window is using the local private database. Close the other window or retry after it finishes.',
      retryable: true,
      raw: message,
    }
  }

  if (/RPC_SYNC_GAP|oldest ledger|startLedger|ledger range/i.test(message)) {
    return {
      kind: 'rpc-sync-gap',
      title: 'Pool history is outside this RPC window.',
      body: 'This Stellar RPC no longer has the older pool events needed for the scan. Use a fresh in-window pool or an archive RPC/indexer.',
      retryable: false,
      raw: message,
    }
  }

  if (/sync \d+ ledger|ASP membership|indexer precondition/i.test(message)) {
    return {
      kind: 'syncing',
      title: 'Pool is still syncing.',
      body: 'The shielded pool indexer is catching up. Try again after a few ledgers.',
      retryable: true,
      raw: message,
    }
  }

  if (/ZKF_RUNTIME_TIMEOUT|private engine.*timed out|note scan.*timed out|local private engine/i.test(message)) {
    return {
      kind: 'stalled',
      title: 'ZK engine did not answer.',
      body: 'The local private engine stalled while reading shielded notes. Retry after it restarts; if it persists, close other ZK Fighter tabs and reload.',
      retryable: true,
      raw: message,
    }
  }

  if (/jsonrpc|\brpc\b|network|fetch|timed? ?out|timeout|connection/i.test(message)) {
    return {
      kind: 'network',
      title: 'Network issue.',
      body: 'Could not reach the Stellar RPC cleanly. Check the network and retry.',
      retryable: true,
      raw: message,
    }
  }

  return {
    kind: 'unknown',
    title: 'Private runtime unavailable.',
    body: message || 'The private runtime failed before returning a report.',
    retryable: true,
    raw: message,
  }
}

export function privateRuntimeErrorText(error: unknown): string {
  const issue = classifyPrivateRuntimeIssue(error)
  return `${issue.title} ${issue.body}`
}

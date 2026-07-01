import { classifyPrivateRuntimeIssue } from '@zk-fighter/core'

export interface NotesIssue {
  readonly title: string
  readonly body: string
}

// Turns a raw loader blocker (RPC error, sync gap, trustline, …) into a clean,
// human message — so screens never dump a verbatim jsonrpc error at the user.
export function describeNotesIssue(blocker: string | null | undefined): NotesIssue | null {
  const message = blocker?.trim()
  if (!message) {
    return null
  }

  const runtimeIssue = classifyPrivateRuntimeIssue(message)
  if (runtimeIssue.kind !== 'unknown') {
    return { title: runtimeIssue.title, body: runtimeIssue.body }
  }

  if (/sync \d+ ledger|ASP membership|indexer precondition/i.test(message)) {
    return {
      title: 'Pool is still syncing.',
      body: 'The shielded pool indexer is catching up. Your balance appears once it syncs — give it a moment and refresh.',
    }
  }
  if (/startLedger|ledger range|re-?index/i.test(message)) {
    return {
      title: 'Indexer catching up.',
      body: 'The pool RPC is re-indexing recent ledgers. Refresh in a moment to load your shielded balance.',
    }
  }
  if (/trustline/i.test(message)) {
    return {
      title: 'USDC trustline needed.',
      body: 'Set up USDC receiving (Receive → Public address) before your USDC balance can load.',
    }
  }
  if (/jsonrpc|\brpc\b|network|fetch|timed? ?out|timeout|connection/i.test(message)) {
    return {
      title: 'Network issue.',
      body: 'Couldn’t reach the Stellar RPC right now. Check your connection and refresh.',
    }
  }

  return { title: 'Balance unavailable.', body: message }
}

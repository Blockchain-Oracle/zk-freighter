import { classifyPrivateRuntimeIssue } from '@zk-fighter/core'

export interface BalanceIssue {
  readonly title: string
  readonly body: string
}

export function uniqueBlockers(blockers: readonly string[]): readonly string[] {
  return [...new Set(blockers.map((blocker) => blocker.trim()).filter(Boolean))]
}

export function describeBalanceIssue(blockers: readonly string[], error?: string): BalanceIssue | null {
  const blocker = error?.trim() || uniqueBlockers(blockers)[0]
  if (!blocker) return null
  const runtimeIssue = classifyPrivateRuntimeIssue(blocker)
  if (runtimeIssue.kind !== 'unknown') {
    return { title: runtimeIssue.title, body: runtimeIssue.body }
  }
  if (/RPC_SYNC_GAP|oldest ledger|startLedger|ledger range/i.test(blocker)) {
    return {
      title: 'Pool history is outside this RPC window.',
      body: 'The Stellar testnet RPC only keeps recent ledgers. This wallet has older shielded-pool history than this endpoint can scan, so private balances stay unavailable until an archive indexer/RPC is used or new in-window shielded activity exists.',
    }
  }
  if (/sync \d+ ledger|ASP membership|indexer precondition/i.test(blocker)) {
    return {
      title: 'Pool is still syncing.',
      body: 'The shielded pool indexer is catching up. Refresh again after a few ledgers.',
    }
  }
  if (/trustline/i.test(blocker)) {
    return {
      title: 'USDC setup needed.',
      body: 'Set up USDC receiving before USDC balances can load.',
    }
  }
  if (/jsonrpc|\brpc\b|network|fetch|timed? ?out|timeout|connection/i.test(blocker)) {
    return {
      title: 'Network issue.',
      body: 'Could not reach the Stellar RPC cleanly. Check the network and refresh.',
    }
  }
  return { title: 'Balance unavailable.', body: blocker }
}

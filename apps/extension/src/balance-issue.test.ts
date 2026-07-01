import { describe, expect, it } from 'vitest'

import { describeBalanceIssue, uniqueBlockers } from './balance-issue'

describe('extension balance issue helper', () => {
  it('deduplicates repeated blocker strings', () => {
    expect(uniqueBlockers([' RPC_SYNC_GAP ', 'RPC_SYNC_GAP', ''])).toEqual(['RPC_SYNC_GAP'])
  })

  it('explains RPC retention gaps without dumping raw backend text', () => {
    const issue = describeBalanceIssue(['RPC_SYNC_GAP: RPC sync gap - the oldest ledger is: 3244316'])
    expect(issue?.title).toContain('RPC window')
    expect(issue?.body).toContain('archive RPC')
  })

  it('falls back to the raw blocker for unknown issues', () => {
    const issue = describeBalanceIssue(['something unexpected'])
    expect(issue?.body).toBe('something unexpected')
  })
})

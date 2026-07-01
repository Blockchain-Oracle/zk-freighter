import { describe, expect, it } from 'vitest'
import { classifyPrivateRuntimeIssue, privateRuntimeErrorText } from './runtime-errors'

describe('private runtime errors', () => {
  it('classifies local database lock errors as busy', () => {
    const issue = classifyPrivateRuntimeIssue('Another tab or window is using this app local database.')
    expect(issue.kind).toBe('busy')
    expect(issue.retryable).toBe(true)
  })

  it('classifies Stellar RPC retention gaps', () => {
    const issue = classifyPrivateRuntimeIssue('RPC_SYNC_GAP: RPC sync gap - the oldest ledger is: 3244316')
    expect(issue.kind).toBe('rpc-sync-gap')
    expect(privateRuntimeErrorText(issue.raw)).toContain('RPC window')
  })
})

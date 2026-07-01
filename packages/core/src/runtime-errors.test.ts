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

  it('classifies stalled local private runtime timeouts separately from network errors', () => {
    const issue = classifyPrivateRuntimeIssue('ZKF_RUNTIME_TIMEOUT: XLM shielded note scan timed out after 20s.')
    expect(issue.kind).toBe('stalled')
    expect(issue.retryable).toBe(true)
  })

  it('classifies storage worker operation timeouts as stalled private runtime errors', () => {
    const issue = classifyPrivateRuntimeIssue('Storage Worker Communication Error: operation timed out after 60000 ms')
    expect(issue.kind).toBe('stalled')
    expect(issue.title).toContain('ZK engine')
  })
})

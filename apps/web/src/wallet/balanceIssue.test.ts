import { describe, expect, it } from 'vitest'
import { describeNotesIssue } from './balanceIssue'

describe('describeNotesIssue', () => {
  it('returns null when there is no blocker', () => {
    expect(describeNotesIssue(null)).toBeNull()
    expect(describeNotesIssue('')).toBeNull()
  })

  it('explains an ASP/indexer sync gap in plain language', () => {
    const issue = describeNotesIssue('ASP membership/indexer precondition stopped; sync 12 ledgers behind.')
    expect(issue?.title.toLowerCase()).toContain('syncing')
  })

  it('explains a ledger-range / RPC re-index error', () => {
    const issue = describeNotesIssue('jsonrpc error: -32600 - startLedger must be within the ledger range: 3170109 - 3291068')
    expect(issue?.title.toLowerCase()).toMatch(/catching up|indexer/)
  })

  it('points USDC trustline issues to receiving setup', () => {
    const issue = describeNotesIssue('USDC trustline is required before deposits.')
    expect(issue?.title.toLowerCase()).toContain('trustline')
  })

  it('flags generic RPC/network failures', () => {
    const issue = describeNotesIssue('fetch failed: network error')
    expect(issue?.title.toLowerCase()).toContain('network')
  })

  it('falls back to the raw blocker for unknown issues', () => {
    const issue = describeNotesIssue('something unexpected happened')
    expect(issue?.body).toContain('something unexpected happened')
  })
})

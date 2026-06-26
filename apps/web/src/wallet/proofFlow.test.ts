import { describe, expect, it } from 'vitest'
import type { XlmShieldProgressEvent } from '@zk-fighter/core'
import { PROOF_STEP_LABELS, proofFlowModel } from './proofFlow'

function nm(step: string, message = step): XlmShieldProgressEvent {
  return { source: 'nethermind', elapsedMs: 0, flow: 'deposit', step, message }
}
function soroban(step: string, message = step): XlmShieldProgressEvent {
  return { source: 'soroban', elapsedMs: 0, step, message }
}

describe('proofFlowModel', () => {
  it('starts with the first step active and no progress before any event', () => {
    const model = proofFlowModel([])
    expect(model.steps.map((s) => s.state)).toEqual(['active', 'pending', 'pending', 'pending', 'pending'])
    expect(model.progress).toBe(0)
    expect(model.percentLabel).toBe('0%')
    expect(model.ringState).toBe('active')
    expect(model.steps.map((s) => s.label)).toEqual([...PROOF_STEP_LABELS])
  })

  it('marks earlier phases done and the proving phase active mid-flight', () => {
    const events: XlmShieldProgressEvent[] = [
      nm('sync_wait', 'Waiting to sync 1 ledger(s) from the chain...'),
      nm('fetch_chain_state', 'Fetching on-chain state'),
      nm('', 'Fetching ASP non-membership proof'),
      nm('', 'Building witness inputs'),
      nm('prove', 'Generating proof'),
    ]
    const model = proofFlowModel(events)
    expect(model.steps.map((s) => s.state)).toEqual(['done', 'done', 'active', 'pending', 'pending'])
    expect(model.progress).toBeCloseTo(0.4)
    expect(model.percentLabel).toBe('40%')
  })

  it('advances to confirming when a soroban confirm event arrives', () => {
    const model = proofFlowModel([nm('prepare_tx', 'Simulating transaction'), soroban('confirm', 'Confirming transaction')])
    expect(model.steps[4].state).toBe('active')
    expect(model.steps.slice(0, 4).every((s) => s.state === 'done')).toBe(true)
  })

  it('shows every step done on a submitted terminal', () => {
    const model = proofFlowModel([nm('prove')], 'submitted')
    expect(model.steps.every((s) => s.state === 'done')).toBe(true)
    expect(model.progress).toBe(1)
    expect(model.ringState).toBe('done')
    expect(model.headline).toBe('Submitted')
  })

  it('marks the last-reached phase as errored on a failed terminal', () => {
    // Last event is `prove`, so the proving phase is where it errored — we have no
    // evidence it completed, so it must NOT be shown as done.
    const events = [nm('sync_wait'), nm('fetch_chain_state'), nm('', 'Building witness inputs'), nm('prove')]
    const model = proofFlowModel(events, 'failed')
    expect(model.steps.map((s) => s.state)).toEqual(['done', 'done', 'error', 'pending', 'pending'])
    expect(model.ringState).toBe('error')
    expect(model.headline).toBe('Failed')
  })

  it('errors the sync step when blocked on an ASP/indexer precondition', () => {
    const model = proofFlowModel([nm('sync_wait', 'Waiting to sync 3 ledger(s) from the chain...')], 'blocked')
    expect(model.steps[0].state).toBe('error')
    expect(model.ringState).toBe('error')
    expect(model.headline.toLowerCase()).toContain('sync')
  })

  it('derives the blocked headline from the phase reached, not a hardcoded "syncing"', () => {
    // Blocked after progressing to the witness/ASP phase (index 1) — that is the phase
    // that stalled, so it errors and the headline must not claim sync.
    const model = proofFlowModel(
      [nm('sync_wait'), nm('fetch_chain_state'), nm('', 'Building witness inputs')],
      'blocked',
    )
    expect(model.steps.map((s) => s.state)).toEqual(['done', 'error', 'pending', 'pending', 'pending'])
    expect(model.headline).toBe('Paused — Building proof inputs')
    expect(model.headline.toLowerCase()).not.toContain('sync')
  })
})

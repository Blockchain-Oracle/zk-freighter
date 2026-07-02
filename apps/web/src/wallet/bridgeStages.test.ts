import { describe, expect, it } from 'vitest'
import type { CctpBridgeReport, CctpBridgeStage } from '@zk-freighter/core'
import { BRIDGE_STAGE_LABELS, bridgeStageModel } from './bridgeStages'

function report(status: CctpBridgeReport['status'], stages: CctpBridgeStage[]): CctpBridgeReport {
  return {
    status,
    statusEvents: stages.map((stage) => ({ stage, elapsedMs: 0, message: stage })),
  } as unknown as CctpBridgeReport
}

describe('bridgeStageModel', () => {
  it('is all pending before any bridge has started', () => {
    expect(bridgeStageModel(null).map((s) => s.state)).toEqual(['pending', 'pending', 'pending', 'pending', 'pending'])
    expect(bridgeStageModel(null).map((s) => s.label)).toEqual(BRIDGE_STAGE_LABELS.map((s) => s.label))
  })

  it('marks reached stages done and the current stage active mid-run', () => {
    const model = bridgeStageModel(report('running', ['readiness', 'approve', 'burn']))
    expect(model.map((s) => s.state)).toEqual(['done', 'done', 'active', 'pending', 'pending'])
  })

  it('marks every stage done when completed', () => {
    const model = bridgeStageModel(report('completed', ['readiness', 'approve', 'burn', 'attestation', 'mint']))
    expect(model.every((s) => s.state === 'done')).toBe(true)
  })

  it('errors the stage that failed', () => {
    const model = bridgeStageModel(report('failed', ['readiness', 'approve', 'burn', 'attestation']))
    expect(model.map((s) => s.state)).toEqual(['done', 'done', 'done', 'error', 'pending'])
  })
})

import type { CctpBridgeReport, CctpBridgeStage } from '@zk-freighter/core'
import type { ProofStep, ProofStepState } from '@zk-freighter/ui'

// The CCTP bridge timeline (ordered). Mirrors the proof-flow step model but keyed to
// the real CctpBridgeReport stages rather than prover events.
export const BRIDGE_STAGE_LABELS: readonly { stage: CctpBridgeStage; label: string }[] = [
  { stage: 'readiness', label: 'Prepare Stellar destination' },
  { stage: 'approve', label: 'Approve USDC on source' },
  { stage: 'burn', label: 'Burn on source chain' },
  { stage: 'attestation', label: 'Circle attestation' },
  { stage: 'mint', label: 'Mint USDC on Stellar' },
]

const ORDER: readonly CctpBridgeStage[] = BRIDGE_STAGE_LABELS.map((entry) => entry.stage)

export function bridgeStageModel(report: CctpBridgeReport | null): ProofStep[] {
  const reached = report ? report.statusEvents.reduce((max, event) => Math.max(max, ORDER.indexOf(event.stage)), -1) : -1
  const completed = report?.status === 'completed'
  const errored = report?.status === 'failed' || report?.status === 'blocked'

  return BRIDGE_STAGE_LABELS.map(({ label }, index) => {
    let state: ProofStepState
    if (!report) {
      state = 'pending'
    } else if (completed) {
      state = 'done'
    } else {
      const active = reached < 0 ? 0 : reached
      if (index < active) {
        state = 'done'
      } else if (index === active) {
        state = errored ? 'error' : 'active'
      } else {
        state = 'pending'
      }
    }
    return { label, state }
  })
}

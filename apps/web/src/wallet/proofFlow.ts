import type { ProofStep, ProofStepState, RingState } from '@zk-fighter/ui'

// Maps the real prover + submit heartbeat onto a fixed, honest set of UI phases,
// shared by every proving flow (shield / send / unshield). Progress only advances
// when a real phase is reached — there is no simulated timer.

export const PROOF_STEP_LABELS = [
  'Syncing pool state',
  'Building proof inputs',
  'Generating ZK proof',
  'Submitting to Stellar',
  'Confirming',
] as const

const TOTAL_PHASES = PROOF_STEP_LABELS.length

/** Minimal structural shape shared by XlmShieldProgressEvent and XlmPrivateProgressEvent. */
export interface ProofFlowEvent {
  readonly source: 'nethermind' | 'soroban'
  readonly step?: string
  readonly message: string
}

export type ProofTerminal = 'submitted' | 'blocked' | 'failed'

export interface ProofFlowModel {
  readonly steps: readonly ProofStep[]
  readonly progress: number
  readonly percentLabel: string
  readonly headline: string
  readonly ringState: RingState
}

/** Classifies one progress event into a phase index (0..4), or -1 if unknown. */
function classifyPhase(event: ProofFlowEvent): number {
  const step = event.step ?? ''
  const message = event.message

  if (event.source === 'soroban') {
    return step === 'confirm' ? 4 : 3 // sign_auth / sign_tx / submit -> phase 3
  }

  if (step === 'sync_wait' || step === 'sync_process' || step === 'fetch_chain_state') {
    return 0
  }
  if (message.includes('ASP') || message.includes('witness')) {
    return 1
  }
  if (step === 'prove') {
    return 2
  }
  if (step === 'prepare_tx' || message.includes('Simulating')) {
    return 3
  }
  return -1
}

function latestPhase(events: readonly ProofFlowEvent[]): number {
  return events.reduce((max, event) => Math.max(max, classifyPhase(event)), -1)
}

function inFlightState(index: number, activePhase: number): ProofStepState {
  if (index < activePhase) {
    return 'done'
  }
  return index === activePhase ? 'active' : 'pending'
}

function terminalState(index: number, reachedPhase: number, isError: boolean): ProofStepState {
  if (!isError) {
    return 'done'
  }
  if (index < reachedPhase) {
    return 'done'
  }
  return index === reachedPhase ? 'error' : 'pending'
}

export function proofFlowModel(
  events: readonly ProofFlowEvent[],
  terminal?: ProofTerminal,
): ProofFlowModel {
  const reached = latestPhase(events)
  const activePhase = reached < 0 ? 0 : reached
  const isError = terminal === 'failed' || terminal === 'blocked'
  const isDone = terminal === 'submitted'

  const steps: ProofStep[] = PROOF_STEP_LABELS.map((label, index) => {
    const state = terminal
      ? terminalState(index, activePhase, isError)
      : inFlightState(index, activePhase)
    return { label, state }
  })

  const doneCount = steps.filter((step) => step.state === 'done').length
  const progress = isDone ? 1 : doneCount / TOTAL_PHASES
  const ringState: RingState = isDone ? 'done' : isError ? 'error' : 'active'

  let headline: string
  if (isDone) {
    headline = 'Submitted'
  } else if (terminal === 'failed') {
    headline = 'Failed'
  } else if (terminal === 'blocked') {
    // Derive from the phase actually reached so the headline never claims "syncing"
    // while a later phase (e.g. building inputs) is the one that stalled.
    headline = `Paused — ${PROOF_STEP_LABELS[activePhase]}`
  } else {
    headline = PROOF_STEP_LABELS[activePhase]
  }

  return {
    steps,
    progress,
    percentLabel: `${Math.round(progress * 100)}%`,
    headline,
    ringState,
  }
}

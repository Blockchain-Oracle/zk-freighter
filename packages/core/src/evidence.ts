export type EvidenceKind =
  | 'tooling'
  | 'proof-benchmark'
  | 'stellar-transaction'
  | 'bridge-transaction'
  | 'failure-gate'

export interface EvidenceEntry {
  readonly date: string
  readonly phase: string
  readonly kind: EvidenceKind
  readonly network: string
  readonly summary: string
  readonly commands?: readonly string[]
  readonly contractIds?: readonly string[]
  readonly transactionHashes?: readonly string[]
  readonly explorerLinks?: readonly string[]
  readonly notes?: readonly string[]
}

export function createPhaseEvidenceEntry(entry: EvidenceEntry): EvidenceEntry {
  return entry
}

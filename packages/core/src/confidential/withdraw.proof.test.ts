import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GRUMPKIN_GENERATORS } from './grumpkin'
import { type CompiledCircuit } from './prover'
import { buildWithdrawProof } from './withdraw'

const PROOF_TIMEOUT_MS = 120_000

function loadCircuit(name: string): CompiledCircuit {
  const path = fileURLToPath(new URL(`../../../../circuits/target/${name}.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as CompiledCircuit
}

describe('confidential withdraw proof path', () => {
  it(
    'builds a satisfiable withdraw witness (every off-circuit derivation matches)',
    async () => {
      const circuit = loadCircuit('circuit_withdraw')
      // After a 1000-unit deposit+merge the spendable commitment is commit(1000, 0).
      const balance = { spendable: { v: 1000n, r: 0n }, receiving: { v: 0n, r: 0n } }
      // Any valid on-curve non-identity point works as the auditor key locally.
      const kAudS = GRUMPKIN_GENERATORS.H

      const out = await buildWithdrawProof({
        secret: new Uint8Array(32).fill(9),
        addrF: 0x1234n,
        amount: 300n,
        balance,
        kAudS,
        circuit,
      })

      // Execution succeeded → the witness satisfied C_spend = commit(v,r),
      // C_spend' = commit(v-a, r'), b_tilde, R_e and the auditor checkpoint.
      expect(out.proof.length).toBeGreaterThan(0)
      expect(out.cSpendNew.length).toBe(64)
      expect(out.rE.length).toBe(64)
      expect(out.sigma.length).toBe(32)
      expect(out.bTilde.length).toBe(32)
      expect(out.bAudS.length).toBe(32)
      expect(out.newR).toBeGreaterThan(0n)
    },
    PROOF_TIMEOUT_MS,
  )
})

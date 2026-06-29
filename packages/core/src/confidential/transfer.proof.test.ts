import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GRUMPKIN_GENERATORS } from './grumpkin'
import { deriveConfidentialAccount } from './keys'
import { type CompiledCircuit } from './prover'
import { buildTransferProof } from './transfer'

const PROOF_TIMEOUT_MS = 120_000

function loadCircuit(name: string): CompiledCircuit {
  const path = fileURLToPath(new URL(`../../../../circuits/target/${name}.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as CompiledCircuit
}

describe('confidential transfer proof path', () => {
  it(
    'builds a satisfiable transfer witness (recipient + dual-auditor channels)',
    async () => {
      const circuit = loadCircuit('circuit_transfer')
      const addrF = 0x1234n
      // Recipient PVK_B from a distinct seed (the on-chain registered viewing key).
      const recipient = await deriveConfidentialAccount(new Uint8Array(32).fill(5), addrF)
      const balance = { spendable: { v: 1000n, r: 0n }, receivingV: 0n }
      const kAud = GRUMPKIN_GENERATORS.H // valid on-curve non-identity auditor key

      const out = await buildTransferProof({
        secret: new Uint8Array(32).fill(9),
        addrF,
        amount: 400n,
        balance,
        pvkB: recipient.PVK,
        kAudR: kAud,
        kAudS: kAud,
        circuit,
      })

      expect(out.proof.length).toBeGreaterThan(0)
      expect(out.cSpendNew.length).toBe(64)
      expect(out.cTx.length).toBe(64)
      expect(out.rE.length).toBe(64)
      for (const field of [out.vTilde, out.bTilde, out.sigma, out.vAudR, out.rAudR, out.vAudS, out.bAudS]) {
        expect(field.length).toBe(32)
      }
      expect(out.newR).toBeGreaterThan(0n)
    },
    PROOF_TIMEOUT_MS,
  )
})

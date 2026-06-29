import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { addressToField } from './keys'
import { verifyConfidentialProof, type CompiledCircuit } from './prover'
import { buildRegisterProof, fieldTo32BE } from './register'

// Real end-to-end proof generation is slow (bb.js UltraHonk in Node) — give it room.
const PROOF_TIMEOUT_MS = 120_000

function loadRegisterCircuit(): CompiledCircuit {
  const path = fileURLToPath(new URL('../../../../circuits/target/circuit_register.json', import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as CompiledCircuit
}

describe('confidential register proof path', () => {
  it('fieldTo32BE is big-endian and 32 bytes', () => {
    const bytes = fieldTo32BE(0x01020304n)
    expect(bytes.length).toBe(32)
    expect([...bytes.subarray(28)]).toEqual([1, 2, 3, 4])
  })

  it('addressToField compresses a 56-char strkey deterministically', async () => {
    const address = 'CDNN7XDLNAHE6BPS3CV3VJQLMUDBFULCEJFOKDGEGQ5N3O7QZ4YMLEF7'
    const a = await addressToField(address)
    const b = await addressToField(address)
    expect(a).toBe(b)
    expect(a).toBeGreaterThan(0n)
  })

  it(
    'generates a register proof the UltraHonk verifier accepts locally',
    async () => {
      const circuit = loadRegisterCircuit()
      const secret = new Uint8Array(32).fill(7)
      const addrF = await addressToField('CDNN7XDLNAHE6BPS3CV3VJQLMUDBFULCEJFOKDGEGQ5N3O7QZ4YMLEF7')

      const result = await buildRegisterProof({ secret, addrF, circuit })

      // Public-input blob is the contract's 5×32 layout, ending in addr_f.
      expect(result.publicInputs.length).toBe(160)
      expect([...result.publicInputs.subarray(128)]).toEqual([...fieldTo32BE(addrF)])
      expect(result.proof.length).toBeGreaterThan(0)

      // The proof verifies against the circuit's own VK — i.e. the witness is
      // satisfiable and the proof is well-formed for these public inputs.
      const ok = await verifyConfidentialProof(circuit, {
        proof: result.proof,
        publicInputs: [result.keys.Y.x, result.keys.Y.y, result.keys.PVK.x, result.keys.PVK.y, addrF].map(
          (field) => `0x${field.toString(16)}`,
        ),
      })
      expect(ok).toBe(true)
    },
    PROOF_TIMEOUT_MS,
  )
})

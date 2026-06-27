// Confidential-token runtime: a thin wrapper over bb.js (UltraHonk + Poseidon2)
// and noir_js, fully isolated from the shielded pool's Nethermind prover. The
// heavy WASM is lazy-loaded via dynamic import so it never enters the eager web /
// extension bundle — it is paid for only when confidential mode is used.
//
// Using bb's own Poseidon2 (poseidon2Hash) makes the wallet's off-circuit hashing
// byte-identical to the circuits by construction — no hand-ported round constants
// to drift. Pinned by KAT against the reference circuit testdata.

interface ConfidentialRuntime {
  readonly bb: { poseidon2Hash(inputs: readonly unknown[]): Promise<{ toBuffer(): Uint8Array }> }
  readonly Fr: new (value: bigint) => unknown
  readonly UltraHonkBackend: new (bytecode: string) => ConfidentialBackend
  readonly Noir: new (circuit: CompiledCircuit) => { execute(inputs: Record<string, unknown>): Promise<{ witness: Uint8Array }> }
}

interface ConfidentialBackend {
  generateProof(witness: Uint8Array): Promise<ConfidentialProof>
  verifyProof(proof: ConfidentialProof): Promise<boolean>
  destroy(): Promise<void>
}

export interface CompiledCircuit {
  readonly bytecode: string
  readonly abi?: unknown
}

export interface ConfidentialProof {
  readonly proof: Uint8Array
  readonly publicInputs: readonly string[]
}

let runtimePromise: Promise<ConfidentialRuntime> | null = null

async function getRuntime(): Promise<ConfidentialRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const bbjs = (await import('@aztec/bb.js')) as unknown as {
        Barretenberg: { new: (opts: { threads: number }) => Promise<ConfidentialRuntime['bb']> }
        Fr: ConfidentialRuntime['Fr']
        UltraHonkBackend: ConfidentialRuntime['UltraHonkBackend']
      }
      const noir = (await import('@noir-lang/noir_js')) as unknown as { Noir: ConfidentialRuntime['Noir'] }
      const bb = await bbjs.Barretenberg.new({ threads: 1 })
      return { bb, Fr: bbjs.Fr, UltraHonkBackend: bbjs.UltraHonkBackend, Noir: noir.Noir }
    })()
  }
  return runtimePromise
}

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  let value = 0n
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte)
  }
  return value
}

/**
 * bb-identical Poseidon2 hash (the Noir-stdlib t4 sponge) over BN254. The first
 * input is conventionally a CONFIDENTIAL_DOMAIN separation tag.
 */
export async function confidentialPoseidon2(inputs: readonly bigint[]): Promise<bigint> {
  const { bb, Fr } = await getRuntime()
  const result = await bb.poseidon2Hash(inputs.map((input) => new Fr(input)))
  return bytesToBigIntBE(result.toBuffer())
}

/** Solve the circuit witness from named inputs (the @noir_js half of the path). */
export async function executeConfidentialCircuit(
  circuit: CompiledCircuit,
  inputs: Record<string, unknown>,
): Promise<Uint8Array> {
  const { Noir } = await getRuntime()
  const noir = new Noir(circuit)
  const { witness } = await noir.execute(inputs)
  return witness
}

/** Generate an UltraHonk proof for a circuit witness (proves against the on-chain VK). */
export async function generateConfidentialProof(circuit: CompiledCircuit, witness: Uint8Array): Promise<ConfidentialProof> {
  const { UltraHonkBackend } = await getRuntime()
  const backend = new UltraHonkBackend(circuit.bytecode)
  try {
    return await backend.generateProof(witness)
  } finally {
    await backend.destroy()
  }
}

/** Verify an UltraHonk proof against a circuit's derived VK. */
export async function verifyConfidentialProof(circuit: CompiledCircuit, proof: ConfidentialProof): Promise<boolean> {
  const { UltraHonkBackend } = await getRuntime()
  const backend = new UltraHonkBackend(circuit.bytecode)
  try {
    return await backend.verifyProof(proof)
  } finally {
    await backend.destroy()
  }
}

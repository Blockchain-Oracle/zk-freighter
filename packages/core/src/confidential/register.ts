// Confidential-token REGISTER proof path (Track B). This module is heavy — it
// pulls the bb.js / noir_js UltraHonk runtime via ./prover — so it is NOT
// re-exported from the confidential barrel. Import it directly (or lazily) when
// the user enters register, e.g. `import('@zk-fighter/core/dist/confidential/register')`.
//
// Register proves: Y = sk·H, vk = Poseidon2(VIEWING_KEY, sk, addr_f), PVK = vk·H,
// with addr_f bound to the deployed token instance (design §7.2). The contract
// then re-checks addr_f == its bound ContractField and gates on the proof.

import { Address, Contract, nativeToScVal, xdr } from '@stellar/stellar-sdk'
import { getConfidentialConfig } from './../networks'
import { deriveConfidentialAccount, type ConfidentialAccountKeys } from './keys'
import {
  executeConfidentialCircuit,
  generateConfidentialProof,
  type CompiledCircuit,
} from './prover'
import {
  runConfidentialInvocation,
  type ConfidentialSubmitOptions,
  type ConfidentialSubmitReport,
} from './soroban'

const FIELD_BYTES = 32
// Register public-input layout (contract REGISTER_PUBLIC_INPUTS_LEN = 5·32):
//   y_x | y_y | pvk_x | pvk_y | addr_f
const REGISTER_PUBLIC_INPUTS = 5

export interface RegisterProofResult {
  /// 160-byte public-input blob in the contract's canonical order.
  readonly publicInputs: Uint8Array
  /// Raw UltraHonk proof bytes (keccak oracle, on-chain verifier format).
  readonly proof: Uint8Array
  /// The derived confidential account keys (for local persistence / display).
  readonly keys: ConfidentialAccountKeys
}

/** Big-endian 32-byte encoding of a BN254 field element. */
export function fieldTo32BE(value: bigint): Uint8Array {
  let v = value
  const out = new Uint8Array(FIELD_BYTES)
  for (let i = FIELD_BYTES - 1; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

function toHex(value: bigint): string {
  return `0x${value.toString(16)}`
}

// js-xdr's scvBytes accepts a Uint8Array directly; the cast keeps us off the
// Node `Buffer` global (which Vite externalizes for the browser). Mirrors the
// `asScvBytesInput` pattern in cctp-stellar.ts.
function asScvBytes(bytes: Uint8Array): xdr.ScVal {
  return xdr.ScVal.scvBytes(bytes as Parameters<typeof xdr.ScVal.scvBytes>[0])
}

function concatFields(fields: readonly bigint[]): Uint8Array {
  const out = new Uint8Array(fields.length * FIELD_BYTES)
  fields.forEach((field, index) => {
    out.set(fieldTo32BE(field), index * FIELD_BYTES)
  })
  return out
}

/**
 * Derive the confidential account for `addrF` and produce a register proof plus
 * the matching public-input blob. `secret` is the wallet's confidential secret
 * (e.g. `identity.keyDerivationSignature`); `circuit` is the compiled register
 * circuit (bytecode + abi). Pure compute — no network access.
 */
export async function buildRegisterProof(args: {
  readonly secret: Uint8Array
  readonly addrF: bigint
  readonly circuit: CompiledCircuit
}): Promise<RegisterProofResult> {
  const keys = await deriveConfidentialAccount(args.secret, args.addrF)
  const witnessInputs: Record<string, string> = {
    sk: toHex(keys.sk),
    y_x: toHex(keys.Y.x),
    y_y: toHex(keys.Y.y),
    pvk_x: toHex(keys.PVK.x),
    pvk_y: toHex(keys.PVK.y),
    addr_f: toHex(args.addrF),
  }
  const witness = await executeConfidentialCircuit(args.circuit, witnessInputs)
  const proof = await generateConfidentialProof(args.circuit, witness)
  const fields = [keys.Y.x, keys.Y.y, keys.PVK.x, keys.PVK.y, args.addrF]
  const publicInputs = concatFields(fields)
  if (fields.length !== REGISTER_PUBLIC_INPUTS) {
    throw new Error('register public-input field count drifted from the contract layout')
  }
  return { publicInputs, proof: proof.proof, keys }
}

/**
 * Register the caller's confidential account on-chain. Derives keys from the
 * wallet's confidential secret, generates the register proof against the
 * instance's bound `addr_f`, and submits `register(account, auditor_id,
 * public_inputs, proof)`. The `circuit` is the compiled register circuit the
 * caller loads lazily (e.g. fetched from `/circuits/circuit_register.json`).
 */
export async function submitConfidentialRegister(
  options: ConfidentialSubmitOptions & { readonly circuit: CompiledCircuit; readonly auditorId?: number },
): Promise<ConfidentialSubmitReport> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) {
    // Defer to the runner's gated path for a consistent blocked report.
    return runConfidentialInvocation(options, 'register', (contractId) =>
      new Contract(contractId).call('register'),
    )
  }

  const addrF = BigInt(`0x${confidential.addrFHex}`)
  const auditorId = options.auditorId ?? 0
  const account = options.identity.stellarPublicKey
  const { publicInputs, proof } = await buildRegisterProof({
    secret: options.identity.keyDerivationSignature,
    addrF,
    circuit: options.circuit,
  })

  return runConfidentialInvocation(options, 'register', (contractId) =>
    new Contract(contractId).call(
      'register',
      Address.fromString(account).toScVal(),
      nativeToScVal(auditorId, { type: 'u32' }),
      asScvBytes(publicInputs),
      asScvBytes(proof),
    ),
  )
}

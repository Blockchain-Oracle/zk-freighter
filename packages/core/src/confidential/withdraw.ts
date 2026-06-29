// Confidential-token WITHDRAW (unshield) proof path (design §7.5). Heavy module
// (pulls the bb.js/noir runtime) — NOT in the eager barrel; import lazily.
//
// Proves ownership of the current spendable commitment C_spend = v·G + r·H,
// that 0 ≤ amount ≤ v < 2^127, and emits the new spendable commitment plus the
// sender-auditor checkpoint. The contract rebuilds the 15-field public-input
// blob from its stored C_spend/Y + the auditor key, so the witness MUST use the
// wallet's exact tracked (v, r) — see balance-state.ts.

import { Address, Contract, nativeToScVal } from '@stellar/stellar-sdk'
import { getConfidentialConfig } from './../networks'
import {
  afterSpend,
  loadConfidentialBalance,
  saveConfidentialBalance,
  type ConfidentialBalance,
} from './balance-state'
import { asScvBytes, fieldTo32BE, pointFrom64BE, pointTo64BE, randomGrumpkinScalar, randomSigma } from './encoding'
import { encryptBalance } from './encrypt'
import { GRUMPKIN_GENERATORS, grumpkinCommit, grumpkinEcdhSharedX, grumpkinScalarMul, type GrumpkinAffine } from './grumpkin'
import { deriveConfidentialSpendingKey, viewingKeyFromSpendingKey } from './keys'
import { executeConfidentialCircuit, generateConfidentialProof, type CompiledCircuit } from './prover'
import { deriveSpendR, encryptAuditorSenderBalance } from './spend-primitives'
import {
  readAuditorKey,
  runConfidentialInvocation,
  type ConfidentialSubmitOptions,
  type ConfidentialSubmitReport,
} from './soroban'

const hex = (value: bigint): string => `0x${value.toString(16)}`

export interface WithdrawProofResult {
  readonly proof: Uint8Array
  readonly cSpendNew: Uint8Array
  readonly sigma: Uint8Array
  readonly bTilde: Uint8Array
  readonly rE: Uint8Array
  readonly bAudS: Uint8Array
  /// New spendable blinding to persist locally after the op lands.
  readonly newR: bigint
}

/**
 * Build a withdraw proof for unshielding `amount` from the spendable balance.
 * Pure compute — replicates every circuit derivation off-circuit so the emitted
 * public outputs match what the verifier checks.
 */
export async function buildWithdrawProof(args: {
  readonly secret: Uint8Array
  readonly addrF: bigint
  readonly amount: bigint
  readonly balance: ConfidentialBalance
  readonly kAudS: GrumpkinAffine
  readonly circuit: CompiledCircuit
}): Promise<WithdrawProofResult> {
  const sk = deriveConfidentialSpendingKey(args.secret)
  const vk = await viewingKeyFromSpendingKey(sk, args.addrF)
  const v = args.balance.spendable.v
  const r = args.balance.spendable.r
  const a = args.amount
  const vNew = v - a
  const sigma = randomSigma()
  const rE = randomGrumpkinScalar()

  const Y = grumpkinScalarMul(sk, GRUMPKIN_GENERATORS.H)
  const cSpend = grumpkinCommit(v, r)
  const rNew = await deriveSpendR(vk, sigma)
  const cSpendNew = grumpkinCommit(vNew, rNew)
  const bTilde = await encryptBalance(vNew, vk, sigma)
  const rEPoint = grumpkinScalarMul(rE, GRUMPKIN_GENERATORS.H)
  const sAS = grumpkinEcdhSharedX(rE, args.kAudS)
  const bAudS = await encryptAuditorSenderBalance(vNew, sAS, sigma)

  const witness = await executeConfidentialCircuit(args.circuit, {
    sk: hex(sk),
    v: hex(v),
    r: hex(r),
    r_e: hex(rE),
    c_spend_x: hex(cSpend.x),
    c_spend_y: hex(cSpend.y),
    y_x: hex(Y.x),
    y_y: hex(Y.y),
    addr_f: hex(args.addrF),
    k_aud_s_x: hex(args.kAudS.x),
    k_aud_s_y: hex(args.kAudS.y),
    a: hex(a),
    c_spend_new_x: hex(cSpendNew.x),
    c_spend_new_y: hex(cSpendNew.y),
    sigma: hex(sigma),
    b_tilde: hex(bTilde),
    r_e_x: hex(rEPoint.x),
    r_e_y: hex(rEPoint.y),
    b_tilde_aud_s: hex(bAudS),
  })
  const proof = await generateConfidentialProof(args.circuit, witness)

  return {
    proof: proof.proof,
    cSpendNew: pointTo64BE(cSpendNew),
    sigma: fieldTo32BE(sigma),
    bTilde: fieldTo32BE(bTilde),
    rE: pointTo64BE(rEPoint),
    bAudS: fieldTo32BE(bAudS),
    newR: rNew,
  }
}

/**
 * Unshield `amount` (underlying base units) of confidential balance to the
 * public `to` address. Generates the proof, submits withdraw(), and on success
 * updates the wallet's tracked spendable balance.
 */
export async function submitConfidentialWithdraw(
  options: ConfidentialSubmitOptions & {
    readonly amount: bigint
    readonly to: string
    readonly circuit: CompiledCircuit
    readonly auditorId?: number
  },
): Promise<ConfidentialSubmitReport> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) {
    return runConfidentialInvocation(options, 'withdraw', (id) => new Contract(id).call('withdraw'))
  }
  const account = options.identity.stellarPublicKey
  const balance = loadConfidentialBalance(options.network, confidential.tokenId, account)
  if (options.amount <= 0n || balance.spendable.v < options.amount) {
    return blocked(options, 'withdraw', ['Amount exceeds your spendable confidential balance. Merge received funds first.'])
  }

  const auditorId = options.auditorId ?? 0
  const kAudKey = await readAuditorKey({ ...options, auditorId })
  if (!kAudKey) {
    return blocked(options, 'withdraw', ['Could not read the auditor key from the registry.'])
  }

  const out = await buildWithdrawProof({
    secret: options.identity.keyDerivationSignature,
    addrF: BigInt(`0x${confidential.addrFHex}`),
    amount: options.amount,
    balance,
    kAudS: pointFrom64BE(kAudKey),
    circuit: options.circuit,
  })

  const report = await runConfidentialInvocation(options, 'withdraw', (id) =>
    new Contract(id).call(
      'withdraw',
      Address.fromString(account).toScVal(),
      Address.fromString(options.to).toScVal(),
      nativeToScVal(options.amount, { type: 'i128' }),
      asScvBytes(out.cSpendNew),
      asScvBytes(out.sigma),
      asScvBytes(out.bTilde),
      asScvBytes(out.rE),
      asScvBytes(out.bAudS),
    ),
  )

  if (report.status === 'submitted') {
    saveConfidentialBalance(
      options.network,
      confidential.tokenId,
      account,
      afterSpend(balance, options.amount, out.newR),
    )
  }
  return report
}

// A blocked report without touching the network, consistent with the runner's shape.
function blocked(
  options: ConfidentialSubmitOptions,
  op: 'withdraw' | 'transfer',
  blockers: readonly string[],
): ConfidentialSubmitReport {
  return {
    status: 'blocked',
    op,
    network: options.network,
    contractId: getConfidentialConfig(options.network)?.tokenId,
    statusEvents: [],
    blockers,
  }
}

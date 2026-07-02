// Confidential-token TRANSFER proof path (design §7.6). Heavy module — import
// lazily. Proves a confidential balance→balance transfer: the sender opens
// C_spend^A, commits the transfer C_tx under a recipient-ECDH blind, re-blinds
// the new spendable, and emits the recipient- and sender-auditor ciphertexts.
//
// The contract rebuilds the 24-field public-input blob from BOTH accounts'
// stored state + both auditor keys, so the witness must use the sender's exact
// tracked (v, r) and the recipient's on-chain PVK_B.

import { Address, Contract } from '@stellar/stellar-sdk'
import { BN254_SCALAR_MODULUS } from '../bytes'
import { getConfidentialConfig } from './../networks'
import {
  afterSpend,
  loadConfidentialBalance,
  saveConfidentialBalance,
  type ConfidentialBalance,
} from './balance-state'
import { encodeTransferPayload } from './contract-data'
import { asScvBytes, fieldTo32BE, pointFrom64BE, pointTo64BE, randomGrumpkinScalar, randomSigma } from './encoding'
import { encryptAmount, encryptBalance } from './encrypt'
import { CONFIDENTIAL_DOMAIN } from './poseidon2'
import { GRUMPKIN_GENERATORS, grumpkinCommit, grumpkinEcdhSharedX, grumpkinScalarMul, type GrumpkinAffine } from './grumpkin'
import { deriveConfidentialSpendingKey, viewingKeyFromSpendingKey } from './keys'
import { executeConfidentialCircuit, generateConfidentialProof, type CompiledCircuit } from './prover'
import { deriveSpendR, deriveTxBlind, spongeSqueeze2 } from './spend-primitives'
import { readAuditorKey, readConfidentialAccount } from './reads'
import {
  runConfidentialInvocation,
  type ConfidentialSubmitOptions,
  type ConfidentialSubmitReport,
} from './soroban'

const hex = (value: bigint): string => `0x${value.toString(16)}`
const mod = (value: bigint): bigint => ((value % BN254_SCALAR_MODULUS) + BN254_SCALAR_MODULUS) % BN254_SCALAR_MODULUS

export interface TransferProofResult {
  readonly proof: Uint8Array
  readonly cSpendNew: Uint8Array
  readonly cTx: Uint8Array
  readonly rE: Uint8Array
  readonly vTilde: Uint8Array
  readonly bTilde: Uint8Array
  readonly sigma: Uint8Array
  readonly vAudR: Uint8Array
  readonly rAudR: Uint8Array
  readonly vAudS: Uint8Array
  readonly bAudS: Uint8Array
  readonly newR: bigint
}

/** Build a confidential-transfer proof. Pure compute (replicates §7.6 off-circuit). */
export async function buildTransferProof(args: {
  readonly secret: Uint8Array
  readonly addrF: bigint
  readonly amount: bigint
  readonly balance: ConfidentialBalance
  readonly pvkB: GrumpkinAffine
  readonly kAudR: GrumpkinAffine
  readonly kAudS: GrumpkinAffine
  readonly circuit: CompiledCircuit
}): Promise<TransferProofResult> {
  const sk = deriveConfidentialSpendingKey(args.secret)
  const vk = await viewingKeyFromSpendingKey(sk, args.addrF)
  const v = args.balance.spendable.v
  const r = args.balance.spendable.r
  const vTx = args.amount
  const vNew = v - vTx
  const sigma = randomSigma()
  const rE = randomGrumpkinScalar()

  const Y = grumpkinScalarMul(sk, GRUMPKIN_GENERATORS.H)
  const cSpend = grumpkinCommit(v, r)
  const rEPoint = grumpkinScalarMul(rE, GRUMPKIN_GENERATORS.H)

  // Recipient channel: ECDH blind for C_tx + encrypted amount.
  const sx = grumpkinEcdhSharedX(rE, args.pvkB)
  const rTx = await deriveTxBlind(sx, sigma)
  const cTx = grumpkinCommit(vTx, rTx)
  const vTilde = await encryptAmount(vTx, sx, sigma)

  // Sender's new spendable.
  const rNew = await deriveSpendR(vk, sigma)
  const cSpendNew = grumpkinCommit(vNew, rNew)
  const bTilde = await encryptBalance(vNew, vk, sigma)

  // Auditor channels (two-squeeze sponge per side).
  const sAR = grumpkinEcdhSharedX(rE, args.kAudR)
  const [mr0, mr1] = await spongeSqueeze2(CONFIDENTIAL_DOMAIN.AUDITOR_RECIPIENT, sAR, sigma)
  const vAudR = mod(vTx + mr0)
  const rAudR = mod(rTx + mr1)
  const sAS = grumpkinEcdhSharedX(rE, args.kAudS)
  const [ms0, ms1] = await spongeSqueeze2(CONFIDENTIAL_DOMAIN.AUDITOR_SENDER, sAS, sigma)
  const vAudS = mod(vTx + ms0)
  const bAudS = mod(vNew + ms1)

  const witness = await executeConfidentialCircuit(args.circuit, {
    sk: hex(sk),
    v: hex(v),
    r: hex(r),
    v_tx: hex(vTx),
    r_e: hex(rE),
    c_spend_x: hex(cSpend.x),
    c_spend_y: hex(cSpend.y),
    y_x: hex(Y.x),
    y_y: hex(Y.y),
    pvk_b_x: hex(args.pvkB.x),
    pvk_b_y: hex(args.pvkB.y),
    addr_f: hex(args.addrF),
    k_aud_r_x: hex(args.kAudR.x),
    k_aud_r_y: hex(args.kAudR.y),
    k_aud_s_x: hex(args.kAudS.x),
    k_aud_s_y: hex(args.kAudS.y),
    c_spend_new_x: hex(cSpendNew.x),
    c_spend_new_y: hex(cSpendNew.y),
    c_tx_x: hex(cTx.x),
    c_tx_y: hex(cTx.y),
    r_e_x: hex(rEPoint.x),
    r_e_y: hex(rEPoint.y),
    v_tilde: hex(vTilde),
    b_tilde: hex(bTilde),
    sigma: hex(sigma),
    v_tilde_aud_r: hex(vAudR),
    r_tilde_aud_r: hex(rAudR),
    v_tilde_aud_s: hex(vAudS),
    b_tilde_aud_s: hex(bAudS),
  })
  const proof = await generateConfidentialProof(args.circuit, witness)

  return {
    proof: proof.proof,
    cSpendNew: pointTo64BE(cSpendNew),
    cTx: pointTo64BE(cTx),
    rE: pointTo64BE(rEPoint),
    vTilde: fieldTo32BE(vTilde),
    bTilde: fieldTo32BE(bTilde),
    sigma: fieldTo32BE(sigma),
    vAudR: fieldTo32BE(vAudR),
    rAudR: fieldTo32BE(rAudR),
    vAudS: fieldTo32BE(vAudS),
    bAudS: fieldTo32BE(bAudS),
    newR: rNew,
  }
}

/**
 * Send a confidential transfer of `amount` to a registered `to` account. The
 * recipient credit lands in their receiving balance (they merge to spend it).
 */
export async function submitConfidentialTransfer(
  options: ConfidentialSubmitOptions & {
    readonly amount: bigint
    readonly to: string
    readonly circuit: CompiledCircuit
  },
): Promise<ConfidentialSubmitReport> {
  const confidential = getConfidentialConfig(options.network)
  if (!confidential) {
    return runConfidentialInvocation(options, 'transfer', (id) => new Contract(id).call('transfer'))
  }
  const account = options.identity.stellarPublicKey
  const balance = loadConfidentialBalance(options.network, confidential.tokenId, account)
  if (options.amount <= 0n || balance.spendable.v < options.amount) {
    return blocked(options, ['Amount exceeds your spendable confidential balance. Merge received funds first.'])
  }
  if (options.to === account) {
    return blocked(options, ['Confidential self-transfer is disabled until local receive openings are persisted.'])
  }

  const sender = await readConfidentialAccount({ ...options, account })
  const recipient = await readConfidentialAccount({ ...options, account: options.to })
  if (!sender) {
    return blocked(options, ['This wallet is not registered for confidential tokens.'])
  }
  if (!recipient) {
    return blocked(options, ['Recipient is not registered for confidential tokens.'])
  }
  const [kAudR, kAudS] = await Promise.all([
    readAuditorKey({ ...options, auditorId: recipient.auditorId }),
    readAuditorKey({ ...options, auditorId: sender.auditorId }),
  ])
  if (!kAudR || !kAudS) {
    return blocked(options, ['Could not read an auditor key from the registry.'])
  }

  const out = await buildTransferProof({
    secret: options.identity.keyDerivationSignature,
    addrF: BigInt(`0x${confidential.addrFHex}`),
    amount: options.amount,
    balance,
    pvkB: pointFrom64BE(recipient.viewingPublicKey),
    kAudR: pointFrom64BE(kAudR),
    kAudS: pointFrom64BE(kAudS),
    circuit: options.circuit,
  })

  const report = await runConfidentialInvocation(options, 'transfer', (id) =>
    buildConfidentialTransferCall(id, account, options.to, out),
  )

  if (report.status === 'submitted') {
    try {
      saveConfidentialBalance(
        options.network,
        confidential.tokenId,
        account,
        afterSpend(balance, options.amount, out.newR),
      )
    } catch (error) {
      return withLocalPersistenceWarning(report, error)
    }
  }
  return report
}

export function buildConfidentialTransferCall(
  contractId: string,
  account: string,
  to: string,
  out: TransferProofResult,
): ReturnType<Contract['call']> {
  const payload = encodeTransferPayload({
    bAudS: out.bAudS,
    bTilde: out.bTilde,
    cSpendNew: out.cSpendNew,
    cTx: out.cTx,
    rAudR: out.rAudR,
    rE: out.rE,
    sigma: out.sigma,
    vAudR: out.vAudR,
    vAudS: out.vAudS,
    vTilde: out.vTilde,
  })
  return new Contract(contractId).call(
    'transfer',
    Address.fromString(account).toScVal(),
    Address.fromString(to).toScVal(),
    payload,
    asScvBytes(out.proof),
  )
}

function blocked(options: ConfidentialSubmitOptions, blockers: readonly string[]): ConfidentialSubmitReport {
  return {
    status: 'blocked',
    op: 'transfer',
    network: options.network,
    contractId: getConfidentialConfig(options.network)?.tokenId,
    statusEvents: [],
    blockers,
  }
}

function withLocalPersistenceWarning(
  report: ConfidentialSubmitReport,
  error: unknown,
): ConfidentialSubmitReport {
  const message = error instanceof Error ? error.message : String(error)
  return {
    ...report,
    blockers: [...report.blockers, `Transaction confirmed, but local confidential balance was not saved: ${message}`],
    error: report.error ?? message,
  }
}

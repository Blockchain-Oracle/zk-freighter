// Confidential-token (Track B) actions for the extension offscreen document.
// Mirrors offscreen-private-actions.ts: the offscreen receives the unlocked
// mnemonic + params, derives the identity, and runs the core confidential op.
// Proof-gated ops (register/withdraw/transfer) load bb.js + the compiled circuit
// here — the offscreen page carries the `'wasm-unsafe-eval'` CSP that allows it,
// and survives popup close while a proof generates.

import {
  deriveWalletIdentity,
  submitConfidentialDeposit,
  submitConfidentialMerge,
  type NetworkKey,
} from '@zk-fighter/core'
import { scanConfidentialIncoming } from '@zk-fighter/core/confidential/receive'
import { submitConfidentialRegister } from '@zk-fighter/core/confidential/register'
import { submitConfidentialTransfer } from '@zk-fighter/core/confidential/transfer'
import { submitConfidentialWithdraw } from '@zk-fighter/core/confidential/withdraw'

// The compiled circuit is just bytecode + abi JSON; keep a loose shape here so we
// don't pull the heavy prover types into this light dispatch module.
type CompiledCircuitJson = { readonly bytecode: string; readonly abi?: unknown }

interface ConfidentialBase {
  readonly mnemonic: string
  readonly network: NetworkKey
}

function base(payload: { readonly [key: string]: unknown }): ConfidentialBase {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  if (!mnemonic) throw new Error('Missing extension wallet mnemonic.')
  const network = payload.network === 'testnet' || payload.network === 'mainnet' ? payload.network : null
  if (!network) throw new Error('Unsupported confidential network.')
  return { mnemonic, network }
}

function amountOf(payload: { readonly [key: string]: unknown }): bigint {
  const value = typeof payload.amount === 'string' ? BigInt(payload.amount) : 0n
  if (value <= 0n) throw new Error('Confidential amount must be greater than zero.')
  return value
}

function recipientOf(payload: { readonly [key: string]: unknown }): string {
  const to = typeof payload.to === 'string' ? payload.to.trim() : ''
  if (!/^G[A-Z2-7]{55}$/.test(to)) throw new Error('Invalid recipient Stellar address.')
  return to
}

// Offscreen runs at the extension origin; circuits are bundled under /circuits.
async function loadCircuit(name: string): Promise<CompiledCircuitJson> {
  const response = await fetch(`/circuits/${name}.json`)
  if (!response.ok) throw new Error(`Failed to load ${name} circuit (${response.status}).`)
  return (await response.json()) as CompiledCircuitJson
}

export async function runConfidentialDeposit(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  return submitConfidentialDeposit({ identity: deriveWalletIdentity(mnemonic, network), network, amount: amountOf(payload) })
}

export async function runConfidentialMerge(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  return submitConfidentialMerge({ identity: deriveWalletIdentity(mnemonic, network), network })
}

export async function runConfidentialScan(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  const result = await scanConfidentialIncoming({ identity: deriveWalletIdentity(mnemonic, network), network })
  // bigint isn't structured-clone friendly across the message boundary — stringify.
  return { count: result.receipts.length, creditedTotal: result.creditedTotal.toString() }
}

export async function runConfidentialRegister(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  return submitConfidentialRegister({ identity: deriveWalletIdentity(mnemonic, network), network, circuit: await loadCircuit('circuit_register') })
}

export async function runConfidentialWithdraw(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  return submitConfidentialWithdraw({ identity: deriveWalletIdentity(mnemonic, network), network, amount: amountOf(payload), to: recipientOf(payload), circuit: await loadCircuit('circuit_withdraw') })
}

export async function runConfidentialTransfer(payload: { readonly [key: string]: unknown }) {
  const { mnemonic, network } = base(payload)
  return submitConfidentialTransfer({ identity: deriveWalletIdentity(mnemonic, network), network, amount: amountOf(payload), to: recipientOf(payload), circuit: await loadCircuit('circuit_transfer') })
}

/** Single offscreen entry point: dispatch a confidential op by its `op` discriminator. */
export async function runConfidentialOp(payload: { readonly [key: string]: unknown }) {
  switch (payload.op) {
    case 'register':
      return runConfidentialRegister(payload)
    case 'deposit':
      return runConfidentialDeposit(payload)
    case 'merge':
      return runConfidentialMerge(payload)
    case 'withdraw':
      return runConfidentialWithdraw(payload)
    case 'transfer':
      return runConfidentialTransfer(payload)
    case 'scan':
      return runConfidentialScan(payload)
    default:
      throw new Error(`Unknown confidential op: ${String(payload.op)}`)
  }
}

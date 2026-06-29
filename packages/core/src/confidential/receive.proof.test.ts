import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeTransferCiphertext, decryptIncomingTransfer } from './receive'
import { grumpkinCommit } from './grumpkin'
import { deriveConfidentialAccount } from './keys'
import { pointFrom64BE } from './encoding'
import { GRUMPKIN_GENERATORS } from './grumpkin'
import { type CompiledCircuit } from './prover'
import { buildTransferProof } from './transfer'

const PROOF_TIMEOUT_MS = 120_000

function loadCircuit(name: string): CompiledCircuit {
  const path = fileURLToPath(new URL(`../../../../circuits/target/${name}.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as CompiledCircuit
}

describe('confidential receive (incoming transfer decryption)', () => {
  it(
    'recipient recovers the exact amount + a blinding that opens C_tx',
    async () => {
      const circuit = loadCircuit('circuit_transfer')
      const addrF = 0x1234n
      const recipientSecret = new Uint8Array(32).fill(5)
      const recipient = await deriveConfidentialAccount(recipientSecret, addrF)
      const amount = 4_2500000n // 4.25 USDC

      // Sender builds a transfer to the recipient's PVK_B.
      const out = await buildTransferProof({
        secret: new Uint8Array(32).fill(9),
        addrF,
        amount,
        balance: { spendable: { v: 1_000_0000000n, r: 0n }, receiving: { v: 0n, r: 0n } },
        pvkB: recipient.PVK,
        kAudR: GRUMPKIN_GENERATORS.H,
        kAudS: GRUMPKIN_GENERATORS.H,
        circuit,
      })

      // Recipient decrypts from the emitted (R_e, v_tilde, sigma).
      const ct = decodeTransferCiphertext(out.rE, out.vTilde, out.sigma)
      const incoming = await decryptIncomingTransfer({ secret: recipientSecret, addrF, ...ct })

      expect(incoming.amount).toBe(amount)
      // The recovered (amount, rTx) must open the on-chain transfer commitment C_tx.
      const reopened = grumpkinCommit(incoming.amount, incoming.rTx)
      expect(reopened).toEqual(pointFrom64BE(out.cTx))
    },
    PROOF_TIMEOUT_MS,
  )

  it('a wrong viewing key recovers garbage, not the amount', async () => {
    const circuit = loadCircuit('circuit_transfer')
    const addrF = 0x1234n
    const recipient = await deriveConfidentialAccount(new Uint8Array(32).fill(5), addrF)
    const out = await buildTransferProof({
      secret: new Uint8Array(32).fill(9),
      addrF,
      amount: 7_0000000n,
      balance: { spendable: { v: 1_000_0000000n, r: 0n }, receiving: { v: 0n, r: 0n } },
      pvkB: recipient.PVK,
      kAudR: GRUMPKIN_GENERATORS.H,
      kAudS: GRUMPKIN_GENERATORS.H,
      circuit,
    })
    const ct = decodeTransferCiphertext(out.rE, out.vTilde, out.sigma)
    const wrong = await decryptIncomingTransfer({ secret: new Uint8Array(32).fill(123), addrF, ...ct })
    expect(wrong.amount).not.toBe(7_0000000n)
  }, PROOF_TIMEOUT_MS)
})

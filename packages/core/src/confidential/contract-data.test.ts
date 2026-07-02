import { xdr } from '@stellar/stellar-sdk'
import { describe, expect, it } from 'vitest'
import { encodeTransferPayload } from './contract-data'
import { buildConfidentialTransferCall } from './transfer'
import { buildConfidentialWithdrawCall } from './withdraw'

const bytes = (length: number, fill: number): Uint8Array => new Uint8Array(length).fill(fill)
const contractId = 'CBNL4THDSDDZ5OWPVLJPDBQGQ4FDH6LHBBFUBPRDNLUCIV2LKCHEVJ4F'
const account = 'GAXTHF3KXUL7IEV2RLNBMNDJ5ANFGD6ZJCBI7WZN4FWDYMW4DUIJRAX6'

function parseMap(value: xdr.ScVal): Map<string, xdr.ScVal> {
  const entries = value.map()
  if (!entries) throw new Error('expected scvMap')
  return new Map(entries.map((entry) => [entry.key().sym().toString(), entry.val()]))
}

function invokeContractArgs(op: ReturnType<typeof buildConfidentialTransferCall>): {
  readonly name: string
  readonly args: readonly xdr.ScVal[]
} {
  const invoke = op.body().invokeHostFunctionOp().hostFunction().invokeContract()
  return { name: invoke.functionName().toString(), args: invoke.args() }
}

describe('confidential contract data encoding', () => {
  it('encodes the deployed transfer payload fields', () => {
    const payload = encodeTransferPayload({
      cSpendNew: bytes(64, 1),
      cTx: bytes(64, 2),
      rE: bytes(64, 3),
      vTilde: bytes(32, 4),
      bTilde: bytes(32, 5),
      sigma: bytes(32, 6),
      vAudR: bytes(32, 7),
      rAudR: bytes(32, 8),
      vAudS: bytes(32, 9),
      bAudS: bytes(32, 10),
    })
    const fields = parseMap(payload)

    expect([...fields.keys()]).toEqual([
      'b_aud_s',
      'b_tilde',
      'c_spend_new',
      'c_tx',
      'r_aud_r',
      'r_e',
      'sigma',
      'v_aud_r',
      'v_aud_s',
      'v_tilde',
    ])
    expect(fields.get('c_tx')?.bytes().length).toBe(64)
    expect(fields.get('b_tilde')?.bytes().length).toBe(32)
  })

  it('rejects invalid point and field sizes before building Soroban args', () => {
    expect(() =>
      encodeTransferPayload({
        cSpendNew: bytes(63, 1),
        cTx: bytes(64, 2),
        rE: bytes(64, 3),
        vTilde: bytes(32, 4),
        bTilde: bytes(32, 5),
        sigma: bytes(32, 6),
        vAudR: bytes(32, 7),
        rAudR: bytes(32, 8),
        vAudS: bytes(32, 9),
        bAudS: bytes(32, 10),
      }),
    ).toThrow('c_spend_new must be 64 bytes')
    expect(() =>
      encodeTransferPayload({
        cSpendNew: bytes(64, 1),
        cTx: bytes(64, 2),
        rE: bytes(64, 3),
        vTilde: bytes(32, 4),
        bTilde: bytes(31, 5),
        sigma: bytes(32, 6),
        vAudR: bytes(32, 7),
        rAudR: bytes(32, 8),
        vAudS: bytes(32, 9),
        bAudS: bytes(32, 10),
      }),
    ).toThrow('b_tilde must be 32 bytes')
  })

  it('builds withdraw with the live contract argument count and final proof', () => {
    const op = buildConfidentialWithdrawCall(contractId, account, account, 1n, {
      cSpendNew: bytes(64, 1),
      sigma: bytes(32, 2),
      bTilde: bytes(32, 3),
      rE: bytes(64, 4),
      bAudS: bytes(32, 5),
      proof: bytes(7, 6),
      newR: 9n,
    })
    const { name, args } = invokeContractArgs(op)

    expect(name).toBe('withdraw')
    expect(args.length).toBe(9)
    expect(args.at(-1)?.bytes().length).toBe(7)
  })

  it('builds transfer with the live contract payload plus final proof', () => {
    const op = buildConfidentialTransferCall(contractId, account, account, {
      cSpendNew: bytes(64, 1),
      cTx: bytes(64, 2),
      rE: bytes(64, 3),
      vTilde: bytes(32, 4),
      bTilde: bytes(32, 5),
      sigma: bytes(32, 6),
      vAudR: bytes(32, 7),
      rAudR: bytes(32, 8),
      vAudS: bytes(32, 9),
      bAudS: bytes(32, 10),
      proof: bytes(11, 11),
      newR: 12n,
    })
    const { name, args } = invokeContractArgs(op)

    expect(name).toBe('transfer')
    expect(args.length).toBe(4)
    expect([...parseMap(args[2]).keys()]).toContain('c_spend_new')
    expect(args.at(-1)?.bytes().length).toBe(11)
  })
})

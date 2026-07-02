import { xdr } from '@stellar/stellar-sdk'

const FIELD_BYTES = 32
const POINT_BYTES = 64

type EntryValue = xdr.ScVal

function assertLength(name: string, bytes: Uint8Array, length: number): void {
  if (bytes.length !== length) {
    throw new Error(`${name} must be ${length} bytes`)
  }
}

function bytesValue(bytes: Uint8Array): xdr.ScVal {
  return xdr.ScVal.scvBytes(bytes as Parameters<typeof xdr.ScVal.scvBytes>[0])
}

function fieldValue(name: string, bytes: Uint8Array): xdr.ScVal {
  assertLength(name, bytes, FIELD_BYTES)
  return bytesValue(bytes)
}

function pointValue(name: string, bytes: Uint8Array): xdr.ScVal {
  assertLength(name, bytes, POINT_BYTES)
  return bytesValue(bytes)
}

function structValue(fields: Record<string, EntryValue>): xdr.ScVal {
  return xdr.ScVal.scvMap(
    Object.keys(fields)
      .sort()
      .map((name) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(name), val: fields[name] })),
  )
}

export function encodeTransferPayload(args: {
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
}): xdr.ScVal {
  return structValue({
    b_aud_s: fieldValue('b_aud_s', args.bAudS),
    b_tilde: fieldValue('b_tilde', args.bTilde),
    c_spend_new: pointValue('c_spend_new', args.cSpendNew),
    c_tx: pointValue('c_tx', args.cTx),
    r_aud_r: fieldValue('r_aud_r', args.rAudR),
    r_e: pointValue('r_e', args.rE),
    sigma: fieldValue('sigma', args.sigma),
    v_aud_r: fieldValue('v_aud_r', args.vAudR),
    v_aud_s: fieldValue('v_aud_s', args.vAudS),
    v_tilde: fieldValue('v_tilde', args.vTilde),
  })
}

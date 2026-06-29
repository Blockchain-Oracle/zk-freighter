import { describe, expect, it } from 'vitest'
import {
  ZERO_BALANCE,
  afterDeposit,
  afterMerge,
  afterReceive,
  afterSpend,
  deserializeBalance,
  loadConfidentialBalance,
  saveConfidentialBalance,
  serializeBalance,
} from './balance-state'

const zeroR = { v: 0n, r: 0n }

describe('confidential balance bookkeeping', () => {
  it('deposit accumulates into receiving, merge folds into spendable (r preserved)', () => {
    let b = ZERO_BALANCE
    b = afterDeposit(b, 250n)
    b = afterDeposit(b, 100n)
    expect(b.receiving).toEqual({ v: 350n, r: 0n })
    expect(b.spendable).toEqual(zeroR)
    b = afterMerge(b)
    expect(b).toEqual({ spendable: { v: 350n, r: 0n }, receiving: zeroR })
  })

  it('an incoming transfer adds {v,r}; merge sums both value and blinding', () => {
    let b = { spendable: { v: 100n, r: 5n }, receiving: zeroR }
    b = afterReceive(b, 40n, 7n)
    b = afterReceive(b, 10n, 3n)
    expect(b.receiving).toEqual({ v: 50n, r: 10n })
    b = afterMerge(b)
    expect(b.spendable).toEqual({ v: 150n, r: 15n }) // 5 + (7+3)
  })

  it('spend reduces v and re-blinds; later merge keeps the new r', () => {
    let b = { spendable: { v: 350n, r: 0n }, receiving: zeroR }
    b = afterSpend(b, 100n, 0xabcn)
    expect(b.spendable).toEqual({ v: 250n, r: 0xabcn })
    b = afterDeposit(b, 50n)
    b = afterMerge(b)
    expect(b.spendable).toEqual({ v: 300n, r: 0xabcn }) // deposit r=0, so merge keeps r
  })

  it('round-trips through serialization, and migrates the v1 receivingV format', () => {
    const b = { spendable: { v: 12345678901234567890n, r: 0xdeadbeefn }, receiving: { v: 7n, r: 9n } }
    expect(deserializeBalance(serializeBalance(b))).toEqual(b)
    const v1 = JSON.stringify({ spendable: { v: '5', r: '0' }, receivingV: '3' })
    expect(deserializeBalance(v1)).toEqual({ spendable: { v: 5n, r: 0n }, receiving: { v: 3n, r: 0n } })
  })

  it('persists + reloads via an injected store, defaulting to zero', () => {
    const map = new Map<string, string>()
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GACC', store)).toEqual(ZERO_BALANCE)
    const b = { spendable: { v: 9n, r: 1n }, receiving: zeroR }
    saveConfidentialBalance('testnet', 'CTOKEN', 'GACC', b, store)
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GACC', store)).toEqual(b)
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GOTHER', store)).toEqual(ZERO_BALANCE)
  })
})

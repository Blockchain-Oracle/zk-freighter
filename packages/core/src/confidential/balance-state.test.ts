import { describe, expect, it } from 'vitest'
import {
  ZERO_BALANCE,
  afterDeposit,
  afterMerge,
  afterSpend,
  deserializeBalance,
  loadConfidentialBalance,
  saveConfidentialBalance,
  serializeBalance,
} from './balance-state'

describe('confidential balance bookkeeping', () => {
  it('deposit accumulates into receiving, merge folds into spendable (r preserved)', () => {
    let b = ZERO_BALANCE
    b = afterDeposit(b, 250n)
    b = afterDeposit(b, 100n)
    expect(b.receivingV).toBe(350n)
    expect(b.spendable).toEqual({ v: 0n, r: 0n })
    b = afterMerge(b)
    expect(b).toEqual({ spendable: { v: 350n, r: 0n }, receivingV: 0n })
  })

  it('spend reduces v and re-blinds; later merge keeps the new r', () => {
    let b = { spendable: { v: 350n, r: 0n }, receivingV: 0n }
    b = afterSpend(b, 100n, 0xabcn)
    expect(b.spendable).toEqual({ v: 250n, r: 0xabcn })
    b = afterDeposit(b, 50n)
    b = afterMerge(b)
    expect(b.spendable).toEqual({ v: 300n, r: 0xabcn }) // r unchanged by merge
  })

  it('round-trips through serialization (bigints preserved)', () => {
    const b = { spendable: { v: 12345678901234567890n, r: 0xdeadbeefn }, receivingV: 7n }
    expect(deserializeBalance(serializeBalance(b))).toEqual(b)
  })

  it('persists + reloads via an injected store, defaulting to zero', () => {
    const map = new Map<string, string>()
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GACC', store)).toEqual(ZERO_BALANCE)
    saveConfidentialBalance('testnet', 'CTOKEN', 'GACC', { spendable: { v: 9n, r: 1n }, receivingV: 0n }, store)
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GACC', store)).toEqual({ spendable: { v: 9n, r: 1n }, receivingV: 0n })
    // distinct account is isolated
    expect(loadConfidentialBalance('testnet', 'CTOKEN', 'GOTHER', store)).toEqual(ZERO_BALANCE)
  })
})

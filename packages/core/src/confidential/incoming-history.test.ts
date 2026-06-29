import { describe, expect, it } from 'vitest'
import { appendIncomingHistory, loadIncomingHistory } from './incoming-history'
import { loadAddressBook, removeAddressBookEntry, saveAddressBookEntry } from './address-book'

function memStore() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
}

const GA = 'GAY265DT5RHUY7ZDRDI6H556ESFGZNUMWBUMHZXAH664MT7BBU7YTDWE'
const GB = 'GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM'

describe('incoming history', () => {
  it('appends newest-first and dedups by eventId', () => {
    const store = memStore()
    const e1 = { amount: '20000000', ledger: 10, txHash: 'a', eventId: 'ev1' }
    const e2 = { amount: '5000000', ledger: 12, txHash: 'b', eventId: 'ev2' }
    appendIncomingHistory('testnet', 'CTOK', GB, [e1], store)
    const merged = appendIncomingHistory('testnet', 'CTOK', GB, [e2, e1], store) // e1 repeat ignored
    expect(merged.map((entry) => entry.eventId)).toEqual(['ev2', 'ev1'])
    expect(loadIncomingHistory('testnet', 'CTOK', GB, store)).toHaveLength(2)
  })

  it('defaults to empty and is account-scoped', () => {
    const store = memStore()
    expect(loadIncomingHistory('testnet', 'CTOK', GB, store)).toEqual([])
  })
})

describe('address book', () => {
  it('saves, updates by address, and removes — rejecting invalid input', () => {
    const store = memStore()
    saveAddressBookEntry('testnet', 'Alice', GA, store)
    saveAddressBookEntry('testnet', '  ', GB, store) // empty label rejected
    saveAddressBookEntry('testnet', 'Bad', 'not-an-address', store) // invalid rejected
    expect(loadAddressBook('testnet', store).map((entry) => entry.label)).toEqual(['Alice'])
    // update label for the same address (no duplicate)
    const updated = saveAddressBookEntry('testnet', 'Alice (work)', GA, store)
    expect(updated).toHaveLength(1)
    expect(updated[0].label).toBe('Alice (work)')
    expect(removeAddressBookEntry('testnet', GA, store)).toEqual([])
  })
})

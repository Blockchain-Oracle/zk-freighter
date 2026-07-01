import { describe, expect, it } from 'vitest'
import { readWebActivity, recordWebActivity } from './webActivityStore'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('webActivityStore', () => {
  it('filters records by network', () => {
    const storage = new MemoryStorage()
    recordWebActivity({ id: 'test', network: 'testnet', intent: 'send', boundary: 'public', status: 'submitted', txHash: 'abc', ts: 2 }, storage)
    recordWebActivity({ id: 'main', network: 'mainnet', intent: 'shield', boundary: 'public', status: 'blocked', ts: 3 }, storage)

    expect(readWebActivity('testnet', storage).map((record) => record.id)).toEqual(['test'])
    expect(readWebActivity('mainnet', storage).map((record) => record.id)).toEqual(['main'])
  })

  it('updates an existing pending record without changing its timestamp', () => {
    const storage = new MemoryStorage()
    recordWebActivity({ id: 'send-1', network: 'testnet', intent: 'send', boundary: 'shielded', status: 'pending', ts: 10 }, storage)
    recordWebActivity({ id: 'send-1', network: 'testnet', intent: 'send', boundary: 'shielded', status: 'submitted', txHash: 'hash', ts: 99 }, storage)

    expect(readWebActivity('testnet', storage)).toEqual([
      expect.objectContaining({ id: 'send-1', status: 'submitted', txHash: 'hash', ts: 10 }),
    ])
  })
})

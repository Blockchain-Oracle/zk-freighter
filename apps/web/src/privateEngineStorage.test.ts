import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasPrivateEngineStorageResetRequest, requestPrivateEngineStorageReset, resetPrivateEngineStorage } from './privateEngineStorage'

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('private engine OPFS storage reset', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores the reset request outside OPFS', () => {
    const storage = new MemoryStorage()

    requestPrivateEngineStorageReset(storage)

    expect(hasPrivateEngineStorageResetRequest(storage)).toBe(true)
  })

  it('removes OPFS root entries recursively', async () => {
    const removeEntry = vi.fn(async () => undefined)
    const root = {
      async *entries() {
        yield ['sqlite', {}]
        yield ['workers', {}]
      },
      removeEntry,
    }
    vi.stubGlobal('navigator', { storage: { getDirectory: async () => root } })

    const report = await resetPrivateEngineStorage()

    expect(report).toEqual({ ok: true, removedEntries: 2 })
    expect(removeEntry).toHaveBeenCalledWith('sqlite', { recursive: true })
    expect(removeEntry).toHaveBeenCalledWith('workers', { recursive: true })
  })

  it('reports browsers that do not expose OPFS directory cleanup', async () => {
    vi.stubGlobal('navigator', { storage: {} })

    const report = await resetPrivateEngineStorage()

    expect(report.ok).toBe(false)
    expect(report.error).toContain('OPFS')
  })
})

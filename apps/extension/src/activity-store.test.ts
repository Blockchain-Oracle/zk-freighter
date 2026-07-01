import { beforeEach, describe, expect, it, vi } from 'vitest'

const storageState = vi.hoisted(() => ({ values: {} as Record<string, unknown> }))

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key?: string) => (key ? { [key]: storageState.values[key] } : { ...storageState.values })),
        set: vi.fn(async (value: Record<string, unknown>) => {
          Object.assign(storageState.values, value)
        }),
      },
    },
  },
}))

vi.mock('@zk-fighter/core', () => ({
  getNetworkConfig: () => ({ horizonUrl: 'https://horizon.test' }),
}))

import { readActivity, recordActivity, type ActivityRecord } from './activity-store'

const storageKey = 'zkf.activity'

describe('activity store', () => {
  beforeEach(() => {
    for (const key of Object.keys(storageState.values)) delete storageState.values[key]
    vi.unstubAllGlobals()
  })

  it('does not let reconciliation overwrite a newer terminal record', async () => {
    const pending: ActivityRecord = {
      id: 'op-1',
      kind: 'shield',
      status: 'pending',
      boundary: 'public',
      txHash: 'pending-hash',
      network: 'testnet',
      ts: 1,
    }
    storageState.values[storageKey] = [pending]

    let releaseFetch!: () => void
    let markFetchStarted!: () => void
    const fetchStarted = new Promise<void>((resolve) => { markFetchStarted = resolve })
    const fetchReleased = new Promise<void>((resolve) => { releaseFetch = resolve })
    vi.stubGlobal('fetch', vi.fn(async () => {
      markFetchStarted()
      await fetchReleased
      return { ok: true, status: 200, json: async () => ({ successful: false }) }
    }))

    const readPromise = readActivity()
    await fetchStarted
    await recordActivity({ ...pending, status: 'submitted', txHash: 'terminal-hash', ts: 2 })
    releaseFetch()
    const records = await readPromise

    expect(records[0]).toMatchObject({ id: 'op-1', status: 'submitted', txHash: 'terminal-hash' })
    expect((storageState.values[storageKey] as ActivityRecord[])[0]).toMatchObject({
      id: 'op-1',
      status: 'submitted',
      txHash: 'terminal-hash',
    })
  })

  it('filters records to the requested network', async () => {
    storageState.values[storageKey] = [
      {
        id: 'testnet-op',
        kind: 'shield',
        status: 'submitted',
        boundary: 'public',
        network: 'testnet',
        ts: 2,
      },
      {
        id: 'mainnet-op',
        kind: 'shield',
        status: 'submitted',
        boundary: 'public',
        network: 'mainnet',
        ts: 1,
      },
    ]

    await expect(readActivity('testnet')).resolves.toMatchObject([{ id: 'testnet-op' }])
    await expect(readActivity('mainnet')).resolves.toMatchObject([{ id: 'mainnet-op' }])
  })

  it('hides legacy records without a network from normal reads', async () => {
    storageState.values[storageKey] = [
      {
        id: 'legacy-op',
        kind: 'shield',
        status: 'submitted',
        boundary: 'public',
        ts: 1,
      },
    ]

    await expect(readActivity()).resolves.toEqual([])
    await expect(readActivity('testnet')).resolves.toEqual([])
  })
})

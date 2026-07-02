import type { NetworkKey } from './networks'

export type AspAccessStatus = 'submitted' | 'indexed' | 'ready'

export interface AspAccessKey {
  readonly network: NetworkKey
  readonly userAddress: string
  readonly poolContractId?: string
  readonly leafHex: string
}

export interface AspAccessRecord extends AspAccessKey {
  readonly status: AspAccessStatus
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly submittedLedger?: number
  readonly indexedLedger?: number
  readonly leafIndex?: string
  readonly root?: string
  readonly submittedAt: number
  readonly indexedAt?: number
  readonly updatedAt: number
}

export interface AspAccessStore {
  read(key: string): Promise<AspAccessRecord | null>
  write(key: string, record: AspAccessRecord): Promise<void>
}

const keyPrefix = 'zkf:asp-access'
const memoryStore = new Map<string, AspAccessRecord>()

export function aspAccessStorageKey(input: AspAccessKey): string {
  return [
    keyPrefix,
    input.network,
    input.poolContractId ?? 'no-pool',
    input.userAddress,
    input.leafHex.toLowerCase(),
  ].join(':')
}

export async function readAspAccessRecord(
  input: AspAccessKey,
  store: AspAccessStore = defaultAspAccessStore(),
): Promise<AspAccessRecord | null> {
  return store.read(aspAccessStorageKey(input))
}

export async function writeAspAccessRecord(
  record: AspAccessRecord,
  store: AspAccessStore = defaultAspAccessStore(),
): Promise<void> {
  await store.write(aspAccessStorageKey(record), record)
}

export function makeMemoryAspAccessStore(): AspAccessStore {
  const records = new Map<string, AspAccessRecord>()
  return {
    async read(key) {
      return records.get(key) ?? null
    },
    async write(key, record) {
      records.set(key, record)
    },
  }
}

function defaultAspAccessStore(): AspAccessStore {
  const storage = safeLocalStorage()
  if (!storage) {
    return {
      async read(key) {
        return memoryStore.get(key) ?? null
      },
      async write(key, record) {
        memoryStore.set(key, record)
      },
    }
  }

  return {
    async read(key) {
      const value = storage.getItem(key)
      if (!value) return null
      return parseRecord(value)
    },
    async write(key, record) {
      storage.setItem(key, JSON.stringify(record))
    },
  }
}

function safeLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    if (
      storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function'
    ) {
      return storage
    }
    return null
  } catch {
    return null
  }
}

function parseRecord(value: string): AspAccessRecord | null {
  try {
    const parsed = JSON.parse(value) as Partial<AspAccessRecord>
    if (
      (parsed.status !== 'submitted' && parsed.status !== 'indexed' && parsed.status !== 'ready') ||
      typeof parsed.network !== 'string' ||
      typeof parsed.userAddress !== 'string' ||
      typeof parsed.leafHex !== 'string' ||
      typeof parsed.submittedAt !== 'number' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null
    }
    return parsed as AspAccessRecord
  } catch {
    return null
  }
}

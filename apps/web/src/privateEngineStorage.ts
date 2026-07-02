const resetRequestKey = 'zk-freighter:private-engine-reset-request:v1'

type DirectoryEntry = readonly [string, unknown]

interface OpfsDirectoryHandle {
  entries?: () => AsyncIterable<DirectoryEntry>
  keys?: () => AsyncIterable<string>
  removeEntry?: (name: string, options?: { readonly recursive?: boolean }) => Promise<void>
}

interface StorageManagerWithDirectory {
  getDirectory?: () => Promise<OpfsDirectoryHandle>
}

export interface PrivateEngineStorageResetReport {
  readonly ok: boolean
  readonly removedEntries: number
  readonly error?: string
}

export function requestPrivateEngineStorageReset(storage: Storage = window.localStorage): void {
  storage.setItem(resetRequestKey, String(Date.now()))
}

export function hasPrivateEngineStorageResetRequest(storage: Storage = window.localStorage): boolean {
  return storage.getItem(resetRequestKey) !== null
}

export function clearPrivateEngineStorageResetRequest(storage: Storage = window.localStorage): void {
  storage.removeItem(resetRequestKey)
}

export async function resetPrivateEngineStorage(): Promise<PrivateEngineStorageResetReport> {
  try {
    const storage = globalThis.navigator?.storage as unknown as StorageManagerWithDirectory | undefined
    if (typeof storage?.getDirectory !== 'function') {
      return {
        ok: false,
        removedEntries: 0,
        error: 'This browser does not expose OPFS cleanup APIs.',
      }
    }

    const root = await storage.getDirectory()
    if (typeof root.removeEntry !== 'function') {
      return {
        ok: false,
        removedEntries: 0,
        error: 'This browser cannot remove OPFS entries from the page.',
      }
    }

    const names = await rootEntryNames(root)
    let removedEntries = 0
    for (const name of names) {
      await root.removeEntry(name, { recursive: true })
      removedEntries += 1
    }
    return { ok: true, removedEntries }
  } catch (error) {
    return {
      ok: false,
      removedEntries: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function runPendingPrivateEngineStorageReset(): Promise<PrivateEngineStorageResetReport | null> {
  if (!hasPrivateEngineStorageResetRequest()) return null
  const report = await resetPrivateEngineStorage()
  clearPrivateEngineStorageResetRequest()
  return report
}

async function rootEntryNames(root: OpfsDirectoryHandle): Promise<readonly string[]> {
  if (typeof root.entries === 'function') {
    const names: string[] = []
    for await (const [name] of root.entries()) names.push(name)
    return names
  }
  if (typeof root.keys === 'function') {
    const names: string[] = []
    for await (const name of root.keys()) names.push(name)
    return names
  }
  return []
}

import { browser } from 'wxt/browser'
import type { NetworkKey, PublicDiscoveryPublishReport } from '@zk-fighter/core'

const storagePrefix = 'zkf.discover.publish'

export interface StoredDiscoverPublish {
  readonly network: NetworkKey
  readonly userAddress: string
  readonly report: PublicDiscoveryPublishReport
  readonly savedAt: string
}

export async function readStoredDiscoverPublish(
  network: NetworkKey,
  userAddress: string,
): Promise<StoredDiscoverPublish | null> {
  const key = storageKey(network, userAddress)
  const value = (await browser.storage.local.get(key))[key]
  if (!isStoredDiscoverPublish(value)) return null
  return value
}

export async function writeStoredDiscoverPublish(report: PublicDiscoveryPublishReport): Promise<void> {
  await browser.storage.local.set({
    [storageKey(report.network, report.userAddress)]: {
      network: report.network,
      userAddress: report.userAddress,
      report,
      savedAt: new Date().toISOString(),
    } satisfies StoredDiscoverPublish,
  })
}

function storageKey(network: NetworkKey, userAddress: string): string {
  return `${storagePrefix}.${network}.${userAddress}`
}

function isStoredDiscoverPublish(value: unknown): value is StoredDiscoverPublish {
  return typeof value === 'object' && value !== null && 'network' in value && 'userAddress' in value && 'report' in value
}

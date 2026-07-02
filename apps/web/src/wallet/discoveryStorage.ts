import type { NetworkKey, PublicDiscoveryPublishReport } from '@zk-freighter/core'

const STORAGE_PREFIX = 'zk-freighter:discover-publish:v1'

export function discoveryStorageKey(network: NetworkKey, publicKey: string): string {
  return `${STORAGE_PREFIX}:${network}:${publicKey}`
}

export function readStoredPublish(network: NetworkKey, publicKey: string): PublicDiscoveryPublishReport | null {
  try {
    const value = window.localStorage.getItem(discoveryStorageKey(network, publicKey))
    if (!value) return null
    const parsed = JSON.parse(value) as PublicDiscoveryPublishReport
    return parsed.status === 'submitted' || parsed.status === 'partial' ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredPublish(report: PublicDiscoveryPublishReport): void {
  window.localStorage.setItem(discoveryStorageKey(report.network, report.userAddress), JSON.stringify(report))
}

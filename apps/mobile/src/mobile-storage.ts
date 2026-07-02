import {
  parseEncryptedVault,
  type AssetCode,
  type EncryptedVault,
  type NetworkKey,
  type PublicDiscoveryLookupReport,
  type PublicDiscoveryPublishReport,
  type XlmNotesReport,
} from '@zk-freighter/core'
import type { ThemeName } from '@zk-freighter/ui'

export type MobileRoute =
  | 'home'
  | 'receive'
  | 'activity'
  | 'more'
  | 'settings'
  | 'scan'
  | 'send'
  | 'shield'
  | 'discover'
  | 'disclosure'
  | 'confidential'
  | 'bridge'

export type MobileActivityIntent = 'fund' | 'shield' | 'send' | 'unshield' | 'bridge' | 'discover' | 'disclosure' | 'confidential' | 'confidentialSetup'
export type MobileActivityBoundary = 'public' | 'shielded'
export type MobileActivityStatus = 'pending' | 'submitted' | 'blocked' | 'failed' | 'confirmed'

export interface MobileActivityRecord {
  readonly id: string
  readonly network: NetworkKey
  readonly ownerAddress: string
  readonly intent: MobileActivityIntent
  readonly boundary: MobileActivityBoundary
  readonly status: MobileActivityStatus
  readonly asset?: AssetCode
  readonly amountStroops?: string
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly error?: string
  readonly ts: number
}

export interface MobileShieldedBalanceCache {
  readonly network: NetworkKey
  readonly address: string
  readonly updatedAt: number
  readonly xlm: XlmNotesReport | null
  readonly usdc: XlmNotesReport | null
}

export const vaultStorageKey = 'zk-freighter:mobile:vault:v1'
export const walletPublicKeyStorageKey = 'zk-freighter:mobile:wallet-public-key:v1'
export const networkStorageKey = 'zk-freighter:mobile:network:v1'
const activityStorageKey = 'zk-freighter:mobile:activity:v1'
const balanceCachePrefix = 'zk-freighter:mobile:shielded-balance:'
const discoverStoragePrefix = 'zk-freighter:mobile:discover:v1:'
const bridgeResumeStoragePrefix = 'zk-freighter:mobile:bridge-resume:v1:'
export const themeStorageKey = 'zk-freighter:mobile:theme:v1'
const maxRecords = 120

export function getStoredNetwork(): NetworkKey {
  return localStorage.getItem(networkStorageKey) === 'mainnet' ? 'mainnet' : 'testnet'
}

export function setStoredNetwork(network: NetworkKey): void {
  localStorage.setItem(networkStorageKey, network)
}

export function getStoredTheme(): ThemeName {
  return localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
}

export function setStoredTheme(theme: ThemeName): void {
  localStorage.setItem(themeStorageKey, theme)
}

export function getStoredVault(): EncryptedVault | null {
  const stored = localStorage.getItem(vaultStorageKey)
  if (!stored) return null
  const parsed = parseEncryptedVault(stored)
  return parsed.ok ? parsed.value : null
}

export function getStoredWalletPublicKey(): string | null {
  const stored = localStorage.getItem(walletPublicKeyStorageKey)
  return stored && /^G[A-Z2-7]{55}$/u.test(stored) ? stored : null
}

export function readMobileActivity(network: NetworkKey, ownerAddress: string): readonly MobileActivityRecord[] {
  return readAllActivity().filter((record) => record.network === network && record.ownerAddress === ownerAddress).sort((a, b) => b.ts - a.ts)
}

export function recordMobileActivity(input: Omit<MobileActivityRecord, 'id' | 'ts'> & { readonly id?: string; readonly ts?: number }): MobileActivityRecord {
  const now = input.ts ?? Date.now()
  const record: MobileActivityRecord = { ...input, id: input.id ?? `mobile-${now}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`, ts: now }
  localStorage.setItem(activityStorageKey, JSON.stringify([record, ...readAllActivity().filter((item) => item.id !== record.id)].slice(0, maxRecords)))
  window.dispatchEvent(new Event('zkf:mobile-activity'))
  return record
}

export function updateMobileActivity(id: string, patch: Partial<Omit<MobileActivityRecord, 'id' | 'ts'>>): MobileActivityRecord | null {
  const all = readAllActivity()
  const current = all.find((item) => item.id === id)
  if (!current) return null
  const next: MobileActivityRecord = { ...current, ...patch, ts: Date.now() }
  localStorage.setItem(activityStorageKey, JSON.stringify([next, ...all.filter((item) => item.id !== id)].slice(0, maxRecords)))
  window.dispatchEvent(new Event('zkf:mobile-activity'))
  return next
}

export function readShieldedBalanceCache(network: NetworkKey, address: string): MobileShieldedBalanceCache | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(balanceKey(network, address)) ?? 'null') as MobileShieldedBalanceCache | null
    return parsed?.network === network && parsed.address === address ? parsed : null
  } catch {
    return null
  }
}

export function writeShieldedBalanceCache(cache: MobileShieldedBalanceCache): void {
  localStorage.setItem(balanceKey(cache.network, cache.address), JSON.stringify(cache))
}

export function clearMobilePrivateCache(network: NetworkKey, address: string): void {
  localStorage.removeItem(balanceKey(network, address))
}

export interface MobileDiscoverStatus {
  readonly network: NetworkKey
  readonly ownerAddress: string
  readonly discoverable: boolean
  readonly receiveCode?: string
  readonly publish?: PublicDiscoveryPublishReport
  readonly lookup?: PublicDiscoveryLookupReport
  readonly updatedAt: number
}

export function readMobileDiscoverStatus(network: NetworkKey, ownerAddress: string): MobileDiscoverStatus | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(discoverKey(network, ownerAddress)) ?? 'null') as MobileDiscoverStatus | null
    return parsed?.network === network && parsed.ownerAddress === ownerAddress ? parsed : null
  } catch {
    return null
  }
}

export function writeMobileDiscoverStatus(status: Omit<MobileDiscoverStatus, 'updatedAt'> & { readonly updatedAt?: number }): MobileDiscoverStatus {
  const next: MobileDiscoverStatus = { ...status, updatedAt: status.updatedAt ?? Date.now() }
  localStorage.setItem(discoverKey(status.network, status.ownerAddress), JSON.stringify(next))
  return next
}

export interface MobileBridgeResume {
  readonly network: NetworkKey
  readonly address: string
  readonly sourceKey: string
  readonly burnTxHash?: string
  readonly approveTxHash?: string
  readonly updatedAt: number
}

export function readMobileBridgeResume(network: NetworkKey, address: string, sourceKey: string): MobileBridgeResume | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(bridgeResumeKey(network, address, sourceKey)) ?? 'null') as MobileBridgeResume | null
    return parsed?.network === network && parsed.address === address && parsed.sourceKey === sourceKey ? parsed : null
  } catch {
    return null
  }
}

export function writeMobileBridgeResume(input: Omit<MobileBridgeResume, 'updatedAt'> & { readonly updatedAt?: number }): MobileBridgeResume {
  const next: MobileBridgeResume = { ...input, updatedAt: input.updatedAt ?? Date.now() }
  localStorage.setItem(bridgeResumeKey(input.network, input.address, input.sourceKey), JSON.stringify(next))
  return next
}

function readAllActivity(): readonly MobileActivityRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(activityStorageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isActivityRecord) : []
  } catch {
    return []
  }
}

function isActivityRecord(value: unknown): value is MobileActivityRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<MobileActivityRecord>
  return typeof record.id === 'string'
    && (record.network === 'testnet' || record.network === 'mainnet')
    && typeof record.ownerAddress === 'string'
    && typeof record.intent === 'string'
    && typeof record.boundary === 'string'
    && typeof record.status === 'string'
    && typeof record.ts === 'number'
}

function balanceKey(network: NetworkKey, address: string): string {
  return `${balanceCachePrefix}${network}.${address}`
}

function discoverKey(network: NetworkKey, address: string): string {
  return `${discoverStoragePrefix}${network}.${address}`
}

function bridgeResumeKey(network: NetworkKey, address: string, sourceKey: string): string {
  return `${bridgeResumeStoragePrefix}${network}.${address}.${sourceKey}`
}

import {
  deriveWalletIdentity,
  demoFundingStatus as coreDemoFundingStatus,
  encodeReceiveCode,
  getCctpSource,
  loadEvmBalances,
  privateRuntimeErrorText,
  requestDemoFunding,
  type AssetCode,
  type CctpBridgeReport,
  type CctpSourceKey,
  type ConfidentialSubmitReport,
  type DemoFundingRequestReport,
  type NetworkKey,
} from '@zk-freighter/core'

import { readActivity, recordActivity, type ActivityBoundary, type ActivityKind, type ActivityStatus } from './activity-store'
import { balanceCacheKey, clearAllBalanceCache, isBalanceStale, readBalanceCache, writeBalanceCache } from './balance-cache'
import { serializeDemoFundingRequestReport, serializeDemoFundingStatusReport } from './demo-funding-serialization'
import type { ActivityResponse, BridgeSourceBalancesResponse, DappBalancesResponse, DemoFundingResponse, DiscoverLookupResponse, DiscoverPublishResponse, DiscoverStatusResponse, PrivateActionResponse, QuickShieldResponse } from './dappMessages'
import { readStoredDiscoverPublish, writeStoredDiscoverPublish } from './discover-store'
import type { ExtensionBalancesRunner, ExtensionDiscoverPublishRunner, ExtensionDiscoverRunner, ExtensionPrivateTransferRunner, ExtensionShieldRunner, ExtensionUnshieldRunner } from './dappRuntime-types'
import { identityForMnemonic, readStoredDappWallet } from './dappRuntimeState'

export { autoShieldTickFlow } from './auto-shield-flow'

// Post-gate flow bodies, split out of dappRuntime.ts (<300 lines). The unlock GATE
// stays in the runtime methods that call these — these run only once gated, and the
// unlocked mnemonic is passed in (the security model is unchanged).

export interface FlowReady {
  readonly mnemonic: string
  readonly network: NetworkKey
}

export function toActivityStatus(status: string): ActivityStatus {
  return status === 'submitted' || status === 'partial' || status === 'completed' ? 'submitted' : status === 'blocked' ? 'blocked' : 'failed'
}

/** Append a real op to the persisted activity history (best-effort, never fatal). */
export function recordOp(
  kind: ActivityKind,
  boundary: ActivityBoundary,
  status: ActivityStatus,
  fields: { asset?: string; amountStroops?: string; txHash?: string; explorerUrl?: string; network: NetworkKey },
  id: string = crypto.randomUUID(),
): string {
  void recordActivity({ id, kind, boundary, status, ts: Date.now(), ...fields }).catch((error: unknown) => {
    console.warn('[ExtensionDappRuntime] activity record failed', error)
  })
  return id
}

export async function activityFlow(network?: NetworkKey): Promise<ActivityResponse> {
  return { ok: true, records: await readActivity(network) }
}

export async function quickShieldFlow(ready: FlowReady, runner: ExtensionShieldRunner | undefined, asset: AssetCode, amountStroops?: string, timeoutMs?: number): Promise<QuickShieldResponse> {
  if (!runner) return { ok: false, error: 'Extension offscreen shield runner is unavailable.' }
  const activityId = recordOp('shield', 'public', 'pending', { asset, amountStroops, network: ready.network })
  try {
    const report = await runner({ mnemonic: ready.mnemonic, network: ready.network, asset, amountStroops, timeoutMs })
    recordOp('shield', 'public', toActivityStatus(report.status), { asset, amountStroops: report.amountStroops, txHash: report.txHash, explorerUrl: report.explorerUrl, network: ready.network }, activityId)
    if (report.status === 'submitted') void clearAllBalanceCache()
    return { ok: true, report }
  } catch (error) {
    recordOp('shield', 'public', 'failed', { asset, amountStroops, network: ready.network }, activityId)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function privateTransferFlow(ready: FlowReady, runner: ExtensionPrivateTransferRunner | undefined, asset: AssetCode, amountStroops: string, receiveCode: string, timeoutMs?: number): Promise<PrivateActionResponse> {
  if (!runner) return { ok: false, error: 'Extension private transfer runner is unavailable.' }
  const activityId = recordOp('send', 'shielded', 'pending', { asset, amountStroops, network: ready.network })
  try {
    const report = await runner({ mnemonic: ready.mnemonic, network: ready.network, asset, amountStroops, receiveCode, timeoutMs })
    recordOp('send', 'shielded', toActivityStatus(report.status), { asset, amountStroops, txHash: report.txHashes[0], explorerUrl: report.explorerUrls[0], network: ready.network }, activityId)
    void clearAllBalanceCache()
    return { ok: true, report }
  } catch (error) {
    recordOp('send', 'shielded', 'failed', { asset, amountStroops, network: ready.network }, activityId)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function unshieldFlow(ready: FlowReady, runner: ExtensionUnshieldRunner | undefined, asset: AssetCode, amountStroops: string, recipientAddress: string, timeoutMs?: number): Promise<PrivateActionResponse> {
  if (!runner) return { ok: false, error: 'Extension unshield runner is unavailable.' }
  const activityId = recordOp('unshield', 'public', 'pending', { asset, amountStroops, network: ready.network })
  try {
    const report = await runner({ mnemonic: ready.mnemonic, network: ready.network, asset, amountStroops, recipientAddress, timeoutMs })
    recordOp('unshield', 'public', toActivityStatus(report.status), { asset, amountStroops, txHash: report.txHashes[0], explorerUrl: report.explorerUrls[0], network: ready.network }, activityId)
    void clearAllBalanceCache()
    return { ok: true, report }
  } catch (error) {
    recordOp('unshield', 'public', 'failed', { asset, amountStroops, network: ready.network }, activityId)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function recordBridgeActivity(report: CctpBridgeReport, network: NetworkKey): void {
  void recordOp('bridge', 'public', bridgeStatus(report.status), {
    asset: 'USDC',
    amountStroops: bridgeAmountStroops(report.amountAtomic),
    txHash: report.stellarMintTxHash,
    explorerUrl: report.stellarMintExplorerUrl,
    network,
  })
}

export function recordConfidentialActivity(report: unknown, network: NetworkKey): void {
  if (!isConfidentialReport(report)) return
  void recordOp('confidential', confidentialBoundary(report.op), toActivityStatus(report.status), {
    asset: 'USDC',
    txHash: report.txHash,
    explorerUrl: report.explorerUrl,
    network,
  })
}

export async function discoverFlow(ready: FlowReady, runner: ExtensionDiscoverRunner | undefined, ownerAddress: string): Promise<DiscoverLookupResponse> {
  if (!runner) return { ok: false, error: 'Extension discovery runner is unavailable.' }
  try {
    // Public lookup — no mnemonic needed; the network comes from the unlocked vault.
    return { ok: true, report: await runner({ network: ready.network, ownerAddress }) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function discoverPublishFlow(
  ready: FlowReady,
  runner: ExtensionDiscoverPublishRunner | undefined,
): Promise<DiscoverPublishResponse> {
  if (!runner) return { ok: false, error: 'Extension discovery publish runner is unavailable.' }
  try {
    const report = await runner({ mnemonic: ready.mnemonic, network: ready.network })
    if (report.status === 'submitted' || report.status === 'partial') {
      await writeStoredDiscoverPublish(report)
      recordOp('discover', 'public', toActivityStatus(report.status), {
        txHash: report.pools.find((pool) => pool.txHash)?.txHash,
        explorerUrl: report.pools.find((pool) => pool.explorerUrl)?.explorerUrl,
        network: ready.network,
      })
    }
    return { ok: true, report }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function discoverStatusFlow(ready: FlowReady, runner: ExtensionDiscoverRunner | undefined): Promise<DiscoverStatusResponse> {
  const state = await readStoredDappWallet()
  const identity = identityForMnemonic(ready.mnemonic, state)
  if (!identity) return { ok: false, discoverable: false, error: 'Unlock ZK Freighter to check discovery.' }
  const receiveCode = receiveCodeForIdentity(identity, ready.network)
  const stored = await readStoredDiscoverPublish(ready.network, identity.stellarPublicKey)
  const storedDiscoverable = stored?.report.status === 'submitted' || stored?.report.status === 'partial'
  if (!runner) return { ok: true, discoverable: storedDiscoverable, receiveCode, report: stored?.report }
  try {
    const lookup = await runner({ network: ready.network, ownerAddress: identity.stellarPublicKey })
    return { ok: true, discoverable: lookup.status === 'found', receiveCode: lookup.receiveCode ?? receiveCode, lookup, report: stored?.report }
  } catch (error) {
    return { ok: true, discoverable: storedDiscoverable, receiveCode, report: stored?.report, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function demoFundingStatusFlow(ready: FlowReady): Promise<DemoFundingResponse> {
  const report = await coreDemoFundingStatus({ identity: deriveWalletIdentity(ready.mnemonic, ready.network), network: ready.network })
  return { ok: report.status !== 'failed', report: serializeDemoFundingStatusReport(report), ...(report.status === 'failed' ? { error: report.blockers[0] } : {}) }
}

export async function demoFundingRequestFlow(ready: FlowReady): Promise<DemoFundingResponse> {
  const report = await requestDemoFunding({ identity: deriveWalletIdentity(ready.mnemonic, ready.network), network: ready.network })
  const fundingEvidence = fundingTxEvidence(report)
  if (fundingEvidence) {
    recordOp('fund', 'public', 'submitted', {
      asset: fundingEvidence.asset,
      txHash: fundingEvidence.txHash,
      explorerUrl: fundingEvidence.explorerUrl,
      network: ready.network,
    })
    void clearAllBalanceCache()
  }
  return { ok: report.status !== 'failed', report: serializeDemoFundingRequestReport(report), ...(report.status === 'failed' ? { error: report.blockers[0] } : {}) }
}

export async function bridgeSourceBalancesFlow(ready: FlowReady, sourceChainKey: CctpSourceKey): Promise<BridgeSourceBalancesResponse> {
  const source = getCctpSource(ready.network, sourceChainKey)
  if (!source) return { ok: false, error: `No CCTP source configured for ${sourceChainKey} on ${ready.network}.` }
  try {
    const balances = await loadEvmBalances({
      ['mnemonic']: ready.mnemonic,
      chainIdHex: source.chainIdHex,
      usdcContract: source.usdcContract,
    })
    return {
      ok: true,
      sourceChainKey,
      sourceLabel: source.label,
      gasToken: source.gasToken,
      address: balances.address,
      nativeWei: balances.nativeWei.toString(),
      usdcAtomic: balances.usdcAtomic.toString(),
    }
  } catch (error) {
    return { ok: false, error: privateRuntimeErrorText(error) }
  }
}

/**
 * Real balances with stale-while-revalidate: instant cached read + a background
 * refresh when stale; a cold cache scans synchronously. `getUnlocked` is read LIVE
 * after the async scan so a refresh that finishes post-lock never re-writes the cache.
 */
export async function balancesFlow(
  ready: FlowReady,
  runner: ExtensionBalancesRunner | undefined,
  getUnlocked: () => string | null,
  refreshing: Set<string>,
  syncBeforeRead = false,
): Promise<DappBalancesResponse> {
  if (!runner) return { ok: false, syncing: false, error: 'Extension balance runner is unavailable.' }
  const state = await readStoredDappWallet()
  const identity = identityForMnemonic(ready.mnemonic, state)
  if (!identity) return { ok: false, syncing: false, error: 'Unlock ZK Freighter to view balances.' }
  const key = balanceCacheKey(ready.network, identity.stellarPublicKey)

  const cached = await readBalanceCache(key)
  if (cached && !syncBeforeRead) {
    if (isBalanceStale(cached)) void refreshBalances(runner, key, ready.mnemonic, ready.network, refreshing, getUnlocked)
    return { ok: true, balances: cached, syncing: refreshing.has(key) }
  }
  try {
    const fresh = await runner({ mnemonic: ready.mnemonic, network: ready.network, syncBeforeRead })
    await writeBalanceCache(key, fresh)
    return { ok: true, balances: fresh, syncing: false }
  } catch (error) {
    return { ok: false, syncing: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function refreshBalances(runner: ExtensionBalancesRunner, key: string, mnemonic: string, network: NetworkKey, refreshing: Set<string>, getUnlocked: () => string | null): Promise<void> {
  if (refreshing.has(key)) return
  refreshing.add(key)
  try {
    const fresh = await runner({ mnemonic, network })
    if (getUnlocked() === mnemonic) await writeBalanceCache(key, fresh)
  } catch (error) {
    console.warn('[ExtensionDappRuntime] balance refresh failed', error)
  } finally {
    refreshing.delete(key)
  }
}

function bridgeStatus(status: string): ActivityStatus {
  if (status === 'completed') return 'submitted'
  if (status === 'running') return 'pending'
  return toActivityStatus(status)
}

function bridgeAmountStroops(amountAtomic: string): string | undefined {
  if (!/^[1-9]\d*$/u.test(amountAtomic)) return undefined
  return (BigInt(amountAtomic) * 10n).toString()
}

export function fundingTxEvidence(report: DemoFundingRequestReport): { readonly asset: AssetCode; readonly txHash: string; readonly explorerUrl?: string } | null {
  const hostedAsset = report.hostedFunding?.assets.find((asset) => asset.txHash)
  if (hostedAsset?.txHash) return { asset: hostedAsset.asset, txHash: hostedAsset.txHash, explorerUrl: hostedAsset.explorerUrl }
  if (report.trustline?.txHash) return { asset: 'USDC', txHash: report.trustline.txHash, explorerUrl: report.trustline.explorerUrl }
  if (report.trustline?.friendbotHash) return { asset: 'XLM', txHash: report.trustline.friendbotHash, explorerUrl: report.trustline.explorerUrl }
  return null
}

function confidentialBoundary(op: string): ActivityBoundary {
  return op === 'deposit' || op === 'withdraw' ? 'public' : 'shielded'
}

function isConfidentialReport(value: unknown): value is ConfidentialSubmitReport {
  return typeof value === 'object' && value !== null && 'op' in value && 'status' in value
}

export function receiveCodeForIdentity(identity: NonNullable<ReturnType<typeof identityForMnemonic>>, network: NetworkKey): string {
  return encodeReceiveCode({
    version: 1,
    network,
    notePublicKey: identity.privateReceive.notePublicKey,
    encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
  })
}

import {
  getDefaultCctpSource,
  type CctpBridgeReport,
  type CctpSourceKey,
  type NetworkKey,
  type XlmShieldSubmitReport,
} from '@zk-freighter/core'
import { truncateMiddle } from './app-helpers'
import { bridgeResumeBurnHashFromUrl, bridgeSourceChainFromUrl } from './bridge-handoff'
import { loadBridgeResumeBurnHash, loadBridgeResumeSourceChain } from './bridge-storage'

const fallbackCctpSource: CctpSourceKey = 'base'

export function reportLabel(report: CctpBridgeReport | null): string {
  if (!report) {
    return 'No bridge transaction submitted.'
  }
  if (report.status === 'completed') {
    return `Arrived publicly on Stellar · ${truncateMiddle(report.stellarMintTxHash ?? '', 12, 10)}`
  }
  if (report.status === 'running') {
    return `Running · ${report.statusEvents.at(-1)?.message ?? 'bridge in progress'}`
  }
  return `${report.status} · ${report.blockers[0] ?? 'see details'}`
}

export function shieldLabel(report: XlmShieldSubmitReport | null): string {
  if (!report) {
    return 'Shield step not run.'
  }
  if (report.status === 'submitted') {
    return `Shield submitted · ${truncateMiddle(report.txHash ?? '', 12, 10)}`
  }
  return `${report.status} · ${report.durationMs.toLocaleString()} ms`
}

export function initialBridgeSource(network: NetworkKey, publicKey: string): CctpSourceKey {
  return (
    bridgeSourceChainFromUrl(network, publicKey) ??
    loadBridgeResumeSourceChain(network, publicKey) ??
    getDefaultCctpSource(network)?.key ??
    fallbackCctpSource
  )
}

export function initialBridgeBurnHash(network: NetworkKey, publicKey: string, sourceKey: CctpSourceKey): string {
  return bridgeResumeBurnHashFromUrl(network, publicKey) ?? loadBridgeResumeBurnHash(network, publicKey, sourceKey)
}

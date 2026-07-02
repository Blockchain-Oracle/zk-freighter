import type { AssetCode, NetworkKey, XlmPrivateSubmitReport } from '@zk-freighter/core'
import { recordWebActivity, type WebActivityBoundary, type WebActivityIntent, type WebActivityRecord } from './webActivityStore'

interface FlowActivityArgs {
  readonly network: NetworkKey
  readonly intent: WebActivityIntent
  readonly boundary: WebActivityBoundary
  readonly asset: AssetCode
  readonly amountStroops: string
}

export function recordPendingFlow(args: FlowActivityArgs): WebActivityRecord {
  return recordWebActivity({ ...args, status: 'pending' })
}

export function recordPrivateFlowResult(activity: WebActivityRecord, args: FlowActivityArgs, report: XlmPrivateSubmitReport): void {
  recordWebActivity({
    id: activity.id,
    ...args,
    status: report.status,
    txHash: report.txHashes[0],
    explorerUrl: report.explorerUrls[0],
    error: report.error ?? report.blockers[0],
  })
}

export function recordFlowFailure(activity: WebActivityRecord, args: FlowActivityArgs, error: unknown, fallback: string): void {
  recordWebActivity({
    id: activity.id,
    ...args,
    status: 'failed',
    error: error instanceof Error ? error.message : fallback,
  })
}

import { deriveWalletIdentity, submitPublicStellarPayment, type AssetCode } from '@zk-freighter/core'

import { clearAllBalanceCache } from './balance-cache'
import type { PublicActionResponse } from './dappMessages'
import { recordOp, toActivityStatus, type FlowReady } from './dappRuntime-flows'

export async function publicTransferFlow(
  ready: FlowReady,
  asset: AssetCode,
  amountStroops: string,
  recipientAddress: string,
): Promise<PublicActionResponse> {
  const activityId = recordOp('send', 'public', 'pending', { asset, amountStroops, network: ready.network })
  try {
    const report = await submitPublicStellarPayment({
      identity: deriveWalletIdentity(ready.mnemonic, ready.network),
      network: ready.network,
      asset,
      amountStroops: BigInt(amountStroops),
      recipientAddress,
    })
    recordOp('send', 'public', toActivityStatus(report.status), {
      asset,
      amountStroops,
      txHash: report.txHash,
      explorerUrl: report.explorerUrl,
      network: ready.network,
    }, activityId)
    void clearAllBalanceCache()
    return { ok: report.status !== 'failed', report, ...(report.status === 'failed' ? { error: report.error } : {}) }
  } catch (error) {
    recordOp('send', 'public', 'failed', { asset, amountStroops, network: ready.network }, activityId)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

import type { StellarUsdcTrustlineReport } from '@zk-fighter/core'
import { usdcReceiveLabel } from './usdcReceiveSetupCopy'
import { ExplorerLink } from './BridgeResultDetails'

interface BridgeReceiveSetupStatusProps {
  readonly report: StellarUsdcTrustlineReport | null
}

export function BridgeReceiveSetupStatus({ report }: BridgeReceiveSetupStatusProps) {
  return (
    <div className="bridge-receive-setup">
      <strong>Stellar USDC receiving</strong>
      <span>
        {report
          ? usdcReceiveLabel(report)
          : 'Checked before source-chain approval or burn. If needed, setup is a public Stellar transaction.'}
      </span>
      {report?.explorerUrl ? <ExplorerLink href={report.explorerUrl} label="View USDC setup" /> : null}
    </div>
  )
}

import type { NetworkKey, WalletIdentity } from '@zk-freighter/core'
import { DemoEvidencePanel } from './DemoEvidencePanel'
import { ProofStatusPanel } from './ProofStatusPanel'
import { TamperedProofPanel } from './TamperedProofPanel'

interface WalletFlowPanelsProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

export function WalletFlowPanels({ identity, network }: WalletFlowPanelsProps) {
  return (
    <>
      <ProofStatusPanel identity={identity} network={network} />
      <TamperedProofPanel identity={identity} network={network} />
      <DemoEvidencePanel />
    </>
  )
}

import type { NetworkKey, PasskeyEnvelope, WalletIdentity } from '@zk-fighter/core'
import { BridgePanel } from './BridgePanel'
import { DemoEvidencePanel } from './DemoEvidencePanel'
import { DisclosurePanel } from './DisclosurePanel'
import { PasskeyPanel } from './PasskeyPanel'
import { ProofStatusPanel } from './ProofStatusPanel'
import { PublicDiscoveryPanel } from './PublicDiscoveryPanel'
import { ShieldSubmitPanel } from './ShieldSubmitPanel'
import { TamperedProofPanel } from './TamperedProofPanel'
import { XlmPrivatePanel } from './XlmPrivatePanel'

interface WalletFlowPanelsProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly passkeyEnvelope: PasskeyEnvelope | null
  readonly receiveCode: string
  readonly onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
}

export function WalletFlowPanels({
  identity,
  network,
  passkeyEnvelope,
  receiveCode,
  onPasskeyEnvelopeChange,
}: WalletFlowPanelsProps) {
  return (
    <>
      <PasskeyPanel
        identity={identity}
        passkeyEnvelope={passkeyEnvelope}
        onPasskeyEnvelopeChange={onPasskeyEnvelopeChange}
      />
      <ProofStatusPanel identity={identity} network={network} />
      <PublicDiscoveryPanel identity={identity} network={network} />
      <DisclosurePanel identity={identity} network={network} />
      <BridgePanel key={`${network}:${identity.stellarPublicKey}`} identity={identity} network={network} />
      <ShieldSubmitPanel asset="XLM" identity={identity} network={network} />
      <ShieldSubmitPanel asset="USDC" identity={identity} network={network} />
      <XlmPrivatePanel asset="XLM" identity={identity} network={network} receiveCode={receiveCode} />
      <XlmPrivatePanel asset="USDC" identity={identity} network={network} receiveCode={receiveCode} />
      <TamperedProofPanel identity={identity} network={network} />
      <DemoEvidencePanel />
    </>
  )
}

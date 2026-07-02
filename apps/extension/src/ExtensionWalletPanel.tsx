import { LockKeyhole } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@zk-freighter/ui'

import type { DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'
import { Badge, Caption, GhostButton, MetaRow, Panel, SectionHeader } from './extension-ui'

// Side-panel wallet view. Only rendered when unlocked (locked surfaces are the
// ExtensionAccess cards), so the old import/unlock branches are gone.
interface ExtensionWalletPanelProps {
  readonly status: DappWalletStatus
  readonly lockWallet: () => Promise<void>
  readonly copyPublicKey: () => Promise<void>
  readonly copyReceiveCode: () => Promise<void>
}

export function ExtensionWalletPanel({ status, lockWallet, copyPublicKey, copyReceiveCode }: ExtensionWalletPanelProps) {
  return (
    <Panel label="Wallet">
      <SectionHeader title="Wallet" right={<Badge tone="ready">unlocked</Badge>} />
      {status.error ? <p style={{ margin: 0, fontSize: 11.5, color: 'var(--dng)' }}>{status.error}</p> : null}
      <MetaRow label="NETWORK">{status.network === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet'}</MetaRow>
      <MetaRow label="STELLAR ADDRESS">
        <GhostButton onClick={() => void copyPublicKey()}>{shorten(status.publicKey)} · copy</GhostButton>
      </MetaRow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', paddingTop: 4 }}>
        <Caption>PRIVATE RECEIVE CODE</Caption>
        <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
          <QRCodeSVG value={status.privateReceiveCode} size={128} level="M" marginSize={2} />
        </div>
        <GhostButton onClick={() => void copyReceiveCode()}>{shorten(status.privateReceiveCode, 12, 8)} · copy</GhostButton>
      </div>
      <Button variant="secondary" fullWidth onClick={() => void lockWallet()}>
        <LockKeyhole size={15} aria-hidden="true" /> Lock
      </Button>
    </Panel>
  )
}

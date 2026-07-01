import { Button } from '@zk-fighter/ui'

import type { DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'
import type { ExtensionSheet } from './ExtensionShell'
import type { ExtensionNavigate } from './extension-routes'
import { Badge, Copy, GhostButton, MetaRow, Panel, SectionHeader } from './extension-ui'

export function ExtensionPublicViewScreen({ status, navigate, openSheet }: { status: DappWalletStatus; navigate: ExtensionNavigate; openSheet?: (sheet: ExtensionSheet) => void }) {
  return (
    <Panel label="Public view">
      <SectionHeader title="Public view" right={<Badge tone="progress">boundary</Badge>} />
      <Copy>Public balances, trustlines, bridge arrivals, shield/deposit, and unshield/withdraw actions are visible on-chain.</Copy>
      <MetaRow label="NETWORK">{status.network}</MetaRow>
      <MetaRow label="ADDRESS"><GhostButton onClick={() => void navigator.clipboard.writeText(status.publicKey)}>{shorten(status.publicKey)} · copy</GhostButton></MetaRow>
      <Button fullWidth onClick={() => openSheet ? openSheet('shield') : navigate('home')}>Shield public funds</Button>
      <Button fullWidth variant="secondary" onClick={() => navigate('bridge')}>Bridge USDC</Button>
    </Panel>
  )
}

export function ExtensionSigningDisabledScreen() {
  return (
    <Panel label="Signing disabled">
      <SectionHeader title="Signing disabled" right={<Badge tone="deferred">closed</Badge>} />
      <Copy>ZK Fighter is a shielded wallet surface, not a general public dApp signer. External public-key access and signing requests fail closed.</Copy>
    </Panel>
  )
}

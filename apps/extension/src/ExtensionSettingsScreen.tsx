import { useEffect, useState, type ReactNode } from 'react'
import type { NetworkKey } from '@zk-freighter/core'
import { Button, useTheme } from '@zk-freighter/ui'

import { readAutoShieldSettings, writeAutoShieldSettings } from './auto-shield-settings'
import { dappMessageTypes, type DappWalletStatus, type PrivateEngineResetResponse } from './dappMessages'
import { shorten } from './extension-format'
import { Badge, Caption, Copy, GhostButton, MetaRow, Panel, SectionHeader } from './extension-ui'

interface SettingsProps {
  readonly status: DappWalletStatus
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
  readonly lockWallet: () => Promise<void>
}

export function ExtensionSettingsScreen({ status, sendRuntimeMessage, lockWallet }: SettingsProps) {
  const { theme, setTheme } = useTheme()
  const [busy, setBusy] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [autoShieldOn, setAutoShieldOn] = useState<boolean | null>(null)

  useEffect(() => {
    void readAutoShieldSettings().then((settings) => setAutoShieldOn(settings.enabled))
  }, [])

  async function setAutoShield(enabled: boolean) {
    const current = await readAutoShieldSettings()
    await writeAutoShieldSettings({ ...current, enabled })
    setAutoShieldOn(enabled)
  }

  async function setNetwork(network: NetworkKey) {
    setBusy(`network-${network}`)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.setNetwork, network })
    } finally {
      setBusy('')
    }
  }

  async function resetPrivateEngine() {
    setBusy('private-engine-reset')
    setResetMessage('')
    try {
      const result = (await sendRuntimeMessage({ type: dappMessageTypes.privateEngineReset })) as PrivateEngineResetResponse
      setResetMessage(result.ok ? `Private engine cache reset. Removed ${result.removedEntries} entr${result.removedEntries === 1 ? 'y' : 'ies'}.` : result.error ?? 'Private engine reset failed.')
    } catch (error) {
      setResetMessage(`Private engine reset failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <Panel label="Settings">
      <SectionHeader title="Settings" right={<Badge tone="ready">{status.network}</Badge>} />
      <MetaRow label="ACCOUNT"><GhostButton onClick={() => void navigator.clipboard.writeText(status.publicKey)}>{shorten(status.publicKey)} · copy</GhostButton></MetaRow>
      <MetaRow label="RECEIVE"><GhostButton onClick={() => void navigator.clipboard.writeText(status.privateReceiveCode)}>{shorten(status.privateReceiveCode, 10, 6)} · copy</GhostButton></MetaRow>

      <SettingBlock label="Network">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['testnet', 'mainnet'] as const).map((network) => (
            <ChoiceButton key={network} active={status.network === network} loading={busy === `network-${network}`} onClick={() => void setNetwork(network)}>{network}</ChoiceButton>
          ))}
        </div>
      </SettingBlock>

      <SettingBlock label="Theme">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['dark', 'light'] as const).map((next) => (
            <ChoiceButton key={next} active={theme === next} onClick={() => setTheme(next)}>{next}</ChoiceButton>
          ))}
        </div>
      </SettingBlock>

      <SettingBlock label="Recovery">
        <Copy>Seed phrase recovery is the only recovery path. Keep it offline; ZK Freighter cannot recover it for you.</Copy>
      </SettingBlock>

      <SettingBlock label="Auto-shield">
        <Copy>Each time you open the wallet, move your available public balance into your shielded balance. Requires one manual shield first. Each deposit is public and shields up to 100 at a time. You can turn this off anytime.</Copy>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ChoiceButton active={autoShieldOn === true} loading={autoShieldOn === null} onClick={() => void setAutoShield(true)}>on</ChoiceButton>
          <ChoiceButton active={autoShieldOn === false} loading={autoShieldOn === null} onClick={() => void setAutoShield(false)}>off</ChoiceButton>
        </div>
      </SettingBlock>

      <SettingBlock label="Private engine">
        <Copy>Clears the local private scan cache and restarts the offscreen proof engine. Your vault and seed phrase stay untouched.</Copy>
        <Button variant="secondary" fullWidth loading={busy === 'private-engine-reset'} onClick={() => void resetPrivateEngine()}>Reset private engine cache</Button>
        {resetMessage ? <Copy>{resetMessage}</Copy> : null}
      </SettingBlock>

      <Button variant="danger" fullWidth onClick={() => void lockWallet()}>Lock wallet</Button>
    </Panel>
  )
}

function SettingBlock({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
      <Caption>{label.toUpperCase()}</Caption>
      {children}
    </div>
  )
}

function ChoiceButton({ active, loading, onClick, children }: { readonly active: boolean; readonly loading?: boolean; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button type="button" disabled={loading} onClick={onClick} style={{ border: `1px solid ${active ? 'var(--ac2)' : 'var(--bd)'}`, borderRadius: 11, background: active ? 'rgba(94,124,250,.14)' : 'var(--card)', color: active ? 'var(--tx)' : 'var(--tx3)', padding: '8px 10px', font: '800 9px/1 var(--fm)', letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
      {loading ? 'saving' : children}
    </button>
  )
}

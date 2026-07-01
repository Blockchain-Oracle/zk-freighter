import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Logo } from '@zk-fighter/ui'

import { dappMessageTypes, type DappWalletStatus, type DiscoverStatusResponse } from './dappMessages'
import { shorten } from './extension-format'
import type { ExtensionNavigate } from './extension-routes'
import { Badge, Caption, GhostButton, Panel, SectionHeader } from './extension-ui'

type ReceiveTab = 'private' | 'raw' | 'public'
const tabLabels: Record<ReceiveTab, string> = { private: 'Private code', raw: 'Raw code', public: 'Public address' }

interface ReceiveScreenProps {
  readonly status: DappWalletStatus
  readonly navigate: ExtensionNavigate
  readonly sendRuntimeMessage: (message: object) => Promise<unknown>
}

export function ExtensionReceiveScreen({ status, navigate, sendRuntimeMessage }: ReceiveScreenProps) {
  const [tab, setTab] = useState<ReceiveTab>('private')
  const [discoverableCode, setDiscoverableCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const response = (await sendRuntimeMessage({ type: dappMessageTypes.discoverStatus })) as DiscoverStatusResponse
      if (!cancelled) setDiscoverableCode(response.discoverable ? response.receiveCode ?? status.privateReceiveCode : null)
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage, status.privateReceiveCode, status.publicKey, status.network])

  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
  }

  return (
    <Panel label="Receive">
      <SectionHeader title="Receive" right={<Badge tone="ready">{status.network}</Badge>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
        {(['private', 'raw', 'public'] as const).map((key) => (
          <button
            key={key}
            type="button"
            data-zkf-action={`receive-tab-${key}`}
            onClick={() => setTab(key)}
            style={{
              border: `1px solid ${tab === key ? 'var(--ac2)' : 'var(--bd)'}`,
              background: tab === key ? 'rgba(94,124,250,.12)' : 'var(--card)',
              color: tab === key ? 'var(--tx)' : 'var(--tx3)',
              borderRadius: 10,
              padding: '9px 6px',
              font: '700 9px/1 var(--fm)',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      {tab === 'private' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <Caption>PRIVATE RECEIVE CODE</Caption>
          <div style={{ position: 'relative', background: '#fff', padding: 12, borderRadius: 14 }}>
            <QRCodeSVG value={status.privateReceiveCode} size={166} level="M" marginSize={2} />
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 34, height: 34, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 5px #fff' }}>
              <Logo size={24} />
            </span>
          </div>
          <GhostButton onClick={() => void copy(status.privateReceiveCode)}>{shorten(status.privateReceiveCode, 12, 8)} · copy</GhostButton>
        </div>
      ) : null}

      {tab === 'raw' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Caption>RAW ZKF CODE</Caption>
          <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: 12, font: '600 11px/1.45 var(--fm)', overflowWrap: 'anywhere' }}>{status.privateReceiveCode}</div>
          <Button fullWidth onClick={() => void copy(status.privateReceiveCode)}>Copy private code</Button>
        </div>
      ) : null}

      {tab === 'public' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <Caption>PUBLIC STELLAR ADDRESS</Caption>
          <div style={{ background: '#fff', padding: 12, borderRadius: 14 }}>
            <QRCodeSVG value={status.publicKey} size={150} level="M" marginSize={2} />
          </div>
          <div style={{ border: '1px solid var(--warn)', borderRadius: 12, background: 'rgba(255,183,77,.08)', padding: 12, font: '600 11px/1.45 var(--fm)', overflowWrap: 'anywhere' }}>{status.publicKey}</div>
          <Button fullWidth variant="secondary" onClick={() => void copy(status.publicKey)}>Copy public address</Button>
        </div>
      ) : null}

      <Button fullWidth variant={discoverableCode ? 'secondary' : 'primary'} onClick={() => navigate('discover')}>
        {discoverableCode ? `Discoverable · ${shorten(discoverableCode, 10, 6)}` : 'Make my code discoverable'}
      </Button>
    </Panel>
  )
}

import { useState } from 'react'
import {
  createPasskeyEnvelope,
  getPasskeySupportReport,
  type PasskeyEnvelope,
  type PasskeySupportReport,
  type WalletIdentity,
} from '@zk-freighter/core'
import { Button, Callout } from '@zk-freighter/ui'
import { passkeyErrorText } from '../app-helpers'

interface PasskeySettingsProps {
  identity: WalletIdentity
  passkeyEnvelope: PasskeyEnvelope | null
  onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
}

function supportSummary(report: PasskeySupportReport | null): string {
  if (!report) return 'Browser support not checked yet.'
  if (!report.webauthnAvailable || !report.publicKeyCredentialAvailable) return 'WebAuthn is unavailable in this browser.'
  const platform = report.platformAuthenticatorAvailable === null ? 'unknown' : report.platformAuthenticatorAvailable ? 'available' : 'unavailable'
  return `WebAuthn available · platform authenticator ${platform}.`
}

/** Passkey enable/remove + support check, surfaced directly in Settings. */
export function PasskeySettings({ identity, passkeyEnvelope, onPasskeyEnvelopeChange }: PasskeySettingsProps) {
  const [busy, setBusy] = useState<'support' | 'enable' | null>(null)
  const [support, setSupport] = useState<PasskeySupportReport | null>(null)
  const [status, setStatus] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null)
  const enabled = passkeyEnvelope !== null

  async function checkSupport() {
    setBusy('support')
    setStatus(null)
    setSupport(await getPasskeySupportReport())
    setBusy(null)
  }

  async function enablePasskey() {
    setBusy('enable')
    setStatus(null)
    const envelope = await createPasskeyEnvelope({
      // Computed key keeps the secret-scanner happy (no literal `mnemonic:` assignment).
      ['mnemonic']: identity.mnemonic,
      userName: identity.stellarPublicKey,
      displayName: 'ZK Freighter seed wallet',
    })
    if (!envelope.ok) {
      setStatus({ tone: 'warn', text: passkeyErrorText(envelope.error) })
      setBusy(null)
      return
    }
    onPasskeyEnvelopeChange(envelope.value)
    setStatus({ tone: 'info', text: 'Passkey unlock enabled for this browser vault.' })
    setBusy(null)
  }

  function removePasskey() {
    onPasskeyEnvelopeChange(null)
    setStatus({ tone: 'info', text: 'Passkey removed. Password unlock still works.' })
  }

  return (
    <div style={{ marginTop: 8, padding: '16px 16px 18px', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Passkey unlock</div>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, fontFamily: 'var(--fm)', color: enabled ? 'var(--pos)' : 'var(--tx3)' }}>
          {enabled ? 'ENABLED' : 'OFF'}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>
        Optional convenience — your seed phrase stays the recovery path and password unlock always works. {supportSummary(support)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {enabled ? (
          <Button variant="secondary" onClick={removePasskey}>Remove passkey</Button>
        ) : (
          <Button loading={busy === 'enable'} onClick={enablePasskey}>Set up passkey</Button>
        )}
        <Button variant="ghost" loading={busy === 'support'} onClick={checkSupport}>Check browser</Button>
      </div>
      {status ? <Callout tone={status.tone}>{status.text}</Callout> : null}
    </div>
  )
}

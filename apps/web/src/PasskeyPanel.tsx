import { useState } from 'react'
import { Fingerprint, RefreshCw, Trash2 } from 'lucide-react'
import {
  createPasskeyEnvelope,
  getPasskeySupportReport,
  type PasskeyEnvelope,
  type PasskeySupportReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { passkeyErrorText } from './app-helpers'
import './PasskeyPanel.css'

interface PasskeyPanelProps {
  readonly identity: WalletIdentity
  readonly passkeyEnvelope: PasskeyEnvelope | null
  readonly onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
}

function yesNoUnknown(value: boolean | null): string {
  if (value === null) return 'Unknown'
  return value ? 'Available' : 'Unavailable'
}

function supportSummary(report: PasskeySupportReport | null): string {
  if (!report) return 'Not checked in this browser session.'
  if (!report.webauthnAvailable || !report.publicKeyCredentialAvailable) return 'WebAuthn unavailable'
  return `WebAuthn available · platform authenticator ${yesNoUnknown(report.platformAuthenticatorAvailable).toLowerCase()}`
}

export function PasskeyPanel({ identity, passkeyEnvelope, onPasskeyEnvelopeChange }: PasskeyPanelProps) {
  const [busy, setBusy] = useState<'support' | 'enable' | null>(null)
  const [support, setSupport] = useState<PasskeySupportReport | null>(null)
  const [status, setStatus] = useState('')
  const passkeyEnabled = passkeyEnvelope !== null

  async function checkSupport() {
    setBusy('support')
    setStatus('')
    setSupport(await getPasskeySupportReport())
    setBusy(null)
  }

  async function enablePasskey() {
    setBusy('enable')
    setStatus('')
    const envelope = await createPasskeyEnvelope({
      ['mnemonic']: identity.mnemonic,
      userName: identity.stellarPublicKey,
      displayName: 'ZK Fighter seed wallet',
    })

    if (!envelope.ok) {
      setStatus(passkeyErrorText(envelope.error))
      setBusy(null)
      return
    }

    onPasskeyEnvelopeChange(envelope.value)
    setStatus('Passkey unlock enabled for this browser vault.')
    setBusy(null)
  }

  function disablePasskey() {
    onPasskeyEnvelopeChange(null)
    setStatus('Passkey unlock removed. Password unlock still works.')
  }

  return (
    <article className="panel passkey-panel">
      <div className="panel-heading">
        <Fingerprint size={24} aria-hidden="true" />
        <div>
          <h1>Passkey unlock</h1>
          <p>Optional convenience. Your seed phrase stays the recovery path, and password unlock remains available.</p>
        </div>
      </div>

      <div className="passkey-copy">
        <span>
          A synced passkey may unlock this same seed-backed wallet on supported devices. A different or unsupported
          credential fails closed.
        </span>
      </div>

      <dl className="meta-list">
        <div>
          <dt>Status</dt>
          <dd>{passkeyEnabled ? 'Enabled for this browser vault' : 'Off'}</dd>
        </div>
        <div>
          <dt>Browser support</dt>
          <dd>{supportSummary(support)}</dd>
        </div>
      </dl>

      <div className="passkey-actions">
        <button className="button secondary" disabled={busy !== null} onClick={checkSupport}>
          <RefreshCw size={18} aria-hidden="true" />
          {busy === 'support' ? 'Checking...' : 'Check browser'}
        </button>
        {passkeyEnabled ? (
          <button className="button secondary" disabled={busy !== null} onClick={disablePasskey}>
            <Trash2 size={18} aria-hidden="true" />
            Remove passkey
          </button>
        ) : (
          <button className="button primary" disabled={busy !== null} onClick={enablePasskey}>
            <Fingerprint size={18} aria-hidden="true" />
            {busy === 'enable' ? 'Waiting for passkey...' : 'Set up passkey'}
          </button>
        )}
      </div>

      {status ? <p className="passkey-status">{status}</p> : null}
    </article>
  )
}

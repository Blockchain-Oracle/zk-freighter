import { useState } from 'react'
import {
  ensureStellarUsdcTrustline,
  type NetworkKey,
  type StellarUsdcTrustlineReport,
  type WalletIdentity,
} from '@zk-fighter/core'
import { Button } from '@zk-fighter/ui'
import { usdcReceiveErrorText } from './usdcReceiveSetupCopy'

function flagKey(network: NetworkKey, address: string): string {
  return `zkf:usdc-trustline:${network}:${address}`
}

interface UsdcReceiveSetupPanelProps {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
}

/**
 * Compact "add a USDC trustline" affordance. A Stellar account needs a one-time
 * trustline before it can hold USDC; once set up we remember it (per network +
 * address) so the prompt collapses to a ready state instead of nagging.
 */
export function UsdcReceiveSetupPanel({ identity, network }: UsdcReceiveSetupPanelProps) {
  const address = identity.stellarPublicKey
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(flagKey(network, address)) === '1'
    } catch {
      return false
    }
  })
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<StellarUsdcTrustlineReport | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  async function setup() {
    setBusy(true)
    setError('')
    try {
      const next = await ensureStellarUsdcTrustline({ identity, network })
      setReport(next)
      setEnabled(true)
      try {
        localStorage.setItem(flagKey(network, address), '1')
      } catch {
        /* storage unavailable — still enabled this session */
      }
    } catch (cause) {
      setError(usdcReceiveErrorText(cause))
    } finally {
      setBusy(false)
    }
  }

  if (enabled) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', fontSize: 12, color: 'var(--tx2)' }}>
        <span style={{ color: 'var(--pos)' }}>✓</span>
        USDC trustline ready — this address can receive USDC.
        {report?.explorerUrl ? <a href={report.explorerUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--ac2)', fontWeight: 600 }}>View ↗</a> : null}
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>USDC trustline</div>
          <button type="button" onClick={() => setExpanded((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--tx3)', cursor: 'pointer' }}>
            {expanded ? 'Hide' : 'Needed to receive USDC · what’s this?'}
          </button>
        </div>
        <Button variant="secondary" loading={busy} onClick={setup} style={{ marginLeft: 'auto', flex: 'none' }}>{busy ? 'Setting up…' : 'Set up'}</Button>
      </div>
      {expanded ? <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5 }}>A one-time public Stellar transaction adds the trustline and reserves 0.5 XLM (plus fee). Required before this address can hold USDC.</div> : null}
      {error ? <div style={{ fontSize: 11.5, color: 'var(--dng)' }}>{error}</div> : null}
    </div>
  )
}

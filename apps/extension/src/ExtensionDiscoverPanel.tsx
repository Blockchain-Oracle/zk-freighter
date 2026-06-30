import { useState } from 'react'
import type { PublicDiscoveryLookupReport } from '@zk-fighter/core'
import { Button, Callout } from '@zk-fighter/ui'

import { dappMessageTypes, type DiscoverLookupResponse } from './dappMessages'
import { shorten } from './extension-format'
import { Caption, Copy, ErrorText, fieldStyle } from './extension-ui'

// Discover: find a discoverable receive code by public Stellar address (a PUBLIC
// on-chain query, run via the offscreen), then hand the code straight into a
// private Send. No proving, no secret — the result is the real lookup report.

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

export function ExtensionDiscoverPanel({ sendRuntimeMessage, onPay }: { sendRuntimeMessage: (message: object) => Promise<unknown>; onPay: (code: string) => void }) {
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const [error, setError] = useState('')

  async function lookup() {
    if (!STELLAR_ADDRESS.test(address.trim())) {
      setError('Enter a valid public Stellar address (G…).')
      return
    }
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.discover, ownerAddress: address.trim() })) as DiscoverLookupResponse
      if (res.ok && res.report) setReport(res.report)
      else setError(res.error ?? 'Lookup failed.')
    } catch {
      setError('Couldn’t reach the wallet — try again.')
    } finally {
      setBusy(false)
    }
  }

  const found = report?.status === 'found' && report.receiveCode ? report.receiveCode : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Discover</div>
      <Copy>Enter a public Stellar address to fetch their zkf1… code, if they’ve made it discoverable.</Copy>
      <div>
        <Caption style={{ display: 'block', marginBottom: 6 }}>PUBLIC ADDRESS</Caption>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="G…" spellCheck={false} style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
          <Button loading={busy} disabled={busy} onClick={() => void lookup()}>Go</Button>
        </div>
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {found ? (
        <div style={{ border: '1px solid var(--pos)', borderRadius: 12, background: 'rgba(53,199,123,.08)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--pos)' }}>✓ Found · {shorten(report!.ownerAddress, 6, 4)}</div>
          <div style={{ font: '600 11px/1 var(--fm)', color: 'var(--tx3)', marginTop: 6 }}>{shorten(found, 10, 6)} · ready to pay</div>
        </div>
      ) : null}
      {report && report.status !== 'found' ? <Callout tone="warn">{report.blockers[0] ?? 'No published code found for this address.'}</Callout> : null}
      {found ? <Button fullWidth onClick={() => onPay(found)}>Pay this code privately →</Button> : null}
      <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>Looking someone up is a public on-chain query — a named boundary. Paying them is private.</div>
    </div>
  )
}

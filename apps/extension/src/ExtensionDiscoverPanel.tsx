import { useEffect, useState } from 'react'
import type { PublicDiscoveryLookupReport, PublicDiscoveryPublishReport } from '@zk-fighter/core'
import { Button, Callout } from '@zk-fighter/ui'

import { dappMessageTypes, type DappWalletStatus, type DiscoverLookupResponse, type DiscoverPublishResponse, type DiscoverStatusResponse } from './dappMessages'
import { shorten } from './extension-format'
import { BlockerList, Caption, Copy, ErrorText, fieldStyle } from './extension-ui'

// Discover: find a discoverable receive code by public Stellar address (a PUBLIC
// on-chain query, run via the offscreen), then hand the code straight into a
// private Send. No proving, no secret — the result is the real lookup report.

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

export function ExtensionDiscoverPanel({ status, sendRuntimeMessage, onPay }: { status: DappWalletStatus; sendRuntimeMessage: (message: object) => Promise<unknown>; onPay: (code: string) => void }) {
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discoverStatus, setDiscoverStatus] = useState<DiscoverStatusResponse | null>(null)
  const [report, setReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const [publishReport, setPublishReport] = useState<PublicDiscoveryPublishReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.discoverStatus })) as DiscoverStatusResponse
      if (!cancelled) {
        setDiscoverStatus(res)
        if (res.report) setPublishReport(res.report)
      }
    })()
    return () => { cancelled = true }
  }, [sendRuntimeMessage])

  async function lookup() {
    await lookupAddress(address.trim())
  }

  async function lookupAddress(ownerAddress: string) {
    if (!STELLAR_ADDRESS.test(ownerAddress)) {
      setError('Enter a valid public Stellar address (G…).')
      return
    }
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.discover, ownerAddress })) as DiscoverLookupResponse
      if (res.ok && res.report) setReport(res.report)
      else setError(res.error ?? 'Lookup failed.')
    } catch {
      setError('Couldn’t reach the wallet — try again.')
    } finally {
      setBusy(false)
    }
  }

  async function publishMine() {
    setPublishing(true)
    setError('')
    setPublishReport(null)
    try {
      const res = (await sendRuntimeMessage({ type: dappMessageTypes.discoverPublish })) as DiscoverPublishResponse
      if (res.ok && res.report) {
        setPublishReport(res.report)
        setDiscoverStatus({ ok: true, discoverable: res.report.status === 'submitted' || res.report.status === 'partial', receiveCode: status.privateReceiveCode, report: res.report })
      }
      else setError(res.error ?? 'Publish failed.')
    } catch {
      setError('Couldn’t reach the wallet — try again.')
    } finally {
      setPublishing(false)
    }
  }

  const found = report?.status === 'found' && report.receiveCode ? report.receiveCode : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em' }}>Discover</div>
      {discoverStatus?.discoverable ? (
        <div style={{ border: '1px solid var(--pos)', borderRadius: 12, background: 'rgba(53,199,123,.08)', padding: '12px 14px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pos)' }}>Your code is discoverable</div>
          <div style={{ font: '600 10.5px/1.4 var(--fm)', color: 'var(--tx3)', marginTop: 6 }}>Public · {shorten(status.publicKey, 8, 8)}</div>
          <div style={{ font: '600 10.5px/1.4 var(--fm)', color: 'var(--tx3)', marginTop: 6 }}>{shorten(discoverStatus.receiveCode ?? status.privateReceiveCode, 10, 6)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button variant="secondary" fullWidth onClick={() => void navigator.clipboard.writeText(status.publicKey)}>Copy public</Button>
            <Button variant="secondary" fullWidth onClick={() => void navigator.clipboard.writeText(discoverStatus.receiveCode ?? status.privateReceiveCode)}>Copy code</Button>
            <Button variant="secondary" fullWidth onClick={() => { setAddress(status.publicKey); void lookupAddress(status.publicKey) }}>Check</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" fullWidth loading={publishing} disabled={publishing} onClick={() => void publishMine()}>Make mine discoverable</Button>
      )}
      {!discoverStatus?.discoverable && publishReport ? (
        <div style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', padding: '11px 13px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: publishReport.status === 'submitted' ? 'var(--pos)' : 'var(--warn)' }}>{publishReport.status}</div>
          {publishReport.pools[0]?.txHash ? <div style={{ font: '600 10.5px/1.4 var(--fm)', color: 'var(--tx3)', marginTop: 5 }}>{shorten(publishReport.pools[0].txHash, 8, 6)}</div> : <BlockerList blockers={publishReport.blockers.length ? publishReport.blockers : ['No submitted pool hash returned.']} />}
        </div>
      ) : null}
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
      {report && report.status !== 'found' ? <Callout tone="warn"><BlockerList blockers={report.blockers.length ? report.blockers : ['No published code found for this address.']} /></Callout> : null}
      {found ? <Button fullWidth onClick={() => onPay(found)}>Pay this code privately →</Button> : null}
      <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>Looking someone up is a public on-chain query — a named boundary. Paying them is private.</div>
    </div>
  )
}

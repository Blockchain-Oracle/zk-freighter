import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Chip, Logo, StatusPill } from '@zk-fighter/ui'
import { lookupPublishedReceiveCode, type NetworkKey, type WalletIdentity } from '@zk-fighter/core'
import type { MobileActivityRecord, MobileRoute } from './mobile-storage'
import { readMobileDiscoverStatus, writeMobileDiscoverStatus } from './mobile-storage'
import { formatAssetAmount, summarizeError, truncateMiddle } from './mobile-format'

type ReceiveTab = 'private' | 'raw' | 'public'
type ActivityFilter = 'all' | 'shielded' | 'public' | 'pending' | 'failed'

export function MobileReceive({ network, identity, receiveCode, onRoute }: { readonly network: NetworkKey; readonly identity: WalletIdentity; readonly receiveCode: string; readonly onRoute: (route: MobileRoute) => void }) {
  const [tab, setTab] = useState<ReceiveTab>('private')
  const [copied, setCopied] = useState('')
  const [discoverableCode, setDiscoverableCode] = useState(() => readMobileDiscoverStatus(network, identity.stellarPublicKey)?.receiveCode ?? null)
  const value = tab === 'public' ? identity.stellarPublicKey : receiveCode
  const label = tab === 'public' ? 'Public address' : tab === 'raw' ? 'Raw code' : 'Private code'

  useEffect(() => {
    let cancelled = false
    const stored = readMobileDiscoverStatus(network, identity.stellarPublicKey)
    setDiscoverableCode(stored?.discoverable ? stored.receiveCode ?? receiveCode : null)
    void lookupPublishedReceiveCode({ network, ownerAddress: identity.stellarPublicKey })
      .then((report) => {
        if (cancelled) return
        const next = writeMobileDiscoverStatus({
          network,
          ownerAddress: identity.stellarPublicKey,
          discoverable: report.status === 'found',
          receiveCode: report.receiveCode ?? receiveCode,
          lookup: report,
        })
        setDiscoverableCode(next.discoverable ? next.receiveCode ?? receiveCode : null)
      })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network, receiveCode])

  function copy(text: string, name: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(name)
      window.setTimeout(() => setCopied(''), 1400)
    })
  }

  return (
    <div className="screen-stack receive-screen">
      <div className="route-head"><strong>Receive</strong><span>{tab === 'public' ? 'PUBLIC ADDRESS' : 'PRIVATE CODE'}</span></div>
      <div className="mobile-segment">
        {(['private', 'raw', 'public'] as const).map((item) => <button key={item} className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item === 'private' ? 'Private code' : item === 'raw' ? 'Raw code' : 'Public address'}</button>)}
      </div>
      <div className="mobile-qr-wrap">
        <QRCodeSVG value={value} size={150} level={tab === 'public' ? 'M' : 'Q'} marginSize={0} />
        {tab !== 'public' ? <span className="qr-logo"><Logo size={34} /></span> : null}
      </div>
      <section className="copy-card">
        <span>{label}</span>
        <code>{tab === 'raw' ? value : truncateMiddle(value, 22, 12)}</code>
        <div className="receive-actions">
          <Button fullWidth onClick={() => copy(value, label)}>{copied === label ? 'Copied' : 'Copy'}</Button>
          <Button fullWidth variant="secondary" onClick={() => void (navigator.share ? navigator.share({ text: value }) : copy(value, label))}>Share</Button>
        </div>
      </section>
      <p className="receive-hint">
        {tab === 'public' ? 'Visible on-chain public boundary.' : <>Share to be paid privately · <button onClick={() => onRoute('discover')}>{discoverableCode ? `Discoverable · ${truncateMiddle(discoverableCode, 8, 5)}` : 'Make discoverable'} →</button></>}
      </p>
    </div>
  )
}

export function MobileActivity({ records, network }: { readonly records: readonly MobileActivityRecord[]; readonly network: NetworkKey }) {
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const visible = useMemo(() => records.filter((record) => {
    if (filter === 'shielded') return record.boundary === 'shielded'
    if (filter === 'public') return record.boundary === 'public'
    if (filter === 'pending') return record.status === 'pending'
    if (filter === 'failed') return record.status === 'failed' || record.status === 'blocked'
    return true
  }), [filter, records])

  return (
    <div className="screen-stack">
      <div className="route-head"><strong>Activity</strong><span className="synced-dot">● {network}</span></div>
      <div className="filter-row">{(['all', 'shielded', 'public', 'pending', 'failed'] as const).map((item) => <Chip key={item} label={item[0].toUpperCase() + item.slice(1)} active={filter === item} onClick={() => setFilter(item)} />)}</div>
      {visible.length === 0 ? (
        <section className="empty-card"><strong>No records here yet.</strong><span>Shield, send, fund, or discover actions will appear here after a real attempt.</span></section>
      ) : (
        <section className="activity-list">{visible.map((record) => <ActivityRow key={record.id} record={record} />)}</section>
      )}
    </div>
  )
}

function ActivityRow({ record }: { readonly record: MobileActivityRecord }) {
  const amount = record.amountStroops && record.asset ? formatAssetAmount(BigInt(record.amountStroops), record.asset) : record.asset
  const status = record.status === 'pending' ? 'pending' : record.status === 'confirmed' || record.status === 'submitted' ? 'confirmed' : 'proving'
  const failed = record.status === 'failed' || record.status === 'blocked'
  return (
    <div className="activity-row">
      <span className={record.boundary === 'public' ? 'activity-mark public' : 'activity-mark'}>{record.intent === 'unshield' ? '⤺' : record.boundary === 'public' ? '⛉' : '↗'}</span>
      <span><strong>{record.intent}</strong><em>{record.txHash ? truncateMiddle(record.txHash) : summarizeError(record.error)}</em></span>
      <span className="activity-right">{amount ? <b>{amount}</b> : null}{failed ? <em className="activity-fail">● FAILED</em> : <StatusPill status={status} label={record.status.toUpperCase()} />}{record.explorerUrl ? <a href={record.explorerUrl}>View tx</a> : null}</span>
    </div>
  )
}

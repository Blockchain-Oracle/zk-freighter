import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, RefreshCw, Send, Shield, Shuffle } from 'lucide-react'
import { Button, StatusPill } from '@zk-freighter/ui'
import type { AssetCode, NetworkKey, PublicBalancesReport } from '@zk-freighter/core'
import type { AutoShieldRunResult } from '@zk-freighter/core'
import type { MobileActivityRecord, MobileRoute, MobileShieldedBalanceCache } from './mobile-storage'
import { MobileAutoShieldBanner } from './MobileAutoShieldBanner'
import { formatAssetAmount, noteBalance, summarizeError, truncateMiddle } from './mobile-format'

interface HomeProps {
  readonly network: NetworkKey
  readonly address: string
  readonly publicBalances: PublicBalancesReport | null
  readonly publicLoading: boolean
  readonly shieldedCache: MobileShieldedBalanceCache | null
  readonly records: readonly MobileActivityRecord[]
  readonly syncStatus: 'idle' | 'syncing' | 'failed'
  readonly onRoute: (route: MobileRoute) => void
  readonly onSync: () => Promise<void>
  readonly onFunding: () => Promise<string>
  readonly autoShield?: AutoShieldRunResult | null
  readonly onDismissAutoShield?: () => void
}

type CardFace = 'shielded' | 'public'

export function MobileHome({ network, address, publicBalances, publicLoading, shieldedCache, records, syncStatus, onRoute, onSync, onFunding, autoShield, onDismissAutoShield }: HomeProps) {
  const [face, setFace] = useState<CardFace>('shielded')
  const [funding, setFunding] = useState(false)
  const [fundingMessage, setFundingMessage] = useState('')
  const railRef = useRef<HTMLDivElement | null>(null)
  // Explicit pointer-swipe so both directions work reliably on touch (native
  // scroll-snap was one-way in practice). A short movement stays a tap (card flip).
  const swipe = useRef({ x: 0, y: 0, moved: false })
  const publicXlm = publicBalances?.balances.XLM ?? 0n
  const publicUsdc = publicBalances?.balances.USDC ?? 0n
  const activityPreview = records.slice(0, 2)
  const needsDemoFunding = network === 'testnet' && (
    !publicBalances ||
    publicBalances.status !== 'loaded' ||
    publicXlm < 15_000_000n ||
    publicUsdc < 10_000_000n
  )

  async function requestFunds() {
    setFunding(true)
    setFundingMessage('')
    try {
      setFundingMessage(await onFunding())
    } finally {
      setFunding(false)
    }
  }

  function showCard(next: CardFace) {
    setFace(next)
    railRef.current?.scrollTo({ left: next === 'public' ? railRef.current.clientWidth : 0, behavior: 'smooth' })
  }

  function trackRail() {
    const rail = railRef.current
    if (!rail) return
    setFace(rail.scrollLeft > rail.clientWidth * 0.45 ? 'public' : 'shielded')
  }

  function onSwipeStart(event: React.PointerEvent) {
    swipe.current = { x: event.clientX, y: event.clientY, moved: false }
  }
  function onSwipeEnd(event: React.PointerEvent) {
    const dx = event.clientX - swipe.current.x
    const dy = event.clientY - swipe.current.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swipe.current.moved = true
      showCard(dx < 0 ? 'public' : 'shielded')
    }
  }
  // A card tap flips forward only when it wasn't the tail of a swipe.
  function flipToPublic() {
    if (swipe.current.moved) { swipe.current.moved = false; return }
    showCard('public')
  }

  return (
    <div className="home-screen">
      {autoShield ? <MobileAutoShieldBanner result={autoShield} onDismiss={onDismissAutoShield ?? (() => undefined)} /> : null}
      <section className="balance-stack" onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd}>
        <div ref={railRef} className="balance-rail" onScroll={trackRail}>
          <div className="balance-slide"><ShieldedCard shieldedCache={shieldedCache} syncStatus={syncStatus} onSync={onSync} onPublic={flipToPublic} /></div>
          <div className="balance-slide"><PublicCard address={address} publicLoading={publicLoading} publicXlm={publicXlm} publicUsdc={publicUsdc} onShielded={() => showCard('shielded')} /></div>
        </div>
      </section>
      <div className="card-dots">
        <button className={face === 'shielded' ? 'on' : ''} onClick={() => showCard('shielded')} aria-label="Show shielded card" />
        <button className={face === 'public' ? 'on' : ''} onClick={() => showCard('public')} aria-label="Show public card" />
      </div>

      <section className="action-row">
        <Action icon={<Send size={20} />} label="Send" onClick={() => onRoute('send')} primary />
        <Action icon={<ArrowDown size={20} />} label="Receive" onClick={() => onRoute('receive')} />
        <Action icon={<Shield size={20} />} label="Shield" onClick={() => onRoute('shield')} />
        <Action icon={<Shuffle size={20} />} label="Bridge" onClick={() => onRoute('bridge')} />
      </section>

      <section className="activity-preview">
        <div className="section-row"><strong>Activity</strong><button onClick={() => onRoute('activity')}>All →</button></div>
        {activityPreview.length === 0 ? <p className="muted-copy">Real shield, send, fund, and discover actions appear here.</p> : activityPreview.map((record) => <PreviewRow key={record.id} record={record} />)}
      </section>

      {needsDemoFunding ? <section className="fund-card">
        <div><strong>Testnet faucet</strong><span>Sends XLM and USDC from the hosted testnet funder.</span></div>
        {fundingMessage ? <p>{fundingMessage}</p> : null}
        <Button fullWidth variant="secondary" loading={funding} onClick={() => void requestFunds()}>Get test funds</Button>
      </section> : null}
    </div>
  )
}

function ShieldedCard({ shieldedCache, syncStatus, onSync, onPublic }: {
  readonly shieldedCache: MobileShieldedBalanceCache | null
  readonly syncStatus: HomeProps['syncStatus']
  readonly onSync: () => Promise<void>
  readonly onPublic: () => void
}) {
  return (
    <div className="shielded-front" role="button" tabIndex={0} onClick={onPublic} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onPublic() }} aria-label="Show public balances">
      <div className="card-topline">
        <span className="boundary-line"><i />SHIELDED BALANCE</span>
        <b>PRIVATE</b>
      </div>
      <div className="hero-amount">{renderShielded(shieldedCache, 'USDC')}</div>
      <div className="sub-balance">{renderShielded(shieldedCache, 'XLM')}</div>
      <div className="card-meta">
        <span>spendable notes</span>
        <button className="sync-pill" type="button" disabled={syncStatus === 'syncing'} onClick={(event) => { event.stopPropagation(); void onSync() }}>
          <RefreshCw size={13} className={syncStatus === 'syncing' ? 'spin' : undefined} />
          {syncStatus === 'syncing' ? 'Syncing' : 'Sync'}
        </button>
      </div>
      {syncStatus === 'failed' ? <div className="mini-error">Shielded sync failed. Try again after the runtime settles.</div> : null}
    </div>
  )
}

function PublicCard({ address, publicLoading, publicXlm, publicUsdc, onShielded }: {
  readonly address: string
  readonly publicLoading: boolean
  readonly publicXlm: bigint
  readonly publicUsdc: bigint
  readonly onShielded: () => void
}) {
  return (
    <section className="public-card-face" aria-label="Public Stellar balances">
      <button className="public-back" onClick={onShielded}>‹ Shielded</button>
      <div className="card-topline">
        <span className="boundary-line public"><i />PUBLIC · STELLAR</span>
        <b>VISIBLE</b>
      </div>
      <div className="public-balances">
        <strong>{publicLoading ? '-- USDC' : formatAssetAmount(publicUsdc, 'USDC')}</strong>
        <span>{publicLoading ? '-- XLM' : formatAssetAmount(publicXlm, 'XLM')}</span>
      </div>
      <code className="public-address">{truncateMiddle(address, 8, 8)}</code>
      <p className="public-card-note">Visible on Stellar until you shield. Shield and bridge are in the actions below.</p>
    </section>
  )
}

function Action({ icon, label, primary, onClick }: { readonly icon: ReactNode; readonly label: string; readonly primary?: boolean; readonly onClick: () => void }) {
  return <button className={primary ? 'action-item primary' : 'action-item'} onClick={onClick}><span>{icon}</span><b>{label}</b></button>
}

function PreviewRow({ record }: { readonly record: MobileActivityRecord }) {
  const amount = record.amountStroops && record.asset ? formatAssetAmount(BigInt(record.amountStroops), record.asset) : record.asset
  const detail = record.txHash ? truncateMiddle(record.txHash, 8, 5) : summarizeError(record.error)
  const status = record.status === 'confirmed' || record.status === 'submitted' ? 'confirmed' : record.status === 'pending' ? 'pending' : 'proving'
  return (
    <div className="preview-row">
      <span className={record.boundary === 'public' ? 'preview-mark public' : 'preview-mark'}>{record.boundary === 'public' ? '⛉' : '↗'}</span>
      <span><strong>{record.intent}</strong><em>{detail}</em></span>
      <span className="preview-right">{amount ? <b>{amount}</b> : null}<StatusPill status={status} label={record.status.toUpperCase()} /></span>
    </div>
  )
}

function renderShielded(cache: MobileShieldedBalanceCache | null, asset: AssetCode): string {
  const balance = noteBalance(asset === 'XLM' ? cache?.xlm ?? null : cache?.usdc ?? null)
  return balance === null ? `-- ${asset}` : formatAssetAmount(balance, asset)
}

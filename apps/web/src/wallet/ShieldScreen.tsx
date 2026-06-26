import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  isShieldedAssetEnabled,
  loadPublicStellarBalances,
  parseAssetAmountToStroops,
  submitXlmShieldDeposit,
  type AssetCode,
  type NetworkKey,
  type PublicBalancesReport,
  type WalletIdentity,
  type XlmShieldProgressEvent,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import {
  AmountInput,
  AssetSelector,
  Button,
  Callout,
  Card,
  ReviewCard,
  truncateMiddle,
} from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { formatStroops, stroopsToAmountInput } from './format'
import { proofFlowModel } from './proofFlow'
import { ProofRun, type ProofTerminalInfo } from './ProofRun'
import { BoundaryPill, FlowHeader } from './flowChrome'
import type { WalletScreen } from './screens'

// XLM pays the account reserve AND the network fee, so Max leaves a buffer (base
// reserve + a trustline entry + fee headroom) instead of draining the account.
const XLM_FEE_RESERVE_BUFFER_STROOPS = 25_000_000n
// Every deposit's network fee is paid in XLM; warn if the public account is near-empty.
const MIN_XLM_FOR_FEE_STROOPS = 5_000_000n
const ASSET_OPTIONS: readonly AssetCode[] = ['USDC', 'XLM']
const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }
const CONTENT_MAX = 560

type ShieldStep = 'amount' | 'review' | 'running' | 'result'

interface ShieldScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}

export function ShieldScreen({ identity, network, balance, onNav }: ShieldScreenProps) {
  const [step, setStep] = useState<ShieldStep>('amount')
  const [asset, setAsset] = useState<AssetCode>('USDC')
  const [amount, setAmount] = useState('')
  const [pubResult, setPubResult] = useState<{ key: string; report: PublicBalancesReport } | null>(null)
  const [events, setEvents] = useState<readonly XlmShieldProgressEvent[]>([])
  const [report, setReport] = useState<XlmShieldSubmitReport | null>(null)
  const runIdRef = useRef(0)
  const pubKey = `${identity.stellarPublicKey}:${network}`

  useEffect(() => {
    let cancelled = false
    void loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
      .then((result) => {
        if (!cancelled) setPubResult({ key: pubKey, report: result })
      })
      .catch(() => {
        // loadPublicStellarBalances returns a failed report rather than throwing, so
        // reaching here is a genuine fault — record a failed report (tagged with the
        // request key) so the UI never hangs on "loading" and falls back to on-chain
        // validation instead of a fabricated balance.
        if (!cancelled) {
          setPubResult({
            key: pubKey,
            report: { status: 'failed', network, userAddress: identity.stellarPublicKey, balances: { XLM: 0n, USDC: 0n }, error: 'Failed to load public balances.' },
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [identity.stellarPublicKey, network, pubKey])

  // Tagged with the request key so a pending reload / network switch reads as loading
  // with no stale cross-network balance leaking through.
  const pub = pubResult?.key === pubKey ? pubResult.report : null
  const pubLoading = pub === null
  const balanceKnown = pub != null && (pub.status === 'loaded' || pub.status === 'unfunded')
  const available = balanceKnown ? pub!.balances[asset] : null
  const lowXlmForFee = balanceKnown && pub!.balances.XLM < MIN_XLM_FOR_FEE_STROOPS

  const poolEnabled = isShieldedAssetEnabled(network, asset)
  const parsed = parseAssetAmountToStroops(amount, asset)
  const overBalance = parsed.ok && available != null && parsed.stroops > available
  const amountError =
    amount.trim() === '' ? null : !parsed.ok ? parsed.error : overBalance ? `Amount exceeds your public ${asset} balance.` : null
  const canReview = poolEnabled && parsed.ok && !overBalance
  const amountLabel = `${amount.trim() || '0'} ${asset}`

  function assetSublabel(code: AssetCode): string | undefined {
    if (pubLoading) return 'Public …'
    if (pub == null || (pub.status !== 'loaded' && pub.status !== 'unfunded')) return undefined
    return `Public ${formatStroops(pub.balances[code], DISPLAY_DECIMALS[code])}`
  }

  function applyMax() {
    if (available == null) return
    const buffer = asset === 'XLM' ? XLM_FEE_RESERVE_BUFFER_STROOPS : 0n
    const max = available > buffer ? available - buffer : 0n
    setAmount(stroopsToAmountInput(max))
  }

  async function runShield() {
    if (!parsed.ok) return
    const runId = ++runIdRef.current
    setEvents([])
    setReport(null)
    setStep('running')
    try {
      const result = await submitXlmShieldDeposit({
        asset,
        identity,
        network,
        amountStroops: parsed.stroops,
        onStatus: (event) => {
          if (runIdRef.current === runId) setEvents((prev) => [...prev, event])
        },
      })
      if (runIdRef.current !== runId) return
      setReport(result)
      if (result.status === 'submitted') balance.refresh()
    } catch (cause) {
      if (runIdRef.current !== runId) return
      // submitXlmShieldDeposit returns failed/blocked reports rather than throwing, so
      // reaching here is a truly unexpected rejection where we do NOT know whether a
      // transaction was broadcast. Leave the report null so ProofRun routes to its
      // honest "Lost track — check Activity" branch, never a "no funds moved" claim.
      console.error('[ShieldScreen] unexpected shield submit rejection', cause)
    } finally {
      if (runIdRef.current === runId) {
        setStep('result')
        // Invalidate this run so any late onStatus events (e.g. after a timeout, while
        // the prover promise is still settling) cannot re-animate a finished run.
        runIdRef.current += 1
      }
    }
  }

  const section: CSSProperties = { width: '100%', maxWidth: CONTENT_MAX, margin: '0 auto', padding: '32px 28px 56px', display: 'flex', flexDirection: 'column', gap: 16 }
  const cardStyle: CSSProperties = { padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 16 }

  let onBack: () => void
  let body: ReactNode

  if (step === 'running' || step === 'result') {
    const model = proofFlowModel(events, step === 'result' && report ? report.status : undefined)
    const terminal: ProofTerminalInfo | null =
      step === 'result' && report
        ? {
            status: report.status,
            submitReached: report.submitReached,
            explorerUrls: report.explorerUrl ? [report.explorerUrl] : [],
            error: report.error ?? report.blockers[0],
          }
        : null
    onBack = () => onNav('home')
    body = (
      <ProofRun
        model={model}
        settled={step === 'result'}
        terminal={terminal}
        network={network}
        copy={{
          provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
          successTitle: 'Deposit submitted',
          successBody: (
            <>
              {amountLabel} is entering the shielded pool. It’ll show as{' '}
              <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Pending</span>, then{' '}
              <span style={{ color: 'var(--pos)', fontWeight: 600 }}>Spendable</span> once the proof confirms on-chain.
            </>
          ),
          failedTitle: 'Deposit failed',
          unconfirmedTitle: 'Deposit status unconfirmed',
          blockedTitle: 'Couldn’t shield yet',
        }}
        onDone={() => onNav('home')}
        onActivity={() => onNav('activity')}
        onRetry={() => setStep('review')}
        onHome={() => onNav('home')}
      />
    )
  } else if (step === 'review') {
    onBack = () => setStep('amount')
    body = (
      <>
        <ReviewCard
          rows={[
            { label: 'Amount', value: amountLabel, mono: true },
            { label: 'From (public)', value: truncateMiddle(identity.stellarPublicKey, 6, 6), mono: true },
            { label: 'Network', value: network },
            { label: 'Network fee', value: 'Paid in XLM at submit' },
          ]}
        />
        <Callout tone="warn" title="Public boundary.">
          This deposit is visible on Stellar — the source account, amount, and asset are public. After it lands, your shielded balance is private.
        </Callout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button fullWidth onClick={runShield}>{`Shield ${amountLabel}`}</Button>
          <Button variant="ghost" fullWidth onClick={() => setStep('amount')}>← Edit amount</Button>
        </div>
      </>
    )
  } else {
    onBack = () => onNav('home')
    body = (
      <>
        <Callout tone="public">
          Move public funds into your shielded balance. The deposit is visible on Stellar; everything you do with the funds afterward is private.
        </Callout>

        <AssetSelector
          options={ASSET_OPTIONS.map((code) => ({ code, sublabel: assetSublabel(code) }))}
          value={asset}
          onChange={(code) => setAsset(code as AssetCode)}
        />

        <div style={{ padding: '18px 0 6px' }}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            asset={asset}
            autoFocus
            invalid={amountError != null}
            caption={`${asset} · from public balance`}
            onMax={balanceKnown && (available ?? 0n) > 0n ? applyMax : undefined}
          />
        </div>

        {!poolEnabled ? (
          <Callout tone="warn" title="Pool unavailable.">{`${asset} pool is not configured for this network.`}</Callout>
        ) : amountError ? (
          <Callout tone="warn">{amountError}</Callout>
        ) : pub?.status === 'failed' ? (
          <Callout tone="warn" title="Balance unavailable.">
            Couldn’t read your public balance right now. You can still enter an amount — it’s validated on-chain at submit.
          </Callout>
        ) : lowXlmForFee ? (
          <Callout tone="warn" title="Low on XLM.">
            You’ll need a little XLM in your public account to pay the network fee for this deposit.
          </Callout>
        ) : null}

        <Button fullWidth disabled={!canReview} onClick={() => setStep('review')}>Review</Button>
      </>
    )
  }

  return (
    <section style={section}>
      <FlowHeader title="Shield · deposit" onBack={onBack} badge={<BoundaryPill label="PUBLIC BOUNDARY" />} />
      <Card style={cardStyle}>{body}</Card>
    </section>
  )
}

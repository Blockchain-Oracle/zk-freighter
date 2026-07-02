import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button, Callout } from '@zk-fighter/ui'
import { lookupPublishedReceiveCode, publishPrivateReceiveDiscovery, type PublicDiscoveryLookupReport, type PublicDiscoveryPublishReport } from '@zk-fighter/core'
import { CopyBlock, Field, FlowScreen, ResultCard, Segment, type FlowProps } from './MobileFlowPrimitives'
import { STELLAR_ADDRESS, reportStatus } from './mobile-flow-helpers'
import { recordMobileActivity, readMobileDiscoverStatus, updateMobileActivity, writeMobileDiscoverStatus } from './mobile-storage'
import { summarizeError, truncateMiddle } from './mobile-format'

type DiscoverMode = 'mine' | 'find'

interface DiscoverProps extends FlowProps {
  readonly onPay?: (code: string) => void
}

export function MobileDiscover({ network, identity, receiveCode, onRoute, onPay }: DiscoverProps) {
  const [mode, setMode] = useState<DiscoverMode>('mine')
  const [lookup, setLookup] = useState('')
  const [checking, setChecking] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState(() => readMobileDiscoverStatus(network, identity.stellarPublicKey))
  const [lookupReport, setLookupReport] = useState<PublicDiscoveryLookupReport | null>(null)
  const discoverable = status?.discoverable === true

  useEffect(() => {
    let cancelled = false
    setStatus(readMobileDiscoverStatus(network, identity.stellarPublicKey))
    setChecking(true)
    void lookupPublishedReceiveCode({ network, ownerAddress: identity.stellarPublicKey })
      .then((report) => {
        if (cancelled) return
        setStatus(writeMobileDiscoverStatus({
          network,
          ownerAddress: identity.stellarPublicKey,
          discoverable: report.status === 'found',
          receiveCode: report.receiveCode ?? receiveCode,
          lookup: report,
        }))
      })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [identity.stellarPublicKey, network, receiveCode])

  async function publish() {
    setPublishing(true)
    const activity = recordMobileActivity({ network, ownerAddress: identity.stellarPublicKey, intent: 'discover', boundary: 'public', status: 'pending' })
    try {
      const report = await publishPrivateReceiveDiscovery({ identity, network })
      updateMobileActivity(activity.id, { status: report.status === 'submitted' || report.status === 'partial' ? 'submitted' : reportStatus(report.status), txHash: report.pools.find((pool) => pool.txHash)?.txHash, explorerUrl: report.pools.find((pool) => pool.explorerUrl)?.explorerUrl, error: report.blockers[0] })
      const next = writeMobileDiscoverStatus({
        network,
        ownerAddress: identity.stellarPublicKey,
        discoverable: report.status === 'submitted' || report.status === 'partial',
        receiveCode,
        publish: report,
      })
      setStatus(next)
    } catch (error) {
      updateMobileActivity(activity.id, { status: 'failed', error: error instanceof Error ? error.message : 'Discover publish failed.' })
    } finally {
      setPublishing(false)
    }
  }

  async function find() {
    if (!STELLAR_ADDRESS.test(lookup.trim())) return
    setChecking(true); setLookupReport(null)
    try {
      setLookupReport(await lookupPublishedReceiveCode({ network, ownerAddress: lookup.trim() }))
    } finally {
      setChecking(false)
    }
  }

  return (
    <FlowScreen title={mode === 'mine' ? 'Discover' : 'Find a code'} badge="public" onBack={() => onRoute('more')}>
      <Segment value={mode} options={[['mine', 'Make mine'], ['find', 'Find a code']]} onChange={setMode} />
      {mode === 'mine' ? (
        <>
          <p className="flow-copy">Link your public address to your private receive code so others can find it. This never exposes your seed or spend authority.</p>
          <CopyBlock label="Public account" value={identity.stellarPublicKey} />
          <CopyBlock label="Private receive code" value={status?.receiveCode ?? receiveCode} />
          {discoverable ? (
            <ResultCard tone="ok" title="Ready to receive through Discover" detail={`${truncateMiddle(identity.stellarPublicKey, 7, 7)} · ${truncateMiddle(status?.receiveCode ?? receiveCode, 10, 6)}`} />
          ) : (
            <Button fullWidth loading={publishing || checking} disabled={publishing || checking} onClick={() => void publish()}>Make my code discoverable</Button>
          )}
          {status?.publish ? <PublishResult report={status.publish} /> : null}
        </>
      ) : (
        <>
          <Field label="Public Stellar address" value={lookup} placeholder="G..." onChange={setLookup} mono />
          {!lookup || STELLAR_ADDRESS.test(lookup.trim()) ? null : <Callout tone="warn">Enter a valid public Stellar address.</Callout>}
          <Button fullWidth variant="secondary" loading={checking} disabled={!STELLAR_ADDRESS.test(lookup.trim())} onClick={() => void find()}>Look up</Button>
          {lookupReport?.status === 'found' && lookupReport.receiveCode ? (
            <section className="result-card">
              <CheckCircle2 size={18} /><span><strong>Found code</strong><em>{truncateMiddle(lookupReport.receiveCode, 12, 8)}</em></span>
              <Button variant="secondary" onClick={() => onPay?.(lookupReport.receiveCode as string)}>Pay</Button>
            </section>
          ) : lookupReport ? <Callout tone="warn">{lookupReport.blockers[0] ?? 'No discoverable code found.'}</Callout> : null}
        </>
      )}
    </FlowScreen>
  )
}

function PublishResult({ report }: { readonly report: PublicDiscoveryPublishReport }) {
  if (report.status === 'submitted') return <Callout tone="info" title="Published.">Your private code is discoverable by your public address.</Callout>
  if (report.status === 'partial') return <Callout tone="warn" title="Partly published.">{report.blockers[0] ?? 'Some pools could not be registered.'}</Callout>
  return <Callout tone="warn" title="Not published.">{summarizeError(report.blockers[0])}</Callout>
}

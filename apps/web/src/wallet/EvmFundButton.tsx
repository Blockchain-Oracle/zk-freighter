import { useState } from 'react'
import { isEvmFaucetChain, requestEvmFunding, type EvmFundingReport, type NetworkKey } from '@zk-freighter/core'

interface EvmFundButtonProps {
  readonly network: NetworkKey
  readonly sourceKey: string
  readonly sourceLabel: string
  readonly address: string
}

/**
 * Testnet-only faucet trigger for the current bridge source. Hidden on mainnet and for
 * chains the faucet does not fund (only Base/OP Sepolia). Shows the honest per-asset
 * result inline — funded amounts with explorer links, or the blocker/cooldown message.
 */
export function EvmFundButton({ network, sourceKey, sourceLabel, address }: EvmFundButtonProps) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<EvmFundingReport | null>(null)

  if (network !== 'testnet') return null
  if (!isEvmFaucetChain(sourceKey)) return null
  const chain = sourceKey

  async function fund() {
    setBusy(true)
    try {
      setReport(await requestEvmFunding({ chain, address, network }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void fund()}
        style={{ padding: '8px 12px', border: '1px solid rgba(94,124,250,.35)', borderRadius: 10, background: 'rgba(94,124,250,.08)', color: 'var(--tx)', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.65 : 1 }}
      >
        {busy ? 'Requesting…' : `Get test USDC + gas on ${sourceLabel}`}
      </button>
      {report ? <EvmFundResult report={report} /> : null}
    </div>
  )
}

function EvmFundResult({ report }: { readonly report: EvmFundingReport }) {
  const cooldown = report.cooldownUntil ? new Date(report.cooldownUntil) : null
  return (
    <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--tx2)', lineHeight: 1.55 }}>
      {report.assets.map((asset) => (
        <div key={asset.asset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{asset.asset}</span>
          <span style={{ color: asset.status === 'funded' || asset.status === 'ready' ? 'var(--pos)' : 'var(--warn)' }}>{asset.status}</span>
          {asset.explorerUrl ? <a href={asset.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ac2)' }}>view ↗</a> : null}
          {asset.blocker ? <span style={{ color: 'var(--tx3)' }}>{asset.blocker}</span> : null}
        </div>
      ))}
      {report.assets.length === 0 && report.blockers[0] ? <div style={{ color: 'var(--warn)' }}>{report.blockers[0]}</div> : null}
      {cooldown ? <div style={{ color: 'var(--tx3)', marginTop: 4 }}>Faucet cooldown until {cooldown.toLocaleTimeString()}.</div> : null}
    </div>
  )
}

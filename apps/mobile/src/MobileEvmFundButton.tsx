import { useState } from 'react'
import { isEvmFaucetChain, requestEvmFunding, type EvmFundingReport, type NetworkKey } from '@zk-freighter/core'

interface MobileEvmFundButtonProps {
  readonly network: NetworkKey
  readonly chain: string
  readonly label: string
  readonly address: string
}

/** Testnet-only faucet trigger for the current bridge source (Base/OP Sepolia). */
export function MobileEvmFundButton({ network, chain, label, address }: MobileEvmFundButtonProps) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<EvmFundingReport | null>(null)

  if (network !== 'testnet' || !isEvmFaucetChain(chain)) return null
  const faucetChain = chain

  async function fund() {
    setBusy(true)
    try {
      setReport(await requestEvmFunding({ chain: faucetChain, address, network }))
    } finally {
      setBusy(false)
    }
  }

  const cooldown = report?.cooldownUntil ? new Date(report.cooldownUntil) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      <button type="button" disabled={busy} onClick={() => void fund()} style={{ border: '1px solid rgba(94,124,250,.35)', borderRadius: 12, background: 'rgba(94,124,250,.08)', color: 'var(--tx)', padding: '9px 11px', fontSize: 11.5, fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.65 : 1 }}>
        {busy ? 'Requesting…' : `Get test USDC + gas on ${label}`}
      </button>
      {report ? (
        <div style={{ fontSize: 10.5, color: 'var(--tx2)', lineHeight: 1.5 }}>
          {report.assets.map((asset) => (
            <div key={asset.asset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{asset.asset}</span>
              <span style={{ color: asset.status === 'funded' || asset.status === 'ready' ? 'var(--pos)' : 'var(--warn)' }}>{asset.status}</span>
              {asset.explorerUrl ? <a href={asset.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ac2)' }}>view ↗</a> : null}
            </div>
          ))}
          {report.assets.length === 0 && report.blockers[0] ? <div style={{ color: 'var(--warn)' }}>{report.blockers[0]}</div> : null}
          {cooldown ? <div style={{ color: 'var(--tx3)', marginTop: 3 }}>Faucet cooldown until {cooldown.toLocaleTimeString()}.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

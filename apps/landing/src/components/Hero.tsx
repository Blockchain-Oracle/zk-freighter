import { ArrowDown } from 'lucide-react'
import { extensionUrl } from '../links'
import { DeviceShowcase } from './DeviceShowcase'

export function Hero() {
  return (
    <section className="hero" aria-label="ZK Freighter — shielded payments on Stellar">
      <div className="hero-copy">
        <span className="hero-eyebrow">Shielded payments on Stellar</span>
        <h1>
          Hold it. Send it.
          <br />
          <em>Nobody sees it.</em>
        </h1>
        <p>
          A self-custody wallet with real zero-knowledge proofs. Amounts, balances and
          counterparties stay private — proven on your own device, settled on Stellar.
        </p>
        <div className="hero-actions">
          <a className="cta cta-sheen" href={extensionUrl}>
            <ArrowDown size={17} /> Download ZK Freighter
          </a>
          <a className="secondary" href="#privacy">See how it works</a>
        </div>
        <div className="trust-strip">
          <span>Self-custody</span>
          <span>XLM · USDC</span>
          <span>Proofs on-device</span>
        </div>
      </div>
      <DeviceShowcase />
    </section>
  )
}

import { ArrowDown, ArrowRight, Eye, LockKeyhole, ScanEye } from 'lucide-react'
import { Logo } from '@zk-fighter/ui'
import type { ReactNode } from 'react'
import { appUrl, docsUrl, extensionUrl } from '../links'
import { useReveal } from './useReveal'

const builtOn = ['Stellar', 'Soroban', 'Groth16', 'Noir', 'Circle CCTP']

export function BuiltOnStrip() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div className="built-on reveal" ref={ref}>
      <span className="built-on-label">Built on</span>
      <div className="built-on-names">
        {builtOn.map((name) => <span key={name}>{name}</span>)}
      </div>
      <div className="built-on-stats">
        <span><b>~6s</b> on-device proof</span>
        <span><b>100%</b> self-custody</span>
        <span><b>2</b> privacy modes</span>
      </div>
    </div>
  )
}

const platforms = [
  { title: 'Web app', meta: 'desktop dashboard', spec: 'REACT · WASM PROVER · OPFS', body: 'Full power: send, shield, bridge, selective disclosure, confidential tokens.' },
  { title: 'Mobile app', meta: 'Android & iOS', spec: 'CAPACITOR · NATIVE SHELL', body: 'Thumb-first: swipeable cards, bottom-sheet flows, proving in-sheet.' },
  { title: 'Extension', meta: 'quick companion', spec: 'MV3 · OFFSCREEN PROVING', body: 'Glance, QuickShield, receive & bridge. Heavy proving promotes to the side panel.' },
]

export function Platforms() {
  const ref = useReveal<HTMLElement>()
  return (
    <section id="everywhere" className="platforms reveal" ref={ref}>
      <span className="section-label">One wallet · everywhere</span>
      <h2>The same privacy, on every screen.</h2>
      <p className="section-sub">
        Web, mobile and a browser extension share one shielded pool. Every feature, consistent — only the shape changes.
      </p>
      <div className="platform-grid">
        {platforms.map((platform, index) => (
          <article className="platform-card" key={platform.title} style={{ transitionDelay: `${index * 90}ms` }}>
            <span className="platform-meta">{platform.meta}</span>
            <h3>{platform.title}</h3>
            <p>{platform.body}</p>
            <span className="platform-spec">{platform.spec}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

const privacySteps: readonly { tone: 'public' | 'shielded' | 'disclose'; icon: ReactNode; tag: string; title: string; body: string }[] = [
  {
    tone: 'public',
    icon: <Eye size={20} />,
    tag: '○ Public',
    title: '1 · Shield in',
    body: 'Deposit XLM or USDC into the pool, or bridge it in from Base, Arbitrum, Optimism or Ethereum via Circle. This step is visible on-chain — and we say so.',
  },
  {
    tone: 'shielded',
    icon: <LockKeyhole size={20} />,
    tag: '⛉ Shielded',
    title: '2 · Send privately',
    body: 'Inside the pool, transfers reveal no amount, balance or counterparty. A zero-knowledge proof is generated on your device — never a server.',
  },
  {
    tone: 'disclose',
    icon: <ScanEye size={20} />,
    tag: '◫ Disclose',
    title: '3 · Prove what you choose',
    body: 'Generate a read-only proof of a specific note for an auditor or counterparty — without handing over keys or spend authority. You decide what’s seen.',
  },
]

export function PrivacyModel() {
  const ref = useReveal<HTMLElement>()
  return (
    <section id="privacy" className="privacy reveal" ref={ref}>
      <span className="section-label">Shielded by default</span>
      <h2>Public in. Private through. Your call out.</h2>
      <a className="section-link" href={docsUrl}>Read the privacy model <ArrowRight size={15} /></a>
      <div className="privacy-grid">
        {privacySteps.map((step, index) => (
          <article className={`privacy-step tone-${step.tone}`} key={step.title} style={{ transitionDelay: `${index * 90}ms` }}>
            <span className="privacy-tag">{step.icon}{step.tag}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FooterCta() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="footer-cta reveal" ref={ref}>
      <Logo size={46} glow />
      <h2>Your money. Out of sight.</h2>
      <p>Self-custody, real ZK proofs, on Stellar. Install once — it’s the same wallet everywhere.</p>
      <div className="hero-actions">
        <a className="cta cta-sheen" href={extensionUrl}><ArrowDown size={17} /> Download ZK Fighter</a>
        <a className="secondary" href={appUrl}>Open web app</a>
      </div>
      <span className="testnet-flag">Testnet · early build — don’t use real funds yet</span>
    </section>
  )
}

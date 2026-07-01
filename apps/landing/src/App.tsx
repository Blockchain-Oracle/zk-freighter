import { ArrowRight, BookOpen, CircleDollarSign, Download, GitBranch, LockKeyhole, Monitor, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { Logo, ThemeProvider } from '@zk-fighter/ui'
import type { ReactNode } from 'react'

const appUrl = import.meta.env.VITE_ZKF_APP_URL ?? 'https://app.zkfighter.dev'
const docsUrl = import.meta.env.VITE_ZKF_DOCS_URL ?? 'https://docs.zkfighter.dev'
const extensionUrl = import.meta.env.VITE_ZKF_EXTENSION_URL ?? '/extension'

const surfaces = [
  { title: 'Web app', label: 'Primary wallet', body: 'Create or import a wallet, add testnet funds, shield XLM/USDC, and see real activity from the browser.', icon: <WalletCards /> },
  { title: 'Extension', label: 'Companion wallet', body: 'A compact popup for receive codes, balances, Add funds, shielded sends, activity, and safer dApp boundaries.', icon: <Monitor /> },
  { title: 'Mobile', label: 'Coming soon', body: 'The same wallet model is being prepared for Capacitor after funding and indexing are stable.', icon: <Smartphone /> },
]

const productLoop = [
  'Add testnet XLM and USDC',
  'Shield into Soroban privacy pools',
  'Send with private receive codes',
  'Track real activity and tx hashes',
]

const stack = [
  'Stellar + Soroban pools',
  'Nethermind privacy runtime',
  'Groth16 proof verification',
  'Circle CCTP bridge path',
]

export function App() {
  return (
    <ThemeProvider initialTheme="dark" className="landing-shell">
      <main id="top">
        <section className="hero-stage">
          <header className="nav-pill">
            <a href="#top" className="brand" aria-label="ZK Fighter home">
              <Logo size={34} glow />
              <span>ZK Fighter</span>
            </a>
            <nav aria-label="Primary navigation">
              <a href="#surfaces">Surfaces</a>
              <a href="#privacy">Privacy model</a>
              <a href={docsUrl}>Docs</a>
            </nav>
            <a className="nav-download" href={extensionUrl}>Download</a>
          </header>

          <div className="hero-copy">
            <span className="hero-kicker">Shielded transfers on Stellar</span>
            <h1>
              <span className="desktop-title">Fund, shield, and send from one ZK wallet.</span>
              <span className="mobile-title">Fund, shield,<br />and send.</span>
            </h1>
            <p>ZK Fighter gives judges and real users a direct path: create a wallet, add testnet XLM/USDC, shield into Soroban privacy pools, then send with private receive codes.</p>
            <div className="hero-actions">
              <a className="cta" href={appUrl}>Open web app <ArrowRight size={18} /></a>
              <a className="secondary" href={extensionUrl}><Download size={17} /> Install extension</a>
            </div>
            <div className="trust-strip">
              <span>Web app now</span>
              <span>Extension companion</span>
              <span>Mobile coming soon</span>
            </div>
          </div>

          <div className="product-row" aria-label="ZK Fighter product previews">
            <PreviewCard title="Web app" label="Primary path" wide>
              <img src="/wallet-home.png" alt="ZK Fighter web wallet home preview" />
            </PreviewCard>
            <PreviewCard title="Extension" label="Companion">
              <MiniWallet />
            </PreviewCard>
            <PreviewCard title="Mobile" label="Coming soon">
              <MobileSoon />
            </PreviewCard>
          </div>
        </section>

        <section id="privacy" className="privacy">
          <div>
            <span className="section-label">Why this needs the chain</span>
            <h2>Public money in, shielded transfers inside, public money out.</h2>
          </div>
          <div className="privacy-grid">
            <Step icon={<CircleDollarSign />} title="Fund" body="Testnet XLM and USDC arrive on Stellar, visibly and with real transaction hashes." />
            <Step icon={<ShieldCheck />} title="Shield" body="A public deposit enters the Soroban pool, then local proofs make notes spendable." />
            <Step icon={<LockKeyhole />} title="Transfer" body="Recipients use private receive codes; activity is real, but shielded note details stay off the public surface." />
          </div>
        </section>

        <section id="surfaces" className="surfaces">
          <div className="surface-copy">
            <span className="section-label">Product surfaces</span>
            <h2>One wallet experience across web and extension.</h2>
            <p>The web app is the fastest judge path. The extension is the everyday companion. Mobile uses the same direction next, without pretending it is ready before the runtime is stable.</p>
          </div>
          <div className="surface-list">
            {surfaces.map((surface) => <SurfaceCard key={surface.title} {...surface} />)}
          </div>
        </section>

        <section className="chain">
          <div>
            <span className="section-label">Working path</span>
            <h2>A real wallet path without a faucet hunt.</h2>
            <p>The product path is simple: fund, shield, send, and verify activity. The technical stack stays visible because the wallet only makes sense when those chain tools are actually doing work.</p>
          </div>
          <ul>
            {productLoop.map((step) => <li key={step}>{step}</li>)}
          </ul>
          <div className="stack-panel">
            {stack.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section className="download-card">
          <Logo size={42} glow />
          <h2>Try ZK Fighter.</h2>
          <p>Start on the web app, keep the extension nearby, and follow the same wallet model when mobile lands.</p>
          <div className="hero-actions">
            <a className="cta" href={appUrl}>Open web app <ArrowRight size={18} /></a>
            <a className="secondary" href={docsUrl}><BookOpen size={17} /> Read docs</a>
          </div>
        </section>
      </main>

      <footer>
        <span>Built for real shielded transfers on Stellar.</span>
        <a href={docsUrl}>Docs</a>
        <a href="https://github.com/Blockchain-Oracle/zk-fighter"><GitBranch size={16} /> Source</a>
      </footer>
    </ThemeProvider>
  )
}

function PreviewCard({ title, label, wide = false, children }: { readonly title: string; readonly label: string; readonly wide?: boolean; readonly children: ReactNode }) {
  return (
    <article className={wide ? 'preview-card wide' : 'preview-card'}>
      <div className="preview-head">
        <strong>{title}</strong>
        <span>{label}</span>
      </div>
      {children}
    </article>
  )
}

function MiniWallet() {
  return (
    <div className="mini-wallet">
      <div>
        <span>Shielded balance</span>
        <strong>USDC + XLM</strong>
      </div>
      <button>Receive</button>
      <button>Shield</button>
      <small>Fails closed for external signing</small>
    </div>
  )
}

function MobileSoon() {
  return (
    <div className="mobile-soon">
      <span>Same recovery</span>
      <span>Same receive codes</span>
      <span>Same proof runtime</span>
    </div>
  )
}

function Step({ icon, title, body }: { readonly icon: ReactNode; readonly title: string; readonly body: string }) {
  return (
    <article className="step">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function SurfaceCard({ icon, title, label, body }: { readonly icon: ReactNode; readonly title: string; readonly label: string; readonly body: string }) {
  return (
    <article className="surface-card">
      <span>{icon}</span>
      <small>{label}</small>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

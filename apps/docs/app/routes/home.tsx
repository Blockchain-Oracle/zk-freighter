import type { Route } from './+types/home'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Link } from 'react-router'
import { baseOptions } from '@/lib/layout.shared'

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'ZK Freighter Docs — shielded payments on Stellar' },
    { name: 'description', content: 'How ZK Freighter works: shielded transfers, the privacy model, architecture, and app guides.' },
  ]
}

const cards = [
  { to: '/docs/quickstart', title: 'Quickstart', body: 'Run the wallet, fund it, and make your first shielded transfer in five minutes.' },
  { to: '/docs/how-it-works/shielded-transfers', title: 'How it works', body: 'Notes, nullifiers, on-device proofs, and what each step reveals.' },
  { to: '/docs/privacy-model', title: 'Privacy model', body: 'Public in. Private through. Your call out — and the honest non-claims.' },
  { to: '/docs/architecture/overview', title: 'Architecture', body: 'The monorepo, the proving stack, and the services behind the wallet.' },
]

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col items-center justify-center text-center flex-1 px-4 py-24">
        <span className="font-mono text-xs tracking-[0.16em] uppercase text-fd-primary mb-5">
          Shielded payments on Stellar
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 max-w-xl">
          The ZK Freighter documentation
        </h1>
        <p className="text-fd-muted-foreground mb-8 max-w-lg">
          A self-custody wallet for shielded XLM and USDC transfers — proofs on your device,
          public boundaries named every time.
        </p>
        <Link
          className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-semibold px-5 py-3 shadow-[0_16px_34px_-14px_rgba(94,124,250,.8)]"
          to="/docs"
        >
          Start reading
        </Link>
        <div className="grid gap-3 mt-14 w-full max-w-3xl sm:grid-cols-2 text-left">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-xl border border-fd-border bg-fd-card p-5 transition-colors hover:border-fd-primary/50"
            >
              <span className="font-bold">{card.title}</span>
              <p className="text-sm text-fd-muted-foreground mt-1.5">{card.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </HomeLayout>
  )
}

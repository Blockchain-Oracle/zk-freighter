# Product Win Definition

## Rule

ZK Freighter wins when:

`Win = judge can try it in 30 seconds x chain tools are obviously necessary x it looks like a real product, not a demo`

This is the product acceptance rubric for future planning and implementation. Evidence still matters, but evidence is not enough if the live path requires manual funding, stale local setup, hidden scripts, or explanation before the user can act.

## What This Means

- A first-time judge should create or unlock a wallet, get usable testnet funds, and start a real shield/send path without leaving the product.
- Funding XLM and USDC is part of onboarding, not a README chore.
- Shielded balance recovery must not depend on public RPC history luck. The private runtime needs durable pool-event recovery through a bootnode/archive indexer or equivalent.
- The product must make Stellar/ZK feel necessary: client-side proof generation, Soroban proof verification, shielded transfers, public boundary warnings, and user-held disclosure are the core story.
- UI quality is part of correctness. The wallet should feel like a compact product wallet with clear navigation, real status, real balances, and no dead clicks.
- Demo evidence remains useful only as a fallback or verification drawer, not as the primary user journey.

## Immediate Product Implications

- Replace "local demo funder" dependency with a real testnet funding service that delivers XLM, prepares USDC receiving, sends USDC, returns real transaction hashes, and records Activity.
- Wire Nethermind runtime event recovery to a bootnode/archive indexer instead of relying only on short-window public RPC `getEvents`.
- Keep mobile deferred until web and extension share stable funding/indexing endpoints. Mobile should not duplicate broken infrastructure assumptions.
- Treat passkeys as optional convenience until the seed/vault/funding/proving path is reliable.

## Sources

- Hackathon/product bar: `.thoughts/research/exploratory/06-hackathon-brief.md`
- Locked product spec: `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`
- MVP stories: `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`
- Privacy wallet UX research: `.thoughts/research/exploratory/04-privacy-wallet-prior-art.md`
- Wallet flow research: `.thoughts/research/2026-06-21-ux-flow-and-questions.md`
- Fresh pool/retention evidence: `.thoughts/research/spikes-log.md`
- Current code gaps checked on 2026-07-01: `packages/core/src/demo-funding.ts`, `packages/core/src/nethermind-runtime.ts`, `apps/extension/src/ExtensionHome.tsx`

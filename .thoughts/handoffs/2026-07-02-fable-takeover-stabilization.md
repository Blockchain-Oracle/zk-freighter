# Handoff: Fable Takeover — Phase 0 Stabilization Complete

Date: 2026-07-02 · Author: Claude (Fable) · Branch: `feat/web-wallet-redesign`

## What happened

Claude (Fable) took over the Codex-built tree (uncommitted) per Abu's instruction, audited it,
verified it end-to-end against live testnet, fixed the verified bugs, and committed the tree in
per-feature commits. The approved master plan is
`~/.claude/plans/hello-there-fable-this-keen-fox.md` (Phases 0–6: stabilize → README → landing →
docs site → premium intro/mobile motion → private↔public sends → EVM faucet).

## Verified with real transactions (2026-07-02, testnet)

- **Web e2e**: create wallet → fund → shield 1 USDC (`a2919b5a…379650`) → private transfer 0.5
  USDC (`24815639…1a7205`) → unshield 0.3 USDC (`302e2ded…927a99`). Activity/Receive/Discover/
  Disclosure/Settings all render and label boundaries correctly.
- **Extension e2e**: `pnpm extension:runtime` ok (popup, routes, module init, dApp signing fails
  closed); `pnpm extension:quickshield` ok in **one attempt** (fund `c7769e…`, access `8bcf22…`,
  shield `1bbbb945…`).
- **Mobile (browser preview)**: onboarding → fund via same-origin proxy → **first-time shield in
  one continuous run** (`dd5c10af…bc89`), all five steps.
- Gates: lint 0 errors, 8/8 typecheck, 265 tests, 8/8 builds, file-size check.

## Fixes landed in Phase 0

1. **Shield ASP gate is now one continuous run** (`packages/core/src/shield-orchestration.ts`):
   insert leaf → in-run poll `checkAspAccessIndexed` (default 6s interval, 90s budget, injectable
   sleep/now, poll-count cap) → deposit. The old "Shield access is confirming. Wait a few ledgers,
   then shield again" stop-and-retry is gone from the happy path; the blocked message remains only
   as a >budget fallback. All surfaces inherit it (web/extension/mobile share the orchestration).
2. **Bootnode warmed `getEvents`**: `oldestLedger` can never be omitted anymore (was
   `?? undefined`, which JSON-drops the key; the Nethermind Rust decoder requires u32 → "error
   decoding response body"). Regression test added. Live shape validated against
   `reference/.../rpc.rs GetEventsResponse` and the running :8788.
3. **Mobile mainnet gate** (`MobileAccess.tsx` ready step): testnet warning + "Add funds" CTA now
   gated on `network === 'testnet'`, mirroring web `OnboardingFlow.tsx`.
4. **Web manual trustline panel removed** (`UsdcReceiveSetupPanel` deleted; ReceiveScreen callout
   now says USDC receiving is automatic) — funding/shield/bridge auto-ensure the trustline on all
   surfaces; web was the odd one out and showed the panel even on mainnet.
5. **React 19 lint errors** (sync setState in effects) fixed in web HomeScreen/ReceiveScreen with
   key-tracked state.
6. **Mobile phone preview infra**: Vite same-origin proxies `/zkf-funding`, `/zkf-bootnode-testnet
   /rpc`, `/zkf-bootnode-mainnet/rpc`; scripts `dev:phone` + `tunnel` (cloudflared quick tunnel,
   installed via brew); `.trycloudflare.com` allowlisted. Verified: tunnel serves the app over
   trusted HTTPS and both proxies reach the local services. See apps/mobile/README.md.

## Not verified / open

- **Native Capacitor** (Android/iOS on device): no device/AVD attached. Phone-browser path is
  ready — run `pnpm --filter @zk-freighter/mobile dev:phone` + `tunnel`, open the URL on the phone.
- Bridge flow not re-verified this session (needs EVM funds; unchanged code).
- Copy overclaims found and NOT yet fixed (Phase 2+ work): Send review says "Visibility: Fully
  shielded" and "Nothing about this payment touches the public chain" (false — the pool tx is
  on-chain and signed by the user's account; see research note below); Settings says "developer
  evidence for judges" (judge-framing violation); WalletFlowPanels "FOR JUDGES" quarantine still
  present.
- Private↔public sends: designed, not built (Phase 5). See
  `.thoughts/research/2026-07-02-private-public-bidirectional-sends.md` — deposit-to-recipient is
  client-only work; relayer belongs in funding-api, NOT bootnode.

## Running services (local)

funding-api :8787 · bootnode testnet :8788 (warmed, Postgres) · bootnode mainnet :8789 ·
web preview :4173 (stale) · mobile dev:phone :4183. Web dev server used for verification ran on
:5199 (disposable).

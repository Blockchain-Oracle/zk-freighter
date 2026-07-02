# Handoff: ZK Freighter — privacy-by-default ZK wallet on Stellar

> For the next agent (Codex). Read this first, then the current plan, then execute the per-phase prompts in [`2026-06-22-codex-build-prompts.md`](2026-06-22-codex-build-prompts.md) **in order, one at a time** (Codex runs linearly — no parallel workflows).

## Objective
Build and ship **ZK Freighter** for **Stellar Hacks: Real-World ZK** (DoraHacks, sponsored by the Stellar Development Foundation). **Deadline: 2026-06-29 19:00 UTC.** A **privacy-by-default**, self-custody **zero-knowledge** wallet for **shielded XLM + USDC** payments on Stellar — **web app first**, Chrome extension later — reusing **Nethermind's privacy pool** as the ZK engine (we do NOT write circuits). Submission needs: public repo + README, a 2–3 min demo video, and **load-bearing ZK touching Stellar**. Testnet is acceptable; a mainnet demo is a bonus.

## Current State
- **Research: COMPLETE & verified.** Build verdict = feasible, no hard blockers → [`.thoughts/research/2026-06-21-00-INDEX-build-readiness.md`](../research/2026-06-21-00-INDEX-build-readiness.md).
- **Spec: ready** → [`.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`](../specs/2026-06-22-zk-freighter-product-spec.md).
- **Implementation plan: ready** → [`.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`](../plans/2026-06-22-zk-freighter-implementation-plan.md).
- **Earlier plan: retained for historical context** → [`.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`](../plans/2026-06-21-stellar-zk-wallet-plan.md).
- **Design: brief + paste-ready designer prompt ready** → [`.thoughts/design/2026-06-21-designer-prompt.md`](../design/2026-06-21-designer-prompt.md). **The prototype itself is NOT built yet** — a designer/AI tool produces it from the prompt. When it arrives, run the prototype-reintegration prompt before wiring UI to it.
- **Code: Phase 0 foundation started and verified.** Current scaffold: root pnpm workspace, `apps/web`, `packages/core`, typed config/evidence models, docs check, and `spikes-log.md`. No wallet funds flow, contracts, or real transactions yet. Continue at Phase 1 unless Abu asks to revisit Phase 0.
- **Reference repos** cloned in `reference/` (gitignored, on disk for grep): `stellar-private-payments` (the engine), `freighter` (UI ref), `passkey-kit`/`smart-account-kit`, `stellar-cctp`, Moonlight repos (`browser-wallet` etc. — the competitor, not ZK).

## Key Decisions (locked — do not relitigate)
1. **Privacy-by-default** — build the privacy layer only; do NOT rebuild a general public wallet. Only public moments are shield-in (deposit) and unshield-out (withdraw). Honest framing always: "shielded transfers"; **never** "anonymous"/"fully private."
2. **Real ZK** — reuse the Nethermind pool + committed proving keys; novelty = wallet/UX + compliance + bridge.
3. **Both XLM and USDC** (one pool per asset).
4. **Seed phrase is the default onboarding; passkey (Face ID) is OPTIONAL** (deterministic via WebAuthn PRF; same wallet returns only via a synced credential). **NO recovery secrets** — lose the phrase, it's gone.
5. **Web app first, extension second.**
6. **Mainnet-capable; network = config toggle** (RPC + passphrase + per-network contract-id map), no code change to switch. Aim to demo on mainnet.
7. **Bridge = Option A** (in-wallet CCTP on-ramp): connect Ethereum → burn → ~minutes attestation → mint public USDC on Stellar → **auto-prompt "Shield this now?"**. Two steps, bridge leg is public. Never build our own bridge.
8. **Ship real, network-verified; no mockups in the judged path.**

## Artifacts (read these — do NOT re-research)
- Current implementation plan: `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`
- Earlier plan retained as context: `.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`
- Build-readiness index + 8 reality briefs: `.thoughts/research/2026-06-21-00-INDEX-build-readiness.md` (+ siblings)
- Engine internals: `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
- Boundary flows (public↔private): `.thoughts/research/2026-06-21-interop-boundary-flows.md`
- Resolved facts (trustline/addresses): `.thoughts/research/2026-06-21-resolved-unknowns.md`
- Designer prompt + full brief + per-screen specs: `.thoughts/design/`
- Plain-English concept + glossary + verified facts: `docs/START-HERE-concept.md`, `docs/GLOSSARY.md`, `docs/VERIFIED-FACTS.md`
- Hackathon page snapshot: `.thoughts/research/2026-06-21-dorahacks-zk-page-snapshot.md`

## Files Changed
Historical handoff snapshot: repo `/Users/abu/dev/hackathon/stellar-zk-wallet/` then included the context docs plus Phase 0 source scaffold: root pnpm workspace, `apps/web`, `packages/core`, and `scripts/check-docs.mjs`. `reference/` remains gitignored research material. Current repo state has moved beyond this snapshot; use `AGENTS.md` and `README.md` for live state.

## Commands And Results (key reproducible facts)
- Run the reference app to learn the real client path: `cd reference/stellar-private-payments && make serve` → http://localhost:8000.
- **Deployed TESTNET XLM pool (reuse on day one):** pool `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`, verifier `CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`, asp_membership `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`, asp_non_membership `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`, XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`. `policy_tx_2_2` proving key is committed → no new ceremony for XLM.
- Deploy a USDC pool: `deploy.sh testnet --deployer <id> --asp-levels 10 --pool-levels 10 --max-deposit <n> ... classic:USDC:<issuer>:<sac_id>` (token is a deploy-time param; shared verifier/ASP).
- **Testnet USDC:** issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`. Faucet: faucet.circle.com.
- **Mainnet USDC:** issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`; SAC `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` (derived with Stellar CLI `27.0.0` and RPC-resolved on 2026-06-22; see `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`).
- **Mainnet CCTP V2 (Stellar):** TokenMessengerMinter `CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL`, MessageTransmitter `CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV`, CctpForwarder `CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T`; prod Iris `https://iris-api.circle.com`. Testnet sandbox Iris `https://iris-api-sandbox.circle.com`. Stellar CCTP domain = 27, Ethereum = 0. Pull live Sepolia V2 addresses from developers.circle.com at build time.
- Network passphrases: testnet `Test SDF Network ; September 2015`; mainnet `Public Global Stellar Network ; September 2015`. Stellar base reserve 0.5 XLM; min account balance 1 XLM; +0.5 XLM per trustline.
- Key fact: a depositor CAN shield directly to a recipient's keys; trustline is invisible (contracts hold SAC balances with no trustline; only a G-address withdraw recipient needs one — handle silently). Engine derives note(BN254)+encryption(X25519) keys from one signature; substitute our seed-derived signing (default) / passkey-PRF (optional), expanded to the 64-byte input the core asserts.

## Open Questions (FOUNDER'S calls — Codex must NOT invent answers; pause if needed)
- **Demo network: mainnet vs testnet** (testnet first; mainnet-capable from the beginning; mainnet deploy/spend requires explicit founder approval).
- **One bundled private-address string** (recommended, Railgun-`0zk` style) **vs two separate keys**.

## Risks Or Blockers
- Nethermind pool is **UNAUDITED, testnet-only**; a mainnet demo = deploy our own pool (real-money risk on unaudited code).
- Two Phase-0 spikes must be RUN (ours): in-browser **proving time/memory** benchmark; **passkey-PRF determinism** across synced/restored devices (fail-safe via envelope encryption + re-enroll).
- In-extension proving + passkey popup are the riskiest later items (Phase 6) — the **web app is the safe surface**.
- ~7-day RPC event retention (rebuild state client-side within the demo window; bootnode is future work, not MVP).
- Deadline is firm.

## Next Steps (in order)
1. Read this handoff → the current implementation plan → the research index.
2. Execute the per-phase prompts in `2026-06-22-codex-build-prompts.md`, **in order, one at a time**, reporting + stopping at each phase boundary.
3. Start at **Phase 0** (toolchain + de-risk spikes) — does NOT depend on the design prototype.
4. When the design prototype lands, run the **prototype-reintegration** prompt before building UI on it.

## Resume Prompt (paste into a fresh Codex session to kick off)
> You are taking over **ZK Freighter**, a privacy-by-default ZK wallet on Stellar, for the Stellar Hacks: Real-World ZK hackathon (deadline 2026-06-29 19:00 UTC). The project root is `/Users/abu/dev/hackathon/stellar-zk-wallet/`. **Inspect the actual repo before acting:** read `.thoughts/handoffs/2026-06-21-codex-handoff.md`, then `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`, then `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`, then `.thoughts/quality/2026-06-22-project-quality-profile.md`, then `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`, then `.thoughts/research/2026-06-21-00-INDEX-build-readiness.md`. The research is done — do not redo it; reuse it. Then execute the implementation plan linearly, starting with Phase 0. Honor the locked decisions (ZK Freighter brand; privacy-by-default; seed-default + optional passkey; no recovery secrets; both XLM+USDC; mainnet-capable via config; bridge = public CCTP then separate shield into the USDC pool, not assumed atomic auto-shield unless a custom adapter is built and tested; honest framing — never "anonymous"). Build real against Stellar testnet — no mocks in the judged path — and capture a real transaction digest as proof for each milestone. Pause and ask the founder only for: testnet/mainnet funding or keys, irreversible mainnet deploys/publishing, or the open product decisions (demo network, receive-code encoding/copy). When the designer's prototype arrives, run the prototype-reintegration prompt before wiring it in.

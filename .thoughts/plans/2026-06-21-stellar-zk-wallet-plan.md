# Plan: ZK Fighter privacy-by-default ZK wallet for Stellar

> **Superseded active-build note, 2026-06-24:** keep this older v3 plan as historical context only. The current extension direction is QuickShield + bridge companion, not a Freighter/Wallets Kit signing wallet.

> One line (honest framing): **ZK Fighter** is a **privacy-by-default**, self-custody wallet for **shielded** payments on Stellar — your identity is your private keys; the only public moments are putting money in (shield) and taking it out (unshield). We build the privacy layer, NOT a duplicate general-purpose public wallet. Built for "Stellar Hacks: Real-World ZK" (deadline 2026-06-29 19:00 UTC).
>
> v3 — corrected to the founder's point of view: privacy-by-default (no dual public wallet), seed-phrase onboarding is the DEFAULT with passkey OPTIONAL, NO recovery secrets, mainnet-capable with network-as-config, and NO assumed positioning/headline (that is the founder's to set).

## Inputs

All verified in prior research (see `.thoughts/research/` + `docs/VERIFIED-FACTS.md`):
- Reality research (8 build-readiness briefs + index), the POV briefs (`2026-06-21-pov-*`), the UX-flow brief, concept + verified-facts docs.
- Cloned reference code in `reference/`: `stellar-private-payments` (the ZK engine we reuse — Rust→WASM, Circom/Groth16, on-chain BN254 verifier, ASP contracts; testnet XLM pool already deployed), `freighter` (multi-network config + dApp-bridge reference), `passkey-kit`/`smart-account-kit`, `stellar-cctp`, Moonlight repos (competitor — not ZK).
- Already-deployed testnet XLM pool reusable on day one: pool `CDQRXOD6…S2PZF`, verifier `CBJFCMPU…X5MSZ`, asp_membership `CBULZZIA…BTKN`, asp_non_membership `CDREZXZI…K3O3`, XLM SAC `CDLZFC3S…CYSC`. `policy_tx_2_2` proving key committed → no new trusted setup for XLM.

**Locked decisions (founder):**
1. **Privacy-by-default.** We build the privacy layer only. We do NOT rebuild general public-wallet functionality (users have Freighter etc. for that). The unavoidable public edges are shield-in / unshield-out.
2. Real ZK — reuse the Nethermind pool; our novelty = the privacy wallet experience + compliance + CCTP-to-shield flow.
3. Shield **both USDC and XLM** (one pool per asset).
4. **Brand/product name:** ZK Fighter.
5. **Seed phrase is the DEFAULT onboarding** (create new / import). **Passkey is OPTIONAL** (deterministic key derivation via WebAuthn PRF; the same wallet returns only when the passkey credential is *synced* within one ecosystem). **NO recovery secrets** — lose your phrase, it's gone.
6. **Web app first, browser extension second** (extension is the riskier surface for in-browser proving + passkey).
7. **Build mainnet-capable.** Network (testnet ↔ mainnet) is a pure **config toggle** (RPC, network passphrase, per-network contract IDs) — no code change. **Aim to demo on mainnet.** Testnet stays available for dev.
8. Cross-chain USDC inflow via **Circle CCTP** — never our own bridge. MVP scope is safe two-step bridge then shield; atomic bridge-and-shield is a research spike only until proven.
9. Ship real, network-verified; **no mockups in the judged path.**

**No overclaiming.** Copy must use "shielded transfers" and avoid "anonymous" / "fully private."

## Assumptions

- We reuse the Nethermind contracts + circuits + committed proving keys as-is (confirm LICENSE; credit them). We do not write circuits.
- We reuse the Nethermind Rust/WASM prover + JS glue behind a thin TS facade. New code only where novelty lives: our own key derivation (from seed, optionally from passkey PRF), the privacy wallet UX, asset routing, compliance, network-config.
- The engine derives its note key + encryption key from one signature today (Freighter). We substitute **our own seed-derived signing** (default) and **passkey-PRF** (optional) as the key source, producing the 64-byte input the engine expects.
- Team can run the Rust/WASM/Soroban/Node toolchain.

## Open Questions (FOUNDER'S CALLS — not assumed here)

- **One bundled private-address string vs separate keys.** The engine exposes a note key + encryption key as two fields today; mature wallets bundle into one shareable string (Railgun `0zk` Bech32m is the closest analog). Recommend bundling for UX — but your call.
- **Demo network: mainnet vs testnet.** Mainnet is technically feasible (ZK host fns + USDC + CCTP all live on mainnet) but the pool is unaudited and mainnet uses real funds. We build mainnet-capable regardless; which one we *demo* on is your call.
- **Sponsor-paid fees** (app covers users' tiny Stellar fees/reserves): **milestone**, not MVP.

## Prototype Reintegration Gate

N/A — no prototype. We build against real network integrations from Phase 0.

## Submission Target & Cut Policy

- **Primary judged target = Phases 0–5** (privacy-by-default shielded loop + USDC + optional passkey + compliance + safe two-step CCTP bridge then shield).
- **Phase 6 (extension) is planned after the web flow is proven** using shared core logic. It is not allowed to become a second implementation or a fake demo surface.
- At every phase boundary there is a complete, working, demoable product. Cut from the end, never the core.

---

## Phase 0: Toolchain + de-risk spikes (time-boxed; gates everything)

### Goal
Convert the real unknowns to facts before building UX, with network-config from the start.

### Work
- **Spike 0 — toolchain green (1-day box):** clone-to-`make serve` of the Nethermind app; confirm committed proving key + vk load. Stand up a flat `apps/web` (single Vite app; no monorepo split / no extension yet) + `contracts/` for the future USDC deploy. **Wire network as config from day one** (a `networks` record: passphrase + RPC + per-network contract-ID map, mirroring Freighter's pattern) so testnet/mainnet is a toggle.
- **Spike B — in-browser proving benchmark (gates Phase 1):** measure wall-clock + peak memory for `policy_tx_2_2`. Numeric gate: PASS < ~15s / < ~2GB → normal UX; 15–45s → explicit pending UX; > 45s/OOM → smaller amounts + pre-warm.
- **Spike KD — key derivation (gates Phase 1; the core identity path):** derive the engine's note key + encryption key (64-byte input) from **our own seed phrase** (default), and ALSO from **passkey PRF** (optional). Prove: create → derive → make a note → reload → re-derive identical keys → spend. Confirm the passkey path is deterministic and document its sync-scoped recovery (no recovery secret).
- **Spike A — USDC pool round-trip (parallel with Phase 1; gates Phase 2):** deploy a USDC pool (`classic:USDC:<issuer>:<sac_id>`), resolve trustline, execute a real deposit AND withdraw with digests.
- **Spike C — CCTP (time-boxed, gates Phase 5 only):** pull live CCTP V2 addresses (testnet sandbox now; capture mainnet addresses too for later), run one bridge→mint with digests.
- **On-chain budget check:** one real `transact` against the deployed verifier confirms the ZK verify fits a transaction's budget.

### Real Integration Path / Mock Policy
Real network (testnet for dev; mainnet config validated). No mocks.

### Checks
Each spike logs a real digest in `.thoughts/research/spikes-log.md`. Fallbacks: B slow → pending UX + smaller amounts; KD passkey-PRF unavailable on a device → seed-only (still default); A fails → ship XLM-only until USDC is proven; C fails → keep the bridge UI disabled and document the failed gate instead of faking it.

### Stop Condition
Spike 0 + B + KD pass → start Phase 1.

---

## Phase 1: Onboarding + privacy-by-default shielded loop (XLM, web app)

### Goal
The familiar onboarding feel + a real **shield → private send → unshield** loop for XLM on the existing testnet pool, with the privacy-by-default identity.

### Work
- **Onboarding (default = seed phrase):** "Create new" (generate + force-backup a seed phrase) / "Import phrase". Passkey enable is an *optional* step, never required. No recovery secret.
- **Identity / private address:** derive note + encryption keys (Spike KD). Present the shareable **private address** — recommend bundling note+enc into one string (Railgun-style); decide per Open Question. The plain Stellar account is plumbing (shield/unshield + fees), not the headline.
- Thin TS facade over the Nethermind WASM prover + the already-deployed XLM pool. Index pool events client-side from RPC at session start (no bootnode; note 7-day retention as a known limit).
- **Receive/scan:** scan pool events + trial-decrypt with the encryption key; register() optional (powers a discoverable address book). **Send:** to a recipient's private address; proof in a Web Worker; pending state from Spike B.
- **Load-bearing-ZK demo beat:** submit a tampered proof, show the on-chain verifier reject it (explorer link).
- **Failure states** (ASP-not-registered, sync-required, proof failure, submit failure). **In-app disclaimer** (unaudited; network banner). **Unit tests** for key derivation + note encrypt/decrypt round-trip.

### Real Integration Path / Mock Policy
Real network XLM through the deployed pool; real client-side proofs. No mocks.

### Stop Condition
A second account receives a private send and unshields it; tampered proof rejected on-chain.

---

## Phase 2: USDC + both assets (gated on Spike A)

### Goal
Same shielded loop for USDC; clean two-pool asset model.

### Work
Wire the USDC pool; asset selector routes to the correct pool (one pool per asset). Handle USDC SAC trustline/auth.

### Mock Policy / Stop Condition
No mocks. If Spike A fails → ship XLM-only, label USDC in-progress. Done when both private loops work.

---

## Phase 3: Optional passkey enhancement

### Goal
Let users who want it enable **passkey unlock + passkey-derived identity** — as an *option*, not the default.

### Work
- Passkey enable flow (PRF-derived keys from Spike KD); passkey unlock for daily use; document the sync-scoped behavior honestly. **No recovery secret** — seed phrase remains the only recovery.
- Optional passkey *smart account* for on-chain auth only if it doesn't complicate the seed-default path (else defer).

### Mock Policy / Stop Condition
No mocks. Device without PRF → seed-only path (already the default). Done when a user can opt into passkey and reconstruct the same wallet via a synced credential.

---

## Phase 4: Compliance — user-held view keys / selective disclosure (END of primary target)

### Goal
User-controlled disclosure (vs Moonlight's custodial logging).

### Work
Export a viewing key (auditor read-only) + generate an audit/selective-disclosure proof using the pool's ASP machinery. (No ASP operator page.)

### Stop Condition
View-key export + one working disclosure proof demonstrated.

---

## Phase 5: Cross-chain inflow (CCTP USDC → shield)

### Goal / Work
Guided flow: bridge USDC in (CCTP) → shield. Two honest steps; progress timeline with real explorer links. Bridge leg labeled public.

### Mock Policy / Stop Condition
Real on the chosen network. Done when bridge→shield runs end-to-end with explorer links. If the CCTP gate fails, the UI must remain disabled and the failure must be documented; never fake bridge state.

---

## Phase 6: Browser-extension surface

### Goal / Work
Reuse the web core in a WXT extension. Solve the two flagged catches (proving in an offscreen document, not the MV3 service worker; passkey ceremony in a tab/side-panel, not the action popup). This older plan's Wallets Kit/dApp-signing direction is superseded; active extension work is receive, QuickShield, bridge handoff, and fail-closed detection/network probes only.

### Mock Policy / Stop Condition
No mocks. The extension may be claimed only after the real shared core, prover runtime, and passkey ceremonies work in the extension constraints. If unsolved, web remains the judged surface and extension is labeled in-progress.

---

## Phase 7: Submission polish + (aim) mainnet demo

### Goal / Work
- **Network = config** already; **deploy the pool stack to mainnet** (funded XLM deployer; ~4 deploys sharing one VK; populate ASP) and run the demo on mainnet if green — a strong "we took it far" signal. Keep testnet as fallback.
- Public repo + README (architecture, real-vs-network, credits, unaudited disclaimer). 2–3 min demo video (script below). Submit on DoraHacks before 19:00 UTC (front-load license/credits/disclaimers).

### Stop Condition
Submission accepted with all artifacts.

---

## Demo Script (2–3 min)
1. **Hook:** onboard with a seed phrase (familiar), optionally enable Face ID; show the private address. State what Moonlight lacks: real ZK, no mandatory relayer, USDC, user-held compliance. Credit Nethermind.
2. **Load-bearing ZK:** shield → private send (real proof) → recipient receives privately → unshield. Then submit a **tampered proof** and show the on-chain verifier **reject** it.
3. **Compliance:** export a view key; auditor reconstructs history read-only + a disclosure proof. End on this climax.
4. **Real-world proof:** show CCTP USDC origin if green, and mainnet only if explicitly approved and safely funded.
- Honest copy throughout: "shielded transfers," public shield/unshield edges, unaudited.

## Verification Checkpoint
- Real digests/explorer links per phase (evidence before assertions). No mocks in the judged path. ZK proven load-bearing (real proof verified on-chain + tampered proof rejected). Honest framing scrub. Key-derivation unit tests pass (fund-loss guard). Confirm network-config toggles cleanly testnet↔mainnet.

## Handoff Notes
- **Critical path:** Spike 0 + B + KD → Phase 1 (onboarding + XLM loop) → Phase 2 (USDC) → Phase 4 (compliance) → Phase 5 (safe CCTP bridge then shield). Passkey (Phase 3) is an optional enhancement, not a gate.
- **After web core:** Phase 6 (extension) uses shared core logic and must pass WXT/MV3 prover packaging checks before any extension claim.
- **Founder's open calls:** one-string address vs two keys, demo network (mainnet vs testnet), exact publishing/discoverability copy.
- **Removed assumptions (vs earlier drafts):** invented "private USDC headline"; dual public/private "two tabs" framing; recovery secrets; testnet-only.
- **Do not start implementation until the founder approves.**

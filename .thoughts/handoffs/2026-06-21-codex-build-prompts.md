# ZK Fighter — Codex build prompts (linear)

> **SUPERSEDED:** Use `2026-06-22-codex-build-prompts.md` for the current build sequence. This file is retained only as historical context from the earlier handoff package. Its extension/Wallets Kit signing direction is no longer active; the current extension track is QuickShield + bridge companion with fail-closed dApp detection.

These replace the parallel workflows used during research. **Codex runs linearly, so run these one at a time, in order.** Paste the block under each "▶ PASTE TO CODEX", let Codex finish + report, then paste the next.

Read the handoff first: [`2026-06-21-codex-handoff.md`](2026-06-21-codex-handoff.md). The plan is the source of truth: [`../plans/2026-06-21-stellar-zk-wallet-plan.md`](../plans/2026-06-21-stellar-zk-wallet-plan.md).

---

## Global guardrails (apply to EVERY prompt below)
- **Honest framing always:** "shielded transfers." Deposits/withdrawals are public. **Never** write "anonymous"/"fully private."
- **No mocks in the judged path.** Build real against Stellar **testnet**; capture a real **transaction digest / explorer link** as proof of each milestone.
- **Reuse, don't reinvent:** the Nethermind pool (in `reference/stellar-private-payments`) is the ZK engine + has committed proving keys. Don't write circuits. Wrap its Rust→WASM prover behind a thin TS facade; write new code only where novelty lives.
- **Honor the locked decisions** (handoff §Key Decisions). **Network = config** from day one.
- **Files small & clean; structured logging; named constants.** Follow honest, simple code.
- **Pause and ask the founder only for:** testnet/mainnet funding or keys; irreversible mainnet deploy/publish; or the 3 open product decisions (final name, demo network, address format). Otherwise keep going.
- **At each phase end:** report what shipped + the proof (digest/links), update `.thoughts/research/spikes-log.md` or a short progress note, then STOP for the next prompt.

---

## Prompt 1 — Phase 0: Toolchain + de-risk spikes
▶ PASTE TO CODEX:
> Execute **Phase 0** of `.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`. First read that phase + `.thoughts/research/2026-06-21-soroban-toolchain.md`, `2026-06-21-client-zk-proving.md`, `2026-06-21-resolved-unknowns.md`, `2026-06-21-passkey-prf.md`.
> Do, in order:
> 1. `git init` the repo. Scaffold a single Vite + React + TypeScript **web app** at `apps/web` (no monorepo split, no extension yet) and a `contracts/` dir for a future USDC pool deploy. Wire **network as config** from the start: a `networks` record (passphrase + Soroban RPC + per-network contract-id map) selected by one key, mirroring `reference/freighter` patterns. Add testnet config using the deployed XLM pool ids in the handoff.
> 2. Get the reference engine running locally (`cd reference/stellar-private-payments && make serve`) to learn the real client path (key derivation → indexing → witness → proof → `transact`).
> 3. **Spike B (proving benchmark):** measure wall-clock + peak memory for `policy_tx_2_2` proving in a browser Web Worker. Record the number. Gate: <~15s/<~2GB = normal UX; 15–45s = design a pending state; >45s/OOM = smaller demo amounts + pre-warm.
> 4. **Spike KD (key derivation):** derive the engine's note(BN254)+encryption(X25519) keys from OUR OWN seed phrase (default), HKDF-expanded to the 64-byte input the core asserts (`reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs`). Prove: create → derive → make a note → reload → re-derive identical keys → spend. (Passkey-PRF path is Phase 3.)
> 5. **On-chain budget check:** submit one real `transact` against the deployed testnet verifier; confirm it fits a transaction's resource budget.
> Acceptance: app boots; `make serve` reference runs; Spike B has a recorded number; Spike KD round-trips deterministically; one real testnet `transact` digest captured. Log results to `.thoughts/research/spikes-log.md`. Pause only if testnet funding/keys are missing. Then report + stop.

---

## Prompt 2 — Phase 1: Onboarding + privacy-by-default shielded loop (XLM)
▶ PASTE TO CODEX:
> Execute **Phase 1** of the plan. Read that phase + `.thoughts/research/2026-06-21-interop-boundary-flows.md`, `2026-06-21-nethermind-privacy-pool.md`, and the design specs `.thoughts/design/screens/2026-06-21-{onboarding,unlock-home,receive,send,shield-unshield,activity}.md`.
> Build, against the **already-deployed testnet XLM pool** (handoff ids — do NOT redeploy):
> 1. **Onboarding (default = seed phrase):** create new (set password → generate 12-word seed → pre-reveal explainer → reveal+copy → confirm-the-phrase) and import. Passkey is NOT here yet. No recovery secret — say so honestly.
> 2. **Identity / private address:** derive note+enc keys (Spike KD); present one shareable private address (Railgun-`0zk` style bundle is recommended — confirm with founder if unsure). Plain Stellar account is plumbing only.
> 3. Thin TS facade over the Nethermind WASM prover; index pool events client-side from Soroban RPC at session start (no bootnode).
> 4. **Shield → private send → unshield** loop for XLM on testnet (real proofs in a Web Worker; honest pending-proof state; Pending-vs-Spendable balance split).
> 5. **Receive/scan** (trial-decrypt with the enc key; optional `register()`); **Send** to a private address.
> 6. **Load-bearing-ZK demo beat:** submit a tampered proof; show the on-chain verifier REJECT it (capture explorer link).
> 7. Failure states (ASP-not-registered, sync-required, proof failure); in-app unaudited/testnet disclaimer; unit tests for key-derivation + note encrypt/decrypt round-trip.
> Acceptance: a second account receives a private send and unshields it on testnet (real digests); tampered-proof rejection demonstrated. Report + stop.

---

## Prompt 3 — Phase 2: USDC + both assets
▶ PASTE TO CODEX:
> Execute **Phase 2**. Read that phase + `.thoughts/research/2026-06-21-usdc-and-assets.md`, `2026-06-21-resolved-trustline-sac.md`.
> 1. Deploy a **USDC pool** on testnet (`deploy.sh ... classic:USDC:<testnet issuer>:<testnet SAC>` — ids in the handoff; shared verifier/ASP). Capture the new pool id into the network config.
> 2. Add an asset selector; route shield/send/unshield to the correct pool (one pool per asset). Handle the USDC trustline **invisibly** (set up the user's own at first receive; pre-check recipients; never show the word "trustline").
> Acceptance: USDC shield → private send → unshield round-trip on testnet (real digests), XLM still working. If the USDC SAC round-trip fails, ship XLM-only and label USDC in-progress (don't fake it). Report + stop.

---

## Prompt 4 — Phase 3: Optional passkey enhancement
▶ PASTE TO CODEX:
> Execute **Phase 3**. Read that phase + `.thoughts/research/2026-06-21-pov-passkey-determinism-truth.md`, `2026-06-21-stellar-passkey-accounts.md` (+ `reference/passkey-kit`, `reference/smart-account-kit`).
> Add an OPTIONAL "enable Face ID / passkey" path: WebAuthn PRF → HKDF → the same 64-byte key material (same wallet as the seed). Passkey unlock for daily use. **No recovery secret** — seed stays the only recovery. Document the sync-scoped behavior honestly (same wallet returns only via a synced credential; envelope-encrypt so a mismatch fails loudly with a re-enroll prompt, never silent fund loss). Device without PRF → seed-only (the default).
> Acceptance: a user can opt into passkey, lock/unlock with it, and reconstruct the same wallet via a synced credential; the seed path is untouched. Report + stop.

---

## Prompt 5 — Phase 4: Compliance — user-held view keys / selective disclosure
▶ PASTE TO CODEX:
> Execute **Phase 4**. Read that phase + `.thoughts/design/screens/2026-06-21-compliance.md`, `.thoughts/research/2026-06-21-interop-boundary-flows.md`.
> Let a user generate a **scoped disclosure proof** for one transaction/auditor (preferred; Penumbra "transaction perspective" model) and, as a demoted last resort, export a full viewing key (with blunt irreversible warnings). User-controlled, never custodial. Use the pool's existing ASP/encryption machinery. (No ASP-operator page.)
> Acceptance: an auditor with the artifact can verify a disclosed transaction read-only; the export/viewing path works. Report + stop.

---

## Prompt 6 — Phase 5: Bridge (CCTP USDC → shield), Option A in-wallet
▶ PASTE TO CODEX:
> Execute **Phase 5** after Phases 0–4 are solid. Read that phase + `.thoughts/research/2026-06-21-cctp-bridge.md`, `2026-06-21-resolved-ids-addresses.md`, and design `.thoughts/design/screens/2026-06-21-bridge.md`.
> Wire the **in-wallet** CCTP on-ramp: connect Ethereum (Sepolia for testnet — pull live Sepolia V2 addresses from developers.circle.com; domains Stellar=27, Ethereum=0) → `depositForBurn` → poll the sandbox Iris attestation → `mint_and_forward` mints public USDC on Stellar → **auto-prompt "Shield this now?"**. Two honest steps; multi-minute cross-chain progress timeline with explorer links per leg; bridge leg labeled public. Handle EVM-32-byte ↔ strkey encoding + recipient trustline.
> Acceptance: one real Sepolia→Stellar bridge→shield run with real digests. If the CCTP gate fails, keep the bridge UI disabled and document the failed gate instead of faking bridge state. Report + stop.

---

## Prompt 7 — Phase 6: Browser-extension surface
▶ PASTE TO CODEX:
> Execute **Phase 6** after the web flow is proven. Read that phase + `.thoughts/research/2026-06-21-wxt-wallet-arch.md`.
> Introduce pnpm workspaces / `packages/core`; scaffold `apps/extension` with **WXT**. Solve the two flagged catches with real spikes FIRST: run proving in an **offscreen document / dedicated worker** (NOT the MV3 service worker; CSP `wasm-unsafe-eval` + `worker-src`), and run passkey ceremonies in a **full tab / side panel** (NOT the action popup). dApp connectivity via the real `@stellar/freighter-api` postMessage protocol so Stellar Wallets Kit detects us.
> Acceptance: the core shield/send/unshield + passkey work inside the extension on testnet; or explicitly defer (the web app stands as the complete judged product — never fake it). Report + stop.

---

## Prompt 8 — Phase 7: Submission polish + (aim) mainnet demo
▶ PASTE TO CODEX:
> Execute **Phase 7**. Front-load the cheap items: confirm Nethermind's + Circle's LICENSE, add credits + the "unaudited · testnet · shielded-transfers (not fully private)" disclaimers to the README and app. If demoing on mainnet (founder decision): verify the recorded mainnet USDC SAC id from `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md` (`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`), deploy the pool stack to mainnet (funded XLM deployer — PAUSE for funding/approval), and validate the config toggle. Write the public README (architecture, real-vs-network, credits, disclaimer). Produce/assist the 2–3 min demo video per the demo script in the plan (lead with onboarding → load-bearing ZK incl. tampered-proof rejection → view-key compliance). Submit on DoraHacks before 19:00 UTC.
> Acceptance: public repo + README + video + a working deployed app, ZK visibly load-bearing. Pause for any mainnet funding/irreversible deploy. Report + stop.

---

## Prompt 9 — Prototype reintegration (run ONLY when the designer's prototype arrives)
▶ PASTE TO CODEX:
> A high-fidelity design prototype has arrived (path: ask the founder). Before wiring it in: (1) **prototype-discovery** — extract every screen, flow, state, copy, and each mocked data source / wallet action / proof surface; note deltas vs `.thoughts/design/` and the plan. (2) **prototype-reintegration** — map every mocked surface to a real decision: real MVP integration / visibly-simulated demo-only / deferred / out-of-scope / blocked. **Do not silently ship prototype mocks as real behavior.** Then update the plan/specs for accepted deltas and resume implementation, preserving the prototype's visual fidelity (don't lose screens/states/copy). Report the discovery + reintegration decisions + stop.

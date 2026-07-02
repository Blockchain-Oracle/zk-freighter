# ZK Freighter — Codex build prompts (current linear set)

These prompts are the current execution set for Codex. They supersede `2026-06-21-codex-build-prompts.md`.

Codex runs linearly. Paste one prompt, let Codex finish, verify the report, then paste the next.

## Global guardrails

Apply these to every prompt:

- Read the actual repo before acting. Current truth beats stale memory.
- Use `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md` as the phase source of truth.
- Use `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`, `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`, and `.thoughts/quality/2026-06-22-project-quality-profile.md` as gates.
- Reuse the Nethermind privacy-pool engine. Do not write new circuits for MVP.
- Honest framing: say "shielded transfers"; never claim "anonymous," "fully private," or "untraceable."
- No mocks in the judged path. Local fixtures are allowed only in tests and must not back product claims.
- Every milestone that touches chain must log evidence in `.thoughts/research/spikes-log.md`.
- Evidence means network, accounts with secrets redacted, contract IDs, transaction hashes, explorer links, before/after balances, and failure notes.
- After every feature-sized checkpoint or phase, dispatch a focused review subagent before continuing. Include feature summary, base/head SHAs or file scope, acceptance gates, tests run, evidence updates, and risk focus. Record the review outcome and fix Critical/Important findings before claiming completion.
- Pause only for funding/keys, irreversible mainnet actions, final demo network posture, or a real evidence conflict.

---

## Prompt 1 — Phase 0: Repository foundation and evidence harness

▶ PASTE TO CODEX:

> Execute Phase 0 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`
> - `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`
> - `.thoughts/quality/2026-06-22-project-quality-profile.md`
> - `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`
>
> Build only the foundation: pnpm workspace, `apps/web`, `packages/core`, strict TypeScript/lint/test/build scripts, evidence ledger, typed network/asset/evidence shapes, and docs consistency checks. Do not implement wallet funds flow yet.
>
> Acceptance: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass; `stellar --version` and `stellar network info --network testnet` are verified; `.thoughts/research/spikes-log.md` has a Phase 0 tooling entry; no funded secrets are committed. Report + stop.

---

## Prompt 2 — Phase 1: Wallet identity, receive code, and network config

▶ PASTE TO CODEX:

> Execute Phase 1 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-resolved-derivation-determinism.md`
> - `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
> - `.thoughts/design/screens/2026-06-21-onboarding.md`
> - `.thoughts/design/screens/2026-06-21-receive.md`
>
> Implement seed-backed deterministic identity, Bech32m `zkf1...` receive-code encode/decode, typed testnet/mainnet network config, feature gating for missing pools/contracts, onboarding shell, visible network mode, and raw receive-code copy/QR. Keep passkey out of this phase except as a disabled optional path.
>
> Acceptance: same seed re-derives same private receive identity after reload/import; different seed differs; receive-code encode/decode round-trips; malformed codes fail closed; network config includes verified SAC IDs; UI shows no fake balances or fake hashes. Report + stop.

---

## Prompt 3 — Phase 2: Nethermind prover facade and XLM proof benchmark

▶ PASTE TO CODEX:

> Execute Phase 2 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-client-zk-proving.md`
> - `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
> - `reference/stellar-private-payments` client/prover paths as needed.
>
> Wrap the real Nethermind browser/WASM prover behind `packages/core`, load committed `policy_tx_2_2` proving/verification assets, and benchmark proof generation in the browser target. Add proof progress state to the web app.
>
> Acceptance: real prover path is wired or a concrete failure is logged; benchmark records wall-clock/runtime/memory signal where available; build catches WASM/prover packaging issues; no mocked prover success. Report + stop.

---

## Prompt 4 — Phase 3: XLM shield, private send, and unshield

▶ PASTE TO CODEX:

> Execute Phase 3 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-interop-boundary-flows.md`
> - `.thoughts/research/2026-06-21-boundary-engine-boundary-mechanics.md`
> - `.thoughts/design/screens/2026-06-21-send.md`
> - `.thoughts/design/screens/2026-06-21-shield-unshield.md`
> - `.thoughts/design/screens/2026-06-21-activity.md`
>
> Use the deployed testnet XLM pool. Implement real shield, event scan/trial-decrypt, private send to receive code, and unshield to public Stellar address. Add activity and clear public-boundary copy.
>
> Acceptance: real XLM shield -> private send -> unshield succeeds on testnet with transaction hashes/explorer links; valid proof is accepted; tampered proof rejection or faithful rejection simulation is recorded; evidence is logged. Pause only if testnet funding/keys are missing. Report + stop.

---

## Prompt 5 — Phase 4: USDC pool and USDC private loop

▶ PASTE TO CODEX:

> Execute Phase 4 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-usdc-and-assets.md`
> - `.thoughts/research/2026-06-21-resolved-trustline-sac.md`
> - `.thoughts/research/2026-06-21-resolved-ids-addresses.md`
>
> Deploy or locate a real testnet USDC pool using the verified USDC SAC. Add USDC config, route USDC shield/private-send/unshield to the USDC pool, reproduce missing USDC receive-readiness/trustline behavior, and handle it in plain user copy.
>
> Acceptance: real USDC shield -> private send -> unshield succeeds on testnet; missing receive-readiness failure and successful ready path are both documented; XLM still works; evidence is logged. If USDC cannot be proven, disable USDC privacy features and document the failed gate. Report + stop.

---

## Prompt 6 — Phase 5: Optional public discovery

▶ PASTE TO CODEX:

> Execute Phase 5 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md` R3/R4
> - `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md` S3/S4
> - `.thoughts/design/screens/2026-06-21-receive.md`
>
> Implement opt-in public discovery/publishing using the verified engine path. Keep direct receive-code sharing as the default. Add pre-publish copy explaining that publishing does not expose keys/funds but creates a public link between public Stellar identity and private receive identity.
>
> Acceptance: direct receive still works without publishing; a user can opt into discovery; sender lookup works after publish; trade-off copy appears before submit; evidence is logged. Report + stop.

---

## Prompt 7 — Phase 6: User-held disclosure artifact

▶ PASTE TO CODEX:

> Execute Phase 6 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/design/screens/2026-06-21-compliance.md`
> - `.thoughts/research/2026-06-21-interop-boundary-flows.md`
> - Nethermind disclosure code/docs in `reference/stellar-private-payments` as needed.
>
> Implement a user-held disclosure artifact: scoped disclosure if supported by the reused engine, otherwise a clearly demoted full viewing-key export only if semantics are verified. Add reviewer/auditor verification flow and copy that ZK Freighter cannot disclose on the user's behalf.
>
> Acceptance: reviewer can inspect disclosed activity read-only; artifact cannot spend; warnings are clear; no fake auditor verification. Report + stop.

---

## Prompt 8 — Phase 7: Optional passkey

▶ PASTE TO CODEX:

> Execute Phase 7 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-pov-passkey-determinism-truth.md`
> - `.thoughts/research/2026-06-21-passkey-prf.md`
> - `.thoughts/research/2026-06-21-stellar-passkey-accounts.md`
>
> Add optional passkey setup after seed wallet exists. Use real WebAuthn PRF where supported, fail closed where unsupported/mismatched, and keep seed-only path fully functional. Record device/browser matrix before making any phone/passkey demo claim.
>
> Acceptance: seed-only still works; passkey-supported path works on an actual target browser/device; unsupported/mismatch fails closed; support matrix is logged. Report + stop.

---

## Prompt 9 — Phase 8: CCTP bridge then shield

▶ PASTE TO CODEX:

> Execute Phase 8 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-21-cctp-bridge.md`
> - `.thoughts/research/2026-06-21-resolved-ids-addresses.md`
> - `.thoughts/design/screens/2026-06-21-bridge.md`
>
> Pull current CCTP V2 testnet/Sepolia addresses at implementation time. Implement public bridge progress: source approval/burn, Circle/Iris attestation, Stellar mint/forward, then separate "Shield this now?" into the proven USDC pool.
>
> Acceptance: one real Sepolia -> Stellar testnet bridge completes with EVM hash, Iris reference, Stellar hash, public USDC balance proof, and separate USDC shield hash. If CCTP fails, keep bridge disabled and document the failed gate. Report + stop.

---

## Prompt 10 — Phase 9: Atomic bridge-and-shield research spike

▶ PASTE TO CODEX:

> Execute Phase 9 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> First read:
> - `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
> - `.thoughts/research/2026-06-21-cctp-bridge.md`
>
> Research/design only unless a concrete adapter path is proven. Do not expose atomic mode as normal MVP. If attempting an adapter, define CCTP-message binding, proof/ext-data binding, and recovery semantics before code.
>
> Acceptance: either atomic is explicitly rejected/deferred with reasons, or a real adapter passes tests and transaction evidence. No unsupported product claim. Report + stop.

---

## Prompt 11 — Phase 10: Mainnet gating and submission hardening

▶ PASTE TO CODEX:

> Execute Phase 10 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`.
>
> Verify all claims against evidence. Disable/gate unproven mainnet features. Add credits/licenses/disclaimers. Prepare public README, evidence table, production build, and demo script. Mainnet deploys/spend require explicit founder approval and small funded amounts.
>
> Acceptance: public repo/readme/app/video package is ready; evidence table has real hashes; unsupported features are labeled disabled/in-progress/excluded; no secrets committed; quality gates pass. Report + stop.

---

## Prompt 12 — Phase 11: WXT extension surface

▶ PASTE TO CODEX:

> Execute Phase 11 from `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md` only after the web flow is stable.
>
> First read:
> - `.thoughts/research/2026-06-22-wxt-extension-reality-check.md`
> - `.thoughts/research/2026-06-21-wxt-wallet-arch.md`
>
> Add or continue `apps/extension` with WXT, reusing `packages/core`. Prove the real prover in an extension page/offscreen document plus dedicated worker. Keep MV3 background as coordinator only. Run passkey ceremony in tab/side panel if passkey scope is reopened. Build the current extension direction as a receive / QuickShield / bridge-handoff companion. Keep external dapp public-key access and signing fail-closed unless Abu explicitly reopens public dApp wallet scope.
>
> Acceptance: extension build works; prover packaging works in real extension runtime; background lifetime does not break proving; dapp detection/network has a real test and access/signing fail closed; QuickShield/bridge handoff are verified or honestly blocked. If unsolved, label extension in-progress and keep web as judged surface. Report + stop.

---

## Prompt 13 — Prototype reintegration

Run only when a high-fidelity prototype arrives.

▶ PASTE TO CODEX:

> A high-fidelity design prototype has arrived at: `<path>`.
>
> Before wiring it in, run prototype discovery and prototype reintegration. Extract every screen, flow, state, copy, mocked wallet action, mocked balance, mocked proof, mocked bridge state, and mocked transaction. Classify each as real MVP integration, visibly simulated demo-only, deferred, out-of-scope, or blocked.
>
> Acceptance: reintegration report exists, accepted deltas are applied to spec/stories/plan, and no prototype mock silently ships as real product behavior. Report + stop.

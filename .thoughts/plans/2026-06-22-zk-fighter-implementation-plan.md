# Plan: ZK Fighter implementation

## Inputs

- Spec: `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- Stories: `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- Quality profile: `.thoughts/quality/2026-06-22-project-quality-profile.md`
- Research index: `.thoughts/research/2026-06-21-00-INDEX-build-readiness.md`
- Validation gates: `.thoughts/research/2026-06-22-pre-spec-validation-gates.md`
- CLI/SAC verification: `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`
- Domain readiness: `.thoughts/research/2026-06-22-domain-readiness-audit.md`
- Core engine research: `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
- Boundary flow research: `.thoughts/research/2026-06-21-interop-boundary-flows.md`
- USDC/trustline research: `.thoughts/research/2026-06-21-resolved-trustline-sac.md`
- Bridge research: `.thoughts/research/2026-06-21-cctp-bridge.md`
- Atomic bridge reality check: `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
- WXT extension reality check: `.thoughts/research/2026-06-22-wxt-extension-reality-check.md`
- Design system and screen specs: `.thoughts/design/`

Current repo reality after Phase 0:

- `apps/web` exists.
- `packages/core` exists.
- No contract scaffold.
- No git repo.
- Root pnpm workspace manifest and lockfile exist.
- `reference/` exists for study only and is gitignored.

## Assumptions

- Use **pnpm workspaces**. Abu confirmed pnpm is preferred for this workspace.
- Start with a small workspace:
  - `apps/web` for the web app.
  - `packages/core` for wallet identity, network config, receive-code handling, prover facade, and asset routing.
  - `contracts/` only when USDC pool/deployment work requires project-owned Soroban code or scripts.
  - `apps/extension` only after the web flow is proven.
- Use the Nethermind privacy-pool engine and committed proving keys. Do not write new circuits for MVP.
- Testnet is the first working network.
- Mainnet is config-gated from the start but not used for irreversible deploy/spend without explicit founder approval.
- Bridge scope is the safe two-step flow: public CCTP bridge, then separate ZK Fighter shield.
- Atomic bridge-and-shield is an experimental spike only until a custom adapter passes real tests.
- Local fixtures are allowed in unit tests. The judged path must never use mocked proofs, balances, bridge state, or transaction hashes.

## Open Questions

- Exact private receive code prefix/encoding.
- Exact label for optional public discovery, currently recommended as "Make my private code discoverable."
- Whether public discovery is enabled in the first private-send slice or immediately after direct private-code sends.
- Final demo network posture: testnet only, testnet plus one small mainnet proof, or full mainnet where deployed.
- Which mainnet features are visibly disabled if mainnet pools/contracts are not deployed by demo time.
- Whether to replace `AGENTS.md` with stable project instructions before implementation to remove stale historical scaffold memory.

## Prototype Reintegration Gate

No high-fidelity prototype exists in the repo right now.

Implementation may proceed against the design docs. If a prototype arrives later, stop before wiring it in and run:

- prototype discovery.
- prototype reintegration.
- mock-to-real classification for every screen/action/proof surface.

No prototype mock may silently ship as real wallet, proof, balance, or bridge behavior.

## Phase 0: Repository foundation and evidence harness

### Goal

Create the smallest implementation foundation that makes later phases testable without hiding real-network evidence gaps.

### Work

- Initialize git only if Abu approves or explicitly says to baseline.
- Create pnpm workspace with `apps/web` and `packages/core`.
- Add stable commands required by the quality profile:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm preview`
- Add strict TypeScript, test runner, and lint config.
- Add `.thoughts/research/spikes-log.md` evidence ledger.
- Add central `packages/core` modules for:
  - network config shape.
  - asset config shape.
  - evidence logging types.
  - error/result types.
- Add docs consistency checks for forbidden claims and stale names.

Files or areas likely affected:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `apps/web/`
- `packages/core/`
- `.thoughts/research/spikes-log.md`
- config files for TypeScript/lint/test/build.

### Real Integration Path

No funds or contracts yet. This phase proves the development harness and CLI assumptions.

### Mock/Simulation Policy

Local test fixtures are allowed. No product UI may show fake chain state as real.

### Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `stellar --version`
- `stellar network info --network testnet`
- docs consistency search for old codename, `product name TBD`, and forbidden privacy claims.

### Acceptance Criteria Covered

- A1
- quality profile local/CI command baseline.

### Stop Condition

The workspace builds cleanly, all baseline checks run, and `spikes-log.md` exists with a Phase 0 tooling entry.

## Phase 1: Wallet identity, receive code, and network config

### Goal

Prove deterministic wallet identity and receive-code behavior before any real funds touch the system.

### Work

- Implement seed-backed wallet identity derivation in `packages/core`.
- Implement private receive code encode/decode:
  - Bech32m HRP `zkf`.
  - payload version + network + 32-byte note public key + 32-byte encryption public key.
  - QR encodes the raw `zkf1...` string, not SEP-0007.
- Add typed network config for testnet/mainnet:
  - passphrase.
  - RPC URL.
  - explorer URL shape.
  - native SAC.
  - USDC issuer/SAC.
  - CCTP contracts where known.
  - pool IDs where deployed.
- Add feature gating for missing pool/contract IDs.
- Add initial web onboarding shell:
  - create/import seed.
  - recovery warning.
  - visible network mode.
  - receive-code copy/QR surface.

Files or areas likely affected:

- `packages/core/src/identity/`
- `packages/core/src/receive-code/`
- `packages/core/src/networks/`
- `apps/web/src/`

### Real Integration Path

Network config uses verified SAC IDs from research. Wallet derivation is tested locally before real use.

### Mock/Simulation Policy

UI may use local empty-state placeholders only if visibly empty/unfunded. No fake balances or transaction hashes.

### Checks

- deterministic seed vector tests.
- receive code round-trip tests.
- malformed receive-code tests.
- network config tests.
- browser smoke check for onboarding/receive screen.
- quality profile commands.

### Acceptance Criteria Covered

- A1
- A5 partial
- A7 seed-only baseline
- A10 partial
- Stories S1, S2, S3, S16

### Stop Condition

A seed import/reload derives the same private receive identity, receive code round-trips, and network gating works without touching funds.

## Phase 2: Nethermind prover facade and XLM proof benchmark

### Goal

Connect to the real Nethermind browser/WASM prover path and measure whether proof generation is viable in the target browser.

### Work

- Study the reference app client path locally from `reference/stellar-private-payments`.
- Wrap the required browser/WASM prover calls behind `packages/core` facade APIs.
- Load committed proving key and verification key for `policy_tx_2_2`.
- Add proof-generation benchmark instrumentation:
  - wall-clock time.
  - memory signal where available.
  - browser/runtime used.
- Add explicit pending/proving state model for the web app.

Files or areas likely affected:

- `packages/core/src/prover/`
- `packages/core/src/privacy-pool/`
- `apps/web/src/proof-status/`
- `.thoughts/research/spikes-log.md`

### Real Integration Path

Use the real Nethermind prover assets and browser runtime. This phase may use local proof inputs before submitting on-chain.

### Mock/Simulation Policy

No mocked prover success. If proof generation fails or is too slow, record the failure and adapt UX or scope.

### Checks

- prover facade tests where feasible.
- real proof benchmark run.
- build verifies WASM/prover packaging.
- evidence log entry with timing and runtime.

### Acceptance Criteria Covered

- A3 partial
- quality profile crypto/proof gate
- Stories S5, S6, S7, S11 groundwork

### Stop Condition

The app can generate or faithfully attempt a real proof through the Nethermind path, and benchmark results are recorded.

## Phase 3: XLM shield, private send, and unshield on testnet

### Goal

Deliver the first complete real privacy loop with XLM on Stellar testnet.

### Work

- Connect web app to Stellar testnet RPC.
- Use deployed testnet XLM pool IDs from research/config.
- Implement XLM shield/deposit UI and submit path.
- Implement event scan/trial-decrypt note discovery.
- Implement private send using recipient receive code.
- Implement unshield/withdraw to public Stellar address.
- Add activity rows for shield/send/unshield.
- Add explicit public-boundary copy for shield and unshield.

Files or areas likely affected:

- `packages/core/src/stellar/`
- `packages/core/src/privacy-pool/`
- `packages/core/src/notes/`
- `apps/web/src/features/shield/`
- `apps/web/src/features/send/`
- `apps/web/src/features/unshield/`
- `apps/web/src/features/activity/`

### Real Integration Path

Funded testnet account required. Use real testnet transactions and real pool events.

### Mock/Simulation Policy

No fake hashes, balances, proof success, or note discovery. Local tests may use fixtures, but UI judged path uses real testnet evidence.

### Checks

- unit tests for amount/asset routing and error mapping.
- valid proof accepted by testnet contract.
- private transfer between two ZK Fighter identities.
- unshield to public address.
- tampered proof rejection or faithful rejection simulation.
- evidence log with hashes/explorer links/balances.

### Acceptance Criteria Covered

- A2
- A3
- A5 direct receive path
- Stories S3, S5, S6, S7, S11

### Stop Condition

Real XLM shield -> private send -> unshield works on testnet with evidence, and tampered proof behavior is recorded.

## Phase 4: USDC pool and USDC private loop

### Goal

Make USDC a real second asset, not a copied XLM UI.

### Work

- Deploy or locate a testnet USDC pool using verified USDC SAC.
- Add USDC pool IDs to network config.
- Implement USDC shield/private-send/unshield routing.
- Reproduce missing-recipient USDC receive readiness/trustline failure.
- Add user-level copy for receive-readiness failures.
- Record successful trustline-ready withdrawal path.

Files or areas likely affected:

- `contracts/` or deployment scripts if project-owned scripts are needed.
- `packages/core/src/assets/`
- `packages/core/src/networks/`
- `packages/core/src/trustline/`
- `apps/web/src/features/shield/`
- `apps/web/src/features/unshield/`

### Real Integration Path

Use Stellar testnet, verified USDC issuer/SAC, and real deployment/transaction evidence.

### Mock/Simulation Policy

No UI claim that USDC is live until the pool exists and the round-trip works. If USDC pool deployment fails, disable USDC privacy features and document the failed gate.

### Checks

- contract/deployment checks if Rust/Soroban code exists.
- USDC pool config test.
- USDC shield/send/unshield testnet run.
- missing receive-readiness failure run.
- successful trustline-ready path run.
- evidence log with hashes/explorer links.

### Acceptance Criteria Covered

- A1
- A3
- A4
- Stories S8, S9, S10

### Stop Condition

USDC shield -> private send -> unshield works on testnet with evidence, including documented failure/success behavior around public USDC receive readiness.

## Phase 5: Optional public discovery

### Goal

Add opt-in discoverability while preserving direct private receive code as the default.

### Work

- Implement public discovery/publishing flow using the engine's `register()` path or verified equivalent.
- Add pre-publish privacy trade-off confirmation.
- Add sender lookup/use path for published receive identity.
- Keep direct private receive code available and primary.

Files or areas likely affected:

- `packages/core/src/discovery/`
- `packages/core/src/privacy-pool/`
- `apps/web/src/features/receive/`
- `apps/web/src/features/settings/`

### Real Integration Path

Use real testnet register/discovery event behavior. Record the public link evidence.

### Mock/Simulation Policy

No fake registry/discovery data in judged path. If discovery is not proven, keep this disabled and retain direct receive codes.

### Checks

- publishing confirmation copy test.
- direct receive works without publishing.
- published lookup works after opt-in.
- evidence log with event/transaction reference.

### Acceptance Criteria Covered

- A5
- Stories S3, S4

### Stop Condition

A user can receive directly without publishing and can separately opt into public discovery with clear trade-off copy.

## Phase 6: User-held disclosure artifact

### Goal

Give the user a credible read-only disclosure path without turning ZK Fighter into a custodian or monitor.

### Work

- Implement scoped disclosure artifact if supported by the reused engine path.
- If scoped disclosure cannot be completed, implement demoted full viewing-key export with blunt warnings only if research confirms the semantics.
- Add reviewer/auditor verification flow.
- Add copy stating ZK Fighter cannot disclose on the user's behalf.

Files or areas likely affected:

- `packages/core/src/disclosure/`
- `apps/web/src/features/compliance/`
- `apps/web/src/features/activity/`

### Real Integration Path

Use existing Nethermind disclosure machinery where available. Verify with real or faithfully generated user activity.

### Mock/Simulation Policy

No fake auditor verification. Demo-only sample artifacts must be labeled as local examples and excluded from judged real path.

### Checks

- disclosure artifact generation test.
- read-only verifier test.
- spend authority cannot be derived from artifact.
- UX copy check.

### Acceptance Criteria Covered

- A8
- Stories S12

### Stop Condition

An auditor/reviewer can inspect disclosed activity read-only, and the artifact cannot spend funds.

## Phase 7: Optional passkey

### Goal

Add passkey convenience without making recovery depend on passkeys.

### Work

- Implement optional passkey setup after seed wallet exists.
- Use WebAuthn PRF only where supported and verified.
- Fail closed on unsupported/mismatched PRF.
- Record device/browser support matrix before any phone/passkey demo claim.
- Keep seed-only path fully functional.

Files or areas likely affected:

- `packages/core/src/passkey/`
- `packages/core/src/identity/`
- `apps/web/src/features/security/`
- `.thoughts/research/spikes-log.md`

### Real Integration Path

Use real WebAuthn/PRF behavior in target browsers/devices. Do not infer support.

### Mock/Simulation Policy

Unit tests may mock WebAuthn interfaces. Product claims require real device/browser proof.

### Checks

- seed-only regression tests.
- supported PRF path test on actual target device/browser.
- unsupported/mismatch fail-closed test.
- support matrix logged.

### Acceptance Criteria Covered

- A7
- Stories S1, S13

### Stop Condition

Passkey is optional, verified where claimed, and seed-only remains the guaranteed recovery path.

## Phase 8: CCTP bridge then shield

### Goal

Add cross-chain USDC inflow through the safe two-step bridge flow.

### Work

- Pull current CCTP V2 testnet/Sepolia addresses at implementation time.
- Implement source approval/burn step.
- Poll Circle/Iris attestation.
- Submit Stellar mint/forward step.
- Show public bridge progress with explorer links.
- Auto-prompt user to shield newly arrived public Stellar USDC.
- Execute separate USDC shield transaction through ZK Fighter.

Files or areas likely affected:

- `packages/core/src/bridge/`
- `packages/core/src/assets/`
- `apps/web/src/features/bridge/`
- `.thoughts/research/spikes-log.md`

### Real Integration Path

Use Sepolia USDC, Circle CCTP sandbox, Stellar testnet, and the already proven USDC pool path.

### Mock/Simulation Policy

No mocked bridge state in judged path. If CCTP fails, keep bridge disabled and document the failed gate.

### Checks

- Sepolia approval/burn hash.
- Circle/Iris attestation reference.
- Stellar mint/forward hash.
- public Stellar USDC balance proof.
- separate shield transaction hash.
- UI states for multi-minute progress and failure.

### Acceptance Criteria Covered

- A6
- A4 dependency
- Stories S14

### Stop Condition

One real Sepolia -> Stellar testnet bridge completes, and the bridged USDC is shielded in a separate real transaction.

## Phase 9: Atomic bridge-and-shield research spike

### Goal

Decide whether atomic bridge-and-shield can be exposed experimentally without hallucinating unsupported behavior.

### Work

- Review stock CCTP forwarder limitations against the privacy pool `transact` entry point.
- Design a custom adapter only if binding CCTP message data to proof/ext data is concrete.
- Define recovery/revert semantics for failed shielding after mint.
- Run real tests before exposing any atomic option.

Files or areas likely affected:

- `.thoughts/research/`
- `contracts/` only if a real adapter is attempted.
- `packages/core/src/bridge/` only after adapter proof.

### Real Integration Path

Research first. Real adapter implementation only if the design is proven and time/funding permits.

### Mock/Simulation Policy

Atomic mode stays hidden/disabled/experimental until real transactions prove it.

### Checks

- design note with front-run/recovery analysis.
- adapter tests if implemented.
- real transaction evidence before any product claim.

### Acceptance Criteria Covered

- R9 guardrails
- Stories S15

### Stop Condition

Either atomic mode is explicitly rejected/deferred with reasons, or a real adapter passes evidence gates.

## Phase 10: Mainnet gating and submission hardening

### Goal

Make final claims match deployed reality and prepare the hackathon submission.

### Work

- Verify mainnet config records.
- Disable/gate unproven mainnet features.
- Add unaudited and real-funds risk copy.
- Add credits/licenses for Nethermind and Circle.
- Prepare README architecture and real-vs-network evidence.
- Produce demo script and evidence table.
- If Abu approves mainnet:
  - use small funded amounts.
  - deploy required pool IDs.
  - record mainnet hashes and explorer links.

Files or areas likely affected:

- `README.md`
- `docs/`
- `apps/web/src/`
- `.thoughts/research/spikes-log.md`
- deployment/config files.

### Real Integration Path

Testnet evidence is acceptable. Mainnet requires explicit founder approval and funding.

### Mock/Simulation Policy

No fake final submission evidence. Any unproven feature must be labeled disabled, in-progress, or excluded.

### Checks

- all quality gates.
- docs consistency checks.
- evidence table complete.
- production build.
- browser demo pass.
- public README clear and honest.

### Acceptance Criteria Covered

- A1-A8
- A10
- all non-extension MVP stories.

### Stop Condition

Submission package has public repo, README, working deployed app, demo evidence, and no unsupported claims.

## Phase 11: WXT extension surface

### Goal

Ship or prove the browser extension without creating a second wallet implementation.

### Work

- Add `apps/extension` only after web core is stable.
- Reuse `packages/core`.
- Use WXT if packaging research remains valid at implementation time.
- Run prover in extension page/offscreen document plus dedicated worker.
- Keep MV3 service worker as coordinator only.
- Run passkey ceremonies in tab/side panel, not action popup.
- Build the extension as a ZK Fighter companion for receive, QuickShield, and bridge handoff.
- Keep Freighter-style external public-key access and signing disabled unless Abu explicitly reopens public dApp wallet scope.

Files or areas likely affected:

- `apps/extension/`
- `packages/core/`
- `packages/extension-adapter/` if needed.

### Real Integration Path

Use real extension runtime constraints and a test dapp for detection/network/fail-closed behavior only. Do not claim Wallets Kit compatibility, public-key access, or signing support unless Abu explicitly reopens the public dApp wallet scope and runtime evidence is recorded.

### Mock/Simulation Policy

No fake extension proof or fake dapp bridge. If unsolved, web app remains the judged surface and extension is labeled in-progress.

### Checks

- extension build.
- prover packaging proof.
- background lifetime test.
- passkey ceremony test.
- dapp detection/network test with access/signing fail-closed.
- QuickShield/bridge handoff runtime test.

### Acceptance Criteria Covered

- A9
- Stories S17

### Stop Condition

Extension claims are backed by real runtime proof, external signing remains disabled, or the extension is explicitly deferred.

## Verification Checkpoint

Before declaring the project complete:

- Run all quality-profile checks.
- Confirm every claimed feature maps to a story and acceptance criterion.
- Confirm every real-network claim has an evidence-log entry.
- Confirm all public docs avoid unsupported privacy claims.
- Confirm no secrets or funded keys are committed.
- Confirm mainnet features are disabled unless tested and approved.
- Confirm bridge wording says public CCTP bridge then shield, unless atomic adapter was actually proven.
- Confirm extension wording says in-progress unless WXT/prover/dapp checks passed.

## Handoff Notes

- Build order is deliberately linear: foundation -> identity/config -> prover -> XLM loop -> USDC loop -> discovery -> disclosure -> passkey -> bridge -> mainnet/submission -> extension.
- The first real demoable product appears at Phase 3 with XLM.
- USDC is not considered done until trustline/readiness behavior is proven.
- Bridge is not considered done until Sepolia -> Stellar testnet -> shield has real hashes.
- Atomic bridge-and-shield is not part of normal MVP behavior unless Phase 9 proves it.
- Extension must reuse shared core logic; otherwise it is deferred.
- Pause for Abu only on funding/keys, irreversible mainnet actions, final demo network posture, or a conflict between real evidence and planned scope.

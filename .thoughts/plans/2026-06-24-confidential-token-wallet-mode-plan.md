# Plan: Confidential Token Wallet Mode

## Inputs

- Research brief: `.thoughts/research/2026-06-23-confidential-tokens-preview.md`.
- Feature memory: `.thoughts/research/2026-06-23-cross-chain-private-bridge-and-token-roadmap.md`.
- Product spec: `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`.
- Quality profile: `.thoughts/quality/2026-06-22-project-quality-profile.md`.
- OpenZeppelin reference clone: `reference/openzeppelin-stellar-contracts-confidential` at `539968f158e0`.
- Current status: ZK Fighter already has the shielded pool MVP, CCTP bridge-then-shield evidence, and Phase 11 extension scaffold. Confidential Tokens are not in the judged path yet.

## Assumptions

- Confidential Token mode is a separate privacy mode, not a replacement for `zkf1...` shielded pool transfers.
- It provides private amounts and balances between public Stellar addresses. It does not hide sender/recipient addresses.
- It must remain testnet-only and unaudited until OpenZeppelin/SDF publish audited mainnet-ready contracts.
- ZK Fighter production code must not import from `reference/`; the reference clone is for study, vectors, and attribution.
- This mode should be planned after public wallet signing foundations, because users need normal Stellar authorization plus proof-generation UX.

## Open Questions

- Is there a maintained JS/TS SDK for browser witness/proof generation, or must ZK Fighter build a local wrapper around Noir/Barretenberg artifacts?
- How are commitment openings recovered after browser storage loss: deterministic derivation, event replay, indexer, encrypted backup, or user export?
- Which assets are credible first: demo token, testnet USDC SAC wrapper, or XLM wrapper?
- Can CCTP-arrived USDC be deposited into a confidential-token wrapper without issuer/SAC authorization surprises?
- What is the minimum disclosure/auditor UX Abu wants for a demo without overloading the main wallet story?

## Prototype Reintegration Gate

No ZK Fighter Confidential Token prototype exists. The OpenZeppelin demo is a reference app, not a UI prototype for ZK Fighter.

No reference demo state, contract ID, proof result, or balance may be copied into ZK Fighter as product evidence unless ZK Fighter runs and records its own testnet proof.

## Phase 1: Reality Spike

### Goal

Prove the preview is usable from our environment before product work starts.

### Work

- Keep `reference/openzeppelin-stellar-contracts-confidential` current for the preview branch.
- Install or locate pinned `nargo 1.0.0-beta.11` and `bb 0.87.0`.
- Run Rust confidential tests and Noir circuit checks locally.
- Record proof-generation time and memory for each circuit if the toolchain runs.

### Real Integration Path

Use the OpenZeppelin branch and demo only as primary-source reference. Any testnet interaction must use ZK Fighter-owned accounts and recorded evidence.

### Mock/Simulation Policy

Reference unit tests are evidence that the preview compiles; they are not evidence that ZK Fighter supports Confidential Tokens.

### Checks

- `cargo test -p stellar-tokens confidential --manifest-path reference/openzeppelin-stellar-contracts-confidential/Cargo.toml`
- `nargo check` and `nargo test` from the confidential circuits workspace, once tools are available.
- Record tool versions and failures.

### Acceptance Criteria Covered

- Establishes whether the token mode is implementation-ready or still blocked on proof tooling.

### Stop Condition

The repo has a current research entry with local Rust + Noir/prover status and clear blockers.

## Phase 2: Wallet Domain Model

### Goal

Define the wallet state model without confusing Confidential Tokens with shielded pools.

### Work

- Add domain docs for public assets, confidential-token wrappers, and shielded pools.
- Define deterministic key derivation for confidential-token spending/viewing keys.
- Define encrypted storage for openings, event cursors, auditor metadata, and disclosure bundles.
- Define recovery behavior when local openings are unavailable.

### Real Integration Path

Use the OpenZeppelin design's key hierarchy and event model. Do not reuse Nethermind note keys unless a cryptographic derivation is explicitly justified and tested.

### Mock/Simulation Policy

Fixtures may model commitments/openings in unit tests. Product UI must not show fake private-token balances as real.

### Checks

- Unit tests for deterministic derivation and storage round-trips.
- Failure tests for missing openings and stale event cursors.

### Acceptance Criteria Covered

- Prevents wallet-state loss from becoming a hidden fund-loss risk.

### Stop Condition

ZK Fighter can represent a confidential token account, wrapper, and local opening state without chain writes.

## Phase 3: Add Token And Registration

### Goal

Let a user add a confidential-token wrapper and register their public Stellar account on testnet.

### Work

- Add a guarded "Add private token" flow for a wrapper contract ID.
- Fetch and display wrapper metadata, underlying asset, auditor registry, and verifier registry.
- Generate registration payload/proof if the SDK path exists.
- Submit `register` through the user's public Stellar account.

### Real Integration Path

Use a deployed testnet wrapper or deploy one explicitly. Record contract IDs, transaction hashes, and account state.

### Mock/Simulation Policy

No fake registration success. If proof generation is unavailable, the UI must say unsupported.

### Checks

- Contract read tests for wrapper metadata.
- Browser or CLI evidence for a real testnet `register`.

### Acceptance Criteria Covered

- Establishes the first live Confidential Token account boundary.

### Stop Condition

The wallet can show a registered confidential-token account from chain state, or the blocker is recorded.

## Phase 4: Deposit, Merge, Withdraw

### Goal

Support the simplest public-boundary flow before confidential transfers.

### Work

- Deposit public SEP-41 tokens into the wrapper.
- Track receiving commitment and local opening state.
- Merge receiving balance into spendable balance.
- Withdraw back to public SEP-41 balance with a real proof.

### Real Integration Path

Use a small testnet amount. Record before/after public balances and transaction hashes.

### Mock/Simulation Policy

No fake balances or proof success. Local fixtures are test-only.

### Checks

- Unit tests for state transitions.
- Testnet evidence for deposit, merge, and withdraw.

### Acceptance Criteria Covered

- Proves the wallet can preserve the public boundary and private balance model.

### Stop Condition

ZK Fighter can round-trip a small testnet amount through the wrapper.

## Phase 5: Confidential Transfer And Disclosure

### Goal

Support private-amount transfers and selective disclosure.

### Work

- Generate and submit `confidential_transfer`.
- Maintain sender and receiver local openings.
- Build a disclosure bundle flow for a counterparty/verifier.
- Add auditor-facing event reconstruction only if keys and indexing are available.

### Real Integration Path

Use two ZK Fighter-controlled testnet accounts. Verify recipient recovery and disclosure against chain events.

### Mock/Simulation Policy

No simulated private-token transfer in the judged path.

### Checks

- Browser proof-generation timing.
- Testnet transfer evidence.
- Disclosure verification evidence.

### Acceptance Criteria Covered

- Demonstrates the core value of Confidential Token mode.

### Stop Condition

The wallet can transfer a private amount between two public accounts and produce a verifiable disclosure.

## Phase 6: Bridge Routing Choice

### Goal

Decide how public bridge arrivals connect to privacy modes.

### Work

- Keep the proven path: CCTP arrives publicly, then user chooses a separate privacy action.
- Offer choices only after they are proven:
  - Shield into ZK Fighter privacy pool.
  - Deposit into a Confidential Token wrapper.
  - Keep public USDC.
- Do not claim atomic bridge-and-shield or atomic bridge-to-confidential-token unless a custom adapter passes real tests.

### Real Integration Path

Reuse recorded CCTP evidence only for the public bridge leg. Record separate wrapper deposit evidence if enabled.

### Mock/Simulation Policy

No fake bridge state, wrapper deposit, or atomic privacy claim.

### Checks

- End-to-end testnet evidence for the selected route.
- README copy review for public/private boundary language.

### Acceptance Criteria Covered

- Connects token privacy to the existing bridge story without overstating it.

### Stop Condition

The user can choose a proven post-bridge privacy route, or unavailable routes stay disabled.

## Verification Checkpoint

Before any public claim, audit:

- Whether the OpenZeppelin preview is still unaudited/testnet-only.
- Whether browser proof generation is real and timed.
- Whether local openings can be recovered or clearly warned about.
- Whether public addresses remain visible in copy.
- Whether every transaction hash and contract ID is recorded in `.thoughts/research/spikes-log.md`.

## Handoff Notes

- Current priority remains the extension QuickShield/bridge companion or external submission, depending on Abu's next instruction.
- Confidential Token mode is compelling, but it is a new privacy surface with new local-state risk.
- Product language: "private amounts and balances between public addresses," not "anonymous token transfers."

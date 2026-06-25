# ZK Fighter Agent Instructions

## Current Project State

- Project root: `/Users/abu/dev/hackathon/stellar-zk-wallet`.
- This repo has implemented through **Phase 11 WXT extension scaffold checkpoint**.
- Phase 8 acceptance evidence is recorded in `.thoughts/research/spikes-log.md`: real Sepolia USDC approval, CCTP burn, Iris attestation, Stellar testnet mint/forward, public USDC balance proof, ASP insertion, and separate USDC shield/deposit.
- Phase 9 decision is recorded in `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`: atomic bridge-and-shield is deferred until a custom adapter passes real tests.
- Phase 10 verification audit is recorded in `.thoughts/verification/2026-06-24-phase10-submission-hardening-audit.md`: code/docs pass gates, with external video/public-repo/final demo posture still remaining.
- Phase 11 extension audit is recorded in `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`: WXT MV3 scaffold/build, Chrome-for-Testing runtime smoke, offscreen Nethermind module initialization, extension dry proof generation, real extension QuickShield XLM and USDC shield/deposit evidence, reusable local USDC funder automation, bridge handoff runtime evidence, and a Freighter-style detection/network profile pass. External public-key access and signing are intentionally disabled because ZK Fighter is not a general public dApp signing wallet. The current extension build plan is `.thoughts/plans/2026-06-24-extension-quickshield-bridge-plan.md`.
- Mainnet readiness research is recorded in `.thoughts/research/2026-06-25-mainnet-readiness.md`: mainnet XLM/USDC SACs, Circle CCTP IDs, XLM/USDC privacy-pool deployments, real extension XLM/USDC QuickShield shield/deposits, and real mainnet XLM/USDC shielded transfer/unshield smokes are recorded. Mainnet bridge-to-shield still requires separate accepted hashes before claims.
- Confidential Token research is recorded in `.thoughts/research/2026-06-23-confidential-tokens-preview.md`, and the future wallet-mode plan is recorded in `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`. It is not part of the current judged path and must not be claimed until ZK Fighter records its own testnet evidence.
- Current implementation scaffold:
  - `apps/web`
  - `apps/extension`
  - `packages/core`
  - root `package.json`
  - root `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- Still not present:
  - no `contracts/`
  - no root `Cargo.toml`
- Local git is initialized on `main` with private GitHub remote `Blockchain-Oracle/zk-fighter`.
- `reference/` contains cloned projects for research only. It is gitignored and must not be treated as ZK Fighter source.
- `reference/openzeppelin-stellar-contracts-confidential` is the OpenZeppelin/SDF Confidential Tokens preview branch. Treat it as reference-only; do not import production code from it.

Always inspect the actual filesystem before acting. Current files beat stale memory.

## Required Read Order

Before implementation, read:

1. `README.md`
2. `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
3. `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
4. `.thoughts/quality/2026-06-22-project-quality-profile.md`
5. `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`
6. `.thoughts/handoffs/2026-06-22-codex-build-prompts.md`
7. Relevant `.thoughts/research/` and `.thoughts/design/` docs for the active phase.

## Locked Decisions

- Product name: **ZK Fighter**.
- Privacy-by-default: build the shielded privacy layer, not a general public wallet replacement.
- Seed phrase is the default recovery path.
- Passkey is optional only; no passkey-only recovery.
- No recovery secrets.
- Support both XLM and USDC as separate pools.
- Web app first.
- Extension later, reusing shared core logic. Current status: WXT MV3 scaffold/build, Chrome-for-Testing runtime smoke, offscreen dry proof generation, receive-code QR/copy, real testnet QuickShield XLM/USDC shield/deposit, real mainnet QuickShield and private-loop XLM/USDC evidence, bridge handoff runtime evidence, and Freighter-style detection/network responses that fail closed for external public-key access and signing.
- Network is config: testnet first, mainnet-capable, no source-code rewrite to switch.
- Bridge path is safe two-step CCTP then shield.
- Atomic bridge-and-shield is experimental only until a custom adapter passes real tests.
- No mocks in the judged path.
- Private receive code format is locked: Bech32m HRP `zkf`, raw `zkf1...` copied and QR encoded.

## Language Rules

- Use "shielded transfers."
- Say shield/deposit, unshield/withdraw, and bridge arrivals are public boundaries.
- Do not claim "anonymous," "fully private," or "untraceable."
- Do not use "registry" in primary UX copy; use plain language like "Make my private code discoverable."

## Evidence Rules

Every milestone that touches chain must record real evidence in:

- `.thoughts/research/spikes-log.md`

Evidence entries should include:

- date/time.
- network.
- accounts/addresses with secrets redacted.
- contract IDs.
- transaction hashes.
- explorer links.
- before/after balance notes.
- failure mode and fix, where applicable.

Do not fake transaction hashes, balances, proof results, bridge state, or mainnet support.

## Context7

Use the `ctx7` CLI to fetch current documentation whenever asked about a library, framework, SDK, API, CLI tool, or cloud service. This includes setup, configuration, version migration, API syntax, SDK usage, framework behavior, and CLI usage.

Steps:

1. Resolve library:
   - `npx ctx7@latest library <name> "<user's question>"`
2. Pick the best official match.
3. Fetch docs:
   - `npx ctx7@latest docs <libraryId> "<user's question>"`
4. Answer or implement using the fetched docs.

Do not include secrets in Context7 queries.

If Context7 fails with quota errors, tell Abu and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY`.

## Build Execution

Use the current prompt set. The remaining boundaries are external submission packaging and extension runtime proof unless Abu explicitly redirects:

- `.thoughts/handoffs/2026-06-22-codex-build-prompts.md`

The older prompt set is superseded:

- `.thoughts/handoffs/2026-06-21-codex-build-prompts.md`

Run phases linearly. Atomic bridge-and-shield is deferred; do not expose it as a normal MVP mode unless a concrete adapter path later passes real tests and transaction evidence is recorded. Extension proof/passkey claims require real Chrome runtime evidence. The current extension dApp profile is detection/network evidence only; external public-key access and signing must stay disabled unless Abu explicitly reverses that product decision after a new plan. Mainnet pool deployment, XLM/USDC QuickShield smokes, and XLM/USDC private-loop smokes are already approved and recorded; any new mainnet spend/deploy/publish still requires explicit Abu approval.

Confidential Tokens are a separate future track. If Abu asks to build them, first follow `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`: prove toolchain/browser proving, local opening recovery, and testnet transactions before changing product claims.

## Engineering Guardrails

- Use pnpm only.
- Production code must not import from `reference/`; reference material may be copied only with attribution and tests.
- Keep source files under 300 lines. Prefer smaller modules over broad files.
- Avoid unexplained magic numbers; name protocol sizes, versions, and domains as constants.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before claiming a phase complete.
- Do not show fake balances, transaction hashes, proof success, bridge state, or mainnet support.

## Post-Feature Review Gate

- After every feature-sized checkpoint or phase, dispatch a focused review subagent before moving to the next feature track.
- Feature-sized checkpoint means a phase, feature commit, new runtime/evidence command, chain-touching path, security-sensitive behavior, or user-visible workflow change.
- The review prompt must include the feature summary, base/head SHAs or file scope, acceptance requirements, and the specific risks to inspect.
- For security-sensitive work such as keys, vaults, proofs, bridges, mainnet paths, extension runtime, or secret handling, request a security/reliability-oriented review, not only a style review.
- Fix Critical and Important findings before proceeding. If a finding is intentionally not fixed, record the technical reason in the final report or a verification note.
- Tiny edits such as typo fixes, comments, copy-only tweaks that do not change claims, and narrow test-only cleanups can be batched into the nearest checkpoint review.
- Report the review outcome to Abu with the test/build evidence. Do not claim a feature checkpoint complete without this review result.

Pause only for:

- funding or private keys.
- irreversible mainnet deploy/spend/publish.
- final demo network posture.
- conflict between real evidence and planned scope.

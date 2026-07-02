# ZK Freighter Agent Instructions

## Current Project State

- Project root: `/Users/abu/dev/hackathon/stellar-zk-wallet`.
- This repo has implemented through **Phase 11 WXT extension scaffold checkpoint**.
- Phase 8 acceptance evidence is recorded in `.thoughts/research/spikes-log.md`: real Sepolia USDC approval, CCTP burn, Iris attestation, Stellar testnet mint/forward, public USDC balance proof, ASP insertion, and separate USDC shield/deposit.
- Phase 9 decision is recorded in `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`: atomic bridge-and-shield is deferred until a custom adapter passes real tests.
- Phase 10 verification audit is recorded in `.thoughts/verification/2026-06-24-phase10-submission-hardening-audit.md`: code/docs pass gates, with external video/public-repo/final demo posture still remaining.
- Phase 11 extension audit is recorded in `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`: WXT MV3 scaffold/build, Chrome-for-Testing runtime smoke, offscreen Nethermind module initialization, extension dry proof generation, real extension QuickShield XLM and USDC shield/deposit evidence, reusable local USDC funder automation, bridge handoff runtime evidence, and a Freighter-style detection/network profile pass. External public-key access and signing are intentionally disabled because ZK Freighter is not a general public dApp signing wallet. The current extension build plan is `.thoughts/plans/2026-06-24-extension-quickshield-bridge-plan.md`.
- Mainnet readiness research is recorded in `.thoughts/research/2026-06-25-mainnet-readiness.md`: mainnet XLM/USDC SACs, Circle CCTP IDs, XLM/USDC privacy-pool deployments, real extension XLM/USDC QuickShield shield/deposits, and real mainnet XLM/USDC shielded transfer/unshield smokes are recorded. Mainnet bridge-to-shield still requires separate accepted hashes before claims.
- Confidential Token research is recorded in `.thoughts/research/2026-06-23-confidential-tokens-preview.md`, and the future wallet-mode plan is recorded in `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`. It is not part of the current judged path and must not be claimed until ZK Freighter records its own testnet evidence.
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
- Local git is initialized on `main` with private GitHub remote `Blockchain-Oracle/zk-freighter`.
- `reference/` contains cloned projects for research only. It is gitignored and must not be treated as ZK Freighter source.
- `reference/openzeppelin-stellar-contracts-confidential` is the OpenZeppelin/SDF Confidential Tokens preview branch. Treat it as reference-only; do not import production code from it.

Always inspect the actual filesystem before acting. Current files beat stale memory.

## Active Redesign Build (Tailwind v4) — CURRENT FOCUS

Reimplementing the UI to the designer's **v2 high-fidelity prototype** across **web → extension → mobile**, in the existing React stack. The HTML prototype is *reference only* (never copied); only presentation changes — **all `packages/core` logic is preserved** (UI is a pure consumer of the `submit*/load*/scan*/derive*/getNetworkConfig` report objects). Approved plan: `~/.claude/plans/use-the-claude-design-mcp-ticklish-stream.md`.

- **Design source (v2):** `/Users/abu/Downloads/GitHub repository link(2)/` (quote the path in shell). Canonical tokens = its `Design System.dc.html`.
- **Grounding docs (read these):** `docs/redesign/DESIGN-MAP.md` (screen → `.dc.html`), `docs/redesign/COMPONENTS.md` (the one-of-each reusable catalog), `docs/redesign/<chunk>.md` (per-chunk build-specs).

**Non-negotiables:**
- **Stack:** Tailwind v4.3 (`@tailwindcss/vite`, no `tailwind.config.js`); map tokens with `@theme inline { --color-x: var(--x) }` (the `inline` keyword is required). Light/dark stay driven by the `ThemeProvider` div — no `dark:` variants.
- **Reuse, don't re-code:** one shared `packages/ui` component per pattern — never build a card/badge/pill/ring inline in a screen.
- **Full wallet on every surface.** Extension heavy flows (Send/Unshield/Activity/Disclosure/Discover) live in the 400px **side panel**; popup = fast glance. "Fails closed" applies ONLY to acting as an external-dApp signer (presentational), never to the wallet's own features.
- **Non-blocking + persistent Activity.** Submitting never locks the UI. Every op persists `{status,txHash}` + reconciles against the chain on app open — no Resume button. Never fake proof/balance/tx state.
- **Mobile:** Android-first; iOS + marketing landing deferred.
- Keep files **< 300 lines**; delete old implementation as each flow is migrated (no two versions).

**Per-chunk execution protocol (every chunk):** open the chunk's `.dc.html` (per DESIGN-MAP) → build with shared `packages/ui` components → `pnpm lint && typecheck && test && build` + screenshot-vs-design → commit. Run `pr-review-toolkit` sub-agents every ~2–3 chunks; security review on key/mnemonic/proof paths.

## Required Read Order

Before implementation, read:

1. `README.md`
2. `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`
3. `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`
4. `.thoughts/quality/2026-06-22-project-quality-profile.md`
5. `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`
6. `.thoughts/handoffs/2026-06-22-codex-build-prompts.md`
7. Relevant `.thoughts/research/` and `.thoughts/design/` docs for the active phase.

## Locked Decisions

- Product name: **ZK Freighter**.
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

Run phases linearly. Atomic bridge-and-shield is deferred; do not expose it as a normal MVP mode unless a concrete adapter path later passes real tests and transaction evidence is recorded. Extension proof/passkey claims require real Chrome runtime evidence. The current extension dApp profile is detection/network evidence only; external public-key access and signing must stay disabled unless Abu explicitly reverses that product decision after a new plan. Mainnet pool deployment, XLM/USDC QuickShield smokes, and XLM/USDC private-loop smokes are already approved and recorded. Mainnet is funded and mainnet spend/deploy is AUTHORIZED for producing real evidence (Abu, 2026-06-27) — do not gate on it; the only remaining mainnet pause is the final demo network posture.

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

**Funding is DONE (Abu, 2026-06-27): both testnet AND mainnet accounts are funded.** Never pause for funding, never ask Abu to fund, never treat faucets as a blocker. Deploy + spend autonomously (testnet and mainnet) and record real evidence.

Pause only for:

- a repo-public flip.
- final demo network posture / recording the demo video.
- conflict between real evidence and planned scope.

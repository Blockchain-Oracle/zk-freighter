# CLAUDE.md

## Project Snapshot

ZK Freighter is a privacy-by-default Stellar wallet for shielded XLM and USDC payments. The repo contains:

- `apps/web` - React/Vite web app.
- `apps/extension` - WXT MV3 browser extension.
- `packages/core` - shared wallet, network, proof, and transaction logic.
- `.thoughts/` - specs, research, verification notes, handoffs, and design docs.

Primary remote:

- `https://github.com/Blockchain-Oracle/zk-freighter`
- default branch: `main`

Always read `AGENTS.md` first. It is the authoritative project instruction file.

## Quality Bar — Deadline Is Not A Factor

The June 29 hackathon deadline must NEVER drive a quality or architecture decision. Do not use the deadline — or any time pressure — as a reason to mock, stub, cut corners, ship the wrong architecture, or do mediocre work. We are AI-coded and therefore fast; speed comes from execution throughput, never from lowering the bar. Build it correctly the first time and choose correctness + good architecture over shipping faster. This reinforces the no-fakes / no-mocks rules below. Do not frame plans or recommendations as "what's feasible in N days" — frame them as the best correct solution.

## Resources Abu Provides — Always Study Them

When Abu shares a link, GitHub repo, demo, or any resource, treat it as required reading. Clone repos into `reference/` (gitignored, research-only), keep them updated to the branch he names, record a short note in `.thoughts/research/`, and actually read/explore them before planning or claiming anything. Never skip a provided resource and never hallucinate about its contents — go look at the real files. If a resource cannot be fetched, say so explicitly instead of guessing. This has cost real time before; do not repeat it.

## Working Rules

- Use `pnpm` only.
- Inspect the actual repo state before acting. Current files beat stale memory.
- Do not import production code from `reference/`; it is research-only.
- Keep production source files under 300 lines.
- Do not fake balances, transaction hashes, proof success, bridge state, or mainnet support.
- Use "shielded transfers".
- Say shield/deposit, unshield/withdraw, and bridge arrivals are public boundaries.
- Do not claim "anonymous", "fully private", or "untraceable".
- Do not use "registry" in primary UX copy; use plain language such as "Make my private code discoverable".

**Funding is DONE — do not pause for it.** Both testnet AND mainnet accounts are funded (Abu, 2026-06-27). Never ask Abu to fund anything, never gate work on funding, and never treat free testnet faucets (friendbot / EVM faucets) as a blocker. Proceed with deploys + spend (testnet and mainnet) and record real evidence. Pause for Abu ONLY before: a repo-public flip, the final demo network posture, recording the demo video, or a genuine conflict between real evidence and planned scope. (Confidential Tokens stay testnet-only by sponsor/verifier-maturity constraint — that is a product rule, NOT a funding issue; testnet is the recommended demo surface.)

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Useful focused commands:

```bash
pnpm docs:check
pnpm files:check
pnpm secrets:check
pnpm extension:runtime
pnpm extension:dapp
pnpm extension:bridge
pnpm extension:quickshield
pnpm extension:quickshield:usdc
pnpm extension:private-loop:mainnet
```

Use `ctx7` for current docs whenever asked about a library, framework, SDK, API, CLI tool, or cloud service.

## Current Design Handoff

For the wallet redesign and Claude Code takeover, start here:

- `.thoughts/handoffs/2026-06-25-claude-code-design-takeover.md`
- `.thoughts/design/brief.md`
- `.thoughts/design/designer-agent-prompt.md`
- `.thoughts/design/2026-06-25-designer-brief-v2.md`
- `.thoughts/wiki/wallet-design-references.md`
- `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
- `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`

The current UI is functional scaffolding. Do not use it as visual inspiration. Use it only to understand flows, state, and data.

## Review Expectations

After feature-sized changes, dispatch a focused review subagent before moving on. For security-sensitive areas such as keys, proofs, bridge flows, mainnet paths, extension runtime, or secret handling, request a security/reliability review.

For the current design handoff, Claude Code should audit the docs, verify links and repo paths, check that product claims match evidence, and only then plan or delegate UI redesign work across web, extension, and possible mobile.

## Active Redesign Build (Tracks A/B/C)

The approved plan is the goal: `~/.claude/plans/you-re-in-plan-mode-velvet-beaver.md` — one sequenced plan, three tracks: (A) harden + ship the redesigned wallet, (B) Confidential Tokens (second privacy mode), (C) mobile. Build with Context Engineering (research → spec → stories → plan → build). The shared design system is `packages/ui`; the designer prototype lives at `/Users/abu/Downloads/GitHub repository link/` (evidence, not source of truth — keep it open, re-check per screen).

Execution rules:
- **Delete dead code as you migrate.** When a flow is rebuilt in the new design, remove the old implementation — never keep two versions, no orphaned files/CSS/helpers. The `WalletFlowPanels` "Developer · Demo evidence" quarantine is transitional only; delete each old panel once its redesigned screen lands.
- **Review cadence:** after every ~2–3 features, run a focused review with the **pr-review-toolkit** sub-agents (e.g. `pr-review-toolkit:code-reviewer`, `pr-review-toolkit:silent-failure-hunter`, `pr-review-toolkit:pr-test-analyzer`) over the diff — sub-agents, not workflows. Fix Critical/Important findings before continuing.
- Verify each feature with `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, and check each screen against its prototype counterpart.
- Surface to Abu ONLY blockers that genuinely need him: an Apple Developer account (iOS), a repo-public flip, or the demo video. **Funding (testnet + mainnet) is already provided — do not block on it, and deploy/spend autonomously to produce real evidence.**


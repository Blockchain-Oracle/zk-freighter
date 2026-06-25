# CLAUDE.md

## Project Snapshot

ZK Fighter is a privacy-by-default Stellar wallet for shielded XLM and USDC payments. The repo contains:

- `apps/web` - React/Vite web app.
- `apps/extension` - WXT MV3 browser extension.
- `packages/core` - shared wallet, network, proof, and transaction logic.
- `.thoughts/` - specs, research, verification notes, handoffs, and design docs.

Primary remote:

- `https://github.com/Blockchain-Oracle/zk-fighter`
- default branch: `main`

Always read `AGENTS.md` first. It is the authoritative project instruction file.

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

Pause for Abu before funding, private keys, irreversible mainnet deploy/spend/publish, final demo network posture, or conflicts between real evidence and planned scope.

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


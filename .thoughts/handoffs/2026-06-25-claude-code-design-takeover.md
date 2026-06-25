# Handoff: Claude Code Design Takeover

## Objective

Enable Claude Code to take over the ZK Fighter wallet redesign work, audit the current design/research handoff, verify the GitHub-visible artifacts, and plan the next design implementation or delegation workflow.

This handoff is for **review and continuation**, not a claim that the visual redesign has been implemented. The current product UI remains functional scaffolding and should not be used as visual inspiration.

## Current State

- Repo: `https://github.com/Blockchain-Oracle/zk-fighter`
- Branch: `main`
- Current remote head at handoff time: `fa12c4fadae0173b58a3eb0eaa813f7e171fb794`
- Local branch was clean before creating this handoff.
- Current product surfaces:
  - `apps/web`: full web wallet scaffold.
  - `apps/extension`: WXT MV3 browser extension scaffold.
  - mobile app: not implemented; planned as possible future surface.
- Current design packet exists and is pushed:
  - `bc219a5 docs: add wallet UX research notes`
  - `fa12c4f docs: add GitHub designer agent prompt`

## Key Decisions

- ZK Fighter remains a privacy-by-default Stellar wallet for shielded XLM and USDC payments, not a general public wallet replacement.
- The redesign covers three surfaces: web app, browser extension, and possible mobile app.
- The web app is the primary full product surface.
- The extension is a companion for receive, QuickShield, and bridge handoff. It is not an external public dApp signing wallet.
- Mobile is future direction only unless Abu explicitly asks to build it.
- Designers and agents must not take visual inspiration from the current UI. The current UI is functional proof/evidence scaffolding.
- The designer owns visual style. The docs intentionally avoid prescribing colors, typography, or aesthetic direction.
- Product language must preserve public/private boundaries:
  - Use "shielded transfers".
  - Say shield/deposit, unshield/withdraw, and bridge arrivals are public boundaries.
  - Do not claim "anonymous", "fully private", or "untraceable".
  - Do not use "registry" in primary UX copy; use plain language like "Make my private code discoverable".

## Artifacts

Start here:

- `CLAUDE.md` - concise Claude Code project entrypoint.
- `AGENTS.md` - authoritative project instructions and current repo state.
- `.thoughts/design/brief.md` - single-file designer/design-agent start point.
- `.thoughts/design/designer-agent-prompt.md` - copy-ready prompt for a GitHub-connected designer agent.
- `.thoughts/design/2026-06-25-designer-brief-v2.md` - detailed product/UX brief.
- `.thoughts/wiki/wallet-design-references.md` - wallet reference wiki with screen-to-reference mapping.
- `.thoughts/research/2026-06-25-wallet-ux-reference-research.md` - research synthesis with verified facts, inferences, unknowns, and non-included items.
- `.thoughts/raw/2026-06-25-wallet-design-research-sources.md` - raw source and URL index.
- `.thoughts/wiki/index.md` and `.thoughts/wiki/log.md` - persistent wiki entrypoints.

Core product context:

- `README.md`
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- `.thoughts/quality/2026-06-22-project-quality-profile.md`
- `.thoughts/research/2026-06-25-mainnet-readiness.md`
- `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`
- `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`

Code paths to inspect for product reality:

- `apps/web/src/App.tsx`
- `apps/web/src/WalletFlowPanels.tsx`
- `apps/web/src/BridgePanel.tsx`
- `apps/extension/src/ExtensionApp.tsx`
- `apps/extension/src/ExtensionQuickShieldPanel.tsx`
- `apps/extension/src/ExtensionBridgePanel.tsx`
- `packages/core/src/receive-code.ts`
- `packages/core/src/networks.ts`

## Files Changed

Research/design packet commit `bc219a5`:

- `.thoughts/design/2026-06-25-designer-brief-v2.md`
- `.thoughts/design/brief.md`
- `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`
- `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
- `.thoughts/wiki/index.md`
- `.thoughts/wiki/log.md`
- `.thoughts/wiki/wallet-design-references.md`

GitHub designer prompt commit `fa12c4f`:

- `.thoughts/design/brief.md`
- `.thoughts/design/designer-agent-prompt.md`
- `.thoughts/wiki/index.md`
- `.thoughts/wiki/log.md`

This handoff pass adds:

- `CLAUDE.md`
- `.thoughts/handoffs/2026-06-25-claude-code-design-takeover.md`

## Commands And Results

Commands already run successfully during this design/research pass:

```bash
pnpm docs:check
pnpm files:check
pnpm lint
git ls-remote --heads origin main
git push origin main
```

Known successful results:

- `pnpm lint` passed after the design packet and GitHub prompt work.
- `pnpm lint` includes package lint, docs check, file-size check, and secret scan.
- `origin/main` was verified at `fa12c4fadae0173b58a3eb0eaa813f7e171fb794` before this handoff pass.

Claude should rerun relevant gates after reading this handoff, especially after any new edits.

## Audit Checklist For Claude Code

1. Verify GitHub state:
   - Confirm `origin/main` includes `bc219a5` and `fa12c4f`.
   - Confirm this handoff commit is present if Abu has pushed it.
2. Read `AGENTS.md` and `CLAUDE.md`.
3. Read `.thoughts/design/brief.md` and confirm it points to the full packet.
4. Audit `.thoughts/design/designer-agent-prompt.md`:
   - It must tell a GitHub-connected agent to inspect `https://github.com/Blockchain-Oracle/zk-fighter`.
   - It must tell the agent to clone locally if possible.
   - It must warn not to use current UI as visual inspiration.
   - It must cover web app, browser extension, and possible mobile app.
5. Audit `.thoughts/design/2026-06-25-designer-brief-v2.md`:
   - Verify flows are complete: onboarding, receive, send, shield, unshield, bridge, activity, disclosure, settings.
   - Verify address formats: `zkf1...`, `G...`, `C...`, `0x...`.
   - Verify public/private boundary language is correct.
   - Verify no colors or rigid visual style are prescribed.
6. Audit `.thoughts/wiki/wallet-design-references.md` and `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`:
   - Check that UI inspiration links are usable.
   - Separate source-inspectable repos from visual-only references.
   - Confirm local reference paths are accurate.
7. Dispatch focused subagents if available:
   - Design brief auditor: completeness, clarity, and creative freedom.
   - Product truth auditor: claims, evidence boundaries, language rules.
   - Reference auditor: external links, GitHub repos, wallet categories, missing high-value references.
   - Implementation planner: how to translate the brief into web/extension/mobile UI work without copying current UI.
8. Run verification:
   - `pnpm lint`
   - optional docs-only focused checks: `pnpm docs:check`, `pnpm files:check`, `pnpm secrets:check`

## Open Questions

- Should the designer produce only app surfaces, or also a public landing/demo page?
- Should the first prototype treat extension as part of final demo or companion/future surface?
- Should mobile be full-fidelity, focused QuickShield/receive, or lower-fidelity future direction?
- How visible should public discovery be in the first redesign?
- What final demo network posture should screens assume: testnet-first, mainnet evidence view, or both?
- Should broad disclosure export be in the prototype, or only scoped disclosure proof?

## Risks Or Blockers

- The current UI is poor and should not anchor the redesign. Claude must treat it as product-state reference only.
- Some wallet references are source-inspectable but not permissively reusable. Do not copy code or protected assets.
- Some references are visual-only or closed-source. Use for UX inspiration only.
- Mainnet claims must match recorded evidence. Do not invent mainnet support or fake hashes.
- The extension must not drift into a general public signing wallet unless Abu explicitly changes that product decision.
- Atomic bridge-and-shield remains deferred.

## Next Steps

1. Pull latest `main` from GitHub.
2. Read `CLAUDE.md`, `AGENTS.md`, and this handoff.
3. Audit the design packet and GitHub designer prompt.
4. Dispatch review subagents for design/product truth/reference coverage if available.
5. Report findings to Abu:
   - what is solid,
   - what needs correction,
   - what should be added before giving the prompt to a designer.
6. If the packet passes, create the next implementation plan for redesigning:
   - web app,
   - browser extension,
   - possible mobile app direction.
7. Only then begin UI implementation or designer-agent handoff.

## Resume Prompt

Claude Code, take over the ZK Fighter wallet redesign handoff. Pull `https://github.com/Blockchain-Oracle/zk-fighter` on `main`, read `CLAUDE.md`, `AGENTS.md`, and `.thoughts/handoffs/2026-06-25-claude-code-design-takeover.md`, then audit the design packet and GitHub designer-agent prompt. Verify the brief covers web, extension, and possible mobile; verify the external wallet references and product-claim boundaries; dispatch focused review subagents if available; run the repo checks; then tell Abu what is ready, what needs correction, and the next implementation workflow.


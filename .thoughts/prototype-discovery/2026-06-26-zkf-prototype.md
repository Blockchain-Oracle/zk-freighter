# Prototype Discovery: ZK Freighter (Onboarding · Wallet · Extension · Mobile)

Prototype is **evidence, not source of truth**. Translate to our React stack (React 19 / Vite); never copy the `.dc.html`. Keep open as a living reference; flag designer omissions/mistakes.

## Prototype Inspected
- `/Users/abu/Downloads/GitHub repository link/`: `ZK Freighter Onboarding.dc.html`, `ZK Freighter Wallet.dc.html`, `ZK Freighter Extension.dc.html`, `ZK Freighter Mobile.dc.html`, `support.js` (a generic "dc-runtime" — `<x-dc>` template + `DCLogic` React-ish component; not design content). An inner `.thoughts/` mirrors our older design docs.

## Design System (shared by all four)
- Fonts: Hanken Grotesk (UI) + IBM Plex Mono (addresses/labels). Dark-first + light theme.
- Tokens: `--bg/page/card/card2`, `--bd/bd2`, `--tx/tx2/tx3`, `--ac #5E7CFA`, `--ac2`, `--pos #35C77B`, `--warn #E5B45C`, `--pub` (public-boundary color), `--usdc`. Rounded cards (10–24px), tabular-nums balances.
- Recurring components: balance header, status pills (PROVING/CONFIRMED/SPENDABLE/BRIDGING/PENDING), PUBLIC / REVEALS-INFO badges, proving ring (% + staged rows "keep tab open"), amount entry, review card, QR + code card, public-boundary callouts, activity row, theme toggle.

## Screen Map
- **Onboarding**: Welcome → Create(password+terms → reveal 12 words tap-to-reveal+copy → confirm words 3/7/11 → optional passkey → done) / Import(12 cells/paste → … → done) → Unlock(password + Face ID, TESTNET pill, restore-from-phrase). Progress bar.
- **Web Wallet** (1180px, sidebar SPA): nav = Home / Activity / Receive / Disclosure / Settings; account chip + theme + lock. Flows: Home (balance + spendable/pending + 5 circular actions + "available to shield" public card + activity preview), Receive (Private-code vs Public-address tabs, QR, "Make my code discoverable" toggle), Activity (Today/Earlier, explorer links on public legs), Send (recipient→amount→review→proving→done), Shield (amount→review→run→done), Unshield (dest→amount→review w/ REVEALS-INFO ack→run→done), Bridge/Add-funds (source chain→amount→connect EVM→review→timeline→arrived→shield), Settings (account/rename, security: reveal-phrase/change-pw/auto-lock/passkey, network testnet/mainnet w/ caution, disclosure, about, lock), Disclosure (hub: scoped-disclosure RECOMMENDED vs export-viewing-key → scope(pick txs)→details(label/expiry)→run→artifact(QR+link) ; verify-as-auditor).
- **Extension** (384×600 popup, bottom nav Home/Receive/Shield/Bridge/Status): Locked/unlock; Home (balance, QuickShield, Receive, Bridge card, Full-wallet/Side-panel, Status); Receive (QR+code+public addr); QuickShield (asset→amount→run→done); Bridge (CURRENTLY handoff → CHANGE per A6); Status & safety (prover ready, offscreen, network, readiness digest, dApp-signing fail-closed, appearance, side panel, lock).
- **Mobile** (phone frame, bottom nav Home/Receive/Scan-FAB/Activity/More): Home, Scan-to-send (QR + torch + paste), Receive, Shield, Unshield, Bridge (self-contained amount→timeline→arrived→shield), Disclosure (hub/scope/run/artifact/verify/verified), More (links + theme + network + "open full web wallet"), Activity; Send via bottom-sheet.

## User Flows (key decision points)
- Receive is a deliberate fork: Private code (zkf1…, shielded) vs Public address (G…, public boundary) — strong, keep.
- Unshield + Bridge gate on explicit "this is public / reveals info" acknowledgment.
- Bridge is always two-step (public CCTP → separate shield); "atomic bridge-and-shield isn't available" stated.
- Proving is a first-class state (ring + stages) across send/shield/unshield/disclosure.

## Revealed Product Requirements
- Real shielded-balance + spendable/pending split + activity (the current code lacks a real balance/activity view).
- Routing/navigation (current web is a flat grid).
- Disclosure UX with scoped-vs-full distinction + expiry + verify-as-auditor.
- Self-contained extension (transactions + bridging in-extension) — Abu's explicit correction.

## Revealed Technical Requirements
- A shared design-system package (tokens + primitives) consumed by 3 shells.
- Proving-progress wired to real prover `onStatus` events (not timers).
- WalletConnect (or equivalent) for in-extension / mobile EVM bridge signing (no injected provider).
- QR scan (mobile), QR render (all) — `qrcode.react` already present.

## Data Model Candidates (already exist in core)
- Notes/balances → `loadXlmShieldedNotes`/`loadAssetShieldedNotes`. Identity/addresses → `identity.ts`/`receive-code.ts`. Activity → pool events. Disclosure → `disclosure.ts`. Bridge → `cctp-bridge`/`cctp-stellar`.

## Mocked Prototype Surfaces (→ reintegration)
- All balances/addresses/activity/proving timers = DEMO/DEMO DATA/PROOF TIMING SIMULATED. Wire to real engines (see plan "Mock→Real").

## Required Prototype Reintegration
- **Remove (noise/mistakes):** extension "punt to web app" for its own tx/bridging; mobile "open full web wallet" as primary; flat dev-panel grid; mock pills. Quarantine tampered-proof/demo-evidence to a Settings dev area.
- **Add (designer gaps):** error states (wrong password, failed/rejected proof, failed submit, insufficient balance, USDC trustline-needed, RPC/bridge errors), real loading/empty states, import device-password step, **Confidential-Token mode (absent)**, extension-native bridge UI.

## Auth / Permissions / Security
- Seed = recovery; passkey = convenience only; password = device unlock. Extension keeps external dApp signing fail-closed (a feature — keep). Unshield/bridge public-boundary acknowledgments.

## State And Edge Cases (add beyond prototype's happy paths)
- Loading (notes/balance/activity/bridge poll), empty (no activity/notes/disclosures), error (above), disabled (insufficient/mainnet-gated), success, proving/pending, bridging.

## Target-stack Translation
- `packages/ui` (tokens + ThemeProvider via CSS vars + primitives). Web = sidebar SPA + routes. Extension = popup + bottom nav. Mobile = Capacitor shell + bottom nav + sheets. All reuse `packages/core`.

## Spec / Story / Plan / Quality Deltas
- Spec: add confidential-token mode (Track B B-S); add explicit error/loading/empty-state requirements; extension self-contained (supersedes handoff). 
- Quality: add visual-fidelity check (screen vs prototype) + state-coverage to gates.

## Open Questions
- Mobile: shared `packages/ui` + per-surface shells (recommended) vs one responsive layout.
- Bridge connection: WalletConnect (recommended) vs injected provider.
- Where confidential-token mode sits in the shell (resolve in B-S, following existing patterns).

## Evidence
First-hand reads of all four `.dc.html` files + `support.js` (this session). Cross-referenced with `.thoughts/research/2026-06-25-zkf-reality-audit-and-context.md`.

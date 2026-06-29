# ZK Fighter — Product Spec (for the redesign)

> **Who this is for:** the designer redesigning ZK Fighter from scratch (landing page, web app, mobile app, browser extension). It describes **what actually exists today**, in plain language, so the new designs stay true to the product.
>
> **Accuracy promise:** this doc favors *accurate over aspirational*. Where something is planned-but-not-built, it says so. Where the older docs (README/AGENTS.md) lag the code, it flags the difference. It was written by reading the real source — file paths are given so you can dig in.
>
> **Last verified:** 2026-06-29, against branch `feat/web-wallet-redesign`.
>
> **One caution about the current UI:** the app you can run today is *functional scaffolding* — the flows, states, and copy are real and wired to live code, but the visuals are deliberately minimal. Use it to understand **behavior**, not as visual inspiration.

---

## 1. What the product is

**Elevator pitch.** ZK Fighter is a **privacy-by-default, self-custody wallet for shielded payments on Stellar**. You hold your own keys; you move XLM and USDC; and the sensitive details of in-pool payments are hidden by **real zero-knowledge cryptography** — not by trusting a middleman. The only public moments are the edges: putting money *in* (shield/deposit) and taking it *out* (unshield/withdraw). Everything you do with the funds in between can stay private.

**The problem it solves, and for whom.** Stellar is a *public* blockchain — by its own documentation, every transaction is recorded and visible to anyone. So a normal Stellar wallet leaks who paid whom, how much, and when. ZK Fighter is for people who want to **send money privately on Stellar** — individuals who don't want their balances and counterparties public, and who still need to *prove* their funds to an auditor or regulator when they choose to. It is **not** a general-purpose public wallet; it builds the privacy layer only and does not try to replace Freighter for everyday public dApp signing.

**Why "private by default."** It's a posture, not a literal promise. The wallet defaults the user *into* the private path (shielded balances, private receive codes) instead of treating privacy as a buried toggle. But the team is deliberately honest about the limits — see the brand rules in §6. The phrase users should internalize is **"shielded transfers,"** Stellar's own term, not "fully private."

**Honest framing the product holds itself to:**
- Shield (deposit), unshield (withdraw), and bridge arrivals are **public boundaries** — visible on-chain.
- The privacy is in the *middle*: in-pool transfers break the link between deposit and withdrawal, and/or hide amounts.
- The product never claims "anonymous," "fully private," or "untraceable."

---

## 2. The privacy / ZK model

ZK Fighter ships **two independent privacy systems**. A designer needs to understand both, because they appear as different screens with different rules.

### Mode A — Shielded Pools (XLM **and** USDC) — *the primary, flagship mode*

Think of a **shared frosted-glass pot** that many people pay into and out of.

| User action | What it means | On-chain visibility |
|---|---|---|
| **Shield (deposit)** | Move public XLM/USDC *into* the pool | **Public** — "this address put X in" |
| **Shielded send (private transfer)** | Pay another ZK Fighter user *inside* the pool | **Hidden** — amount + counterparty private |
| **Shielded receive** | Get paid privately via your `zkf1…` receive code | **Hidden** |
| **Unshield (withdraw)** | Move funds *out* of the pool to a public Stellar address | **Public** — "this address took Y out" |

- A **note** is your private balance inside the pool — a sealed cryptographic "receipt" (a commitment) that proves a coin exists without revealing its amount or owner. You can hold several notes. Each is **spendable** until you spend it, then it's marked **spent** (via a one-time "nullifier" stamp that prevents double-spends without revealing which deposit it came from).
- **Selective disclosure** is the compliance escape hatch: you can generate a **read-only proof** that you own a specific note — to show an auditor, accountant, or regulator — **without handing over any power to spend, and without revealing the amount or your other notes**. They get a receipt they can verify; they get no keys. (More in §4.)

### Mode B — Confidential Tokens (USDC only, **testnet-only**) — *the newest mode*

A *different* flavor of privacy. Here the **addresses stay public, but the amounts and balances are hidden**. Your balance lives on-chain as an encrypted commitment; only you (and an auditor you're bound to) can read it. Operations: **register** your confidential account once, **deposit** public USDC in, **merge** received funds into your spendable balance, **transfer** confidentially to another account, **withdraw** back to public USDC. A confidential **transfer reveals no amount on-chain** — only a commitment moves.

A subtlety worth designing around: a deposit (or an incoming transfer) lands in a separate **receiving** balance, *not* directly spendable — the user must **merge** it before they can spend. That's why the screen shows *"+… received · merge to spend."* (Deposit and merge need no proof; withdraw and transfer each require an on-chain-verified ZK proof.)

> **Designed but NOT built — delegated spending:** the confidential design also includes a **spender / encrypted-allowance** model (an owner grants a spender a hidden allowance, the spender transfers within it, the owner revokes). The Noir circuits are written and their verification keys are committed (`set_spender`, `spender_transfer`, `revoke_spender`; reserved on-chain `CircuitType` ordinals 3–5), but **there is no contract method and no wallet UI for it yet**. Do not design spender flows as if they exist — flag them only as a future capability if asked.

> **Two modes, opposite emphasis:** Shielded Pools hide **who-paid-whom**; Confidential Tokens hide **how-much**. Same wallet, same seed, different tool for different needs.

### Proving — where it runs and how long

- **All proving happens on the user's own device, in the browser** (lazy-loaded WebAssembly, off the main thread for the pool path). **Nothing is uploaded** — no server sees your secrets.
- Mode A uses the **Nethermind privacy-pool prover** (Noir/Barretenberg, BN254 curve). Mode B uses **UltraHonk via `bb.js`** (Noir, Grumpkin keys). For Mode B, the **Noir circuits are vendored** from the OpenZeppelin / Stellar Development Foundation Confidential Tokens preview, but the **Soroban contract itself (`contracts/confidential-token/`) is original ZK Fighter work** — a SEP-41-shaped wrapper that gates every state change through the on-chain UltraHonk verifier. Each account's storage **auto-extends ~30 days on every read/write**, so an in-use confidential balance can't be archived out from under its owner.
- **Timing:** a few seconds to tens of seconds, **hardware-dependent**. The recorded evidence for a dry XLM deposit proof is **~5.5 seconds** (`~5,477 ms`, plus ~0.8s browser warm-up). Treat proving as a **first-class, blocking UI moment** — the user must keep the tab open while it runs.
- **What a proof actually proves:** for a spend, *"I own a note worth at least this amount, it's really in the pool, and I haven't spent it"* — without revealing the note, its value, or the key. For a disclosure, *"I own this specific note"* — read-only, no spend power, no amount leaked.

### What's hidden vs. visible — quick reference

| Step | Public | Hidden |
|---|---|---|
| Shield / deposit | source account, amount, asset | what you do with it afterward |
| Shielded transfer (Mode A) | a pool transaction occurred; proof/nullifier/commitment events | sender↔recipient link, amount, memo |
| Unshield / withdraw | destination, amount, asset | which deposit/note funded it |
| Confidential transfer (Mode B) | sender + recipient addresses | the amount (only a commitment moves) |
| Bridge (CCTP) | EVM burn, Circle attestation, Stellar mint, public arrival | nothing yet — it's a public leg until you shield |

---

## 3. Assets & chains

**Supported assets — exactly two:**

| Asset | Code | Decimals on Stellar | Notes |
|---|---|---|---|
| Stellar Lumens | **XLM** | **7** (stroops) | native asset |
| USD Coin | **USDC** | **7** (stroops) | Circle's USDC as a Stellar classic asset |

> ⚠️ **Decimals gotcha for mockups:** USDC is **7 decimals on Stellar**, *not* the 6 decimals it uses on Ethereum/EVM. This is intentional. Display amounts accordingly.

No other tokens, no NFTs, no swaps. (See non-goals, §4.)

**Chains / networks:**
- **Stellar Testnet** and **Stellar Mainnet** — switchable as a **config toggle** (no code change). The active network is always shown as a visible badge.
- **EVM chains appear only for the bridge** (see below): Ethereum, Base, Arbitrum, Optimism — on their testnets (Sepolia/Base Sepolia/Arbitrum Sepolia/OP Sepolia) and mainnets.

**Bridging — from where to where, and the UX.** ZK Fighter uses **Circle CCTP** (the official USDC bridge) to bring **real USDC from an EVM chain onto Stellar**, then optionally shield it. It is a **two-step, both-ends-public** flow:
1. **Fund** a ZK Fighter–derived EVM address (the wallet signs the burn itself with a **seed-derived EVM key — no MetaMask, no WalletConnect**).
2. **Burn** USDC on the source chain → **wait for Circle's attestation** (~1 minute) → **mint** native USDC on the user's public Stellar account.
3. The user then **shields** the arrived USDC as a separate step.

The bridge UX shows clear stages (approval → burn → attestation → Stellar mint → public arrival → optional shield), a copyable EVM funding address with live balance, and a **"Resume a bridge"** path (paste a burn hash to finish a stalled mint).

**Testnet vs. mainnet status (read this carefully):**
- **Shielded Pools (XLM & USDC):** shield, shielded transfer, and unshield are **proven on BOTH testnet and mainnet** with real, accepted transaction hashes.
- **Bridge:** full bridge-then-shield is **proven on testnet** across all four EVM sources. **Mainnet bridge-to-shield is NOT yet claimed** — the routing is wired but live mainnet evidence hasn't been recorded, and the UI deliberately guards it.
- **Confidential Tokens:** **testnet only, by product rule** — the UltraHonk verifier is an unaudited preview. Mainnet is intentionally gated off; the screen warns and blocks if the user is on mainnet.
- **Atomic "bridge-and-shield in one step":** **deferred / not shipped.** Only the safe two-step path exists.
- The product is **hackathon software on research/reference implementations** — there's a standing "do not use for real funds" disclaimer.

---

## 4. Full feature inventory

Everything below **exists and is wired to live code today** unless explicitly marked. The web app is the most complete surface; see §5 for what differs on extension/mobile.

### Onboarding — wallet creation & import
- **Create:** generate a 12-word seed phrase (shown as a numbered grid), set + confirm a vault password, **required checkbox** acknowledging the phrase is saved. *States:* validation errors (password mismatch, invalid phrase, not acknowledged), encryption error.
- **Import:** paste a recovery phrase, set a vault password.
- **Seed phrase is the only guaranteed recovery path. There are no recovery secrets and no support backdoor — lose the phrase, the funds are gone.**
- Network selector (testnet/mainnet) is visible during onboarding.

### Lock / Unlock
- **Unlock** with vault password; **optionally** unlock with **passkey** (only shown if a passkey was enrolled). Passkey is a *convenience* layer (WebAuthn PRF) — it never replaces the seed and is not a recovery method.
- **Lock** clears the in-memory wallet and returns to the unlock screen. A prominent **"Lock wallet"** control lives in the sidebar and Settings.

### Home / portfolio
- Big **"SHIELDED BALANCE"** number (USDC, with XLM shown inline), a **"SPENDABLE"** status pill, and a row of round action buttons: **Add funds** (→ bridge), **Send**, **Receive**, **Shield**, **Unshield**, **Confidential**.
- A **"Public Stellar account"** card (dashed, "PUBLIC" badge) with the `G…` address and the line *"Funds here are visible on Stellar until you shield them."* + **"Shield now."**
- Activity preview with **"See all →."** *States:* loading ("Refreshing…"), error, empty.

### Send (shielded transfer)
- Pay another user's **`zkf1…` private receive code**. Badge: **"SHIELDED."** Flow: amount → review → proving → result. Copy emphasizes *"nothing about this transfer is public."* *States:* proving, **"Payment sent,"** "Send failed," "Couldn't send yet," "Send status unconfirmed."

### Receive
- Two tabs: **"Private code"** (the `zkf1…` code as QR + copyable text — "Share this to be paid privately") and **"Public address"** (the `G…` address as QR — labeled a **public boundary**, with a USDC-trustline setup panel: *"Set up USDC receiving … once per network"*).
- A link to **"Make it discoverable →"** (the Discover screen).

### Shield / Unshield (the public boundaries)
- **Shield · deposit** — badge **"PUBLIC BOUNDARY."** Pick asset (USDC/XLM), enter amount (with **Max**), review, prove, submit. Success copy: *"…is entering the shielded pool. It'll show as Pending, then Spendable once the proof confirms on-chain."*
- **Unshield · withdraw** — badge **"REVEALS INFO."** Send to a public `G…` address (defaults to the user's own), **requires an acknowledgement checkbox** that destination + amount become visible. Warn-toned throughout.

### Bridge (CCTP)
- **Bridge · add funds** — badge **"BOTH ENDS PUBLIC."** Source-chain selector, derived EVM funding address (copyable, live USDC + gas balance), **"Start bridge,"** a **"Bridge progress"** step list, an **arrived → "Shield arrived USDC"** step, and a **"Resume a bridge"** card. *States:* readiness blockers, no-balance warning, in-flight, completed, failed.

### Selective disclosure
- **Disclosure** — badge **"READ-ONLY PROOF."** Two tabs:
  - **Create proof:** pick asset/note, name the authority ("e.g. Acme Bank compliance") + a reference, generate locally (*"Proving on your device — nothing is uploaded"*), then copy a JSON receipt: *"It's read-only and cannot move funds."*
  - **Verify a proof:** paste a receipt → **"Verified."** / **"Not verified."** with explicit checks: *"Proof ✓ · context ✓ · known root ✓ · no spend authority ✓."*

### Confidential tokens mode
- **Confidential · tokens** — badge **"CONFIDENTIAL · TESTNET."**
  - **Registration gate:** if not set up, *"Set up confidential account"* (a one-time on-chain proof). States: loading / unavailable / unregistered / registered.
  - Balance card: **"Spendable …"** and, when funds are waiting, **"+… received · merge to spend."**
  - Operation tabs: **deposit / withdraw / transfer**, plus a **"Merge received → spendable"** action. Review step states the privacy rule per op (deposit = public boundary; withdraw = public boundary; **transfer = stays private, no amount on-chain**).
  - Running step streams stages; result shows submitted/failed with an explorer link. **Mainnet → warns and blocks.**

### Discover (publish / look up a receive code)
- **Discoverable code** — badge **"PUBLIC BOUNDARY."** *"Make my code discoverable"* links a public `G…` address to the private receive keys on-chain so others can find your `zkf1…` code by your public address (*"never exposes your seed or spend authority"*). Plus **"Find someone's code"** by their `G…` address. *(Note the brand rule: this is "make discoverable," never "registry" — see §6.)*

### Settings & security
- **Account** card; **Security** (passkey enable/remove + "Check browser"); **Network** (Testnet/Mainnet toggle); **Appearance** (light/dark theme); a **"Developer · Demo evidence"** card (prover readiness, the tampered-proof rejection demo, recorded on-chain evidence — *transitional, for judges/devs*); and **Lock wallet**.

### Account switching
- **Not a feature today.** The wallet is single-account (one seed → one identity). Multi-account switching does not exist yet — don't design flows that assume it without confirming scope.

### Swap
- **Not a feature, and explicitly a non-goal.**

### Proving UX (shared across flows)
A reusable **proving view** with a **determinate ring** (real progress, not a fake timer), a **5-phase step list** — *Syncing pool state → Building proof inputs → Generating ZK proof → Submitting to Stellar → Confirming* — each row **pending / active / done / error**, and rich **terminal states**: success (✓), failed ("no funds moved"), blocked/paused, **and "status unconfirmed"** ("a transaction may have been broadcast — check Activity before retrying"). Design these states deliberately; they're load-bearing for trust.

> **Non-goals (won't exist, don't design them):** swaps, NFTs, staking, fiat buy/sell, general public-dApp transaction signing, custom gas, arbitrary token import.

---

## 5. The three surfaces

The shared logic lives in `packages/core`; the shared visual primitives live in `packages/ui`. All three surfaces should feel like one product.

### Web app — *the primary, most complete surface*
Has **every** feature in §4. Today it's a fixed sidebar (~236px) + a centered content column (~560–860px) tuned from a **mobile-first prototype** — so for the real canvas, expect to **rebalance for desktop** rather than copy the narrow column. This is the safest surface to demo.

### Browser extension (WXT, Manifest V3) — *a focused companion, not a full wallet*
- **What it does:** wallet import/unlock/lock, public address + `zkf1…` receive code (QR + copy), **QuickShield** (one-tap shield of XLM/USDC with sensible defaults), and a **native CCTP bridge** (the extension signs the EVM burn itself with the seed-derived key — badge **"native"**). Surfaces: a **popup** ("Runtime checkpoint") and a **side panel** ("Extension workspace," stays open across tabs).
- **What it intentionally does NOT do:** it is **not** a Freighter-style public signing wallet. External dApp **public-key access and transaction signing fail closed by design** — the message is *"ZK Fighter external dApp access and signing are disabled; use QuickShield and bridge inside ZK Fighter."*
- **Not exposed in the extension UI today:** private transfer and unshield have backend support but **no popup UI** — so the extension can shield and bridge, but full private-send/withdraw live on the web app.
- **Constraints:** MV3 service-worker + an **offscreen document** does the WASM proving (timeouts ~18s dry / ~180s deep); narrow popup (~360px min) means heavy proof/confirm UI wants the **side panel**; the background bundle is sizeable (~0.7 MB) because it carries the prover.

### Mobile app — *planned, not built*
Track C. Navigation and flows are intended to mirror the web app on a phone canvas, reusing `packages/core` + `packages/ui`. **Treat mobile as greenfield design** — there's no shipped mobile UI to honor yet.

---

## 6. Terminology & tone

**Use these exact words (canonical product vocabulary):**

| Term | Meaning |
|---|---|
| **shielded transfer** | the honest name for a private payment (Stellar's own word) — use this, not "private chain" |
| **shield / deposit** | move funds *into* the pool (a **public boundary**) |
| **unshield / withdraw** | move funds *out* to a public address (a **public boundary**) |
| **shielded balance** / **spendable** / **pending** / **spent** | balance + note states the user sees |
| **note** | a single private balance inside the pool |
| **pool** | the shared on-chain privacy pot |
| **private receive code** (`zkf1…`) | what you share to be paid privately (Bech32m, shown raw as text + QR) |
| **public Stellar account** (`G…`) | the public boundary address |
| **disclosure** / **read-only proof** | the compliance receipt; "context," "known root," "no spend authority" |
| **public boundary** | the standard label for any step that's visible on-chain |
| **confidential** / **spendable** / **receiving** / **merge** | Confidential-Token-mode vocabulary |
| **passkey** | optional convenience unlock — never "recovery" |

**Hard brand-voice rules (these are enforced, not preferences):**
- ❌ Never say **"anonymous," "fully private,"** or **"untraceable."** They're false at the pool edges.
- ❌ Never say **"private by default"** as a literal guarantee — frame it as *shielded transfers* with public boundaries.
- ❌ Never use **"registry"** in primary UX copy. Say **"Make my private code discoverable."**
- ✅ Always **name the public boundaries** (shield, unshield, bridge arrivals).
- ✅ Always **show the active network** (testnet/mainnet badge).
- ✅ Use **user-level language** over protocol jargon (e.g. *"This address cannot receive USDC yet"* rather than *"missing trustline"*).
- ✅ Keep the **unaudited / testnet / "do not use for real funds"** risk framing visible where it applies.

**Tone:** trustworthy, precise, calm. Honesty *is* the brand — the product wins by saying exactly what's hidden and what isn't, which is more credible than overclaiming. (Differentiator framing the team uses: real ZK proofs, no mandatory custodial relayer, optional passkey, USDC support, user-held cryptographic disclosure.)

---

## 7. Numbers & states worth showing (so mockups feel real)

**Realistic values:**
- Private receive code: `zkf1…` — a long Bech32m string (~120–180 chars). Always shown raw, as text + QR.
- Public Stellar address: `G…` (56 chars; truncate as `GAB…XYZ`). Contract IDs: `C…`. EVM burn hashes: `0x…`.
- Example balances: a shielded balance like **"1,250.00 USDC + 320.5 XLM,"** **SPENDABLE 840.00 USDC,"** with one note **Pending** after a shield. QuickShield defaults: **1.0 XLM** or **10.0 USDC**.
- Both XLM and USDC: **7 decimals**.

**Transaction / note types & statuses:**
- Notes: **Spendable** / **Spent**; deposits transit **Pending → Spendable**.
- Flow outcomes: **submitted (success)**, **failed (no funds moved)**, **blocked/paused**, **status unconfirmed**.
- Confidential balance: **Spendable** vs **Receiving (merge to spend)**.

**Timings:**
- ZK proof generation: **~5.5 s recorded (dry deposit)**, ranging to tens of seconds on slower hardware — design the proving ring/steps for *seconds, occasionally longer*.
- Bridge attestation wait: **~1 minute** for Circle's attestation before the Stellar mint.

**Boundary badges to render:** `PUBLIC BOUNDARY` (shield, discover), `REVEALS INFO` (unshield), `BOTH ENDS PUBLIC` (bridge), `SHIELDED` (send), `READ-ONLY PROOF` (disclosure), `CONFIDENTIAL · TESTNET` (confidential), `PUBLIC` (public account card).

---

## 8. Where to look (for digging into the real code)

**Product framing & language (read first):**
- `README.md` — pitch, evidence table, posture *(note: it predates the Confidential mode shipping — treat this spec as more current on that point)*
- `docs/START-HERE-concept.md` — plain-English privacy model
- `docs/GLOSSARY.md` — every term in plain English
- `docs/VERIFIED-FACTS.md` — anti-hallucination record of claims
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md` — locked product spec, non-goals
- `.thoughts/design/2026-06-25-designer-brief-v2.md` + `.thoughts/design/screens/` — prior design brief & per-screen specs

**Design system (the visual primitives that exist today):**
- `packages/ui/src/tokens.ts` — color palette, fonts, CSS variables (see appendix)
- `packages/ui/src/proving.tsx` — the proving ring + step list components
- `packages/ui/src/{button,inputs,primitives,review}.tsx` — buttons, inputs, cards, review rows

**Web app (routes, screens, copy):**
- `apps/web/src/App.tsx` — onboarding / unlock entry
- `apps/web/src/wallet/WalletShell.tsx` — sidebar nav + screen routing (`screens.ts` defines the route union)
- `apps/web/src/wallet/HomeScreen.tsx`, `ActivityScreen.tsx`, `ReceiveScreen.tsx`, `ShieldScreen.tsx`, `SendScreen.tsx` / `UnshieldScreen.tsx` (+ `PrivateFlowScreen.tsx`), `BridgeScreen.tsx`, `DisclosureScreen.tsx`, `ConfidentialScreen.tsx`, `SettingsScreen.tsx`, `DiscoverScreen.tsx`
- `apps/web/src/wallet/ProofRun.tsx` + `proofFlow.ts` — the proving UX and its states
- `apps/web/src/AccessPanels.tsx` — create/import/unlock copy

**Extension:**
- `apps/extension/src/ExtensionApp.tsx`, `ExtensionWalletPanel.tsx`, `ExtensionQuickShieldPanel.tsx`, `ExtensionBridgePanel.tsx`
- `apps/extension/src/dappRuntimeHelpers.ts` / `entrypoints/content.ts` — the "signing disabled" boundary

**Core logic, assets, networks, privacy:**
- `packages/core/src/assets.ts` — the two assets + decimals
- `packages/core/src/networks.ts` — networks, pool IDs, CCTP + confidential wiring
- `packages/core/src/receive-code.ts` — the `zkf1…` code format
- `packages/core/src/xlm-shield.ts`, `xlm-private.ts`, `disclosure.ts` — Mode A (pools)
- `packages/core/src/confidential/*` — Mode B (confidential tokens): `keys.ts`, `register.ts`, `withdraw.ts`, `transfer.ts`, `receive.ts`, `balance-state.ts`, `prover.ts`, `grumpkin.ts`, `poseidon2.ts` (note its reserved `DELEGATION_VIEWING_KEY` / `ENCRYPTED_ALLOWANCE` domains — the unbuilt spender feature)
- `packages/core/src/cctp-bridge.ts` — the bridge
- `circuits/` — the Noir circuits: `register`, `withdraw`, `transfer` (built + used) and `set_spender`, `spender_transfer`, `revoke_spender` (built, **not yet wired**); compiled VKs in `circuits/vks/`; provenance in `circuits/ATTRIBUTION.md` (vendored from OpenZeppelin/SDF, `nargo 1.0.0-beta.11` / `bb 0.87.0`)
- `contracts/confidential-token/src/lib.rs` — the Soroban contract (ZK Fighter–authored). Read it to see exactly which ops exist: `register`, `deposit`, `merge`, `withdraw`, `transfer` (+ admin `set_contract_field`, views `config`/`is_registered`/`account`). The `CircuitType` enum reserves `SpenderTransfer`/`SetSpender`/`RevokeSpender` but **no methods implement them**.
- `scripts/` — the real evidence/CI harness (not product UI): `check-extension-quickshield.mjs`, `check-mainnet-private-loop.mjs`, `cctp-bridge-source-flow.ts`, `secret-scan.mjs`, `check-file-size.mjs`, etc. — proof that the flows actually run on-chain.

**Real on-chain evidence (proof these flows actually run):**
- `.thoughts/research/spikes-log.md` — hashes, balances, timings, explorer links
- `README.md` evidence table — testnet + mainnet hashes for shield / transfer / unshield / bridge

---

## Appendix — Current visual system (today's tokens, *not* a constraint on the redesign)

The existing surfaces share one token set (`packages/ui/src/tokens.ts`). You're redesigning from scratch, so treat this as *context*, not a brief:
- **Accent:** `#5E7CFA` (a periwinkle blue), constant across themes.
- **Dark-first**, with a light palette. Dark backgrounds around `#0E0F11`/`#08090A`, cards `#15161A`, primary text `#F3F4F6`, muted `#969BA3`.
- **Semantic colors:** positive/spendable green `#35C77B`, warn amber `#E5B45C`, a dedicated **"public"** grey `#8A93A2` for public-boundary chrome.
- **Type:** **Hanken Grotesk** (sans) + **IBM Plex Mono** (addresses, codes, amounts). Headings are heavy (700–800) with tight tracking; mono labels are small-caps-ish with wide letter-spacing.
- **Shape:** ~10–14px radii; pill-style status/boundary badges.

---

### Planned-vs-shipped, at a glance

| Capability | Status |
|---|---|
| Shielded pools (XLM & USDC): shield / send / unshield | ✅ Shipped — testnet **and** mainnet |
| Selective disclosure (create + verify) | ✅ Shipped |
| Private receive codes (`zkf1…`) + discover | ✅ Shipped |
| Passkey unlock (optional) | ✅ Shipped |
| Confidential tokens (register/deposit/merge/withdraw/transfer) | ✅ Shipped — **testnet only** (unaudited verifier) |
| Confidential **delegated spending** (set/transfer/revoke spender) | 🚧 Circuits + VKs committed, ordinals reserved — **no contract method or UI yet** |
| CCTP bridge-then-shield (4 EVM sources) | ✅ Shipped on **testnet**; mainnet wired but **not yet claimed** |
| Extension: QuickShield + native bridge + receive | ✅ Shipped (companion scope) |
| Extension: private send / unshield UI | 🚧 Backend exists, **no UI yet** |
| External dApp signing (extension) | ⛔ Intentionally disabled (fails closed) |
| Atomic bridge-and-shield (one step) | 🚧 Deferred |
| Mobile app | 🚧 Planned, not built |
| Multi-account switching | ❌ Not present |
| Swaps / NFTs / staking / fiat | ❌ Non-goals |

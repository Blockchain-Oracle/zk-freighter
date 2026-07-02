# Design Prompt — ZK Freighter privacy-by-default Stellar wallet

You are designing a **high-fidelity, clickable prototype with fully mocked data** for a privacy-focused crypto wallet. This prompt is the authoritative scope and stands on its own. You also have the **uploaded codebase**, which contains visual references, live competitor screenshots, and a deeper design brief — see **"Reference material in the repo"** at the end if you want to go deeper or find an image. Read this once, then design.

You are designing **two things**: (1) a **landing page** (public marketing site) and (2) the **wallet web app** itself. Both share one visual direction.

---

## What the product is

A **privacy-by-default, self-custody wallet for shielded payments on Stellar.** A browser **web app** (not a mobile app, not a browser extension). It lets people hold a balance and pay each other **privately** — the amounts and counterparties of private transfers are hidden — while being **completely honest** about the few moments that are public.

The single most important rule: **never overclaim.** Do not write "fully private," "anonymous," or "untraceable" anywhere. Use **"shielded transfers."** Deposits and withdrawals ARE public and must be labeled as public. A wallet that says "anonymous" and then leaks information is worse than no privacy wallet — so the honesty is the brand.

**Product name is locked: ZK Freighter.** Use the name consistently. Keep the wordmark restrained and avoid any Freighter-derivative identity.

**Assets:** exactly **XLM and USDC**. Nothing else. No token import, no asset search.

**Network:** one toggle, **testnet ↔ mainnet**, with a persistent, always-visible network indicator. Not a multi-chain manager. On mainnet, privacy features may be **disabled with a clear reason** ("privacy is testnet-only today; plain transfers still work").

---

## The privacy model, in plain terms (this is what every screen must teach)

The wallet holds two kinds of money in **one wallet**:

- **Shielded (private) balance** — your real balance. Private transfers between private addresses are **hidden**.
- **Public balance** — plain Stellar funds, visible to anyone, used only as the on-ramp/off-ramp.

There are exactly four money movements. Each has a precise honesty obligation:

1. **Shield (deposit / public → private):** move public funds INTO the private pool. The deposit transaction itself **is public** (people can see an account deposited), but the balance is hidden once inside. Frame as "make private."
2. **Private send (private → private):** **fully hidden.** Amount, recipient, and memo do not appear on-chain. The only public fact is "a transaction occurred" plus the submitting account and a tiny fee.
3. **Unshield (withdraw / private → public):** move funds OUT to a Stellar address. **This reveals information** — the destination, the amount, and a "spent" marker become public. There is **no relayer**, so the submitting account is also visible. (Which deposit it came from stays hidden.) **This is the most important honesty screen in the app** — require an explicit acknowledgement before confirming.
4. **Bridge (on-ramp, NOT a private transfer):** bring USDC from Ethereum onto Stellar via Circle's CCTP. USDC is burned on Ethereum → Circle attests (~minutes) → USDC mints as **public** USDC on Stellar → the user shields it as a separate one-tap step. Two steps, two chains, an attestation wait — and **the bridge leg is public.** Label it. Mark it **"to-be-validated on testnet."**

**Two addresses, one wallet (a real footgun — your labeling is the safety feature):**
- A **private address** — a long string (render it `zkf1…`, ~120–180 chars). Share this to get paid privately.
- A **public Stellar address** — a normal `G…` address. Used for deposits, on-ramps, and fees only.
- The Receive screen shows **both**, clearly labeled, with an explicit **"same wallet"** reassurance. Sending private funds to the public address (or vice versa) is the classic mistake — make the distinction unmissable.

**Proving takes time, and that's a feature, not a bug.** Private sends and withdrawals generate a zero-knowledge proof **on the user's device** that can take **seconds to minutes.** Handle this with:
- A **Spendable vs. Pending** balance split (funds that are confirmed/usable vs. still proving). The split absorbs the wait.
- A **first-class "Generating proof" state** with staged progress, an elapsed timer, a soft estimate, and "keep this tab open" guidance. **Never a frozen, contextless spinner.**

**Trustline is invisible.** USDC technically needs a one-time setup on Stellar. Handle it silently (at onboarding / first receive; pre-check recipients before a send). **The word "trustline" never appears.** You may surface the small cost plainly (e.g. "one-time 0.5 XLM network reserve") — never the jargon.

**Onboarding = seed phrase first and mandatory.** Create or import a 12/24-word recovery phrase. A passkey / Face ID is an **optional** convenience for faster unlock — never the default, never a replacement for the seed. **There is no recovery if the seed is lost — say so honestly.**

**Compliance = user-held selective disclosure.** Let the user prove **one transaction** to an auditor (preferred) or, as a demoted last resort, export a full viewing key (with blunt, irreversible-action warnings). Never custodial — the wallet never discloses on the user's behalf.

---

## Screens to design

Group logically; build in roughly this order. For each, design the full state set (see "Required states" below).

**Landing page (public marketing site — separate from the wallet app)**
0. A single-scroll landing page. Visual language **inspired by Freighter** (live screenshots are in the repo at `reference/screenshots/freighter/` — borrow the *style*, not the features): dark theme, a deep purple/indigo gradient field, large rounded UI-mockup cards, clean minimal type, calm and premium. Sections:
   - **Hero** — ZK Freighter wordmark + an honest one-line value prop (e.g. "Send money privately on Stellar — shielded by default, self-custody, no middleman"). Primary CTA **"Launch web app"**; secondary "How it works". A small badge **"Chrome extension — coming soon"** (we ship the web app first, the extension later). Floating wallet-UI mock cards (like Freighter's three-card hero) — but showing **our** screens (shielded balance, private send, a disclosure proof), never swap/NFT/trending.
   - **How privacy works** — the shield → private send → unshield story in 3 honest steps, the public/private boundary stated plainly.
   - **Why it's different** — real ZK, self-custody (no mandatory relayer), passkey-optional, user-held compliance/selective disclosure. Honest framing — never "anonymous."
   - **Trust & credits strip** — built on Stellar's ZK primitives; credits Nethermind + Circle; an "unaudited · testnet" disclaimer.
   - **Footer** — placeholder docs/github/support links + the honest disclaimer.
   Do NOT copy Freighter's iOS/Android app-store CTAs (we're web-first) or its Swap/Trending cards.

**Onboarding**
1. Welcome / choose path (Create new · I already have a wallet · "How privacy works" explainer). Testnet pill visible from screen one.
2. Set unlock password (before the phrase; teach password ≠ recovery, can't be reset).
3. Pre-reveal explainer (what the phrase is; only recovery; no skip path).
4. Reveal + copy the 12 words (blur-to-reveal, copy with caution, "I've saved it" checkbox gates Continue).
5. Confirm the phrase (tap word-chips back in order).
6. Import existing wallet (12/24-word grid, paste-fans-out + clears clipboard, then password).
7. Optional: enable Face ID / passkey (equal-weight "Skip for now"; honest "NOT a backup").

**Unlock + Home**
8. Unlock / lock ("Welcome back", password or optional Face ID, escape hatches to restore/create).
9. Home / portfolio — the core teaching screen: **shielded balance hero** (per-asset, no invented fiat total), **Spendable vs. Pending split**, a small **"Available to shield (public)"** card with a one-tap Shield, four equal actions **Send · Receive · Add funds · Unshield** (no Swap), and a short recent-activity preview. Privacy-peek eye to blur amounts.

**Receive**
10. Receive · Private tab (default) — long private-address string + QR (raw string, NOT a Stellar URI), **copy is the primary action**, no logo on the QR. "Shielded · payments here stay private."
11. Receive · Public deposit tab — `G…` address + Stellar `pay` QR, honest "deposits are public" callout, friendly unfunded state, explorer link present here (absent on the private tab).
12. QR fullscreen ("Show to scan") — enlarged QR with a clear "Showing your PRIVATE/PUBLIC address" header.
13. Optional: register a @handle in a directory (honest trade-off; reversible).
14. Request a specific amount (private payment request → link + QR; memo minor).
15. First-time "same wallet, two addresses" interstitial.

**Send (private → private)** — a 4-step flow:
16. Recipient (paste/scan/address-book; **teach-error if a public `G…` address is pasted** → "that would be an Unshield and reveal info").
17. Amount (XLM/USDC, validate against **Spendable only**, "What stays private" panel, optional encrypted memo).
18. Review (centerpiece: **Hidden vs. Public two-column breakdown**; proof notice).
19. Sign (password / Face ID).
20. **Generating proof** (first-class: staged progress, timer, estimate, "keep tab open," minimize-to-Home-pill, cancel pre-submit).
21. Success ("Sent privately"; recipient-spendability-lag note; balance delta).
22. Error recovery (stage-scoped retry; never loses entered data).

**Shield (deposit)** — Source → Amount → Review (honest "what's public" ledger) → Generating proof → Submitting → Success (Pending→Spendable note + public explorer link).

**Unshield (withdraw)** — Destination (non-dismissible "withdrawals are public" warning) → Amount (Spendable only) → **Review + required leak-acknowledgement checkbox** (the most important honest screen: reveals destination + amount + spent-marker + submitting account; "why is my account visible?" explainer) → Generating proof (the long one; supports a sync-first state) → Submitting → Success (restate public vs. hidden).

**Add funds / Bridge (CCTP on-ramp)**
- Add-funds chooser (From another chain · Transfer from another account · "already have public funds? Shield them"). No fiat buy.
- Bridge: Source (Ethereum → Stellar, USDC only, BOTH legs public) → Amount (two-leg route/cost, ~10–20 min estimate) → Connect Ethereum (mocked) → Review & start → Burn (Ethereum confirmations) → **Tracking** (headline: vertical 3-stage timeline ETH burn → Circle attesting with live clock → Stellar mint; resumable, never frozen) → Arrived ("public USDC on Stellar — Shield this now?") → plus a persistent Home/Activity chip so a closed bridge is never "lost."

**Activity / History**
- Month-sectioned list of all four event types, each row showing type, privacy-aware amount, status, and a **visibility glyph (Hidden / Public / Mixed)**. Pending tray pinned on top. Mask-amounts eye-toggle.
- Filters sheet (type, asset, status, visibility, direction; fixed taxonomy).
- Activity detail — "Your view (decrypted)" + an honest **"What others can see"** block; explorer links for public legs only; "Generate disclosure proof."
- Per-transaction disclosure proof (off the detail).

**Accounts + Settings**
- Accounts list (all accounts under one seed; switch; copy private/public; rename; "account vs address" explainer; new rotating private address).
- Add account (derive from same seed — no new seed, no key import).
- Settings root → Security (reveal seed behind password, change password, auto-lock timer, passkey toggle), Network (testnet/mainnet + mainnet-gated note), Compliance & disclosure, About (honest unaudited/testnet disclaimers; credits Nethermind + Circle + Stellar), Lock.

**Compliance / selective disclosure**
- Compliance hub (two **asymmetric** path cards: "Create a disclosure proof" = recommended; "Export a viewing key" = muted last resort; list of past disclosures).
- Build a disclosure proof — choose scope (by transaction / date / counterparty) with a live "what the auditor will see" preview and a "what's NOT revealed" list.
- Recipient/label/expiry → Generating proof (first-class pending) → artifact (copy/download/QR + irrevocability warning).
- Export viewing key (gated, loudest warnings, deflects to the proof flow).
- Verify a disclosure (auditor-side viewer — read-only, scoped, verifiable; standalone, no wallet).
- "How disclosure works" learn sheet.
- Disclosure detail (share / revoke / status).

---

## Required states (design all of these wherever they apply)

Every flow with data must cover: **empty · loading · pending-proof · error · disabled · success.** Partial coverage reads as unfinished.

Privacy-specific states you must invent (no mainstream reference exists):
- **Pending-proof** on Send / Unshield / Shield / disclosure — staged progress + timer + estimate + "keep tab open." Never a bare spinner.
- **Bridge in-flight** — two-chain progress with a live attestation clock; slow and timeout variants; resumable after closing.
- **Mainnet-gated privacy** — disabled-with-reason; plain transfers still work.
- **Proof-failure / retry** (funds untouched), **sync-required**, and the **"same-wallet two-address"** explainer.
- **Time-based states are real states:** Pending → Spendable promotion, proof validity windows, attestation waits, and **expired** transactions (mark them visibly and **keep** them — never silently delete).

---

## QR & private-address specifics (get these right)

- The **private address** is a long string (`zkf1…`, ~120–180 chars). On Receive, **copy is the primary action** (manual typing is infeasible). Show it middle-truncated head+tail with the **last 4 emphasized** as a visual checksum; offer "show full address."
- The **private QR encodes the raw string** (not a Stellar URI), at **error-correction level M** (drop to L only if it overflows), full quiet zone, **larger and high-contrast, with NO logo overlay** (a logo forces higher EC and makes a long payload unscannable).
- The **public deposit QR** encodes a Stellar `pay` URI (destination = `G…`, asset, amount omitted, network passphrase = active network so a testnet QR can't be paid on mainnet). Use **`pay` only — never a transaction-signing QR.**
- Middle-truncate all addresses keeping head+tail (e.g. `G…7AOO`, `0x71C…3aB9`).

---

## Do NOT build these (out of scope / wrong product)

- Token **swap / DEX**, any in-wallet DeFi / yield / LP.
- **Fiat buy/sell** on-ramp (the only "add funds" are receive/shield and the CCTP bridge).
- **NFT / collectibles** gallery.
- **Multi-chain / custom-RPC** management (one chain, one testnet/mainnet toggle).
- **In-wallet dApp browser / Discover / Explore**, dApp-connect, sign-message, delegated transaction signing.
- **Hardware wallet** support.
- **Import private key / secret key** (recovery is seed-phrase only).
- **Arbitrary token import / manage-assets / asset search** (assets fixed: XLM + USDC; trustline silent).
- **Custom gas / fee editor** (Stellar fees are tiny and flat — no fee UI).
- **Staking / earn, price charts, portfolio analytics** (home = balances + activity only).
- **Social / seedless login as the default** (passkey optional; seed primary and mandatory).
- **Human-readable third-party address aliasing.**
- **Watch-only wallet as a setup branch** (the viewing key is a compliance export, not an onboarding path).

---

## Anti-slop bar

- **No generic SaaS / generic-crypto-wallet template look.** This product has a point of view.
- **No wall of identical cards.** Activity, balances, and asset rows must encode *meaning* — public vs. private vs. pending — visually and semantically, not by repeating one card.
- **No overclaiming.** No "anonymous," "fully private," "untraceable," no smug all-secret padlock. If one screen says "anonymous," the prototype has failed.
- **Never hide the leaks to look slicker.** The unshield / bridge / public-deposit disclosures must be prominent. Burying them is the worst failure here.
- **No frozen spinners for proofs.** Design the wait with progress and context.
- **No decorative privacy theatre** — no matrix-rain, glowing-shield, "encrypting…" animations that signify privacy without teaching it.
- **Never demote the seed phrase.** Passkey is the optional add-on.
- **No jargon bleed** — "trustline," "nullifier," "note commitment," "Soroban," "0zk" never reach the user. Name concepts in plain language.

---

## Creative freedom

You own the **entire visual direction** — colors, typography, spacing, illustration, and motion. We deliberately do **not** prescribe a palette or type system. Invent a look that makes privacy feel **calm, trustworthy, and legible** rather than paranoid or theatrical. Where motion helps, let it *teach*: the shield/unshield boundary crossing, the Pending → Spendable promotion, proof generation as narrated progress, the bridge as a two-chain journey, the unshield acknowledgement as a deliberate gate, and selective disclosure as a precise scoped action. The only hard creative constraint is **honesty** — be as distinctive and beautiful as you like, as long as no screen overclaims and every public/private boundary is legible.

---

## Deliverable

A **high-fidelity, clickable (or richly static) prototype with fully mocked data and mocked integrations** — no live chain, no real proofs, no real keys, no real bridge. Use realistic, product-specific mock data (two-decimal USDC, XLM with reserve nuance, a long `zkf1…` private address, month-sectioned activity mixing all four event types and pending rows). **Visibly mark every mocked surface** with a consistent "demo data / mocked" affordance, and flag the bridge as "to-be-validated on testnet," so a reviewer never mistakes a placeholder for a working integration. Aim for production-quality UX, IA, microcopy, and polish — this prototype is the headline artifact.

---

## Reference material in the repo (you have the uploaded codebase)

This prompt is the authoritative scope, but the repo has everything if you want to go deeper or find an image:

- **Live Freighter screenshots (visual inspiration)** — `reference/screenshots/freighter/freighter-landing-full.png` and `freighter-landing-hero.png`. Borrow the dark/gradient/rounded **style**; ignore its swap/NFT/trending features and its iOS/Android CTAs.
- **Freighter's actual wallet UI source** (closest structural reference; maps ~1:1 to our screens) — `reference/freighter/extension/src/popup/views/` (Welcome, AccountCreator, RecoverAccount, MnemonicPhrase, UnlockAccount, Send, ViewPublicKey, Wallets, Settings, AccountHistory).
- **Full, exhaustive design brief** (every screen in depth) — `.thoughts/design/2026-06-21-designer-brief.md`.
- **Per-screen detailed specs** — `.thoughts/design/screens/*.md`.
- **Link-cited UX references (what to borrow per screen)** — `.thoughts/design/2026-06-21-design-references.md`.
- **Privacy-wallet UX patterns** (Zcash/Zashi, Railgun) — `.thoughts/design/2026-06-21-refs-privacy-wallets.md`.
- **Plain-English product context + glossary** — `docs/START-HERE-concept.md`, `docs/GLOSSARY.md`, `README.md`.

You're free to open any of these. When in doubt, this prompt wins.

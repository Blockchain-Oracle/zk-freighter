# Designer Brief: ZK Freighter

> **Brand locked: ZK Freighter.** Do not invest in a Freighter-derivative wordmark, logo, or color identity. Use the ZK Freighter name consistently, with a restrained lockup that does not lean on Freighter's brand.

---

## Purpose

Public blockchains are panopticons by default. On Stellar, as on every transparent ledger, sending someone money permanently publishes who paid whom, how much, and when, to anyone with a block explorer. For most people that is not a feature — it is a leak they never consented to. Payroll, donations, rent between roommates, savings — all of it becomes a public record keyed to a reusable address.

ZK Freighter exists to make **shielded payments on Stellar feel as ordinary as sending a normal payment**. It is a privacy-by-default, self-custody, zero-knowledge wallet: the user's balance and their private-to-private transfers are hidden by a privacy pool (Nethermind's engine), while the only moments that touch the public ledger are deliberate and clearly labeled — putting money *in* (shield) and taking it *out* (unshield).

The design problem is not "draw a crypto wallet." It is **teaching a genuinely unfamiliar mental model — public vs. private money living in one wallet — without lecturing, and without ever overclaiming.** The product's integrity depends on honesty: every screen must quietly teach where privacy begins and ends. A wallet that *says* "anonymous" and then leaks on withdrawal is worse than no privacy wallet at all. Our differentiator is that we tell the truth, legibly, at exactly the moment it matters.

---

## Prototype Scope

A **high-fidelity, clickable (or richly static) prototype with fully mocked data and mocked integrations.** No live chain, no real proofs, no wallet keys. The goal is to demonstrate production-quality UX, information architecture, microcopy, and the *honest privacy model* — not working cryptography.

In scope to design end-to-end:
- The full onboarding set (seed-phrase primary and mandatory; passkey optional).
- Unlock / lock and Home / portfolio with the **shielded vs. spendable vs. pending** balance model.
- Receive (private address **and** public Stellar address, "same wallet").
- Send (private→private), Shield (public→private), Unshield (private→public, with leak disclosure).
- Activity (private rows, public rows, pending-proof rows, expiry).
- Add funds incl. the **bridge on-ramp** (cross-chain, multi-step, public leg labeled).
- Accounts management and Settings incl. the **network toggle** and **compliance / selective-disclosure export**.
- Every supporting state: empty, loading, **pending-proof**, error, disabled, success.

**Every mocked surface must be visibly marked** (a consistent "mocked / demo data" affordance) so a reviewer never mistakes a placeholder for a live integration. The bridge in particular is **"to-be-validated on testnet"** — design the complete flow but flag it as pending a feasibility spike.

---

## Product Context

- **Form factor:** browser **web app first.** The browser-extension form factor is explicitly *later* and out of scope for this brief — do not design extension chrome, popup constraints, or `chrome://` affordances. Design for a focused web surface (a centered app column is fine; you are not bound to a 360px extension popup).
- **Engine:** the privacy pool is **Nethermind's**. The user never sees this; it is plumbing.
- **Chain:** Stellar, single chain. There is **one network toggle** (testnet ↔ mainnet) with a **persistent, unmissable network indicator** — not a multi-chain/custom-RPC manager. Mainnet privacy may be **gated** (no mainnet pool deployed yet), so design a clear "privacy is testnet-only today, plain transfer still works" disabled-with-reason state.
- **Assets:** exactly **XLM and USDC.** No token import, no asset search. The USDC **trustline is handled invisibly** — set up at onboarding/first-receive, pre-checked on recipients before send. **The word "trustline" never appears in the UI.** (Internally it costs a small XLM reserve; you may surface that cost plainly — e.g. "0.5 XLM one-time" — never the jargon.)
- **Reference lineage:** the cloned **Freighter** source (`reference/freighter/extension/src/popup/views/`) maps ~1:1 to our public-wallet screens — borrow its layout, IA, and microcopy, then strip the do-not-copy surfaces. The novel privacy surfaces have **no mainstream reference** and must be invented from this brief + Zcash/Zashi + Railgun patterns.

---

## Target Users

We are designing for **crypto-literate-enough people who want a normal payment to stay private** — not cryptographers. Three lenses:

1. **The privacy-seeking individual.** Wants to receive a salary, a grant, a gift, or pay a person without the whole amount and counterparty being permanently public. Intent: *"Give me an address I can share, let money arrive privately, and let me pay people privately."* They will not read a whitepaper. They need the model taught implicitly, by the UI.

2. **The on-ramper.** Has funds elsewhere — on Ethereum, on an exchange, in a public Stellar account — and wants them landed and shielded. Intent: *"Get my money in here and made private with as few decisions as possible."* This is the bridge + shield audience; their patience is a multi-minute cross-chain wait they need honestly narrated.

3. **The accountable user.** A freelancer, a DAO contributor, anyone who may later need to *prove* a specific transaction to an accountant, auditor, or counterparty — **on their own terms.** Intent: *"Keep it private by default, but let me selectively reveal one transaction without handing over my whole financial history."* They are the reason selective disclosure (Penumbra "transaction perspective" model) beats a blanket view key.

Across all three: the user's deepest need is **trust through legibility.** They must always be able to answer "is this private right now, or not?" The design's job is to make that answer obvious before they act.

---

## Domain Knowledge The Designer Needs

You do not need the cryptography. You **do** need these concepts straight, because each one is a screen-level honesty obligation.

- **Privacy-by-default.** The wallet is the privacy layer, not a general public wallet. The default view is the private (shielded) balance. Public is the opt-in, the boundary, the exception. Frame everything as **"shielded transfers."** **Never** write "fully private," "anonymous," "untraceable," or "fully anonymous." Deposits and withdrawals are **public** and must be labeled so.

- **The private address vs. the public Stellar account.** The user's *identity* for private payments is a **note key (BN254) + an encryption key (X25519)**, bundled and shown as **one shareable "private address"** string (Railgun 0zk-style — we render it `zkf1…`). Underneath sits a plain **Stellar account (G… address)** used only as plumbing for shield/unshield and fees — it is **not** the headline. The **Receive** screen shows **both**, clearly labeled, with an explicit **"same wallet"** reassurance. The two-address mix-up (sending private funds to the public address, or vice versa) is a documented footgun — your labeling is the guardrail.

- **Shield (public → private / deposit).** Moving public funds *into* the pool. The deposit transaction itself is **public** (it's visible that an account deposited), but once inside, the balance is hidden. Frame as "make private" / "add to your private balance."

- **Unshield (private → public / withdraw).** Moving funds *out* to a Stellar address. **This reveals information** — the destination, the amount, and a "spent" marker become public; *which deposit it came from stays hidden.* **There is no relayer today, so the submitting account is visible (metadata).** This is the single most important honesty moment in the product: you **must** show a clear, non-dismissable-feeling leak disclosure before the user confirms. (Zcash's de-shield guidance is the authority; Railgun's own copy is *too soft* here — we go further.)

- **The three public→private paths (know the nuance):** (a) a payer **shields straight to your private address** using the app + your published keys — cleanest; (b) a payer **pays your public Stellar address** and **you shield it yourself** — leaks more (your public account is now linked). Private→private is **fully hidden.** Private→public (unshield) leaks as above.

- **Pending-proof / proving latency.** ZK proofs are generated **client-side** and can take **seconds to minutes.** This is unavoidable physics, not a bug. The design answer is a **Spendable vs. Pending balance split** that absorbs the wait, plus **honest, progress-bearing pending states** — **never a frozen, contextless spinner.** A "Generate proof" step with a validity window and "keep this open" guidance is a *first-class* state, not an error.

- **View-key / selective disclosure.** Compliance is **user-held, not custodial.** Prefer the Penumbra **"transaction perspective"** model — disclose **one transaction** to an auditor — over exporting a blanket viewing key that reveals all past *and future* activity. Where a full viewing key is offered, the warnings must be blunt and the action treated as dangerous and irreversible.

- **The bridge as an on-ramp (not a private transfer).** The bridge is a **funding path**, included in v1. Flow: USDC **burned on Ethereum → Circle attests (~minutes) → USDC mints as PUBLIC USDC on Stellar → user shields it (one tap).** It is **two steps, not atomic**, spanning **two chains** with an **attestation wait**, and **the bridge leg is public** (Circle is the attester) — label it. It lives in the **"Add funds"** area, never framed as a privacy feature. Mark **"to-be-validated on testnet."**

- **Stellar realities to honor (without jargon):** a generated account is inert until funded (present unfunded as a **friendly empty state**, not an error; testnet has Friendbot); accounts carry a small XLM reserve and the USDC trustline costs a bit more reserve — surface the **cost** plainly, never the term.

---

## Core User Journey

Design as one coherent arc, not isolated screens:

1. **Arrive & set up.** Welcome → **Create new** (or **Import**). Seed-phrase is the **default and mandatory** path: set unlock password → reveal phrase (with a pre-reveal "this is your only recovery, we can't restore it" warning) → confirm phrase. **Passkey (Face ID) is an optional add-on**, never the default, never demoted-seed. Onboarding silently provisions the user's USDC trustline. **No recovery secrets — lose the phrase, it's gone — say so honestly.**

2. **Land in an empty, honest home.** A new wallet shows an **unfunded empty state** that teaches: "your private balance lives here; add funds to begin." The balance model (**Shielded total → Spendable / Pending**) is visible even at zero.

3. **Get money in.** Via **Add funds**: receive to the public Stellar address, *or* bridge USDC from Ethereum (multi-minute, two-chain, attestation-aware, public-leg labeled), then **shield** it in one tap. Or a payer shields **straight to the private address.** Each path teaches what is public.

4. **Watch it become spendable.** Incoming/shielded funds appear as **Pending** with honest progress; once proven, they move to **Spendable.** The split *is* the latency UX.

5. **Pay privately.** Send (private→private): pick/paste a recipient **private address** (recipient pre-checked invisibly for USDC) → amount → **Generate proof** (first-class pending step, validity window, "keep open" guidance) → success → row lands in Activity as a **private** row (your own decrypted amount; counterparty hidden).

6. **Take money out (the honesty climax).** Unshield → destination Stellar address → amount → **explicit leak disclosure** (destination + amount + spent-marker become public; submitting account visible; no relayer) → confirm → proof → public withdrawal in Activity, marked public.

7. **Account for it later.** From Settings, **selectively disclose one transaction** to an auditor (transaction-perspective), or export a viewing key with blunt warnings — **user-controlled.**

8. **Throughout:** a persistent **network indicator**; on mainnet, privacy actions are **gated-with-reason** while plain transfer stays available.

---

## Screen-by-screen Direction

Screens are grouped by cluster, in recommended build order. Each screen lists its purpose, key components, all required states, primary interactions, and what to borrow. The cross-cutting requirement on every applicable screen: **empty, loading, pending-proof, error, disabled, success**, plus a visible **"mocked / demo data"** marker.

### Cluster 1 — Onboarding (build first; establishes the honesty voice)

**1.1 Welcome / choose path.** First impression; teach the one-sentence privacy-by-default promise and route to exactly two paths (create / import) — no third social/seedless path that would demote the seed.
- Components: centered restrained ZK Freighter wordmark; honest one-line tagline ("self-custody wallet for shielded payments on Stellar" — never "fully private"); primary "Create a new wallet" + tertiary "I already have a wallet"; tertiary "How privacy works" link opening a mocked explainer sheet; persistent TESTNET network pill top-right (visible from screen one).
- States: default (static); explainer sheet open/dismiss; returning-user variant routes to Unlock (routing note only).
- Interactions: Create → Set password; Import → Import existing; How privacy works → dismissible sheet that does not advance.
- Borrow: `reference/freighter/.../views/Welcome/index.tsx`; MetaMask create-wallet flow.

**1.2 Create new — Set password (before phrase).** Establish the local unlock password BEFORE any seed is shown; teach that the password is local-only, is NOT the recovery secret, and can't be reset.
- Components: heading + teaching subtext distinguishing password from recovery phrase; Password + Confirm masked fields with show/hide; mocked strength meter with live guidance; terms checkbox ("I understand ZK Freighter can't recover this password or my recovery phrase."); primary "Continue" disabled until valid + confirmed + terms; Back → Welcome.
- States: empty/default (CTA disabled, no errors until touched); typing/partial (strength updates; mismatch error after confirm touched); invalid; disabled; loading/success (mocked ~600ms "creating local vault" button spinner); error (mocked storage failure → error Notification, CTA re-enabled).
- Interactions: per-field show/hide; Enter submits when valid; Continue → Pre-reveal explainer.
- Borrow: `.../views/AccountCreator/index.tsx`; `.../components/accountCreator/PasswordForm`.

**1.3 Create new — Pre-reveal explainer (phrase modal).** Gate the seed reveal behind an honesty-critical explainer: what the phrase is, that it's the only recovery (no reset), and that a confirm step follows. Remove Freighter's skip path.
- Components: heading "Your recovery phrase"; icon rows (borrow pattern, rewrite copy): only way to recover; never share; no reset / gone for good; phrase also derives your private address (privacy teach); reassurance that a confirm step follows; primary "Reveal recovery phrase"; secondary "Back"; **NO "Do this later" / Skip.**
- States: default modal; loading ("Generating your phrase…"); error (mocked generation failure → inline error).
- Interactions: Reveal → Reveal+copy screen; Back → Set password.
- Borrow: `.../views/MnemonicPhrase/index.tsx` (OnboardingModal icon rows; skip path removed). Seed is a fixed BIP-39 fixture marked "Mocked phrase — do not use with real funds."

**1.4 Create new — Reveal + copy phrase.** Display the 12 words for recording; provide copy with friction/warning; advance only after the user attests they've saved it.
- Components: heading "Write down your recovery phrase"; numbered 12-word grid (zero-padded index); copy-to-clipboard with privacy caution tooltip + "Copied" + mocked auto-clear note; reveal/blur cover ("Tap to reveal — make sure no one is watching"); confirmation checkbox ("I've saved my recovery phrase somewhere safe."); primary "Continue" gated by checkbox; Back → pre-reveal (same phrase, warning).
- States: hidden/empty (blurred cover, copy disabled); revealed; copied success ("Copied — clipboard clears shortly"); disabled; back-warning (same phrase shown again).
- Interactions: reveal toggle; copy with auto-clear; checkbox gates Continue; Continue → Confirm.
- Borrow: `.../components/mnemonicPhrase/DisplayMnemonicPhrase`, `MnemonicDisplay`.

**1.5 Create new — Confirm the phrase.** Verify the user recorded the phrase before the wallet is finalized; teach proving-latency via a footnote.
- Components: heading + instruction; preferred shuffled tappable chip pool + ordered answer row (tap to place/remove), slimmer alt = 3 random masked inputs; primary "Confirm & create wallet" disabled until order matches; "Show phrase again" escape hatch; footnote teaching proving-latency ("later private withdrawals generate a proof that can take a moment"); Back → Reveal.
- States: empty; in progress; incorrect (full-but-wrong → "not the right order" + Show-phrase-again); correct → loading/success ("Creating your wallet…" + invisible "Setting up USDC" micro-line, never "trustline"); disabled.
- Interactions: chip place/remove; Show phrase again; Confirm → optional passkey step. Mocked key derivation yields a fixed private-address fixture used later on Home/Receive.
- Borrow: `.../components/mnemonicPhrase/ConfirmMnemonicPhrase`, `CheckButton`.

**1.6 Import existing wallet.** Recover from a 12- or 24-word phrase, then set a local password via the shared form. Seed-derived only — no private-key/secret-key import (DO-NOT-COPY).
- Components: heading + subtext; 12/24-word toggle (switching to 12 clears fields); numbered masked input grid (autoComplete off, type=password unless Show); paste-whole into first box fans out + clears clipboard; Show/Hide all-words toggle; primary "Continue" disabled until all required words filled → shared PasswordForm → finalize. Order: phrase grid FIRST, then password.
- States: empty; partial; filled; paste success (+clipboard-cleared toast); invalid phrase ("Invalid recovery phrase…"); 12↔24 switch clears fields (warn if non-empty); loading/success ("Restoring your wallet…" + invisible USDC check); disabled; error (Notification + retry).
- Interactions: length toggle; per-word entry; paste fan-out + clipboard clear; show/hide; Continue → PasswordForm → finalize → optional passkey or Home. Known-good fixture restores mocked balances; a wrong fixture triggers the invalid-phrase state.
- Borrow: `.../views/RecoverAccount/index.tsx`; `.../components/accountCreator/PasswordForm`.

**1.7 OPTIONAL — Enable Face ID / passkey.** Offer an additive WebAuthn-PRF convenience factor without demoting the seed; honest that it is faster unlock + same-wallet-return via synced credential, but NOT recovery and not a phrase replacement.
- Components: heading "Add Face ID for faster unlock"; teaching icon rows (unlock without typing; synced passkey returns the same wallet; honesty row "NOT a backup — lose the phrase and the wallet is gone"); primary "Enable Face ID" (mocked WebAuthn); **equal-weight** "Skip for now" ("enable later in Settings"); note that the phrase remains the only recovery; no seedless passkey path.
- States: default offer; prompting/loading ("Waiting for Face ID…"); success; failed/cancelled (Notification; retry + skip remain; never blocks); unsupported/disabled (Enable disabled w/ tooltip; Skip is the path).
- Interactions: Enable → mocked WebAuthn → success/fail; Skip → Home. Success/fail/unsupported toggled by a prototype flag.
- Borrow: `.../views/MnemonicPhrase/index.tsx` (OnboardingModal shell + icon-row pattern); Phantom Auth optional-layer framing.

### Cluster 2 — Unlock + Home/Portfolio (the privacy-teaching core)

**2.1 Unlock / Lock (Welcome back).** Daily re-entry gate that decrypts the device-local vault via password or optional Face ID. Never touches the seed or network; teaches password ≠ recovery-phrase and offers honest escape hatches.
- Components: minimal header with product mark + read-only network pill; identicon seeded from the PRIVATE-address fingerprint (matches Home); title "Welcome back" + "Enter your password to unlock."; account label (nickname + truncated private-address chip `zkf1q…7p4a`); masked password field with show/hide, autofocused, single field; primary full-width "Unlock" disabled until non-empty; optional "Unlock with Face ID" ABOVE the password field, rendered only if a credential exists (password path always still visible); footer escape hatches "Restore from recovery phrase" + "Create a new wallet"; honest footnote ("Your password unlocks this device only. It is not your recovery phrase and cannot restore your wallet.").
- States: empty/idle; typing; loading/submitting ("Unlocking…" sub-second, NOT a proving state); error wrong-password (field error + "Incorrect password. Try again.", cleared+refocused; after 5 fails a 30s cool-down note nudging recovery); Face ID in-progress / failed-cancelled (silent fallback to password + toast) / unavailable (button not rendered); disabled; success (identicon check/scale then route to Home preserving deep-link); auto-lock banner (dismissible "Locked after inactivity for your privacy.").
- Interactions: Enter submits; eye toggle; idle auto-lock (mocked ~5min) returns here; footer opens import/create; network pill informational only ("Switch networks after unlocking").
- Borrow: `.../views/UnlockAccount/index.tsx`; `.../components/EnterPassword/index.tsx`; `.../components/identicons/IdenticonImg`. Face ID button + lock-reason banner are net-new.

**2.2 Home / Portfolio.** Primary post-unlock surface and the core privacy-teaching screen: shielded balance as hero; small public "available to shield" card as the on-ramp; a Pending-vs-Spendable split that makes seconds-to-minutes proving honest; four primary actions (Send / Receive / Add funds / Unshield); a short recent-activity preview. **Never a wall of identical cards.**
- Components: account header (identicon + nickname; tappable network pill, lock glyph on gated mainnet; kebab → Copy private address / Account details / Settings / Lock); hero "Shielded balance" eyebrow + shield glyph + (i); large per-asset shielded amounts (USDC primary, XLM secondary), **no invented fiat total**; privacy-peek eye to blur digits; Pending-vs-Spendable split ("Spendable / Ready to send" + "Pending / Proving… confirming" with count + ETA; Pending tappable to a status sheet; hidden when zero); secondary public card "Available to shield (public)" with public XLM+USDC, honest (i), inline "Shield" CTA, reserved-balance footnote (trustline cost without the word); 4 equal-weight actions (Send default, Receive, Add funds, Unshield with reveals-info hint dot; **no Swap slot**); recent activity preview (~4 rows with type icon, your-side amount, status chip, "Public" tag on shield/unshield/bridge legs).
- States: loading first-paint (skeletons, network pill immediate, no full-screen spinner); syncing (thin "Syncing your private balance…" banner + progress, last-known dimmed, Send/Unshield "Available after sync" if behind); pending-proof (non-zero animated Pending + ETA + "Keep this tab open while your proof finishes"; status sheet lists stages Building proof → Submitting → Confirming → Spendable); empty/first-run ("No shielded funds yet." + Add funds CTA + Show my addresses); public-funds-but-none-shielded (0 hero + prominent "Shield now" + shield-before-spend line); balance-hidden (masked + "Tap to reveal", session-persisted); error balance/indexer ("Couldn't refresh your balance. Showing last known values." + Retry, actions still available if Spendable>0); error proof-failed ("Failed" chip + "Retry proof", never silently removed); mainnet-gated (banner + Shield/Unshield/private-Send disabled-with-reason; Receive + public card active); network-just-switched (skeleton reload + toast); disabled summary (Send/Unshield disabled when Spendable=0 or gated; Shield disabled when public=0 → Add funds prompt); success post-action (toast + new Activity item in correct state).
- Interactions: pull/refresh; tap Pending → status sheet; tap (i) explainers; privacy-peek toggle; action row routes; kebab actions; network pill → single testnet/mainnet switch sheet; "See all" → full Activity; rows → detail.
- Borrow: `.../views/Account/index.tsx`; `.../components/account/AccountHeader` + `AccountHeaderModal`; Freighter balance helpers + Stellar minimum-balance docs; `.../views/AccountHistory`; `.../components/account/NotFundedMessage`. Net-new: shielded hero, Spendable/Pending split + status sheet, public card with one-tap Shield, four-action row, pending-proof animation, mainnet-gated banner.

### Cluster 3 — Receive (the two-address footgun guardrail)

**3.1 R1 — Receive · Private tab (default).** Give the bundled private address string + QR to get paid privately, framed so the user trusts pasting it publicly, understands it routes to the shielded balance, and doesn't confuse it with the public deposit address.
- Components: app header (back + "Receive"; kebab → Request an amount / Register / Show public address); segmented tabs Private (active) · Public deposit with persistent helper "Same wallet — two addresses for two jobs"; privacy pill "Shielded · payments here stay private"; large QR card encoding the RAW bundled private string (NOT SEP-0007), EC level M (drop to L on overflow), full quiet zone, **no logo overlay**; tap → R3; address display "Your private address" + middle-truncated head+tail (`zkf1qg…7f4a`) with emphasized last-4; primary "Copy private address" (copy is PRIMARY) with Copied! swap; secondary "Show to scan" (R3) · "Request an amount" (R5); collapsible reassurance/teaching block; footer "Learn how private payments work" + note "Private payments don't appear on the public explorer" (no explorer link here); directory chip "Listed in directory · Manage" when registered.
- States: default/loaded; loading (QR skeleton + shimmer); empty/not-yet-generated (friendly retry, not red); error (key read failed → Notification + Try again); disabled/network-gated (mainnet: private-receive-testnet-only caveat + Switch to Testnet + jump to R2; copy stays enabled, badge muted); success/copied (Copied! + first-time "safe to share"); pending-proof acknowledgement banner if a Shield/Send elsewhere is proving; registered vs not-registered chip.
- Interactions: Copy → Copied! + toast (clipboard-failure fallback reveals selectable full field); tap QR → R3; tab switch → R2 (animated, both retained); toggle reassurance; toggle Show full address.
- Borrow: `.../views/ViewPublicKey/index.tsx` (QRCodeSVG block, copy-label + truncated address + CopyText doneLabel='Copied!', header, error Notification, footer slot); `.../components/CopyValue/index.tsx`.

**3.2 R2 — Receive · Public deposit tab.** Give the G… Stellar address + SEP-0007 deposit QR for funding (exchange/on-ramp/bridge landings, payers who can only reach a normal Stellar account), making unmistakable that anything landing here is PUBLIC until shielded.
- Components: same header + segmented control (Public deposit active) + same-wallet helper; public pill "Public · visible on Stellar"; always-visible honest callout (deposits are public; shield with one tap + "What is shielding?" link); QR card encoding a SEP-0007 `web+stellar:pay` URI (destination=G…, asset XLM/USDC, amount omitted, network_passphrase=active network so a testnet QR can't be paid on mainnet); address "Your public Stellar address" + truncated G… (`GA7K…7AOO`); primary "Copy Stellar address"; silent-trustline status line (never the word): "Ready to receive XLM and USDC" / "Preparing to receive USDC…" / one-time 0.5 XLM reserve plain-language cost; unfunded-account empty block (friendly: "send ≥1 XLM to activate" + Learn why; testnet-only Fund with Friendbot, MOCK); footer "View on stellar.expert" (present here, absent on R1).
- States: default/funded; loading; empty/unfunded; error (account fetch → "Failed to fetch your account data"); disabled/mid-network-switch ("Updating for {network}…"); success/copied; pending-proof acknowledgement banner; USDC-setup pending inline (auto-resolves, MOCK 2s).
- Interactions: Copy G…; Fund with Friendbot (testnet); Switch to {network} when arriving from R1 gate; tap QR → R3; What is shielding? / Learn why → explainer; tab switch → R1.
- Borrow: `.../views/ViewPublicKey/index.tsx` (closest 1:1); design references doc (unfunded empty-state + Friendbot; SEP-0007 QR).

**3.3 R3 — QR fullscreen ("Show to scan").** Maximize scannability for in-person payment by enlarging the active tab's QR while keeping the user oriented on WHICH address is shown — preventing the wrong-QR footgun.
- Components: dim scrim + centered modal; context header "Showing your PRIVATE address" / "Showing your PUBLIC deposit address" with matching badge; maximum-size QR, full quiet zone, brightness-boost hint, EC M (private, drop to L on overflow), no logo on private QR; truncated address line beneath; actions Copy, Close, Switch to public/private.
- States: default; loading (brief skeleton); error (can't encode even at EC L → "Can't display a scannable code — copy instead" + Copy); disabled/mainnet-private ("Testnet only — see public deposit on mainnet"); success (copy toast).
- Interactions: tap scrim/Close → R1/R2; Switch toggle swaps payload + relabels; Copy active payload.
- Borrow: `.../views/ViewPublicKey/index.tsx` (extend QRCodeSVG into a modal); references doc (QR sizing/EC).

**3.4 R4 — Register in directory (publish keys) sheet.** Optional discoverability: publish the private-address receive keys to a lookup directory so others pay by @handle — framed as an explicit, honest, reversible privacy trade.
- Components: sheet header "Get found by a handle" + "Optional"; honest disclosure (publishes receive keys + links handle, no longer pseudonymous; does NOT publish balance/transactions/spend ability; can unpublish but saved links persist); @handle input with live availability (Checking… / Available / Taken / Invalid); preview "@yourhandle → resolves to your private address"; primary "Publish my address" + secondary "Not now"; Manage mode when registered (current @handle, Copy share link, Unpublish destructive confirm).
- States: default/not-registered (Publish disabled until valid+available); loading (Checking…/Publishing…); empty; error (Retry; MOCK directory); disabled (invalid/taken/empty; whole sheet disabled-with-reason if directory testnet-only on mainnet); success ("You're listed as @yourhandle" + Copy share link + Done; R1 gains Listed chip); **no proof step** (normal write → "Submitting…").
- Interactions: type → debounced check; Publish → R1 chip updates; Unpublish → destructive confirm ("already-saved links keep working"); Copy share link.
- Borrow: no Freighter ref (borrow sheet/CTA + destructive-confirm generically); references doc (honest "cannot be revoked once shared" cadence, adapted).

**3.5 R5 — Request a specific amount (private payment request).** Generate a pre-filled private payment request (private address + amount + asset + optional minor note) as a shareable link + QR. Memo kept minor.
- Components: header "Request a payment"; asset toggle XLM / USDC; large amount input with asset suffix (optional = "pay any amount"); de-emphasized optional note ("only you and the payer see this; part of the encrypted payment"); read-only destination summary routing to private address with shield badge; generated request: QR + Copy request link + Show to scan (R3 variant); primary "Create request".
- States: default (Create enabled since amount optional); loading (Creating…); empty (no amount → "any amount" helper); error (invalid amount ≤0 / too many decimals → inline; link-gen failure → retry); disabled (invalid amount; disabled-with-reason on mainnet private gating); success (QR + link + Copied! + toast); **no proof step** (request creation is local).
- Interactions: switch asset (suffix + decimal rules update); type amount → validate; Create → reveal QR + link; Copy link; Show to scan → R3.
- Borrow: `.../views/Send/index.tsx` (AMOUNT step + asset-picker, re-skinned as a request); `.../views/ViewPublicKey/index.tsx`.

**3.6 R6 — First-time "same wallet, two addresses" interstitial.** One-time teaching gate on first Receive open so the private/public distinction is learned before the user can copy the wrong address; re-openable later.
- Components: two-card diagram Private (shield, "people pay you, stays private") vs Public deposit (bank, "fund from exchanges/on-ramp, public") joined by a brace "one wallet · one balance · one seed"; three honest lines; primary "Got it, show my addresses" → R1; secondary "Don't show this again".
- States: default (shown once); dismissed (skips to R1 thereafter); no loading/error/empty/pending-proof.
- Interactions: Got it → R1; R1/R2 footer "Learn how private payments work" reopens as a non-gating explainer.
- Borrow: no Freighter ref; references doc (Zashi "shielded vs transparent, same wallet" framing).

### Cluster 4 — Send (private→private)

**4.1 RECIPIENT — Send privately to.** Capture and validate a recipient private (0zk-style) address via paste/scan/address-book; teach that a private send requires a private address, not a public G… key.
- Components: flow header (title "Send privately", step "1 of 4", back/close, persistent network pill); dismissible privacy primer chip ("Recipient, amount, and memo stay hidden."); full-width recipient input (monospace, lock/shield left icon, Paste + Scan adornments, wraps to 2 lines, middle-truncates once valid `0zk1qy…h7aoo`); address book "Saved contacts" + "Recent recipients" rows; "Save to contacts" after a valid new address; minor "Send to my other addresses" (self-consolidation); QR scanner sheet (camera preview, torch, "Paste instead" fallback); footer Continue gated on valid + settled.
- States: empty; empty-no-contacts; loading/validating (400ms debounce, Continue hidden while unsettled); valid (check + truncated echo + optional name); disabled (Continue until valid+settled; flow gated on MAINNET); error-invalid-format ("Not a private address. Private addresses start with 0zk…"); **error-pasted-public-G/C-address** (teach-moment: "That's a public Stellar address. Sending here would be an Unshield and reveal amount+destination" + Switch to Unshield); error-recipient-not-registered ("private address isn't active yet" + Copy a shield-to link instead); error-clipboard/camera-permission-denied.
- Interactions: Paste trims + auto-validates; Scan decodes to input; reject SEP-0007 payloads with the public-address teach error; selecting a contact/recent → AMOUNT; Back/X confirms discard only if data entered; Switch-to-Unshield carries the pasted address.
- Borrow: `.../components/send/SendTo/index.tsx`; Railway private-transfers help.

**4.2 AMOUNT — How much, privately.** Pick asset (XLM/USDC), enter amount with Max, validate strictly against **Spendable** (never total/pending), and explicitly show what stays private.
- Components: header (title "Amount", step "2 of 4"); recipient summary chip (tap to edit); asset picker XLM and USDC only, each showing shielded Spendable; large auto-scaling amount field + secondary mocked fiat line; balance line "X.XX spendable" + Max + dimmer "+ Y.YY pending (not yet spendable)"; "What stays private" panel (Amount/Recipient/Memo = Hidden + one honest "a transaction + submitting account are public" row); "Add encrypted memo" minor button → MEMO sub-sheet; static network fee row (no editor); reserve note if XLM dips below base reserve; footer "Review" (labelled "Enter an amount" when empty).
- States: empty; loading (balance skeleton, Max disabled until Spendable known); valid; max-applied ("Sending your full spendable balance"); disabled; error-insufficient-spendable (shows spendable, explains pending can't be spent, offers Use Max); error-below-dust/precision (>7dp guard); error-balance-fetch-failed (Retry); pending-only edge (Spendable 0 but Pending>0: "Nothing spendable yet — still confirming").
- Interactions: asset toggle re-validates + resets Max; Max writes exact Spendable; amount font auto-scales; recipient chip → RECIPIENT preserving state; USDC recipient trustline resolved silently (word never shown).
- Borrow: `.../components/send/SendAmount/index.tsx`; Railway proofs-of-innocence help.

**4.3 MEMO sub-sheet — Encrypted memo (optional).** Attach a short note encrypted to the recipient that is never posted publicly; kept deliberately minor.
- Components: focused sub-sheet "Encrypted memo (optional)"; multiline input with char counter; helper "Only the recipient can read this. It's never posted publicly."; Save / Remove / Cancel; resulting "Memo · encrypted" chip on AMOUNT + REVIEW with tap-to-view.
- States: empty; filled; over-limit (counter red, Save disabled); saved (chip appears; "What stays private" gains Memo=Hidden row); removed.
- Interactions: Save returns with chip; Remove clears memo + the Memo row; Cancel discards.
- Borrow: `.../constants/send-payment.ts` (MemoEditingContext focused-sheet pattern).

**4.4 REVIEW — Confirm private send.** The honesty screen: a scannable Hidden-vs-Public breakdown plus final amount/recipient before signing, and set expectation for the proof.
- Components: header (title "Review", step "3 of 4"); summary block (From "Your shielded balance" → recipient, big amount+asset, fiat est., memo chip if present); **two-column Hidden vs Public disclosure (centerpiece)**: HIDDEN = amount/recipient/shielded balance/memo "never appear on-chain"; PUBLIC = "a transaction occurred" + "the submitting account (no relayer yet)" + "network fee"; proof notice ("Signing starts a zero-knowledge proof on your device… you can keep using the app while it runs"); flat network fee line (no editor); footer "Confirm & sign" + secondary Edit.
- States: default; loading/preparing ("Preparing…" while unsigned tx + proof inputs assembled); disabled; error-recipient-stale ("no longer reachable privately" → Edit); error-spendable-changed-race ("balance changed since you entered the amount" → AMOUNT with new max); error-simulate/prepare-failed ("Couldn't prepare this transaction" + Retry).
- Interactions: Confirm & sign → SIGN gate; Edit/back preserves all data via visited-steps persistence.
- Borrow: `.../components/InternalTransaction/SubmitTransaction` (TransactionConfirm layout + goBack); Railway private-transfers.

**4.5 SIGN — Auth gate (password / Face ID).** Authorize local key access to start proving + signing; password default, passkey optional; seed never requested.
- Components: modal over REVIEW "Confirm it's you"; masked password field with show/hide + primary "Unlock & send"; if passkey enrolled, prominent "Use Face ID" with password fallback link; reassurance ("Your key signs locally. It never leaves this device.").
- States: default; loading ("Verifying…"); error-wrong-password (inline + shake/clear); error-passkey-cancelled/failed ("Face ID cancelled" + password fallback revealed); disabled (Unlock disabled while empty); success (dismiss → PENDING_PROOF).
- Interactions: correct auth unlocks in-memory key, kicks off proving, advances; Cancel → REVIEW unchanged.
- Borrow: `.../views/UnlockAccount/index.tsx` (shared EnterPassword gate).

**4.6 PENDING_PROOF — Generating proof (first-class state).** Absorb seconds-to-minutes of client-side proving honestly, let the user navigate away and resume, and teach that the latency is the privacy feature — never a frozen spinner.
- Components: staged progress (Building inputs → Generating proof → Submitting); elapsed timer + soft estimate ("usually 10–90s on this device"), no fake countdown; plain-language "Your device is doing the private math…"; "Run in background"/Minimize → persistent Home status pill ("1 private send proving…") deep-linking back; Cancel (with confirm), valid only pre-submission.
- States: proving/default; slow/long-tail ("Taking longer than usual… safe to leave it running", no error styling); submitting ("Broadcasting the shielded transaction", Cancel disabled/irreversible); backgrounded (Home + status pill; return re-renders live progress); error-proof-failed (→ ERROR with retry); success (→ SUCCESS); interrupted/restored (tab closed mid-proof: "A private send was interrupted. Resume / Discard", pre-submit only).
- Interactions: Minimize → Home pill; tap pill → back; Cancel pre-submit aborts cleanly (funds untouched); send continues if user navigates within session. Mocked timeline (inputs 1s → proof 12s → submit 2s) + toggles for slow/failure.
- Borrow: Zashi 2.0 (tappable status banner + best-next-action); Railway (keep-app-open / proof-validity framing).

**4.7 SUCCESS — Sent privately.** Confirm the private transfer, reinforce the privacy outcome, set honest expectations about recipient spendability lag.
- Components: success mark + "Sent privately", amount+asset+recipient; reassurance ("On-chain this looks like an opaque shielded transaction — no amount, no recipient"); recipient-spendability note ("becomes spendable shortly after their wallet syncs"); balance delta preview ("Spendable: 142.50 → 117.50 USDC"); actions Done / View in Activity / Send again; optional link to the public submission tx labelled "This only shows that a transaction occurred".
- States: success/default; confirmed-vs-pending ("Submitted — confirming" → flips to Confirmed); partial/change-reorg edge.
- Interactions: Done resets → Home; View in Activity → new private (pending) row; Send again → fresh RECIPIENT.
- Borrow: `.../views/FullscreenSuccessMessage`; Railway recipient-spendability copy.

**4.8 ERROR (cross-cutting) — recover without re-entry.** Recover gracefully from proof/submission/pre-flight failures while preserving all entered data and never silently dropping an in-progress send.
- Components: error notification with plain-cause copy, keeping the step indicator; primary Retry scoped to the failed stage (re-prove vs re-submit only); back-to-edit preserving recipient/amount/memo; contextual secondary actions (Get help; Fund/Shield XLM if account lacks fees; Switch-to-Unshield; Switch-to-testnet).
- States: proof-generation-failed; submission/broadcast-failed (retry submit only, offer fee-funding); recipient-not-registered; insufficient-spendable race; network/RPC down; mainnet-gated.
- Interactions: stage-scoped Retry avoids re-entering/re-proving when only submission failed; back-to-edit returns with state intact.
- Borrow: `.../views/Send/index.tsx` (Notification variant=error + retry scaffolding); Zcash UX checklist (mark pending/expired, never delete).

### Cluster 5 — Shield (deposit) + Unshield (withdraw): the boundary crossings

**5.1 Shield — Source / entry (SOURCE).** Pick which public funds (XLM/USDC) to move into the pool; double as the "Add funds → I already have public balance" landing; teach up front that the deposit is public.
- Components: SubviewHeader "Shield funds" + X; direction pill pair Public ──▶ Shielded (eye icon on Public, shield on Shielded); AssetToggle XLM/USDC + selectable public balance source row with Max; honest deposit Notification ("Shielding is a public deposit — amount and your Stellar account are visible on-chain"); sticky footer "Continue".
- States: empty-no-public-funds (friendly block "Receive public funds" + "Bridge USDC in", not an error); empty-unfunded-Stellar (fund with 1 XLM + testnet Friendbot); loading; invisible USDC trustline setup ("Preparing USDC…", quiet +0.5 XLM reserve line, never the word); disabled (Continue greyed until asset with balance chosen); mainnet gate (NetworkGate disables CTA + "Switch to testnet").
- Interactions: select asset reveals its public balance row; Max fills next-step amount, auto-reserving XLM gas with "Keeping 1.5 XLM" note; Continue → AMOUNT.
- Borrow: `.../views/AddFunds/index.tsx`; Railway shield-unshield; Stellar minimum-balance glossary.

**5.2 Shield — Amount (AMOUNT).** Enter the deposit amount and reinforce the Pending→Spendable transition that absorbs proving latency.
- Components: SubviewHeader + back; big numeric input with asset suffix + Max (auto-width); available-public line "of 42.50 XLM public"; BalanceSplitChip preview "After shielding: Pending +X → Spendable in ~1–2 min"; flat Stellar fee line; footer "Review".
- States: default/typing live validation; over-balance (error + disabled Review); XLM dust below reserve (warn + clamp Max to keep ~1.5 XLM); zero/empty; USDC trustline finalizing ("Finishing setup…" then enable).
- Interactions: Max respects reserve; Review → REVIEW.
- Borrow: `.../components/send/SendAmount`; Railway proofs-of-innocence.

**5.3 Shield — Review (REVIEW).** Confirm deposit and deliver the honest "what is public" teaching moment before signing.
- Components: SubviewHeader "Review shield"; summary card (From Public USDC → To "your shielded pool" (own wallet, not an address), amount, fee, one-time reserve line only if charged); PrivacyLedger (shield variant): Revealed = deposit amount / public account / that a deposit happened; Hidden = how you later spend it / who you send to; footer primary "Shield funds" + Back.
- States: default; build/simulate failure (Notification + Retry); disabled while building ("Preparing…"); mainnet gate re-asserted if network flips.
- Interactions: Shield funds → mock wallet sign → PROOF (or straight to SUBMITTING if deposit needs no proof).
- Borrow: `.../components/send/SendAmount/SubmitTransaction`; Zcash UX checklist.

**5.4 Shield — Generating proof (PROOF) [pending-proof].** Honest client-side proving wait for the deposit — short here — with no frozen spinner.
- Components: centered proof-progress module (Building commitment → Generating proof → Ready), elapsed timer, "math stays on your computer"; keep-open guidance "~30 sec, keep tab open"; Cancel (safe, nothing submitted).
- States: proving/default; slow/over-estimate ("taking a little longer — still working", no error); proof failed (Notification + Retry + Get help); cancelled (→ REVIEW, nothing lost).
- Interactions: auto-advance to SUBMITTING on success; Cancel → REVIEW. Estimate 30s, mock completes ~6s.
- Borrow: Zashi 2.0; `.../components/send/SendAmount/SubmitTransaction`.

**5.5 Shield — Submitting (SUBMITTING).** On-chain submit of the public deposit transaction.
- Components: reused SubmitTransaction busy state "Submitting deposit…" with subtle progress.
- States: submitting; network-error (Retry, funds untouched); success (→ SUCCESS).
- Interactions: auto-advance to SUCCESS. Mock submit ~2s, mock digest.
- Borrow: `.../components/send/SendAmount/SubmitTransaction`.

**5.6 Shield — Success (SUCCESS) [success + pending-proof aftermath].** Confirm the public deposit leg landed and set honest Pending→Spendable expectation.
- Components: success check "Deposit confirmed — funds entering your shielded pool"; live BalanceSplitChip "Pending +25.00 USDC · Spendable in ~1 min"; explorer link "View public deposit ↗" (Mocked/Testnet — honest, this leg is public); "We'll mark it Spendable automatically" note; primary "Done" + secondary "View in Activity".
- States: success (pending-proof) default; spendable reached if user lingers (chip flips "Now Spendable").
- Interactions: Done → Home; View in Activity → Pending row.
- Borrow: `.../views/FullscreenSuccessMessage`; Railway proofs-of-innocence; Zcash UX checklist.

**5.7 Unshield — Destination (DESTINATION).** Capture the public Stellar destination and immediately frame the withdrawal as public-facing; invisibly pre-check USDC receivability.
- Components: SubviewHeader "Withdraw to Stellar"; direction pills Shielded ──▶ Public (eye icon on Public); recipient input "Stellar address (G…)" with paste + QR-scan, middle-truncate on resolve; **non-dismissible warning Notification** ("Withdrawals are public — destination and amount visible on-chain"); AssetToggle XLM/USDC; footer "Continue".
- States: empty (disabled + helper); invalid address; recipient cannot receive USDC (no jargon: friendly blocker + "Switch to XLM"); unfunded destination XLM <1 ("send at least 1 XLM to activate"); self-withdraw allowed with subtle note; loading; mainnet gate.
- Interactions: paste auto-trims/validates; QR-scan (mocked) fills; Continue → AMOUNT. Demo data: valid `GB…X4QK` (USDC-ready) + `GC…7AOO` (cannot receive USDC).
- Borrow: `.../views/Send/index.tsx`; Zcash UX checklist.

**5.8 Unshield — Amount (AMOUNT).** Enter withdrawal amount from Spendable only; teach that Pending cannot be spent yet.
- Components: SubviewHeader + back; big amount input + Max (Spendable only); BalanceSplitChip as source of truth "Spendable 90.00 · Pending 25.00 (not yet available)"; flat fee line + restate 1 XLM activation if destination unfunded; footer "Review".
- States: default; over-spendable but covered by pending (honest error "withdraw up to 90 now, 25 still becoming Spendable" + "Use max Spendable", never spend Pending); over-total error; zero/empty; loading.
- Interactions: Max = Spendable; Review → REVIEW.
- Borrow: `.../components/send/SendAmount`; Railway proofs-of-innocence.

**5.9 Unshield — Review + leak warning (REVIEW) [critical honest screen].** The deliberate disclosure gate — the most important screen in the cluster; require explicit acknowledgement before proving.
- Components: SubviewHeader "Review withdrawal"; summary card (From shielded pool → To `G…7AOO` expandable, amount, fee, activation note if applicable); **PrivacyLedger (unshield variant, hero)**: Revealed = destination / amount / "spent" marker / submitting account (no relayer → metadata can link to you); Hidden = which deposit funded it / other shielded balance / past activity; **required checkbox** "I understand this withdrawal is public" (gates CTA); footer primary "Generate proof & withdraw" + Back.
- States: default (checkbox unchecked → CTA disabled); acknowledged (CTA enabled); "Why is my account visible?" expandable metadata/relayer-future sheet; build failure (Notification + Retry); mainnet gate.
- Interactions: check box enables CTA; CTA mock-signs → PROOF; expand no-relayer disclosure sheet.
- Borrow: Zcash UX checklist; `.../components/send/SendAmount/ReviewTransaction`; Penumbra addresses/keys.

**5.10 Unshield — Generating proof (PROOF) [pending-proof, the long one].** Client-side spend proof that may take minutes — honest, cancel-safe, never frozen; supports a sync-first interstitial.
- Components: proof-progress module with longer estimate + strong keep-open guidance ("up to a couple minutes, keep tab open"); labeled steps Selecting notes → Building proof → Finalizing + elapsed timer; optional "proof valid ~3 min" window once ready-pre-submit; Cancel (safe).
- States: proving default; slow (past-estimate reassurance, no error); proof expired before submit (warning + Regenerate); proof failed (error + Retry + Help); sync-required ("catching up to the network first…" with sync progress then resumes); cancelled (→ REVIEW, acknowledgement preserved).
- Interactions: auto-advance to SUBMITTING; Cancel → REVIEW. Estimate 90s, mock completes ~8s; one path forces slow→success.
- Borrow: Zashi 2.0; Railway shield-unshield.

**5.11 Unshield — Submitting (SUBMITTING).** On-chain submit of the public withdrawal.
- Components: reused SubmitTransaction busy state "Submitting withdrawal…".
- States: submitting; network-error (Retry; route back to PROOF if proof expired); success (→ SUCCESS).
- Interactions: auto-advance; re-route to PROOF if proof window lapsed.
- Borrow: `.../components/send/SendAmount/SubmitTransaction`.

**5.12 Unshield — Success (SUCCESS) [success + honest residue].** Confirm the public withdrawal landed and restate what is now public vs what stayed hidden.
- Components: success check "40.00 USDC now public at G…7AOO"; explorer link "View public withdrawal ↗" (Mocked/Testnet — honest); mini PrivacyLedger recap (Public = destination + amount visible; Hidden = which deposit funded it); updated BalanceSplitChip (Spendable −40); primary "Done" + secondary "View in Activity".
- States: success default; edge (destination newly activated → "1 XLM minimum applied").
- Interactions: Done → Home; View in Activity → row.
- Borrow: `.../views/FullscreenSuccessMessage`; Zcash UX checklist.

### Cluster 6 — Bridge / Add funds from another chain (CCTP on-ramp, then shield)

**6.1 B0 — Add-funds chooser (entry).** Route the user to the right way to get funds in; re-skin of Freighter AddFunds with the fiat "Buy with Coinbase" on-ramp removed (DO-NOT-COPY).
- Components: SubviewHeader "Add funds" / "Choose how to bring money in", X to Home; two stacked method cards (leading glyph + title + description); card "From another chain" (bridge glyph, "Move USDC from Ethereum onto Stellar (public), then shield it", trailing ChainBadge "Ethereum → Stellar"); card "Transfer from another account" (QR → Receive public tab); tertiary "Already have public funds? Shield them" → Shield SOURCE; footer microcopy "Bringing funds in is always public. You shield them as a second step." + persistent MockedRibbon.
- States: default (both cards enabled); disabled/mainnet-gated ("From another chain" shows "Testnet only" pill + disabled explainer + "Switch to testnet"); no injected Ethereum wallet (card still enabled; connection deferred to CONNECT).
- Interactions: tap card → Bridge SOURCE (from-bottom) or Receive; Back → Home.
- Borrow: `.../views/AddFunds/index.tsx` (strip Coinbase button).

**6.2 B1 — Source: choose chain + asset (SOURCE).** Establish what is bridged (Ethereum → Stellar, USDC only) and teach up front that BOTH ends of the bridge are public.
- Components: SubviewHeader "Bridge USDC in" / "From Ethereum to Stellar"; direction visual "Ethereum → Stellar" pill pair, BOTH pills carry an eye icon (deliberately contrasts Shield's Public→Shielded); source chain selector (single selected "Ethereum (via Circle CCTP)" + disabled "More chains coming" WIP row); fixed non-interactive USDC chip + note "Only USDC can be bridged. XLM stays native to Stellar." (no AssetToggle); PublicLegBanner (primary); sticky footer "Continue".
- States: default (Ethereum selected, USDC fixed, Continue enabled); mainnet gate (gated explainer + "Switch to testnet"); loading (thin "Checking bridge status…"); error (bridge service down, mocked → Notification + Retry, Continue disabled).
- Interactions: Continue → AMOUNT; Back → B0.
- Borrow: `.../views/Send/index.tsx` (SET_SOURCE_ASSET select-then-continue via SendDestinationAsset).

**6.3 B2 — Amount (AMOUNT).** Enter USDC amount; show the honest two-leg route/cost; invisibly pre-validate the Stellar side can receive USDC (trustline never named).
- Components: SubviewHeader "How much to bridge?"; large auto-resizing numeric input, suffix "USDC", ChainBadge "from Ethereum"; source balance line "Ethereum USDC available: 250.00" + Max; route/cost card (bridge amount (Ethereum) / Ethereum gas est / Circle fee 0.00 / receive ~ amount (Stellar) / "Arrives as public USDC. Shield it after."); estimated time chip "~10–20 min (burn + attestation + mint)"; sticky footer "Continue".
- States: empty; invalid over balance ("More than your Ethereum USDC balance"); invalid below CCTP minimum ("Minimum bridge amount is 1.00 USDC."); USDC-not-receivable INVISIBLE ("Preparing your Stellar account to receive USDC…" + optional "Adds 0.5 XLM network reserve (one-time)"); recipient-not-ready (too little XLM for reserve → warning "needs ~0.5 XLM to receive USDC" + "Receive XLM" / testnet "Fund with Friendbot", Continue disabled); loading; disabled.
- Interactions: Max fills available; Continue → CONNECT (or skip to REVIEW if already connected); Back → SOURCE.
- Borrow: `.../views/Send/index.tsx` (AMOUNT step + SendAmount big input + Max + balance line).

**6.4 B3 — Connect / authorize Ethereum (CONNECT).** Get authority to initiate the Ethereum burn honestly; make the foreign external-chain step legible and separate from the Stellar wallet.
- Components: SubviewHeader "Connect the Ethereum side"; explainer card (USDC burned on Ethereum; connect external Ethereum wallet; separate from Stellar wallet); connect options (mocked): primary "Connect Ethereum wallet" (injected/MetaMask mocked sheet w/ Mocked chip) + collapsed "Use a watch / manual source" advanced fallback so the prototype can proceed; connected panel (middle-truncated 0x address, detected USDC balance, network check); destination line "USDC will mint to your Stellar account G…7AOO" (ChainBadge Stellar, same-wallet reassurance); sticky footer "Continue to review".
- States: empty/not connected; connecting (Loading "Waiting for Ethereum wallet…" + Cancel); connected correct network (success panel); wrong network ("Switch to Sepolia" + Switch mocked, disabled); insufficient ETH for gas (warning, disabled, testnet faucet note); connection rejected/failed (Notification + Retry); disabled.
- Interactions: Connect → mocked sheet → connected panel; Continue → REVIEW; Back → AMOUNT.
- Borrow: `.../views/ViewPublicKey` (address middle-truncation + copy); `.../views/Send/index.tsx` (Loading/Notification scaffolding).

**6.5 B4 — Review & start (REVIEW).** Final confirmation before money moves on Ethereum; lay out both legs, the public nature, time expectation, destination, and resumability.
- Components: SubviewHeader "Review bridge"; two-leg summary mirroring the later BridgeTimeline (Leg1 Ethereum "Burn 100.00 USDC" eye=public; Leg2 Stellar "Mint 100.00 USDC to G…7AOO" eye=public); PublicLegBanner (restated in full); cost recap (Ethereum gas est / Circle fee 0.00 / est arrival ~10–20 min); "What happens if you close" note (bridge runs on its own, resumable); sticky footer "Start bridge".
- States: default ready; re-validation on entry (mocked Loading "Re-checking route & balances…"; if changed → back to AMOUNT); mainnet gate; disabled (Start greyed if a precondition lapsed with inline reason).
- Interactions: Start bridge → external Ethereum signature (mocked) → BURN; Back → CONNECT/AMOUNT.
- Borrow: `.../views/Send/index.tsx` (PAYMENT_CONFIRM via InternalTransaction/SubmitTransaction TransactionConfirm).

**6.6 B5 — Burn (submitting on Ethereum) (BURN).** The brief window where the burn is signed/submitted/confirmed; first timeline node goes live; becomes irreversible once signed.
- Components: SubviewHeader "Starting bridge…" with NO back; Close X warns and routes to TRACKING (not cancel); BridgeTimeline first appearance (node 1 "Burning on Ethereum" active, nodes 2–3 pending); status under node 1 ("Confirm the burn in your Ethereum wallet" → "Waiting for Ethereum confirmations (1/3)…" live counter, mocked); Ethereum tx explorer link (mocked) once hash exists; reassurance "You can leave this screen — it'll keep going."
- States: awaiting signature (Loading + Cancel ONLY before signature → REVIEW); signed/confirming (counter + explorer link, NO cancel); burn confirmed (node 1 complete, auto-advance to TRACKING); signature rejected ("You rejected the burn. Nothing was sent." → REVIEW); burn failed on-chain (error + Retry → REVIEW + Etherscan link, recoverable); insufficient gas at submit (error + Retry).
- Interactions: auto-advance on confirm; Close → TRACKING (keeps running).
- Borrow: `.../views/Send/index.tsx` (submit phase SubmitTransaction).

**6.7 B6 — Tracking: cross-chain pending (TRACKING) [headline screen].** Honestly represent the multi-minute three-stage cross-chain wait with a vertical timeline + live attestation clock; resumable across wallet close; never a frozen spinner.
- Components: SubviewHeader "Bridging USDC" / "Ethereum → Stellar — public"; Close X → Home (does NOT cancel); BridgeTimeline centerpiece, 3 nodes (1 Burning on Ethereum complete + Etherscan link; 2 Circle attesting active + AttestationClock "~13 min typical — 4:20 elapsed" + Circle status link; 3 Minting on Stellar pending); amount + route recap strip; compact PublicLegBanner "Still public. You'll shield it after it arrives."; footer "Track in Activity" / "Close — keep tracking" (no primary while pending) + quiet "Get help / it's stuck".
- States: Leg2 pending/active normal (attestation clock counting, functional pulse); Leg2 slow (soft warning >20min, "Taking longer than usual… your funds are safe"); Leg2 attestation TIMEOUT (hard >60min, mocked: "on Circle's side; your burned USDC is recoverable" + Retry fetch + Check Circle status + Get help, never says lost); Leg3 minting active ("Minting on Stellar…" + Stellar tx link); Leg3 mint failed / recipient-not-ready (mocked: "can't receive USDC right now" + "Fix and retry mint", funds claimable); all complete (auto-advance to ARRIVED); resumed view (timeline reconstructed from persisted state); loading on resume ("Checking bridge progress…"); offline/poll failure (thin warning "Can't reach network to update — retrying…" with last-known timestamps, never blanks).
- Interactions: Close → Home (chip persists); tap Home chip / Activity row re-enters here; explorer links open mocked pages; Retry actions re-poll; auto-advances per leg.
- Borrow: `.../views/AccountHistory/index.tsx` (pending-section + chip representation); `.../views/Send/index.tsx` scaffolding; BridgeTimeline + AttestationClock invented.

**6.8 B7 — Arrived: public USDC + "Shield this now?" (ARRIVED).** The arrival pivot: funds are public USDC on Stellar; convert the win into the privacy action by auto-prompting to shield.
- Components: SubviewHeader "USDC arrived" / "On Stellar — as public USDC"; arrival summary card (big "+100.00 USDC", ChainBadge Stellar, "In your public balance now" + Stellar tx explorer link mocked + collapsed all-complete timeline); honest pivot block ("This USDC is public. Shield it to make it private." + one-line model reminder); primary "Shield this now" → Shield SOURCE with USDC + 100.00 pre-filled; secondary "Keep it public for now" → Home (persistent Zashi-style "Shield now" nudge on the public row); persistent MockedRibbon.
- States: success default; partial/dust ("Received 99.98 USDC (gas-adjusted)" honest delta); shield gated (mainnet: "Shield this now" disabled w/ reason + "Switch to testnet"; "Keep it public" still works); USDC receiving just set up ("USDC receiving enabled (0.5 XLM reserve used)." — no "trustline").
- Interactions: "Shield this now" → Shield flow carrying asset+amount; "Keep it public" / close → Home.
- Borrow: `.../views/FullscreenSuccessMessage`; Shield SOURCE handoff target.

**6.9 B8 — In-progress representation on Home / Activity (resumable surface).** Give the multi-minute, closeable bridge a persistent home outside its own route so users never feel they lost their money; failed bridges are never deleted.
- Components: Home chip/banner (tappable "Bridging 100.00 USDC — Circle attesting (~13 min)" + mini 3-dot progress + chevron → re-enters TRACKING; dismiss hides chip only); Activity row typed "Bridge in", state "In progress", +100.00 USDC pending, ChainBadge "Ethereum → Stellar"; on completion → "Bridged in — public" row; after shielding links to the subsequent shield row; failed/timeout rows persist as "Needs attention".
- States: in progress; needs attention (failed/timeout chip turns warning, row re-opens TRACKING recovery); complete not yet shielded (chip "100.00 USDC arrived — Shield it" → Shield; row "Bridged in (public)"); complete + shielded (chip clears; both rows linked); empty (no chip).
- Interactions: tap chip/row → TRACKING or Shield; persists across wallet close.
- Borrow: `.../views/AccountHistory/index.tsx` (month-sectioned list, pending state, empty pattern).

### Cluster 7 — Activity / History

**7.1 Activity list (month-sectioned).** Single chronological log of all four event types (shield / private-send / unshield / bridge), grouped by month, each row carrying type, privacy-aware amount, status, and a visibility glyph (Hidden / Public / Mixed). Default landing for "what happened to my money + who could see it."
- Components: app header (title "Activity", Filter funnel with active-count badge, persistent network pill, eye-toggle to mask amounts, "Mock data" chip); pending tray pinned above months ("In progress · N" for non-terminal rows; graduates into month sections on completion); month section headers (newest-first, always expanded); activity row (circular type-icon chip + primary label Shielded/Private send/Unshielded/Bridged in + visibility sub-line closed-lock Hidden / open-eye Public / Mixed + right column amount with privacy-aware sign + asset code over status-chip-or-time); amount masking control (bullets while keeping sign + asset code); footer "Load older activity".
- States: empty cold ("No activity yet" illustration + teaching + "Add funds" primary + "Receive privately" link); empty filtered ("No activity matches these filters" + "Clear filters"); loading first-load (skeleton rows, no bare spinner); loading incremental ("Loading older…" without blanking); refreshing (thin top progress / "Syncing…" pill, rows stay interactive); pending-proof row ("Proving…" chip + keep-tab-open sub-text + proof validity hint); attesting row (bridge: "Attesting…" chip + Circle ETA + ETH→Circle→Stellar mini-progress); awaiting-spendable row ("Pending balance" chip); submitting/broadcasting row with unshield "submitted from <public account> (visible)" note; success/complete terminal row (clock time + one-time subtle graduation highlight); failed row ("Failed" alert chip + cause class, retained); expired row ("Expired" chip + "Try again", retained); disabled/mainnet-gated (historical rows render, new-tx retry disabled with reason).
- Interactions: tap row → detail; tap Filter → filters sheet; eye-toggle masks all (session-persisted); pull-to-refresh; "Load older activity" paginates without blanking; in-progress rows live-poll + update chip in place with reserved row height (no reflow jump).
- Borrow: `.../views/AccountHistory/index.tsx`; `.../components/accountHistory/HistoryItem/index.tsx`; Zcash UX checklist; Railway private-transfers.

**7.2 Filters sheet.** Narrow the list by event type, asset, status, visibility, and direction within the honest privacy framing, over a fixed small taxonomy (no arbitrary tokens, no multi-chain).
- Components: slide-up sheet "Filter activity" with close + "Reset"; type multi-select chips (Shield · Private send · Unshield · Bridge, default all on); asset segmented (All · XLM · USDC); status multi-select chips (In progress · Complete · Failed · Expired); visibility segmented teaching control (All · Hidden (private) · Public legs); direction segmented (All · In · Out); hide-dust toggle; sticky footer "Show results (N)" with live count + Cancel.
- States: default (all-inclusive); active filters (count badge on funnel, Reset enabled); zero-results preview ("Show results (0)" disabled-style + "try widening"); disabled (Filter button disabled on empty wallet with "Nothing to filter yet").
- Interactions: any change live-updates footer count over fixture; "Show results" applies + closes; chips persist for session; clearable here and from list "Clear filters".
- Borrow: `.../components/SlideupModal`; `.../views/AccountHistory/index.tsx`.

**7.3 Activity detail.** Primary teaching surface: show the user's own decrypted truth for the event AND an explicit, honest "what others can see" disclosure block with explorer links for public legs only. One layout, four type-variants.
- Components: title row (type icon + title + dated subtitle + visibility badge); "Your view (decrypted)" block (credit/debit rows with amount+asset + per-type To/From rules — private send shows decrypted amount/memo + "Recipient (private)"; shield shows public Stellar source; unshield shows public destination + "deposit hidden"; bridge shows ETH→Stellar); "What others can see" disclosure block (per-type honest two-column table; no explorer link for hidden legs; unshield includes submitting-account metadata leak warning; bridge labels Circle attester / on-ramp-not-private); metadata block (Status, Network fee tiny/flat no editor, Memo on private legs shown even if empty labeled encrypted, Created timestamp, Proof validity/ETA when in-progress); contextual footer ("View on stellar.expert" per public leg; for hidden private send "nothing public to view"; "Try again" on failed/expired; always "Generate disclosure proof").
- States: complete per type; pending-proof (amounts greyed "Pending", Status "Proving…", live progress + keep-tab-open, explorer absent until public leg exists); attesting (bridge ETH→Circle→Stellar stepper + ETA + per-leg links); awaiting-spendable ("Pending balance" + "not spendable yet"); failed (Status + reason + "Try again" where safe); expired ("Expired" + "Try again" + prior-proof-invalid note); disabled/mainnet-gated (Try again / disclosure disabled with reason, read-only); loading detail (deep link skeleton, don't block on explorer fetch); copy success ("Copied!").
- Interactions: copy public address / tx hash; open explorer for public legs only, honestly labeled; "Generate disclosure proof" → disclosure flow; "Try again" → routes back into the relevant flow pre-filled; Close → list.
- Borrow: `.../components/accountHistory/TransactionDetail/index.tsx`; Zcash UX checklist; Railway shield-unshield.

**7.4 Per-transaction disclosure proof (compliance hook off the detail).** Let the user selectively prove ONE transaction to a third party without handing over a wallet-wide viewing key — Penumbra transaction-perspective. (This is the in-context entry; the full hub lives in Compliance.)
- Components: sheet "Generate disclosure proof" with read-only target tx summary; explainer (proves only this single transaction; contrast callout that this is safer than the wallet viewing key + "About viewing keys" link); "What will be revealed" granularity toggles (amount, asset, memo, counterparty optional, timestamp), default minimum; output options (Copy disclosure proof, Download .json/.txt, Show QR) + blunt irrevocability warning; mocked-integration banner.
- States: default/configuring; generating (pending-proof: "Generating proof…" honest progress + keep-tab-open, not frozen); ready/success (truncated copyable proof + Copy/Download/QR + irrevocability warning + "Copied!"); error (Retry); disabled/mainnet-gated.
- Interactions: toggle reveal granularity → live preview updates; Generate → Ready → Copy/Download/QR; link to Settings view-key export with "broader, cannot be revoked" warning.
- Borrow: Penumbra addresses/keys; Railway view-only-wallets; `.../views/ViewPublicKey/index.tsx`.

### Cluster 8 — Accounts + Settings

**8.1 Accounts list (manage / switch).** Identity hub: see all accounts under the seed, switch active, copy private/public addresses, inline-rename, enter add-account / new-address flows. Teaches account-vs-address model.
- Components: SubviewHeader "Accounts" + X; scrollable AccountRow list (identicon from private bundle, editable name 24-char max, truncated PRIVATE address as primary line labeled "private address" with public G… one level deeper, mocked total-balance chip); active row visually selected (checkmark/accent), not tappable-to-switch; per-row ••• options (Copy private address, Copy public Stellar address, Rename, Show on Receive →; NO remove); sticky footer primary "+ Add account" + secondary "What's an account vs an address?".
- States: default (≥1 account, one active); single-account ("all accounts share one seed"); loading; balance-pending sub-line per row (Pending vs Spendable, no frozen spinner); empty (data-wipe edge: "No accounts yet" + Create); error (balances fail → inline Notification + Retry; list still renders); disabled (active-row switch disabled; "show public address" disabled when G… unfunded, tooltip); success-switch (active marker moves, return Home, toast).
- Interactions: tap non-active row → makeAccountActive → Home; tap ••• → inline options; Copy → "Copied!" (public address shows on-chain-visibility caution); Rename → slide-in card; +Add account → derive-from-seed.
- Borrow: `.../views/Wallets/index.tsx`; `.../components/identicons/IdenticonImg`; Phantom wallets/accounts/addresses help.

**8.2 Add account (derive from same seed).** Create the next sequential HD account from the existing seed — no new seed, no secret-key import, no hardware (all DO-NOT-COPY). Reduces Freighter's 3-option add menu to one honest path.
- Components: modal subview, SubviewHeader "Add account" + back; explanatory card ("Creates a new account from your existing seed phrase. No new backup needed."); optional name input prefilled "Account {n+1}"; note ("New accounts start empty. Each has its own private + public Stellar address."); primary "Create account".
- States: default/idle; working (spinner "Creating…", inputs disabled, deterministic micro-delay); success (new row highlighted, return to list, toast); error (inline Notification + Retry); disabled (only while working).
- Interactions: Create → derive → append → Accounts list; back → discard.
- Borrow: `.../views/AddAccount/AddAccount/index.tsx` (reduce 3-option AddWallet to one path).

**8.3 Inline rename.** Rename any account; names are local-only labels, never on-chain.
- Components: slide-in Card over dimmed background; title "Rename account"; autofocus text input (maxLength 24, current name placeholder); read-only "Private address: zkf1q9…7p4n"; Cancel / Save.
- States: default; empty input (Save disabled, "Name can't be empty"); too-long ("Max 24 characters"); unchanged (Save no-ops/disabled); saving; success (card dismisses, label updates, toast); error (inline + Retry).
- Interactions: type → Save → close; Enter submits; outside-click / Cancel → discard.
- Borrow: `.../views/Wallets/index.tsx` RenameWallet slide-in; `.../views/ViewPublicKey/index.tsx` pencil→check inline edit.

**8.4 New private address + account-vs-address explainer.** Teach the one-seed → N-accounts → N-rotating-addresses model and generate a fresh rotating private receive address (Zashi/Railgun pattern). The Accounts list links here.
- Components: explainer sheet SubviewHeader "Accounts & addresses"; plain-language model card + simple labeled tree diagram (1 seed → N accounts → N rotating private addresses + 1 public G…); honest note (public Stellar address is static, deposit/fees only, visible until shielded); "New private address" primary → fresh `zkf1…` with QR + Copy + "Same wallet, new address" reassurance.
- States: default; generating (spinner, deterministic micro-delay); success (new rotating address + Copy; "Old addresses still work"); error (Retry); disabled (on mainnet if privacy gated, with reason).
- Interactions: Generate → derive → reveal fresh address + QR + Copy.
- Borrow: Zashi rotating-address blog ("same wallet" reassurance); `.../views/ViewPublicKey/index.tsx` (address + QR + Copy shell).

**8.5 Settings root (menu).** Hub for Security, Network, Compliance/view-key, About, and Lock; persistent unaudited + network tags.
- Components: SubviewHeader "Settings" + X; ListNavLink rows (Security, Network, Compliance & disclosure, About); divider + distinct accent Lock row (immediate, no confirm); footer (network pill echo + version "v0.1.0 · testnet · unaudited").
- States: default only (rows never disabled); Lock requires no confirm; footer network pill reflects live network.
- Interactions: tap row → subview; tap Lock → lock + route to Unlock.
- Borrow: `.../views/Settings/index.tsx`.

**8.6 Security (sub-menu).** Gate to seed reveal, change password, auto-lock, and passkey toggle; surfaces the no-recovery disclaimer.
- Components: SubviewHeader "Security"; honest banner ("Your seed phrase is the ONLY recovery. No reset — lose it and funds are gone."); rows (Reveal seed phrase, Change password, Auto-lock timer, Passkey (Face ID) with trailing On/Off pill).
- States: default; passkey row pill reflects On/Off; WebAuthn unsupported → passkey row "Unavailable on this device" disabled + tooltip.
- Interactions: tap row → respective subview.
- Borrow: `.../views/Security/index.tsx` (keep Show recovery phrase + Auto-lock; drop asset-lists/advanced).

**8.7 Reveal seed phrase (password gate + warning).** Show the 12/24-word seed behind a password + explicit warning. Highest-danger screen — designed for friction.
- Components: Step A (SubviewHeader "Reveal seed phrase" + bold warning card + masked password input + "Reveal" disabled until non-empty); Step B (numbered word grid blurred behind "Tap to reveal" scrim; Copy with clipboard caution + Hide toggle; auto-reblur on blur/idle).
- States: idle; verifying; error wrong-password (inline + rate-limit after N attempts "Try again in 30s"); success (Step B blurred-until-tap); revealed (words + Copy/Hide); disabled; passkey-only edge ("This account has no seed phrase").
- Interactions: enter password → Reveal → tap-to-unblur; Copy/Hide; auto-return to gate on idle/tab-switch.
- Borrow: `.../views/MnemonicPhrase`; `.../views/DisplayBackupPhrase`; `.../views/UnlockAccount/index.tsx`.

**8.8 Change password.** Change the local unlock password (encrypts local keystore). Does NOT change the seed; honest "password unlocks this device, seed is recovery".
- Components: SubviewHeader "Change password"; masked inputs Current / New / Confirm new; strength meter on New; note distinguishing password vs seed; primary "Update password".
- States: default (disabled until valid + match); mismatch ("Passwords don't match"); weak (meter warns; block below floor); wrong-current (inline + rate-limited); saving; success (toast + return); error (Retry).
- Interactions: fill 3 fields → Update → return to Security.
- Borrow: no Freighter ref (commented TODO) — MetaMask / Phantom password-reset model (current → new → confirm).

**8.9 Auto-lock timer.** Choose idle timeout before the wallet auto-locks.
- Components: SubviewHeader "Auto-lock timer"; single-select option list (1/5/15/30 min, 1 hour, Never; selected shows Check); helper text; "Never" shows "Not recommended on shared devices".
- States: default (current checked); saving (options disabled); success (check moves, subtle "Saved", auto-persist no save button); loading (skeleton); error (Notification + Retry); disabled (during save).
- Interactions: tap option → auto-save → check moves.
- Borrow: `.../views/AutoLockTimer/index.tsx` (1:1).

**8.10 Passkey (Face ID) enable / disable.** OPTIONAL WebAuthn-PRF convenience unlock. Honest: seed stays primary, passkey is NOT recovery, same wallet returns only via a synced credential.
- Components: SubviewHeader "Passkey"; toggle card "Use Face ID / passkey to unlock" (On/Off) + explainer (sync caveat + seed-still-primary); Enable: "Set up passkey" → mocked WebAuthn → "Confirm with current password" bind step; Disable: confirm "Turn off passkey unlock?".
- States: off/default; enabling (mocked OS prompt overlay "Waiting for passkey…" labeled Mocked → password-bind); on/success (toast; Security pill → On); disabling (confirm → off → toast); error/declined ("Passkey setup cancelled" / "Couldn't set up passkey — password still works"); unsupported (toggle disabled + reason); loading (reading credential state).
- Interactions: toggle on → ceremony + password bind; toggle off → confirm.
- Borrow: no Freighter ref — Phantom Auth optional-layer framing.

**8.11 Network (testnet/mainnet toggle + indicator).** The ONLY network control: flip testnet↔mainnet. One switch flips RPC/passphrase/USDC issuer+SAC/CCTP under the hood; user never sees a contract id. Surfaces the mainnet-privacy-gated note.
- Components: SubviewHeader "Network"; segmented control Testnet↔Mainnet matching the global header pill; read-only summary card ("Active: Testnet · privacy pool: available" + single muted "managed automatically" line, no contract ids, no custom RPC); mainnet-gate note ("Shielded transfers run on testnet today; on mainnet privacy pool isn't deployed — plain transfers work, Shield/Unshield/Private send disabled until it ships").
- States: default (Testnet selected); switching ("Switching network…" spinner; balances refetch downstream); mainnet-selected (banner "Privacy features disabled on mainnet"; global pill → MAINNET distinct); confirm-on-switch-to-mainnet ("Switch to mainnet? Shielded features off here"); error ("Couldn't switch network" + Retry; stays on prior); loading.
- Interactions: toggle → (confirm if mainnet) → re-init → update global pill.
- Borrow: Stellar networks docs (single binary toggle; explicitly REJECT Freighter ManageNetwork/custom-RPC/add-network).

### Cluster 9 — Compliance / selective disclosure

**9.1 Compliance entry (Settings → Compliance & disclosure).** Hub that frames the two disclosure tools, routes to the preferred one (disclosure proof), and lists previously generated disclosures for re-share/revoke/status.
- Components: SubviewHeader "Compliance & disclosure" + back (reached from a Settings row under Security); dismissible teaching banner ("read-only access to only what you choose — never your full history, never spend" + "How disclosure works" link → learn sheet); two **deliberately asymmetric** path cards ("Create a disclosure proof" primary, Recommended; "Export a viewing key" muted/secondary with caution glyph, "last resort"); "Your disclosures" list (rows with label, type pill Proof/Viewing key, scope summary, created date, status pill Active/Expired/Revoked); inherited network indicator; mainnet-gated note when privacy gated.
- States: empty (no disclosures illustrative empty state, cards still present); loading (skeleton rows, cards immediate); error (Notification + Retry; cards stay usable); disabled (mainnet privacy-gated dims cards with reason chip + network-toggle link); success (newest row animates in with "Created" highlight).
- Interactions: tap proof card → scope builder; tap viewing-key card → gated export; tap row → detail; dismiss banner (persists); Retry on load error.
- Borrow: `.../views/Settings/index.tsx` (ListNavLink IA + SubviewHeader); Freighter empty-state pattern.

**9.2 Build a disclosure proof — choose scope.** Core differentiator: user selects EXACTLY what to reveal (by transaction / date range / counterparty), with a live "what the auditor will see" preview making "scoped, not everything" physically obvious.
- Components: SubviewHeader "Create disclosure" (step 1 of 3); scope-mode segmented control (By transaction default — searchable multi-select tx list with checkboxes + counter; By date range — two date pickers + live count; By counterparty — pick a private address); sticky "What the auditor will see" preview (tx count, total per asset, date span, explicit "Hidden: everything else, plus all future activity"); always-visible "What's NOT revealed" micro-list (other txs, balances, seed phrase, spend access); primary "Next" (disabled until valid selection).
- States: empty no-shielded-txs (cannot disclose, CTA disabled, link home); empty filter-returns-nothing ("No transactions match"); loading (skeleton rows, preview dashes); selected/active (counter + preview populate); error (Notification + Retry); disabled (Next with inline reason).
- Interactions: switch scope mode (resets selection with confirm if non-empty); search/filter + multi-select; preview recomputes live; Next → recipient & limits.
- Borrow: `.../views/Send/index.tsx` (multi-step in-place slider, visited steps persist); shielded Activity row layout.

**9.3 Disclosure proof — recipient, limits & expiry.** Label the artifact, set recipient note, choose expiry, and establish the revoke/expiry model with honest copy about offline copies.
- Components: SubviewHeader "Create disclosure" (step 2 of 3); required label field ("Name this disclosure (only for you)"); optional recipient note ("Who is this for?"); expiry radio group (No expiry / 7 days / 30 days default / Custom date) with honest helper (expiry controls the share link, not downloaded copies); read-only reassurance block (viewing only, never spend, nothing outside chosen scope); compact scope recap card + "Edit scope" link → step 1; primary "Review".
- States: default (expiry preset 30 days); invalid (blank label disables CTA + inline error; past custom date → field error); disabled (Review until label valid); success (Review → generation).
- Interactions: edit label / recipient note / expiry; Edit scope → step 1 with selection preserved; Review → proof generation.
- Borrow: `.../views/DisplayBackupPhrase/index.tsx` (Formik + View.Footer primary); `.../views/ViewPublicKey/index.tsx` (inline-editable label).

**9.4 Pending proof — generating disclosure.** First-class honest pending state for client-side proof generation (seconds-to-minutes); never a frozen spinner.
- Components: centered generation card "Building your disclosure proof" + "Proving locally, nothing uploaded"; labeled phase progress (Collecting txs → Generating ZK proof → Packaging) + elapsed timer; keep-tab-open warning; secondary Cancel (returns to step 2 with selections intact); mocked-integration tag ("Proof timing simulated").
- States: pending-proof (primary, animated phase progress + timer + keep-open); slow/long-running ("larger scopes take longer"); error (Notification + plain cause + Try again / Back to scope); cancelled (→ step 2); success (auto-advance to artifact detail).
- Interactions: Cancel; auto-advance on success; Retry on failure.
- Borrow: product's own pending-proof state; `components/Loading` as fallback spinner inside the card; Zashi status-banner idea.

**9.5 Export a viewing key (gated, demoted).** The blunt full-access export, deliberately higher-friction than the proof flow, with deflection toward the proof and the loudest warnings in the cluster.
- Components: SubviewHeader "Export viewing key"; loud warning block (louder than proof flow: all txs past AND future, cannot be revoked, anyone with it sees everything you receive, plus the one reassurance read-only/never spend); deflection callout "Prefer a disclosure proof" + "Create a disclosure instead" button; password gate (masked Input) → "Reveal viewing key" disabled until filled; post-reveal (monospace middle-truncated key block + CopyText "Copied!", anti-paste warning, optional "Save as named record" status "Active (cannot be revoked)", View.Footer Done); persistent steer "Prefer disclosing a single transaction instead →".
- States: gate default (CTA disabled until password); wrong password (inline error); loading (deriving, mock); revealed/success (key shown, copy enabled, anti-paste warning); disabled (mainnet gated with reason chip).
- Interactions: deflect to proof flow (prominent); submit password to reveal; Copy key; Save as tracked record; Done → entry.
- Borrow: `.../views/DisplayBackupPhrase/index.tsx` (~1:1 password-gate → reveal → blunt warning → Done); `.../views/Security/index.tsx`; `.../views/ViewPublicKey/index.tsx`.

**9.6 Verify a disclosure (auditor-side viewer).** Shows the other half — what the auditor sees opening the artifact — selling the read-only, scoped, verifiable promise. Standalone in-app viewer, no wallet needed.
- Components: reached via shareable link / "Open a disclosure" (paste artifact or link); verification banner (auto mock-verify → "Verified — authentic and unmodified" or red "Could not verify"); scope header ("You're viewing a scoped disclosure", recipient note, created date, expiry countdown, owner private address as revealed, explicit read-only/cannot-spend line); disclosed transactions list (date, amount, asset, direction, memo) + muted "N other transactions not included" footer; export for records (CSV/PDF, mock).
- States: loading/verifying ("Verifying disclosure…" progress, never blank); verified (green banner + list); invalid/tampered (red banner, list suppressed); expired (amber "expired on {date}, ask for a new one", list suppressed); revoked ("The owner revoked this disclosure", list suppressed); empty scope ("This disclosure contains no transactions").
- Interactions: auto-verify on open; export to CSV/PDF; expired/revoked → suppress data.
- Borrow: `.../views/AccountHistory` (read-only row layout); Zashi status-banner idea for the verification banner.

**9.7 How disclosure works (learn sheet).** One-screen explainer reinforcing proof-vs-viewing-key, opened from the entry banner and inline links.
- Components: bottom sheet / modal; two-column compare (Disclosure proof — scoped, past-only default, expirable link, recommended; vs Viewing key — everything, past+future, not revocable, last resort); honest caveat line ("either way, the auditor only ever reads, never spends"); "Got it" dismiss + "Create a disclosure" jump link.
- States: static (open/closed only).
- Interactions: dismiss; jump to create a disclosure.
- Borrow: `.../views/MnemonicPhrase` (explain-before-act pre-reveal sheet pattern).

**9.8 Disclosure detail (share / revoke / status).** Post-generation home for a single artifact: share it, watch status, revoke if possible — closing the revoke/expiry loop with honesty about un-revocable viewing keys and offline copies.
- Components: SubviewHeader = inline-editable disclosure label; status pill (Active / Expires in {countdown} / Expired / Revoked); type & scope summary card (Proof vs Viewing key, tx count + date span + assets; no "edit scope" — immutable → "Create a new disclosure"); share block (shareable link + large no-logo QR + Copy "anyone with this link can open until it expires"; for viewing-key type show key block + un-revocable warning instead); "Open as auditor" preview → verify viewer; revoke control (proof = "Revoke link" destructive confirm "stops new opens, can't recall copies"; viewing key = revoke DISABLED with honest reason + "Remove from list" local-only); activity footnote (created/last-opened, local-only, "we don't report this anywhere").
- States: active (share + revoke available); expired (share disabled + "Expired {date}" + create new); revoked (share disabled + "Revoked {date}"); loading (skeleton card); error (Notification + Retry); disabled (viewing-key revoke disabled with reason); success (revoke confirm toast, pill flips to Revoked).
- Interactions: Copy / QR share; Rename (pencil→check); Open as auditor → verify viewer; Revoke (confirm) or remove-from-list; Create a new disclosure.
- Borrow: `.../views/ViewPublicKey/index.tsx` (QR + middle-truncated string + CopyText + inline-edit label); long-string QR rules (large, EC level M, no logo overlay).

### Cluster 10 — Lock (cross-cluster exit)

**10.1 Lock (manual lock + locked hand-off).** Immediately lock the wallet, clear in-memory keys, route to Unlock. Converges with auto-lock into one locked screen (= screen 2.1).
- Components: Lock row in Settings root (and optional Home kebab; no confirm); transition to out-of-cluster locked screen ("Welcome back" + password, plus "Unlock with Face ID" when passkey enabled).
- States: trigger (immediate "Locking…" transition); locked hand-off (password-only, or password + passkey if enabled); auto-lock convergence (timer produces same locked screen); force-clear on key-clear failure (never leave keys resident); pending-proof caveat ("Locking will cancel an in-progress proof. Continue?").
- Interactions: tap Lock → clear keys → locked screen; unlock via password or passkey.
- Borrow: `.../views/Settings/index.tsx` (Log Out onClick signOut + navigate, immediate); `.../views/UnlockAccount/index.tsx` (resulting locked screen).

---

## Data, States, And Mocking Rules

- **Everything is mocked.** No live RPC, no real proof generation, no real bridge, no real keys. **Mark every mocked surface** with a consistent affordance so reviewers don't mistake demo data for a live integration.
- **Use realistic, product-specific mock data:** plausible XLM/USDC amounts (USDC two-decimal, XLM with reserve nuance), middle-truncated addresses that **keep head+tail** (e.g. `G…7AOO`, `0x71C…3aB9`), a long Bech32m-style **private address** string (`zkf1…`, ~120–180 chars), month-sectioned activity with a believable mix of shield / private-send / unshield / bridge / pending rows. Suggested anchors: Shielded USDC 1,240.50 + XLM 85.000 → Spendable USDC 1,200.00 / XLM 85.000, Pending USDC 40.50 ("Proving… ~28s"); public available-to-shield USDC 50.00 + XLM 12.5 (Reserved 1.5 XLM).
- **Mandatory states per relevant screen:** **empty, loading, pending-proof, error, disabled, success.** Privacy-specific states you must invent (no mainstream reference): pending-proof on Send/Unshield/Shield/disclosure; bridge in-flight (two-chain progress + attestation wait); mainnet-gated privacy; proof-failure / retry; sync-required; "same-wallet" two-address explainer.
- **Time-based states are real states:** Pending → Spendable transitions, proof **validity windows**, bridge attestation waits, and **expiry** (mark expired transactions visibly and keep them — never silently delete).
- **Honesty labels are data, not decoration:** "public," "shielded/private," "deposit is public," "this reveals information," "no relayer — submitting account visible" — treat these as required content fields on the relevant rows and confirmations, not optional garnish.
- **Prototype toggles to expose for the demo:** registered-vs-unregistered recipient; spendable=0 / pending-only; proof slow path + failure path; bridge slow / attestation-timeout / mint-failure; WebAuthn success/fail/unsupported; storage-failure on vault create.

---

## Prototype Quality Bar

- **Production-quality UX, IA, polish, and microcopy** — this prototype is the headline artifact; it should read as a real shipping product, not a sketch.
- **Every screen teaches the privacy model** through its structure and copy — a first-time user should infer "what's private here?" without a tutorial.
- **Complete state coverage** (empty/loading/pending-proof/error/disabled/success) on every flow that has them — partial flows read as unfinished.
- **Honest, never-overclaiming language** throughout. If a single screen says "anonymous," the prototype has failed its core obligation.
- **Borrowed-then-stripped:** public-wallet screens should feel as solid as Freighter; novel screens should feel native to the same product, not bolted on.
- **Pending is designed, not spinnered:** any wait of seconds-to-minutes has progress, context, and a "what to do" — no frozen spinners anywhere.

---

## Anti-slop Risks To Avoid

- **Generic SaaS / generic-crypto-wallet aesthetic.** This is a privacy product with a real point of view — not a dashboard template. No stock "fintech" filler.
- **Wall of identical cards.** Activity, balances, and asset rows must encode *meaning* (public vs. private vs. pending) — not repeat the same card N times. Visual differentiation is **semantic**, not decorative.
- **Overclaiming privacy.** "Fully private," "anonymous," "untraceable," a smug lock icon implying total secrecy — **all forbidden.** The honesty *is* the brand.
- **Hiding the leaks to look slicker.** The temptation is to soften or bury the unshield/bridge/public-deposit disclosures. Don't. Burying them is the worst possible slop here — it's a trust failure dressed as polish.
- **Frozen spinners for proofs.** A contextless spinner for a multi-minute proof is unacceptable; it reads as "broken." Design the wait.
- **Decorative-only privacy theatre.** Glowing shields, "encrypted…" animations, matrix-rain, padlock confetti that *signify* privacy without *teaching* it. Cut all of it.
- **Two-address footgun left unguarded.** If Receive doesn't make "private address vs. public address, same wallet" unmistakable, users will lose funds or leak — the labeling is a safety feature, not a layout detail.
- **Demoting the seed phrase.** Making passkey/social feel like the "real" path is both a slop pattern and a spec violation — seed stays primary and mandatory.
- **Jargon bleed.** "Trustline," "note commitment," "nullifier," "Soroban," "0zk" — none of these reach the user. If a concept needs a name, name it in plain language.

---

## Interaction Opportunities

Places where motion and interaction can *teach* (use sparingly, always functional — never decorative):

- **Shield / unshield as a literal boundary crossing** — a considered transition that shows money moving from the public side to the private side (and the reverse, with its disclosure), so the boundary is felt, not just read.
- **Pending → Spendable promotion** — a satisfying, honest moment when a proven balance becomes usable, reinforcing the split rather than hiding the wait.
- **Proof generation as narrated progress** — a first-class step with stages and validity window, "keep this open," and a calm completion — turning unavoidable latency into a moment of confidence.
- **Bridge in-flight as a two-chain journey** — progress that honestly spans Ethereum → attestation → Stellar → shield, so the multi-minute wait feels tracked, not stuck.
- **The unshield disclosure as a deliberate gate** — an interaction that makes the user *acknowledge* what becomes public, without feeling like a dark-pattern nag.
- **Receive "same wallet" reveal** — an interaction that makes the private/public relationship click instantly.
- **Selective disclosure as a precise, scoped action** — picking *one* transaction to reveal, visibly *not* exposing the rest.

Leave the **visual direction free** — these are *where* interaction earns its place, not *how* it should look.

---

## Inspiration And Source Material

- **Primary, load-bearing reference: Freighter** (shipping Stellar wallet) — `reference/freighter/extension/src/popup/views/` maps ~1:1 to our public-wallet screens (Welcome, AccountCreator, RecoverAccount, MnemonicPhrase, UnlockAccount, Send, ViewPublicKey, Wallets, Settings, AccountHistory). Borrow layout, IA, and microcopy; then **strip the do-not-copy surfaces.**
- **Full link-cited references doc:** `/Users/abu/dev/hackathon/stellar-zk-wallet/.thoughts/design/2026-06-21-design-references.md` — read it. Per-screen pattern→link mappings, the privacy-screen references, QR/Stellar specifics, the do-not-copy list, name-collision findings, and microcopy worth lifting.
- **Privacy patterns — Zcash / Zashi:** the authority on **honest framing** — the UX wallet checklist (https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html: show confirmed *and* unconfirmed; "Spendable" component; visibly mark pending and expired; the de-shield warning *"Explicitly tell users that they are about to reveal transaction information"*), and Zashi 2.0's status-banner + shield-before-spend patterns (https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/, https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/).
- **Privacy patterns — Railgun:** the **0zk-style private-address** bundle, **Pending → Spendable** balance via Private POI, the shield/unshield/private-send flow shapes, and view-only-key handling (https://help.railway.xyz/transactions/private-transfers, https://help.railway.xyz/private-proofs-of-innocence, https://help.railway.xyz/transactions/shield-unshield, https://help.railway.xyz/transactions/shield-unshield-1, https://help.railway.xyz/setup/view-only-wallets) — *but* note Railgun's leak warnings are too soft; **we go further.**
- **Compliance — Penumbra:** the **"transaction perspective"** selective-disclosure model — reveal one transaction, not a blanket FullViewingKey (https://protocol.penumbra.zone/main/concepts/addresses_keys.html).
- **Stellar specifics:** minimum-balance / reserve (https://developers.stellar.org/docs/learn/glossary#minimum-balance), networks toggle (https://developers.stellar.org/docs/networks).
- **Onboarding microcopy worth lifting:** Freighter's phrase warnings; MetaMask's "SRP is the single non-recoverable point of failure" (https://support.metamask.io/start/creating-a-new-wallet/); Phantom Auth optional-layer framing (https://help.phantom.com/hc/en-us/articles/32367778944403-About-Phantom-Auth); Phantom wallets/accounts/addresses (https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom).

---

## Creative Freedom

You own the **visual direction entirely** — colors, typography, spacing, illustration, motion language, the feel of "private." We deliberately **do not** prescribe a palette or type system; the references constrain *structure, IA, microcopy, and honesty*, not aesthetics. Invent the look that makes privacy feel **calm, trustworthy, and legible** rather than paranoid or theatrical. The novel privacy surfaces have no mainstream precedent — invent them confidently from this brief. The one non-negotiable creative constraint is **honesty**: the design may be as distinctive and beautiful as you like, as long as no screen overclaims and every boundary is legible.

---

## Explicit Non-goals

**Do NOT design these (do-not-copy list — features we are not building):**
- Token **swap / DEX** ("Swap" home action; any in-wallet DeFi/yield/LP).
- **Fiat buy/sell on-ramp** as such — the only "add funds" surfaces are receive/shield and the CCTP bridge.
- **NFT / collectibles** gallery.
- **Multi-chain / custom-RPC management** — there is exactly **one** testnet/mainnet toggle of **one** chain.
- **In-wallet dApp browser / Discover / Explore.**
- **dApp-connect / connected-apps / grant-access / sign-message / sign-transaction (delegated XDR).**
- **Hardware-wallet** support.
- **Import private key / Stellar secret key** as an add path — add paths are **seed-derived only.**
- **Arbitrary token import / manage-assets / asset search / add-token** — assets are fixed **XLM + USDC**; the USDC trustline is silent.
- **Custom gas / fee-market editor** — Stellar fees are tiny and flat; no fee UI.
- **Staking / earn, price charts, portfolio analytics** — home is **balances + activity** only.
- **Social/seedless login as the default** — passkey is optional; **seed phrase stays primary and mandatory.**
- **Memo as a headline feature** — keep it minor if present.
- **Human-readable address aliasing** (e.g. Unstoppable Domains). (The optional @handle directory resolves to *your own* private address only — it is not third-party name resolution.)
- **Watch-only wallet as an onboarding branch** — the viewing key is an **export/compliance artifact**, not a setup path.
- **SEP-0007 `tx` (XDR signing) on the receive QR** — receive uses `pay` only.
- **A brand logo overlaid on the long shielded-address QR** — it forces high error-correction and makes a long payload unscannable; the private QR is **larger, high-contrast, logo-free, with copy as the primary action.**

**Scope / integration caveats:**
- The **browser extension** form factor is **out of scope** for this brief — web app only.
- The **bridge** is **included** but design it as **"to-be-validated on testnet"** — full flow, flagged as pending a feasibility spike; never framed as a privacy feature.
- **No relayer today** — the unshield submitting account is visible; disclose it, do not design around a relayer that doesn't exist.
- **Mainnet privacy may be gated** — design the gated-with-reason state; do not assume mainnet shielding works.
- This is a **mocked prototype** — no real keys, proofs, chain, or bridge; **mark every mocked surface.**

---

## Open Questions

These are unresolved decisions the designer can flag opinions on; none should block the prototype (pick a sensible default and mark it):

1. **Product name & wordmark.** ZK Freighter is locked. Use a restrained lockup; do not use a Freighter-derivative mark.
2. **Confirm-phrase method.** Default to the tappable word-chip method; the 3-random-masked-inputs variant is a slimmer alternative — pick one as primary.
3. **Private-address rendering prefix.** We render the bundle as `zkf1…` in copy/mocks; confirm whether the final string keeps that prefix or another (`0zk…` appears in some Send specs from Railgun lineage — keep one consistent prefix across all screens).
4. **Directory / @handle feature depth.** Is the @handle directory (R4) in v1 scope or a later add? Design it but it may be deferred — keep it cleanly separable.
5. **Bridge feasibility.** CCTP→Stellar is "to-be-validated"; if the spike fails, the bridge becomes "coming soon." Design the full flow but ensure B0 degrades gracefully to a single "Add funds = Receive/Shield" path.
6. **Mainnet gating granularity.** Confirm exactly which actions stay live on mainnet (plain transfer / public receive) vs gated (shield/unshield/private send/disclosure) so the disabled-with-reason copy is precise.
7. **Pending → Spendable timing copy.** ETAs ("~28s", "~1–2 min", "up to a couple minutes") are mocked estimates; confirm the honest ranges once real proving times are measured.
8. **Auditor viewer distribution.** The disclosure verifier (9.6) is shown as in-app; confirm whether the auditor opens it via a public web link (no wallet) — affects whether it needs an unauthenticated route.

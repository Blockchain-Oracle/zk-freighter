# Screen cluster: Shield (deposit) + Unshield (withdraw)

> Product: **ZK Freighter** (brand locked). Privacy-by-default, self-custody ZK wallet for shielded payments on **Stellar**. Browser web app. Assets: **XLM + USDC**. Network: **testnet/mainnet config toggle** with a visible indicator; mainnet privacy may be gated.
>
> This cluster owns the **two public boundary moments** of the wallet — the only times privacy is intentionally crossed:
> - **Shield (public → private):** move a *public* Stellar balance into the shielded pool. Destination of the "Add funds" area. Public on the way in, then `Pending → Spendable`.
> - **Unshield (private → public):** withdraw shielded balance to a *public* Stellar address. **Reveals destination + amount + a "spent" marker.** Hides which deposit it came from.
>
> Honesty rules that bind every screen here:
> - Never say "fully private" / "anonymous". Say **"shielded"**, and name exactly what is public.
> - **Shield is a public deposit.** The submitting Stellar account, the amount, and the fact that funds entered the pool are visible on-chain.
> - **Unshield reveals destination + amount.** No relayer in v1 → the **submitting account is also visible** (metadata). What stays hidden = **which shielded deposit funded it**.
> - The word **"trustline" never appears**. USDC trustline setup/pre-check happens invisibly (surface only the tiny +0.5 XLM reserve cost when it is actually charged).
> - ZK proofs are generated **client-side** and take **seconds → minutes**. No frozen spinners. Use a named, cancel-safe **"Generating proof"** state and a **Pending vs Spendable** balance split to absorb latency.
> - **Mock everything.** Mark every mocked surface with a small "Mocked" tag. Proof timings, Circle attestation, and explorer links are simulated.

## Cluster IA & shared scaffolding

Both flows reuse the **Send multi-step in-place slider** pattern from Freighter `views/Send/index.tsx`: one route, N steps rendered as stacked panels, only the active panel visible, visited panels persist, directional slide animation (`from-right` forward, `dismiss`/`from-bottom` back), each step has its own back/close. Borrow `STEPS` enum + `goToStep(next, anim)` + `visitedSteps` map verbatim in structure.

Shared chrome borrowed from Freighter:
- **`SubviewHeader`** (title + back chevron + optional close X) at the top of every step — `views/AddFunds/index.tsx`.
- **`View.Content`** scroll body + sticky footer button zone.
- **`Notification`** (`@stellar/design-system`, variants `error`/`warning`/`primary`) for the honest disclosure callouts and error banners — used in `views/Send/index.tsx` for the simulate-failure case.
- **`Loading`** spinner component for transient fetches (balances, recipient pre-check) — `views/AddFunds/index.tsx`.
- **`ReviewTransaction` / `SubmitTransaction` / `SubmitFail`** confirm/submit/error components — `components/send/SendAmount/SubmitTransaction`.

Cluster-specific shared primitives (invent, reuse across both flows):
- **`BalanceSplitChip`** — inline `Spendable 0.00 · Pending 0.00` readout with a tooltip explaining the difference (RAILGUN "Pending Balance → Spendable" model). Appears on the amount step and on Home.
- **`PrivacyLedger`** — the recurring "what's public / what's hidden" two-column callout. Green-check column = hidden, eye-icon column = revealed. Every boundary review screen renders one; the *contents differ* for shield vs unshield (this is the anti-slop teaching device — never the same card twice).
- **`AssetToggle`** — XLM / USDC segmented control (fixed two assets, no search, no add-token).
- **`NetworkGate`** — wrapper that, on **mainnet**, disables the primary CTA with a reason banner ("Shielded transfers run on testnet only today") and offers "Switch to testnet". Plain public transfer stays available elsewhere.

Entry points:
- **Shield**: Home → "Add funds" → "Already have funds? Shield them" OR Home → public-balance row → "Shield" OR the one-tap "Shield now" nudge on a fresh public receipt (Zashi shield-before-spend pattern) OR final tap of the Bridge flow ("Shield the bridged USDC").
- **Unshield**: Home → shielded-balance row → "Withdraw" OR Settings-less direct "Withdraw to a Stellar address" action in the shielded asset detail.

---

# PART A — SHIELD (public → private / deposit)

Linear flow, modeled on Railway shield (`select token → shield → recipient → amount → review → submit`) but collapsed because the recipient is **always the user's own private address** (no recipient step). Steps: **`SOURCE` → `AMOUNT` → `REVIEW` → `PROOF` → `SUBMITTING` → `SUCCESS`**.

## A1. Shield — Source / entry (`SOURCE` step)

**Purpose:** Pick what public funds to shield and teach, up front, that *this deposit is public*. This is the destination of "Add funds", so it doubles as the "I already have public balance" landing.

**Layout & components**
- `SubviewHeader` title "Shield funds", subtitle "Move public balance into your shielded pool". Close X returns Home.
- A one-line **direction visual**: `Public ──▶ Shielded` pill pair with an arrow; the Public pill carries a small eye icon, the Shielded pill a shield icon. Teaches the model in one glance.
- **`AssetToggle`** XLM / USDC. Below it the selectable **public balance source row(s)**: asset icon, "Public XLM" / "Public USDC", available public amount, and a `Max` affordance.
- **Honest deposit note** (`Notification` variant `primary`, dismissible-per-session): "Shielding is a **public deposit** — the amount and your Stellar account are visible on-chain. Privacy starts once funds are inside the pool."
- Sticky footer primary: **"Continue"** (disabled until an asset with non-zero public balance is selected).

**States**
- **Empty / no public balance to shield:** both source rows show `0.00`. Replace footer with a friendly empty block (Freighter unfunded-empty pattern): "No public funds to shield yet." Two routes: **"Receive public funds"** (→ Receive, public Stellar address tab) and **"Bridge USDC in"** (→ Bridge). Not an error.
- **Unfunded Stellar account (cannot even hold a deposit yet):** show the Freighter unfunded empty state — "Fund this account with at least 1 XLM to begin" + Learn-more + (testnet only) **"Fund with Friendbot"** one-click. Mark Friendbot "Testnet".
- **USDC selected but user has no USDC trustline yet:** **no jargon.** Silent: a thin inline `Loading` "Preparing USDC…" while the trustline is set up behind the scenes; if it will cost reserve, a quiet line "Adds 0.5 XLM network reserve (one-time)". If it fails → see error states.
- **Loading:** public balances fetching → skeleton rows + `Loading`.
- **Disabled:** Continue disabled (greyed) with helper text "Select funds to shield" when nothing chosen.
- **Mainnet gate:** `NetworkGate` disables Continue, banner "Shielded transfers run on testnet only today — switch network to try it." + "Switch to testnet".

**Interactions**
- Tapping asset → selects + reveals its public balance row. `Max` fills amount-to-be on next step (XLM `Max` must reserve gas + min-balance — auto-leave the reserve, show "Keeping 1.5 XLM for fees & reserve").
- Continue → slide `from-right` to `AMOUNT`.

**Mock data:** Public XLM `42.5000000`, Public USDC `120.00`. Trustline pre-check returns "ready" for XLM, "needs setup (mock 1.2s)" for USDC.

**Borrow from:** `views/AddFunds/index.tsx` (method-chooser layout, footnote footer, `SubviewHeader`), Railway shield step 1 (token select), Freighter unfunded empty state + Friendbot.

## A2. Shield — Amount (`AMOUNT` step)

**Purpose:** Enter how much to shield; reinforce the Pending→Spendable transition.

**Layout & components**
- `SubviewHeader` "Shield funds" + back chevron (→ `SOURCE`).
- **Big amount input** (numeric, asset suffix), borrowing `components/send/SendAmount` numeric-input + auto-width pattern (`InputWidthProvider`). `Max` chip.
- Under input: **available public** "of 42.50 XLM public" and the **`BalanceSplitChip`** preview: "After shielding: Pending +X → becomes Spendable in ~1–2 min."
- A subtle **fee line** (Stellar flat fee, e.g. "Network fee ~0.00001 XLM") — no fee editor (DO-NOT-COPY custom gas).
- Footer primary: **"Review"**.

**States**
- **Default / typing:** live validation.
- **Over-balance:** input border error + helper "More than your public balance" + disabled Review.
- **XLM dust below reserve:** if shielding would drop public XLM below the min reserve, warn "Keep at least ~1.5 XLM public for fees & reserve" and clamp `Max`.
- **Zero / empty:** Review disabled.
- **USDC trustline still finalizing:** Review shows inline spinner "Finishing setup…" then enables.
- **Loading:** none beyond input.

**Interactions:** `Max` respects reserve; Review → slide to `REVIEW`.

**Mock data:** entered `25 USDC`; preview "Pending +25.00 USDC → Spendable ~90s".

**Borrow from:** `components/send/SendAmount` (numeric input, Max, available-balance line), RAILGUN pending→spendable copy.

## A3. Shield — Review (`REVIEW` step)

**Purpose:** Confirm + the honest "what's public" teaching moment before signing.

**Layout & components**
- `SubviewHeader` "Review shield".
- **Summary card:** From `Public USDC` → To `Your shielded pool` (not an address — "your own wallet"), Amount `25.00 USDC`, Network fee, one-time reserve line *only if charged*.
- **`PrivacyLedger` (shield variant):**
  - **Public (revealed) ▸ eye icon:** "The deposit amount (25 USDC)", "Your public Stellar account", "That a deposit happened".
  - **Hidden ▸ shield icon:** "How you later spend it", "Who you send shielded funds to". Caption: "Deposits are always public — that's how value enters the pool."
- Footer primary: **"Shield funds"**. Secondary: "Back".

**States**
- **Default.**
- **Simulate/build failure:** `Notification` error "Couldn't prepare this deposit" + Retry (mirrors Send's `xdr` empty-simulation guard).
- **Disabled:** while building the unsigned tx, button shows inline spinner "Preparing…".
- **Network changed mid-flow → mainnet:** re-assert `NetworkGate`.

**Interactions:** "Shield funds" → wallet sign prompt (mocked) → on sign, advance to `PROOF` (shield may need a small membership/commitment proof) **or** straight to `SUBMITTING` if no proof is required for deposit in the engine. Spec both; default mock = brief `PROOF` then `SUBMITTING`.

**Borrow from:** `components/send/.../ReviewTransaction` (summary card + fee rows), Zcash checklist (name what's revealed), this product's `PrivacyLedger`.

## A4. Shield — Generating proof (`PROOF` step) *(pending-proof state)*

**Purpose:** Honest client-side proving wait (short for shield; long for unshield). Never a frozen spinner.

**Layout & components**
- Centered **proof progress** module: animated but *informative* — a labeled progress bar/steps ("Building commitment → Generating proof → Ready to submit"), an **elapsed timer**, and a plain-language line "Your device is doing the private math — this stays on your computer."
- **Keep-open guidance:** "Keep this tab open (about 30 sec)." (Railway "keep app open" pattern.)
- **Cancel** secondary (safe — nothing submitted yet).

**States**
- **Proving (default):** progress + timer counting.
- **Slow / over expected time:** after the estimate elapses, swap copy to "Taking a little longer than usual — still working" (no error). Never imply hang.
- **Proof failed:** `Notification` error "Couldn't generate the proof on this device" + Retry + "Get help". (Invented failure — no reference; borrow `SubmitFail` scaffolding.)
- **Cancelled:** returns to `REVIEW`, nothing lost.

**Interactions:** auto-advances to `SUBMITTING` on success.

**Mock data:** estimate 30s, mock completes ~6s.

**Borrow from:** Zashi proving-status banner + sync-progress; RAILGUN "Generate Proof" validity-window framing; `SubmitFail` for failure scaffolding.

## A5. Shield — Submitting (`SUBMITTING` step)

**Purpose:** On-chain submit of the public deposit tx.

**Layout:** Reuse `SubmitTransaction` busy state — "Submitting deposit…" with subtle progress. **States:** submitting / network-error (→ Retry, funds untouched) / success-advance. **Borrow:** `components/send/.../SubmitTransaction`.

## A6. Shield — Success (`SUCCESS` step) *(success + pending-proof aftermath)*

**Purpose:** Confirm the public leg landed, and set the honest expectation that the balance is **Pending → Spendable**.

**Layout & components**
- Success check + "Deposit confirmed — funds are entering your shielded pool."
- **`BalanceSplitChip`** now live: "Pending +25.00 USDC · becomes Spendable in ~1 min." A thin progress affordance ties to Activity.
- **Explorer link** for the *public* deposit tx (honest: this leg is public) — "View public deposit ↗" (mocked link, "Testnet").
- Note: "We'll mark it Spendable automatically — no need to wait here."
- Primary: **"Done"** (→ Home). Secondary: "View in Activity" (lands on the Pending row).

**States**
- **Success (pending-proof):** the default — balance is Pending, not yet Spendable. This is the headline honest state.
- **Spendable reached (if user lingers):** chip flips to "Now Spendable" with a subtle confirm.

**Borrow from:** Freighter `FullscreenSuccessMessage`; RAILGUN spendable copy; Zcash "mark pending in Activity, tell remaining time".

---

# PART B — UNSHIELD (private → public / withdraw)

The **information-leak flow.** Authority = Zcash de-shielding checklist: *"Explicitly tell users that they are about to reveal transaction information."* Railway's own copy is too soft — we add a strong, unmissable leak warning. Steps: **`DESTINATION` → `AMOUNT` → `REVIEW` (leak warning) → `PROOF` → `SUBMITTING` → `SUCCESS`**.

## B1. Unshield — Destination (`DESTINATION` step)

**Purpose:** Capture the **public Stellar destination** and immediately frame that this is a public-facing action.

**Layout & components**
- `SubviewHeader` "Withdraw to Stellar". Subtitle "Move shielded funds to a public address". Close X → Home.
- **Direction visual** (inverse of shield): `Shielded ──▶ Public`; the Public pill carries the eye icon.
- **Recipient input:** "Stellar address (G…)" with paste + (optional) QR-scan affordance. Middle-truncate on resolve (`G…7AOO`). Helper: "This is a public address. Anyone can see this withdrawal."
- **Early honest banner** (`Notification` variant `warning`, NOT dismissible): "Withdrawals are public. The destination and amount will be visible on-chain."
- **`AssetToggle`** XLM / USDC (which shielded asset to withdraw).
- Footer primary: **"Continue"** (disabled until a valid address).

**States**
- **Empty:** Continue disabled, helper "Enter a Stellar address".
- **Invalid address:** input error "That's not a valid Stellar address (G…)".
- **Recipient USDC trustline pre-check (invisible):** on valid G-address + USDC asset, a quiet inline `Loading` "Checking recipient…":
  - **Recipient can receive USDC:** silent pass, Continue enables.
  - **Recipient cannot receive USDC** (no trustline / unfunded): **no jargon** — friendly blocker "This address can't receive USDC yet. Ask them to add USDC support, or withdraw XLM instead." Offer "Switch to XLM". (Trustline word never shown.)
  - **Unfunded destination + XLM under 1 XLM:** warn "New Stellar accounts need at least 1 XLM to activate — send at least 1 XLM."
- **Self-withdraw (own public address):** allowed; subtle note "Withdrawing to your own public Stellar account."
- **Loading:** address resolution skeleton.
- **Mainnet gate:** `NetworkGate` (privacy pool testnet-only).

**Interactions:** paste auto-trims/validates; QR-scan (mocked) fills field; Continue → `AMOUNT`.

**Mock data:** valid `GB…X4QK` (USDC-ready), a second `GC…7AOO` (cannot receive USDC) to demo the blocker.

**Borrow from:** `views/Send` `SendTo` (destination input, validation, truncation), Zcash de-shield warning copy, invisible-trustline pre-check (invented; no jargon).

## B2. Unshield — Amount (`AMOUNT` step)

**Purpose:** Amount from **Spendable** shielded balance (Pending can't be spent — teach this).

**Layout & components**
- `SubviewHeader` "Withdraw to Stellar" + back.
- Big amount input (asset suffix), `Max`.
- **`BalanceSplitChip`** as the source-of-truth: "Spendable 90.00 USDC · Pending 25.00 (not yet available)". `Max` uses **Spendable only**.
- Fee line (flat Stellar fee). If destination is unfunded XLM, restate the 1 XLM activation minimum.
- Footer: **"Review"**.

**States**
- **Default.**
- **Over-spendable but covered by Pending:** special honest state — error "You can withdraw up to 90.00 now. 25.00 is still becoming Spendable (~1 min)." + "Use max Spendable" shortcut. **Do not** let Pending be spent (RAILGUN rule).
- **Over total:** "More than your shielded balance."
- **Zero/empty:** Review disabled.
- **Loading:** balance refresh spinner on the chip.

**Interactions:** `Max` = Spendable; Review → `REVIEW`.

**Mock data:** Spendable `90.00 USDC`, Pending `25.00`; user enters `40`.

**Borrow from:** `components/send/SendAmount`; RAILGUN spendable-vs-pending; Zcash "show remaining time".

## B3. Unshield — Review + leak warning (`REVIEW` step) *(the critical honest screen)*

**Purpose:** The deliberate disclosure gate. The single most important screen in the cluster.

**Layout & components**
- `SubviewHeader` "Review withdrawal".
- **Summary card:** From `Your shielded pool` → To `G…7AOO` (full address expandable), Amount `40.00 USDC`, Network fee, one-time activation note if applicable.
- **`PrivacyLedger` (unshield variant) — prominent, the hero of this screen:**
  - **Public (revealed) ▸ eye icon, emphasized:** "The destination address (G…7AOO)", "The amount (40.00 USDC)", "A 'spent' marker on the pool", **"The account that submits this withdrawal (no relayer yet — this is metadata that can link to you)."**
  - **Hidden ▸ shield icon:** "**Which deposit this came from**", "Your other shielded balance", "Your past shielded activity". Caption: "Observers see *that* you withdrew and *to where* — not *which* shielded funds paid for it."
- **Explicit acknowledgement** (Zcash mandate): a required **checkbox** "I understand this withdrawal is public" — primary CTA disabled until checked.
- Footer primary: **"Generate proof & withdraw"** (named, so the proving wait is expected). Secondary "Back".

**States**
- **Default:** checkbox unchecked → CTA disabled.
- **Acknowledged:** CTA enabled.
- **No-relayer disclosure expanded:** tappable "Why is my account visible?" → short sheet explaining metadata leak + that a relayer is a future improvement. Honest, not buried.
- **Build failure:** `Notification` error + Retry.
- **Mainnet gate** re-asserted.

**Interactions:** check box → enable CTA → CTA signs (mock) → `PROOF`.

**Borrow from:** Zcash de-shield warning ("explicitly tell users they are about to reveal transaction information"); Penumbra/this-product `PrivacyLedger`; `ReviewTransaction` summary card. **Do NOT** copy Railway's soft framing — strengthen it.

## B4. Unshield — Generating proof (`PROOF` step) *(pending-proof, the long one)*

**Purpose:** Client-side spend proof — can be the multi-minute case. Honest, cancel-safe, never frozen.

**Layout & components**
- Same proof-progress module as A4 but with **longer estimate** and stronger keep-open guidance: "Generating your withdrawal proof — up to a couple of minutes. Keep this tab open." Labeled steps "Selecting notes → Building proof → Finalizing." Elapsed timer. Optional "proof valid for ~3 min once ready" (Railway validity window) once complete-but-pre-submit.
- **Cancel** (safe — not submitted).

**States**
- **Proving (default):** progress + timer.
- **Slow:** past-estimate reassurance copy, no error.
- **Proof expired (validity window lapsed before submit):** `Notification` warning "The proof timed out — regenerate it." + "Regenerate".
- **Proof failed:** error + Retry + Help.
- **Sync-required** (engine needs latest pool state first): honest interstitial "Catching up to the network first…" with sync progress, then resumes proving. (Zashi sync-progress pattern.)
- **Cancelled:** back to `REVIEW`, acknowledgement preserved.

**Mock data:** estimate 90s, mock completes ~8s; one demo path forces "slow" then success.

**Borrow from:** Zashi proving + sync-progress banners; RAILGUN "Generate Proof" + validity window; `SubmitFail` scaffolding.

## B5. Unshield — Submitting (`SUBMITTING` step)

Reuse `SubmitTransaction` busy state — "Submitting withdrawal…". **States:** submitting / network-error (Retry; proof may need regeneration if expired → route back to `PROOF`) / success. **Borrow:** `components/send/.../SubmitTransaction`.

## B6. Unshield — Success (`SUCCESS` step) *(success + honest residue)*

**Purpose:** Confirm public withdrawal landed; restate what is now public and what stayed hidden.

**Layout & components**
- Success check + "Withdrawal sent — 40.00 USDC is now public at G…7AOO."
- **Explorer link** "View public withdrawal ↗" (mocked, "Testnet") — honest, this leg is public.
- **Mini `PrivacyLedger` recap (one line each):** Public: "destination + amount are now visible." Hidden: "which deposit funded it stays private."
- **Updated `BalanceSplitChip`:** shielded Spendable reduced by 40.
- Primary **"Done"** (→ Home). Secondary "View in Activity".

**States**
- **Success (default).**
- **Partial/edge — destination newly activated:** extra line "This activated the recipient's Stellar account (1 XLM minimum applied)."

**Borrow from:** Freighter `FullscreenSuccessMessage`; Zcash "mark in Activity"; this-product `PrivacyLedger` recap.

---

# Cross-cutting states (apply to BOTH flows)

- **Empty:** Shield A1 no-public-funds + unfunded-account empty states; Unshield blocked when shielded Spendable is 0 → "Nothing to withdraw yet — shield or receive funds first."
- **Loading:** balance fetches (skeleton rows + `Loading`), recipient/trustline pre-check (inline spinner), tx build ("Preparing…").
- **Error:** build/simulate failure (`Notification` error + Retry, mirroring Send's empty-`xdr` guard); network/submit failure (`SubmitFail` + Retry, funds untouched); **proof failure** (invented; Retry + Help); USDC-recipient-cannot-receive blocker (no jargon, offer XLM); insufficient reserve.
- **Disabled:** primary CTA greyed with helper until preconditions met (asset chosen / amount valid / address valid / **unshield acknowledgement checked**).
- **Success:** A6 / B6 with explorer links + `BalanceSplitChip` updates.
- **Pending-proof:** named **`PROOF`** step (A4/B4) + the **Pending vs Spendable** split that lets users leave the tab; Activity carries the Pending/Incomplete row with remaining-time.
- **Mainnet gate:** `NetworkGate` disables both primary CTAs on mainnet with a reason + "Switch to testnet"; plain public transfer remains available elsewhere.
- **Mocked tags:** Friendbot, Circle bridge attestation, explorer links, proof timings — each visibly tagged "Mocked"/"Testnet".

# Anti-slop checks honored
- Each review screen renders a **different** `PrivacyLedger` (shield reveals deposit; unshield reveals destination+amount+submitter, hides source deposit) — no wall of identical cards.
- Every screen **teaches the privacy model** (direction pills, honest deposit note, leak warning, hidden/revealed ledger).
- All of empty / loading / error / disabled / success / **pending-proof** states are specified per step.
- No prescribed colors/fonts; no decorative-only effects (proof animation is informative, not a frozen spinner).
- DO-NOT-COPY respected: no fiat buy/sell (AddFunds re-skinned to shield-in only), no swap, no custom gas/fee editor, no token import (assets fixed XLM+USDC), no trustline jargon, no relayer claimed (metadata leak disclosed honestly).

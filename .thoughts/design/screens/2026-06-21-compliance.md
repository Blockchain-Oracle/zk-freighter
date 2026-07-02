# Compliance / selective disclosure — screen cluster spec

> Product: **ZK Freighter** (brand locked). Privacy-by-default self-custody ZK wallet for shielded payments on Stellar. Browser web app.
> Cluster: **Compliance / selective disclosure** — let a user prove specific shielded activity to a specific auditor *without* handing over their whole history.
> Visual direction (color/type) intentionally unspecified — leave free.

## The privacy model this cluster must teach

Every screen here exists to make ONE distinction legible, because it is the differentiator vs. custodial logging:

- **Disclosure proof (Penumbra "transaction perspective") = PREFERRED, the default CTA.** Reveals a *scoped* view — chosen transactions / a date range / a single counterparty — as a self-contained, verifiable artifact. Past-only by default. Does not leak future activity. This is "prove a payment is clean without exposing your whole history."
- **Viewing key export = the blunt instrument, demoted.** Grants *full, permanent, ongoing* read access to ALL transactions, past **and future**, and **cannot be revoked once shared**. Always presented second, behind friction, with a louder warning.
- **User-held, not custodial.** ZK Freighter never logs to a third party. The user manufactures the disclosure locally and hands it over themselves. The auditor gets read-only data, never spend ability — say this explicitly on every artifact.
- **Honesty about what a proof still leaks:** the on-chain "spent" markers / unshield destinations referenced in a disclosed tx are already public; the proof just *links your identity* to them for the auditor. Never imply the proof itself is private from the auditor — it is the act of revealing.

Mocked-data prototype: all transactions, generated artifacts, proof timings, and the "verify" round-trip are mock. Mark every mocked surface with a small **"Demo data"** / **"Mocked integration"** tag.

---

## Screen 0 — Compliance entry (Settings → Compliance & disclosure)

**Purpose:** the hub. Frame the two tools, route to the preferred one, list previously generated disclosures so the user can re-share or revisit.

**Reference to borrow:** `views/Settings/index.tsx` `ListNavLink`/`ListNavLinkWrapper` IA + `SubviewHeader` (back-arrow titled sub-view). Reached from a new Settings row "Compliance & disclosure" sitting under `Security`.

**Layout & components:**
- `SubviewHeader` — title "Compliance & disclosure", back arrow to Settings.
- **Teaching banner** (dismissible, persists dismissed): one short paragraph — "Share proof of specific transactions with an auditor or accountant. They get read-only access to only what you choose — never your full history, never the ability to spend." Includes an inline "How disclosure works" text-link → Screen 5 (learn sheet).
- **Two primary path cards (NOT identical — deliberately asymmetric):**
  1. **"Create a disclosure proof"** — visually primary. Subtitle "Reveal only the transactions you pick. Recommended." Chevron → Screen 1.
  2. **"Export a viewing key"** — visually secondary / muted, with a small caution glyph. Subtitle "Full, permanent read access to everything. Use only if an auditor requires it." Chevron → Screen 3 (gated).
- **"Your disclosures" list** — past-generated artifacts (Screen 6 is the detail). Each row: label (e.g. "Q2 tax — accountant"), type pill (Proof / Viewing key), scope summary ("4 transactions" / "All activity"), created date, status pill (Active / Expired / Revoked). Tap → detail.
- Network indicator inherited from chrome; if **mainnet + privacy gated**, show an inline note that disclosure works on testnet data only (see Disabled state).

**States:**
- **Empty (no disclosures yet):** "Your disclosures" section replaced by an illustrative empty state — "No disclosures yet. When you create one, it'll live here so you can re-share or revoke it." Both path cards still present. (Borrow Freighter "No transactions to show" empty pattern.)
- **Loading:** skeleton rows in "Your disclosures"; path cards render immediately (static).
- **Error (can't load past disclosures):** `Notification variant="error"` "Couldn't load your disclosures" + Retry; path cards remain usable.
- **Disabled (mainnet, privacy gated):** both path cards dimmed with a reason chip "Disclosure is available on testnet data for now" + link to network toggle; matches the mainnet-gating pattern used for Shield/Unshield.
- **Success:** (transient) after returning from a generate flow, the newest row animates in with a brief "Created" highlight.

**Interactions:** tap card → flow; tap disclosure row → detail; dismiss banner; retry on error. Demo-data tag on the disclosures list.

---

## Screen 1 — Build a disclosure proof: choose scope

**Purpose:** the heart of the differentiator. User selects EXACTLY what to reveal. This screen must make "scoped, not everything" physically obvious.

**Reference to borrow:** multi-step in-place flow from `views/Send/index.tsx` (DESTINATION → AMOUNT → CONFIRM slider; visited steps persist) — reuse the stepper chrome. Transaction-row rendering borrows the shielded Activity row (own decrypted amount/memo, counterparty hidden) from the Activity cluster.

**Layout & components:**
- `SubviewHeader` — "Create disclosure" + step indicator (1 of 3: Scope → Recipient & limits → Review).
- **Scope-mode segmented control** (pick one, drives the body below):
  - **By transaction** (default) — searchable, multi-select list of the user's shielded transactions. Each row: date, own amount (XLM/USDC), direction (shielded send / receive / shield-in / unshield-out), memo if present, a checkbox. A persistent footer counter "3 selected". "Select all in view" affordance, but never silently selects future txs.
  - **By date range** — two date pickers (from / to); a live count "Reveals 12 transactions in this range." Honest helper: "Only transactions in this range are revealed."
  - **By counterparty** — pick a private address you've transacted with; reveals only txs with that party. Helper: "Reveals your payments to/from this address only."
- **Live "What the auditor will see" preview panel** (sticky) — updates as selection changes: count of txs, total amount per asset, date span, and an explicit **"Hidden: everything else, plus all future activity"** line. This panel is the teaching device.
- **What's NOT revealed** micro-list (always visible): "Your other transactions · Your balances outside this scope · Your seed phrase · Spend access."
- Primary CTA "Next" (disabled until ≥1 tx / valid range / a counterparty chosen).

**States:**
- **Empty (no shielded txs to disclose):** "You don't have any shielded transactions to disclose yet." CTA disabled; link back home.
- **Empty (filter returns nothing):** "No transactions match this range/counterparty." Keep controls; CTA disabled.
- **Loading (fetching tx list):** skeleton rows; preview panel shows "—".
- **Selected/active:** counter + preview populate; Next enabled.
- **Error:** `Notification` "Couldn't load your transactions" + Retry.
- **Disabled:** Next disabled with inline reason until valid selection.

**Interactions:** switch scope mode (selection resets with a confirm if non-empty); search/filter; multi-select; preview recomputes live; Next → Screen 2. Demo-data tag on tx list.

---

## Screen 2 — Disclosure proof: recipient, limits & expiry

**Purpose:** label the artifact, decide whether it expires, set who it's for. Establishes the revoke/expiry model.

**Reference to borrow:** form/`View.Footer` primary-button pattern from `DisplayBackupPhrase` and `Send` review steps; inline-editable label borrows the pencil→check name-edit from `ViewPublicKey`.

**Layout & components:**
- `SubviewHeader` — "Create disclosure" (step 2 of 3).
- **Label field** — "Name this disclosure (only for you)" e.g. "Q2 tax — Jane @ Acme CPA". Required.
- **Recipient note (optional)** — free-text "Who is this for?" stored in the artifact header so the auditor sees intent. Helper: "Shown to whoever opens this disclosure."
- **Expiry control** — radio group: **No expiry** / **7 days** / **30 days** / **Custom date**. Helper that tells the truth about the medium: *"Expiry controls the share link in this app. A disclosure proof is a file — once you've sent the file, expiry can stop new opens of the link but cannot un-send a copy. For full, permanent removal of future access, don't export a viewing key."* (Honest about offline copies.)
- **Read-only reassurance block** — "This grants viewing only. The recipient can never spend your funds or see anything outside the scope you chose."
- **Recap of scope** (from Screen 1) in a compact card with an "Edit scope" link back to step 1.
- Primary CTA "Review".

**States:**
- **Empty/default:** No expiry preselected? No — default to **30 days** to nudge good hygiene; user can choose No expiry.
- **Invalid:** label blank → CTA disabled with inline error; custom date in the past → field error.
- **Disabled:** Review disabled until label valid.
- **Error / Loading:** none heavy here (local form), but Review triggers Screen 2.5 generation.

**Interactions:** edit label; pick expiry; edit recipient note; Edit scope → step 1 (selection preserved); Review → Screen 2.5 (generation).

---

## Screen 2.5 — Pending proof: generating disclosure (FIRST-CLASS pending state)

**Purpose:** ZK proof generation runs client-side and can take seconds-to-minutes. This is the honest pending state — never a frozen spinner.

**Reference to borrow:** the named "Generate Proof" pending pattern used across this product's Send/Unshield (pending-proof first-class state) + Zashi tappable status-banner idea. Generic `components/Loading` only as a fallback spinner inside the card.

**Layout & components:**
- Centered generation card: title "Building your disclosure proof", subtitle "Proving locally on your device — nothing is uploaded."
- **Determinate-ish progress** with labeled phases (mock-timed): "Collecting selected transactions → Generating zero-knowledge proof → Packaging artifact." Show elapsed time; if >~20s, show reassurance "Larger scopes take longer. Keep this tab open."
- **Keep-open warning** — "Don't close this tab until it finishes."
- Secondary "Cancel" (returns to Screen 2 with selections intact; no artifact produced).
- **Mocked-integration tag** clearly visible ("Proof timing simulated").

**States:**
- **Pending-proof (primary):** animated phase progress, elapsed timer, keep-open notice.
- **Slow / long-running:** after threshold, swap subtitle to the "larger scopes take longer" reassurance; never imply hang.
- **Error (proof failed):** `Notification variant="error"` "Couldn't build the proof" + plain-language cause (mock: "generation interrupted") + Try again (returns to Screen 2.5) / Back to scope.
- **Cancelled:** returns to Screen 2.
- **Success:** auto-advance to Screen 3-result equivalent → Screen 6 (generated artifact, shareable).

**Interactions:** cancel; auto-advance on success; retry on failure.

---

## Screen 3 — Export a viewing key (GATED, demoted path)

**Purpose:** the blunt full-access export. Deliberately higher-friction than the proof flow. Teaches *why* the proof is better.

**Reference to borrow:** `views/DisplayBackupPhrase/index.tsx` almost 1:1 — password-gate (`Formik` + masked `Input`) → reveal → `MnemonicDisplay`-style copyable block → blunt `BackupPhraseWarningMessage`. Also `Security` sub-view for placement.

**Layout & components (pre-reveal gate):**
- `SubviewHeader` — "Export viewing key".
- **Loud warning block** (louder than the proof flow — borrow `BackupPhraseWarningMessage` styling/severity): four bullets, each a real consequence:
  - "Grants read access to **all** your shielded transactions — past **and future**."
  - "**Cannot be revoked** once shared."
  - "Anyone who has it sees everything you receive from now on."
  - "Read-only — it can never spend your funds." (the one reassurance)
- **"Prefer a disclosure proof" deflection callout** — "Most audits only need specific transactions. A disclosure proof reveals only what you choose and won't expose future activity." Button "Create a disclosure instead" → Screen 1.
- **Password gate** — `Input type=password` "Enter your password" (reuses unlock-password component); CTA "Reveal viewing key" disabled until filled.

**Layout & components (post-reveal):**
- Read-only key block (monospace, middle-truncated with full-copy), `CopyText` "Copied!" (borrow `ViewPublicKey` copy affordance).
- **Anti-paste warning** (lift Railway microcopy): "Don't paste this into email or chat. Share it only over a secure channel."
- Optional "Save as named record" → stores a Viewing-key-type row in Your disclosures (so it can at least be *tracked*, even though crypto-revoke is impossible) with status "Active (cannot be revoked)".
- `View.Footer` "Done" → back to entry.

**States:**
- **Gate (default):** warning + password; CTA disabled until password entered.
- **Wrong password (error):** inline `error` on the field (mirror `showBackupPhrase` error path) "Incorrect password."
- **Loading:** CTA `isLoading` while deriving (mock).
- **Revealed (success):** key shown, copy enabled, anti-paste warning.
- **Disabled (mainnet gated):** entire export disabled with reason chip, same as cluster gating.

**Interactions:** deflect to proof; submit password; copy key; save record; done. The deflection link is intentionally prominent.

---

## Screen 4 — Verify a disclosure (auditor-side, read-only viewer)

**Purpose:** show the *other half* — what the auditor experiences when they open the artifact. Sells the "read-only, scoped, verifiable" promise. In-app standalone viewer (no wallet needed); mock.

**Reference to borrow:** read-only presentation of `views/AccountHistory` row layout + a verification banner (Zashi status-banner idea). No Freighter 1:1 — invent from spec.

**Layout & components:**
- Reached via a shareable link / "Open a disclosure" entry (paste artifact or link).
- **Verification banner (top):** on load runs a mock verify → **"Verified ✓ — this disclosure is authentic and unmodified"** with the prover's claim summary. If tampered/invalid: red "Could not verify this disclosure."
- **Scope header:** "You're viewing a scoped disclosure." Recipient note, created date, expiry countdown, owner's *private address* (only as much as the artifact chose to reveal). Explicit "Read-only. You cannot spend or see anything outside this view."
- **Disclosed transactions list** — date, amount, asset, direction, memo (exactly the scoped set). A "Hidden by the owner" muted footer row count: "+ N other transactions not included in this disclosure."
- **Export for records** — download CSV/PDF of the disclosed set (mock).

**States:**
- **Loading / verifying (pending):** "Verifying disclosure…" progress; never a blank screen.
- **Verified (success):** green banner + list.
- **Invalid/tampered (error):** red banner, list suppressed.
- **Expired:** amber banner "This disclosure expired on {date}. Ask the owner to issue a new one." List suppressed (link-level expiry).
- **Revoked:** "The owner revoked this disclosure." List suppressed.
- **Empty scope (degenerate):** "This disclosure contains no transactions."

**Interactions:** auto-verify on open; export records; expired/revoked → suppress data. Mocked-integration tag.

---

## Screen 5 — "How disclosure works" learn sheet

**Purpose:** one-screen explainer reinforcing proof-vs-viewing-key. Opened from entry banner and inline links.

**Reference to borrow:** pre-reveal explainer modal pattern from `MnemonicPhrase` (explain-before-act sheet). Content-only.

**Layout & components:** bottom sheet / modal. A small two-column compare: **Disclosure proof** (scoped · past-only by default · expirable link · recommended) vs **Viewing key** (everything · past+future · not revocable · last resort). One honest caveat line: "Either way, the auditor only ever reads — they can never spend." Single "Got it" dismiss; link "Create a disclosure" → Screen 1.

**States:** static; open/closed only. No data states.

**Interactions:** dismiss; jump to create.

---

## Screen 6 — Disclosure detail (generated artifact: share / revoke / status)

**Purpose:** post-generation home for a single disclosure — share it, watch its status, revoke if possible. Closes the revoke/expiry loop.

**Reference to borrow:** share artifact = `views/ViewPublicKey` (QR + middle-truncated string + `CopyText "Copied!"` + explorer/external link, inline-editable label pencil→check). Revoke confirm = destructive-action confirm pattern.

**Layout & components:**
- `SubviewHeader` — disclosure label (inline-editable).
- **Status pill** — Active / Expires in {countdown} / Expired / Revoked.
- **Type & scope summary card** — Proof vs Viewing key; "4 transactions · 2 May–14 Jun · USDC+XLM"; "Edit scope" is NOT offered (artifacts are immutable — instead "Create a new disclosure").
- **Share block** — shareable link + QR (render large, no logo, per long-string QR rules) + Copy. "Anyone with this link can open the disclosure until it expires." For viewing-key type: show the key block + the un-revocable warning instead of a link.
- **Open as auditor** — preview → Screen 4 (so user sees exactly what's shared).
- **Revoke control:**
  - For **proof**: "Revoke link" — destructive confirm "Revoking stops new opens of this link. Copies already downloaded can't be recalled." → status → Revoked.
  - For **viewing key**: revoke is **disabled** with the honest reason "A shared viewing key cannot be cryptographically revoked." Offer only "Remove from this list" (local bookkeeping; warns it doesn't cut access).
- **Activity footnote:** when this disclosure was created / last opened (mock log, local-only — reinforce "we don't report this anywhere").

**States:**
- **Active:** share + revoke available.
- **Expired:** share disabled, "Expired {date}", CTA "Create a new disclosure".
- **Revoked:** share disabled, "Revoked {date}".
- **Loading:** skeleton card.
- **Error:** `Notification` + Retry.
- **Disabled (viewing-key revoke):** as above with reason.
- **Success (revoke):** confirm toast + pill flips to Revoked.

**Interactions:** copy/QR share; rename (pencil→check); open-as-auditor; revoke (confirm) / remove-from-list; create-new.

---

## Cross-cluster notes

- **Asymmetry is the design:** proof is the bright, default, low-friction path; viewing key is muted, gated, deflected. Never render the two paths as identical cards.
- **Honesty rails (must appear, verbatim-in-spirit):** "read-only, never spend" on every artifact; "past + future, cannot be revoked" on viewing key; "expiry stops new link opens, not downloaded copies" on proof; "we don't report this anywhere" on local logs.
- **Mocked surfaces to tag:** transaction list, proof generation timing, verify round-trip, share links/QR, CSV/PDF export, open/created logs. The viewing-key/disclosure crypto is mocked-integration → label.
- **No DO-NOT-COPY leakage:** no dApp-connect/sign-message, no custodial reporting, no analytics dashboards, no fee UI.

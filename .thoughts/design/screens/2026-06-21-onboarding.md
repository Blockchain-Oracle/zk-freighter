# Onboarding cluster — screen spec

**Product:** ZK Freighter (brand locked). A privacy-by-default, self-custody zero-knowledge wallet for shielded payments on Stellar. Browser web app first.

**Cluster:** First-run onboarding only. Welcome / choose-path → Create new (password → pre-reveal explainer → reveal+copy → confirm) → OR Import existing → OPTIONAL passkey step → handoff to Home.

**Prototype note:** All wallet operations are MOCKED. Seed generation, key derivation (BN254 note key + X25519 encryption key bundled into one "private address"), WebAuthn PRF, trustline setup, and account funding are simulated with deterministic fixtures + artificial delays. Every screen with a mocked operation carries a small "Mocked for prototype" tag (corner badge or inline footnote — visual direction free).

**Anti-slop guardrails for this cluster:**
- Every screen teaches one piece of the privacy/security model — never decorative copy.
- Honest framing throughout: the seed phrase is the ONLY recovery path; lose it and the wallet is gone. No "reset", no "recover via email/social", no hidden backup.
- Do NOT demote the seed phrase. Passkey is explicitly optional and additive; seed is primary and mandatory.
- The word "trustline" never appears. USDC enablement is invisible plumbing surfaced (if at all) as "Setting up USDC".
- The phrase "private address" is the user-facing identity; the underlying Stellar G… account is never the headline during onboarding.
- Persistent network indicator (TESTNET pill) is visible from the very first screen.

---

## Global onboarding chrome (applies to all screens below)

- **Centered single-column card** on a full-bleed background, max width ~480–520px. Borrowed from Freighter `Onboarding` + `OnboardingModal` + `View.Content alignment="center"`.
- **Top bar:** small restrained ZK Freighter wordmark at left; **network pill** at right reading `TESTNET` (mocked toggle — non-interactive during onboarding, but always visible so the privacy/network model is taught from screen one). On mainnet the pill reads `MAINNET` and a one-line note appears later (passkey/handoff) that shielded transfers may be gated on mainnet.
- **Progress affordance** for the Create path: a 3-step indicator (Password · Backup · Confirm) + optional 4th (Secure) when passkey step is reached. Import path shows a 1-step (or 2 with passkey) indicator. Borrow nothing visual; just communicate position.
- **Back control** on every step except Welcome and any irreversible post-confirm screen. Going back never discards the seed silently — see Create-confirm states.
- **Primary CTA** bottom-anchored, full-width; **secondary/tertiary** stacked below it (Freighter Welcome two-stacked-button pattern).

---

## Screen 1 — Welcome / choose path

**Purpose:** First impression; teach the one-sentence product promise (privacy by default) and route to exactly two paths. No third "social/seedless" path (that would demote the seed).

**Reference:** `reference/freighter/extension/src/popup/views/Welcome/index.tsx` (centered logo + name + two stacked rounded buttons: Create new / I already have a wallet).

**Layout & components:**
- Centered restrained ZK Freighter wordmark.
- One-line tagline that teaches the model honestly, e.g. "A self-custody wallet for shielded payments on Stellar." (NOT "fully private"/"anonymous".)
- Two stacked buttons:
  - Primary: **Create a new wallet**
  - Tertiary: **I already have a wallet** (import)
- Tertiary text link below: **How privacy works** → opens a lightweight explainer sheet (mocked) covering: shielded by default; only deposits (shield-in) and withdrawals (unshield-out) are public; the seed phrase is the only recovery.
- Network pill `TESTNET` top-right.

**States:**
- **Default:** as above.
- **Loading:** none on entry (static). If "How privacy works" sheet pulls copy async in prod, show skeleton lines; in prototype it's instant.
- **Error:** n/a (no network call).
- **Disabled:** n/a.
- **Returning-user variant:** if a wallet already exists locally (mocked flag), this screen is bypassed → Unlock screen (out of cluster). Note this routing only; do not design Unlock here.

**Interactions:**
- Create → Screen 2 (Set password).
- Import → Screen 6 (Import seed).
- "How privacy works" → explainer sheet (dismissible; does not advance).

**Mock data:** none (static copy). Wordmark = restrained ZK Freighter lockup.

---

## Screen 2 — Create new: Set password (BEFORE phrase)

**Purpose:** Establish the local unlock password BEFORE any seed is shown. Teach that the password is local-only and is NOT the recovery secret — distinct from the seed phrase.

**Reference:** `reference/freighter/extension/src/popup/views/AccountCreator/index.tsx` + its shared `PasswordForm` (password + confirm + terms, validated, "Confirm/Next" precedes the phrase). One shared PasswordForm component is reused by both Create and Import.

**Layout & components:**
- Heading: "Create a password".
- Subtext teaching moment: "This password unlocks the app on this device. It is NOT your recovery phrase — we can't reset it, and it won't recover your wallet on another device."
- **Password** field (masked, show/hide toggle).
- **Confirm password** field (masked, show/hide toggle).
- **Strength meter** (mocked rules: min length, etc.) with live inline guidance.
- **Terms checkbox**: "I understand ZK Freighter can't recover this password or my recovery phrase." (privacy-honest variant of Freighter's terms checkbox).
- Primary CTA: **Continue** (disabled until valid + confirmed + terms checked — borrow Freighter `disabled={!(isValid && dirty)}`).
- Back → Welcome.

**States:**
- **Empty/default:** fields empty, CTA disabled, no errors shown until touched.
- **Typing/partial:** strength meter updates; confirm-mismatch error only after confirm field is touched.
- **Invalid:** inline field errors ("Passwords don't match", "Too short"); CTA stays disabled.
- **Disabled:** CTA disabled whenever invalid/terms unchecked.
- **Loading/success:** on Continue, brief mocked "creating local vault" spinner on the button (Freighter `isSubmitting`/`isLoading`), then advance to Screen 3. (Mocked: ~600ms.)
- **Error:** mocked failure path (e.g. storage unavailable) → inline `Notification variant="error"`: "Couldn't set up local storage. Try again." CTA re-enabled.
- **pending-proof:** n/a (no ZK here).

**Interactions:** show/hide toggles per field; Enter submits when valid; Continue → Screen 3.

**Mock data:** password held in component state only; never persisted in plaintext in the prototype.

---

## Screen 3 — Create new: Pre-reveal explainer (phrase modal)

**Purpose:** Gate the seed reveal behind an explainer that teaches what the phrase is, why it's the only recovery, and that a confirm step follows. This is the honesty-critical screen.

**Reference:** `reference/freighter/extension/src/popup/views/MnemonicPhrase/index.tsx` (the `OnboardingModal` shown before words: icon rows + "Show recovery phrase" / footer). **Remove Freighter's "Do this later" / Skip path** — we do NOT allow skipping backup (would create an unrecoverable wallet silently). Strengthen the "no recovery" message.

**Layout & components:**
- Heading: "Your recovery phrase".
- Icon rows (borrow the row pattern, rewrite copy):
  - Lock icon — "These 12 words are the only way to recover your wallet and funds."
  - Eye-off icon — "Never share them. Anyone with the phrase controls your funds."
  - Alert icon — "There is no reset. Lose the phrase and the wallet is gone for good — no email, no support, no backup."
  - Shield icon (privacy teach) — "This phrase also derives your private address. It's what keeps your shielded balance recoverable."
- Reassurance line: "For your security, we'll ask you to confirm a few words on the next step."
- Primary CTA: **Reveal recovery phrase**.
- Secondary CTA: **Back** (returns to password — does not generate/show seed).
- NO skip/"do this later".

**States:**
- **Default:** modal as above.
- **Loading:** if seed generation is deferred until reveal, tapping Reveal shows a brief mocked "Generating your phrase…" spinner before Screen 4. (Mocked deterministic 12-word fixture.)
- **Error:** generation failure (mocked) → inline error "Couldn't generate a phrase. Try again."
- **Disabled / empty / success / pending-proof:** n/a.

**Interactions:** Reveal → Screen 4. Back → Screen 2.

**Mock data:** seed generated as a fixed BIP-39 12-word fixture for the prototype, e.g. `lunar  ridge  fabric  often  …` (deterministic; mark "Mocked phrase — do not use with real funds").

---

## Screen 4 — Create new: Reveal + copy phrase

**Purpose:** Display the 12 words for the user to record; provide copy with a friction/warning; advance only after the user attests they've saved it.

**Reference:** `popup/components/mnemonicPhrase/DisplayMnemonicPhrase` (numbered word grid + copy + "I've saved" advance). Freighter `MnemonicDisplay`.

**Layout & components:**
- Heading: "Write down your recovery phrase".
- **Numbered 12-word grid** (2 cols × 6, or 3×4), each cell `NN  word` with the index zero-padded (Freighter `(index+1).padStart(2,"0")`).
- **Copy to clipboard** button with a privacy-honest caution tooltip: "Copying to clipboard is risky — prefer writing it down. Clipboard will auto-clear." On copy → "Copied" confirmation (Freighter `CopyText "Copied!"`) and a mocked auto-clear timer note.
- **Reveal/blur toggle:** words start blurred behind a "Tap to reveal — make sure no one is watching" cover (privacy teach), then unblur. (Additive to Freighter, justified by shoulder-surfing threat.)
- **Confirmation checkbox:** "I've saved my recovery phrase somewhere safe."
- Primary CTA: **Continue** (disabled until checkbox checked).
- Back → Pre-reveal explainer (warn: see states).

**States:**
- **Hidden/empty (initial):** words blurred behind cover; copy disabled until revealed.
- **Revealed:** words visible; copy enabled; checkbox enabled.
- **Copied (success):** "Copied — clipboard clears shortly" inline; non-blocking.
- **Disabled:** Continue disabled until checkbox checked.
- **Back warning:** going back shows a small confirm: "Go back? The same phrase will be shown again." (No new phrase generated on return — prevents user confusion about which phrase is real.)
- **Loading/error/pending-proof:** n/a (no network).

**Interactions:** reveal toggle; copy (with auto-clear); checkbox gates Continue; Continue → Screen 5 (Confirm).

**Mock data:** same 12-word fixture from Screen 3 (must match for confirm to validate).

---

## Screen 5 — Create new: Confirm the phrase

**Purpose:** Verify the user actually recorded the phrase before the wallet is finalized. Last step before the wallet is real.

**Reference:** `popup/components/mnemonicPhrase/ConfirmMnemonicPhrase` (re-checks the phrase). Freighter `CheckButton` chip pattern.

**Layout & components (pick ONE confirm method; word-chip is preferred):**
- Heading: "Confirm your recovery phrase".
- Subtext: "Tap the words in the correct order to confirm you saved them."
- **Word-chip method (preferred):** a shuffled pool of the 12 words as tappable chips; an ordered answer row filling left-to-right; tapping a chip moves it into the next answer slot; tapping a placed word removes it. Alternative slimmer method: 3 randomly chosen positions ("word #3, #7, #11") as masked inputs — lower friction, acceptable for prototype.
- Primary CTA: **Confirm & create wallet** (disabled until the order matches).
- Back → Reveal screen (re-shows same phrase).

**States:**
- **Empty:** answer row empty / inputs blank; CTA disabled.
- **In progress:** chips moving into slots; CTA disabled until full + correct.
- **Incorrect:** on full-but-wrong, inline error "That's not the right order. Check your written phrase." + a "Show phrase again" link back to Screen 4. Borrow Freighter `OnboardingError` / `authError ? "Invalid mnemonic phrase"`.
- **Correct → loading/success:** CTA shows mocked spinner "Creating your wallet…" while it (mock) derives keys + sets up USDC invisibly ("Setting up USDC" micro-line — never says "trustline"). Then advance.
- **Disabled:** CTA disabled until exact match.
- **pending-proof:** n/a — but this is the right place to set expectations: a small footnote "Some actions later (like withdrawing privately) generate a proof that can take a moment." teaches the proving-latency model before the user hits it.

**Interactions:** chip tap to place/remove; "Show phrase again" escape hatch; Confirm → Screen 7 (optional passkey).

**Mock data:** validates against the Screen 3/4 fixture; mocked key derivation produces a fixed private-address fixture (Railgun-0zk-style bundle string) shown later on Receive/Home.

---

## Screen 6 — Import existing wallet

**Purpose:** Recover an existing wallet from a 12- or 24-word phrase, then set a local password (shared form). No private-key import (seed-derived only — DO-NOT-COPY).

**Reference:** `reference/freighter/extension/src/popup/views/RecoverAccount/index.tsx` (numbered masked per-word grid; paste-whole fan-out into the first box; 12/24 word `Toggle`; Show/Hide `Eye/EyeOff`; shared `PasswordForm`; `OnboardingError "Invalid mnemonic phrase"`). This is a near 1:1 borrow.

**Sub-flow order:** Freighter shows PasswordForm first, then the phrase grid. We keep the same shared `PasswordForm` but **show the phrase-entry grid FIRST, then the password form**, so the user proves they hold a valid phrase before being asked to set a password (cleaner mental model for recovery). Either order is acceptable; document this as the chosen order.

**Layout & components:**
- Heading: "Import your wallet".
- Subtext: "Enter your recovery phrase to restore your wallet and shielded balance."
- **12/24-word toggle** (Freighter `SHORT_PHRASE=12` / `LONG_PHRASE=24`; switching to 12 clears all fields).
- **Numbered masked input grid:** each cell `NN` label + masked input (`type=password` unless Show toggled), `autoComplete="off"` (Freighter `PhraseInput`).
- **Paste-whole support:** pasting a space-separated phrase into the first box fans out across all inputs and clears the clipboard afterward (Freighter `handlePaste` → `setMnemonicPhraseArr(pastedWords)` + `navigator.clipboard.writeText("")`). Privacy-honest toast: "Pasted and cleared your clipboard."
- **Show/Hide toggle** for all words (Freighter tertiary button + Eye/EyeOff).
- Primary CTA: **Continue** (disabled until all required words filled — Freighter `disabled={!(isValid && buildMnemonicPhrase(...).length)}`). Advances to the shared **PasswordForm** (same component as Screen 2) → then finalize.

**States:**
- **Empty:** all inputs blank; CTA disabled.
- **Partial:** some filled; CTA disabled until count matches selected length.
- **Filled:** CTA enabled.
- **Paste success:** fields populated + "clipboard cleared" toast.
- **Invalid phrase:** on submit, mocked validation → `OnboardingError` "Invalid recovery phrase. Check the words and their order." (mirror Freighter `authError`).
- **12↔24 switch:** toggling clears fields (Freighter behavior) — warn if fields were non-empty: "Switching length clears entered words."
- **Loading/success:** after password set + Continue, mocked spinner "Restoring your wallet…" (re-derives keys + invisibly checks/sets up USDC). Then → Screen 7 (optional passkey) or directly Home if user declines.
- **Disabled:** CTA disabled per fill/validity rules.
- **Error (data fetch):** mirror Freighter `RequestState.ERROR` → `Notification variant="error"` "Couldn't restore right now. Try again." with retry.
- **pending-proof:** n/a (import itself isn't a proof; but show the same proving-latency footnote as Screen 5).

**Interactions:** length toggle; per-word entry; paste fan-out + clipboard clear; show/hide; Continue → shared PasswordForm → finalize.

**Mock data:** any 12/24 words accepted if they match a small fixture set; one "known-good" fixture restores a wallet with mocked balances so downstream screens demo well; a deliberately wrong fixture triggers the invalid-phrase error state for the prototype.

---

## Screen 7 — OPTIONAL: Enable Face ID / passkey

**Purpose:** Offer an ADDITIVE convenience factor (WebAuthn PRF / passkey) without demoting the seed. Honest about its limits: it's a faster unlock + a way the same wallet returns via a synced credential, but it is NOT recovery and does NOT replace the phrase.

**Reference:** No Freighter screen exists (Freighter has no passkey). Borrow the generic `OnboardingModal` shell + icon-row pattern from `MnemonicPhrase` modal. Framing/limits per design-references row "Onboarding — OPTIONAL passkey" (Phantom Auth as a model: optional layer, not a replacement). Note from references: a passkey-only C… account has NO seed — but in OUR flow the seed is already created/imported, so the passkey is purely additive on top of an existing seed-backed wallet. Do NOT present a seedless passkey path here.

**Layout & components:**
- Heading: "Add Face ID for faster unlock" (or platform-appropriate: Touch ID / passkey).
- Teaching icon rows:
  - Fingerprint icon — "Unlock ZK Freighter with Face ID instead of typing your password."
  - Sync icon — "On a device with your synced passkey, the same wallet returns."
  - Alert icon (honesty) — "This is NOT a backup. If you lose your recovery phrase, your wallet is gone — a passkey can't recover it."
- Primary CTA: **Enable Face ID** (triggers mocked WebAuthn PRF prompt).
- Tertiary CTA: **Skip for now** (clearly equal-weight legitimate choice; "You can enable this later in Settings").
- Small note: "Your recovery phrase remains the only way to restore this wallet." (seed stays primary).

**States:**
- **Default:** offer as above.
- **Prompting (loading):** after Enable, a mocked system biometric/passkey sheet; button shows "Waiting for Face ID…".
- **Success:** check-state "Face ID enabled" → continue to Home handoff.
- **Failed/cancelled:** if the user cancels or it errors → inline `Notification` "Couldn't enable Face ID. You can try again or skip." Both Enable (retry) and Skip remain available. Never block onboarding on this.
- **Unsupported (disabled):** if the platform lacks WebAuthn PRF (mocked capability flag), the Enable button is disabled with a tooltip "Face ID isn't available on this device/browser." Skip becomes the only path; no dead end.
- **Empty / pending-proof:** n/a.

**Interactions:** Enable → mocked WebAuthn prompt → success/fail; Skip → Home. Either way the wallet already exists (created in Screen 5 / imported in Screen 6) — this step only attaches an optional credential.

**Mock data:** WebAuthn PRF entirely mocked (no real credential); success/fail/unsupported toggled by a prototype flag so all three states are demoable.

---

## Post-onboarding handoff (boundary of cluster)

After Screen 7 (enabled or skipped), route to **Home** (out of cluster) in a first-run "welcome" state. The first-receive trustline setup and unfunded empty state belong to the Home/Receive cluster, not here — but onboarding has already (mock) initiated the USDC setup so the user lands ready. If on mainnet, surface the one-line "shielded transfers may be limited on mainnet" note here as the last teaching beat before Home.

---

## Cross-screen state checklist (coverage audit)

- **Empty:** Welcome (static), Password (empty fields), Reveal (blurred cover), Confirm (empty answer row), Import (blank grid).
- **Loading:** Password create spinner, phrase generation, Confirm "Creating your wallet…", Import "Restoring…", passkey "Waiting for Face ID…".
- **Error:** storage failure (Password), generation failure (pre-reveal), wrong order (Confirm), invalid phrase + fetch error (Import), passkey failed/unsupported (Screen 7).
- **Disabled:** all primary CTAs gated by validity/checkbox/order/fill; passkey Enable disabled when unsupported.
- **Success:** copied confirmation, correct-order confirm, wallet created/restored, Face ID enabled.
- **pending-proof:** no proof generated during onboarding, but the proving-latency model is TAUGHT (footnote on Confirm + Import) so the first real proof later isn't a surprise.

## Mocked surfaces (must be labelled in prototype)

Seed generation, key derivation (note + encryption keys → one private address), the phrase-validation accept/reject, USDC "setup", WebAuthn passkey enable, and all spinners/delays. Each gets a "Mocked for prototype" marker.

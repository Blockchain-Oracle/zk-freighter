# Screen cluster spec — Accounts + Settings

Product: **ZK Freighter** (brand locked). Privacy-by-default, self-custody, zero-knowledge wallet for **shielded payments on Stellar**. Browser web app (extension later, out of scope).

This file specs ONE cluster: **Accounts** (multi-account list, switch, add, new private address) + **Settings** (Security, Network, Compliance/view-key, About, Lock). Every screen below teaches the privacy model and surfaces honest disclaimers. Prototype = high-fidelity, MOCKED data + MOCKED integrations; every mocked surface is labeled. Visual direction (color/font) is intentionally left free.

> Primary structural reference for the whole cluster: Freighter `reference/freighter/extension/src/popup/views/` — `Wallets`, `Settings`, `Security`, `AutoLockTimer`, `About`, `ViewPublicKey`, `UnlockAccount`. Borrow `SubviewHeader` (title + back/X), `ListNavLink`/`ListNavLinkWrapper` (settings rows), `View.Content`/`View.Footer` (layout), `CopyText` ("Copied!"), inline-rename (pencil→check). STRIP the DO-NOT-COPY surfaces (hardware-wallet add, import-secret-key add, asset-lists, advanced/custom-RPC network management, swap).

---

## Cluster-wide conventions (apply to every screen here)

- **Header:** `SubviewHeader` pattern — left back chevron (or **X** to close a modal sheet), centered title, optional right action. Ref: Freighter `components/SubviewHeader`.
- **Network indicator:** a persistent **TESTNET / MAINNET pill** is visible in the global app header above this cluster (specced fully in Network screen). Never hidden.
- **Two-key identity reminder:** Anywhere we show "an account," remember each account = ONE shareable **private address** (BN254 note key + X25519 encryption key, bundled Railgun-0zk-style) PLUS an underlying **public Stellar `G…` account** used only as plumbing (shield/unshield + fees). The `G…` is never the headline.
- **Truncation:** all addresses middle-truncated keep head+tail (e.g. `zkf1q9…7p4n` for private, `GAEX…7AOO` for public). Ref: Freighter `helpers/stellar truncatedPublicKey`.
- **Honest copy rule:** never "fully private"/"anonymous." Always "shielded." Deposits/withdrawals are public.
- **Mocked-surface chip:** a small "Mocked" tag on any data/integration that is faked in the prototype (balances, attestation, friendbot, passkey ceremony). Consistent placement (top-right of the affected card).
- **Avatars:** deterministic identicon derived from the account's private-address bundle (NOT from the `G…`), so the visual identity matches the headline address. Ref: Freighter `IdenticonImg`.

---

# ACCOUNTS

## 1. Accounts list (manage / switch)

**Purpose:** see all accounts under this seed, switch the active one, copy addresses, inline-rename, and enter the add-account / new-address flows. This is the identity hub.

**Borrow from:** Freighter `views/Wallets/index.tsx` (the WalletRow list + active-highlight + per-row ellipsis options + bottom "Add a wallet" CTA + slide-in RenameWallet card + AddWallet sheet). Phantom "wallets/accounts/addresses" mental model.

**Layout & components:**
- `SubviewHeader` title "Accounts", right action = **X** (close back to Home).
- Scrollable account list. Each **AccountRow**:
  - Identicon avatar (from private bundle).
  - Editable **name** (default "Account 1", "Account 2", …; max 24 chars — borrow Freighter's 24-char rule).
  - **Truncated PRIVATE address** as the primary identifier line (e.g. `zkf1q9…7p4n`) with a subtle "private address" label; the public `G…` is NOT shown on the row (it lives one tap deeper, on Receive / row options) to keep the headline private-first.
  - **Mocked total balance** chip (shielded + pending combined value), labeled "Mocked".
  - **Active marker:** the active row is visually selected (checkmark / accent border) and is NOT tappable-to-switch (it's already active).
  - **Ellipsis (•••) options** opening an inline action menu: **Copy private address**, **Copy public (Stellar) address**, **Rename**, **Show on Receive →**. (Ref: Freighter WalletRow ellipsis → Rename / Copy address.) NO "remove account" (seed-derived accounts can't be deleted — state this if asked via a disabled/explained affordance).
- **Sticky footer**, two actions:
  - Primary: **+ Add account** (derive next account from the same seed). Ref: Freighter bottom "Add a wallet" button.
  - Secondary/text: **What's an account vs an address?** → opens the explainer sheet (screen 4).

**States:**
- **Default:** ≥1 account, one active.
- **Single-account:** list of one; the "switch" affordance is absent, but Add account + rename + copy all present. Teach: "All your accounts share one seed phrase."
- **Loading:** skeleton rows (avatar circle + 2 text lines + balance shimmer) while mocked balances resolve. Ref: Freighter `components/Loading`.
- **Balance-pending within a row:** if an account has proofs in flight, show a small "Pending" sub-line on its balance instead of a frozen spinner (privacy-model: Pending vs Spendable split).
- **Empty:** not reachable post-onboarding (there is always ≥1). If forced (data wipe), show friendly "No accounts yet" + single **Create account** CTA (routes to onboarding, out of this cluster).
- **Error:** balances failed to load → inline `Notification variant=error` "Couldn't load balances" + Retry; the LIST of accounts still renders (identity is local, balances are remote). Ref: Freighter `Wallets__fail`.
- **Disabled:** active row's switch action disabled; ••• "Show public address" disabled with tooltip when the account's `G…` is unfunded ("This account has no on-chain Stellar account yet — fund it from Add funds").
- **Success (switch):** tapping a non-active row → brief inline confirm, active marker moves, app returns Home with the newly active account. Toast "Switched to {name}".
- **Pending-proof:** N/A as a blocking state here; surfaced only as the per-row "Pending" balance sub-line above.

**Interactions:**
- Tap non-active row → set active → navigate Home (ref: Freighter `makeAccountActive` + navigate to account).
- Tap ••• → inline options (close on outside-click — ref Freighter `handleClickOutside`).
- Copy → `CopyText` micro-feedback "Copied!" (ref: Freighter CopyText). Copying the PUBLIC address shows a one-line caution: "Public address — anything sent here is visible on-chain until you shield it."
- Rename → slide-in card (screen 3).
- +Add account → screen 2.

**Mock data:**
- `Account 1` — `zkf1q9…7p4n` — active — Mocked balance "1,204.50 USDC · 320 XLM".
- `Savings` — `zkf1m4…ee2d` — Mocked balance "0 USDC · 12 XLM" — public `G…` UNFUNDED (drives the disabled "show public address" state).
- `Account 3 (pending)` — `zkf1zz…0a8c` — Mocked balance "Spendable 50 USDC · **Pending 100 USDC**".

---

## 2. Add account (derive from same seed)

**Purpose:** create the next sequential account from the existing seed — NO new seed, NO secret-key import, NO hardware (all DO-NOT-COPY). This is purely HD derivation.

**Borrow from:** Freighter `AddAccount/AddAccount/index.tsx` (derive-next-from-seed) and the AddWallet sheet shell — but REDUCE its 3-option menu (create / import-secret / hardware) to a SINGLE honest path, since the other two are excluded.

**Layout & components:**
- Modal sheet / subview, `SubviewHeader` "Add account" with back chevron.
- Single explanatory card: "This creates a new account from your existing seed phrase. No new backup needed — your seed phrase already recovers it." (Ref microcopy lifted from Freighter create-from-seed framing.)
- Optional name input (prefilled "Account {n+1}", editable, 24-char max).
- Note line: "New accounts start empty. Each has its own private address and its own public Stellar address."
- Primary button **Create account**.

**States:**
- **Default / idle:** button enabled.
- **Working:** button → spinner + "Creating…" (HD derivation is instant in reality, but keep a deterministic micro-delay state so the prototype shows the pattern). Disable inputs.
- **Success:** new row appears in list, becomes selectable; auto-return to Accounts list with the new account highlighted; toast "Account created."
- **Error:** "Couldn't create account" inline `Notification` + Retry (mocked failure path so the designer renders it).
- **Empty / loading / disabled:** Name field empty is allowed (falls back to default). Button disabled only while Working.
- **Pending-proof:** N/A.

**Interactions:** Create → derive → append → return. Back chevron → discard, return to list.

**Mock data:** prefilled name "Account 4"; on create, append `zkf1k7…b21e`, empty mocked balance.

---

## 3. Inline rename

**Purpose:** rename any account; names are local-only labels (never on-chain).

**Borrow from:** Freighter `Wallets` `RenameWallet` slide-in Card (Formik input, "Address: {short}", Cancel / Save) AND `ViewPublicKey` pencil→check inline edit.

**Layout & components:** slide-in Card over a dimmed background (ref: Freighter `LoadingBackground` overlay). Title "Rename account". Text input (autofocus, maxLength 24, current name as placeholder). Read-only line "Private address: `zkf1q9…7p4n`". Buttons: Cancel (tertiary) / Save (secondary).

**States:**
- **Default:** prefilled with current name.
- **Empty input:** Save disabled (can't blank a name) OR reverts to default — pick disabled-with-hint "Name can't be empty."
- **Too long:** inline error "Max 24 characters" (ref Freighter Yup max(24)).
- **Unchanged:** Save no-ops / disabled (ref Freighter: only dispatch if name changed).
- **Saving:** Save → brief spinner.
- **Success:** card dismisses, row label updates, toast "Renamed."
- **Error:** rare; inline "Couldn't rename" + Retry.

**Interactions:** type → Save → close. Outside-click / Cancel → discard. Enter submits.

**Mock data:** rename "Account 1" → "Daily".

---

## 4. New private address (rotating receive address) + "What's an account vs address" explainer

**Purpose:** teach the account-vs-address model and let users generate a FRESH rotating private receive address (Zashi/Railgun pattern) — multiple addresses, ONE balance, ONE seed. (Distinct from creating a whole new ACCOUNT.)

**Borrow from:** Zashi rotating-shielded-address reassurance copy ("All transactions sent to your different rotating Shielded Addresses will remain part of one wallet balance under the same seed phrase"); Freighter `ViewPublicKey` for the address+copy block shell. (Full Receive screen is a different cluster — here we only handle the *generate-new-address* affordance + the explainer that the Accounts list links to.)

**Layout & components:**
- Explainer sheet (`SubviewHeader` "Accounts & addresses"):
  - Plain-language model card: "**One account** = one identity under your seed. **Each account has many private addresses** you can hand out — they all land in the same balance. We rotate them so two payers can't link your payments."
  - Diagram: 1 seed → N accounts → each account → N rotating private addresses + 1 public `G…`. Keep it a simple labeled tree, not decorative.
  - Honest note: "Your **public Stellar address** is shared and static — it's used only for deposits and fees, and anything sent to it is visible until you shield it."
- **Generate new address** affordance (links into the Receive cluster but specced as the entry button here): primary "New private address" → reveals a fresh `zkf1…` with QR + Copy + "Same wallet, new address" reassurance label.

**States:**
- **Default:** explainer + Generate button.
- **Generating:** button spinner (address derivation; deterministic micro-delay).
- **Success:** new rotating address shown, Copy ready; prior addresses still valid (note "Old addresses still work").
- **Loading / empty / error:** error → "Couldn't generate a new address" + Retry. No empty state (there's always at least the first address).
- **Disabled:** Generate disabled on mainnet IF mainnet privacy is gated (mirror Network gating; show reason).
- **Pending-proof:** N/A (address gen ≠ proof).

**Mock data:** current `zkf1q9…7p4n` → generate `zkf1tt…9w0k`.

---

# SETTINGS

## 5. Settings root (menu)

**Purpose:** hub for Security, Network, Compliance/view-key, About, and Lock.

**Borrow from:** Freighter `views/Settings/index.tsx` — `ListNavLinkWrapper` of icon rows + Log Out row + version footer. Keep the EXACT row pattern; swap the row set to ours and DROP Preferences/Help/Feedback/What's-new/asset-lists (out of scope) — or keep a minimal Help link to docs only.

**Layout & components:**
- `SubviewHeader` "Settings", right = X.
- `ListNavLink` rows (icon + label + chevron):
  1. **Security** → screen 6.
  2. **Network** → screen 12.
  3. **Compliance & disclosure** → screen 13.
  4. **About** → screen 16.
- Divider, then a distinct **Lock** row (icon, accent) → immediately locks (screen 17). Ref: Freighter Log Out row (separate styling, onClick not a NavLink).
- Footer: **network pill** echo + **version** "v0.1.0 · testnet · unaudited" (ref: Freighter version footer with GitCommit icon) — "unaudited" is a persistent honest tag.

**States:** default only; rows never disabled. Lock requires no confirm (matches Freighter Log Out). Network pill in footer reflects live network. Mocked: none (pure nav). Loading/empty/error: N/A (local nav).

**Interactions:** tap row → subview. Tap Lock → lock + route to Unlock.

---

## 6. Security (sub-menu)

**Purpose:** gate to seed reveal, change password, auto-lock, passkey toggle.

**Borrow from:** Freighter `views/Security/index.tsx` `ListNavLinkWrapper`. Replace its asset-lists/advanced rows with ours; KEEP "Show recovery phrase" + "Auto-lock timer".

**Layout & components:** `SubviewHeader` "Security" + rows:
1. **Reveal seed phrase** (icon-phrase) → screen 7.
2. **Change password** → screen 9.
3. **Auto-lock timer** → screen 10.
4. **Passkey (Face ID) — On/Off** → screen 11 (row shows current state as a trailing pill: "On"/"Off").
- Honest banner at top: "Your seed phrase is the ONLY recovery. There is no reset — lose it and your funds are gone." (Lift Freighter/MetaMask SRP framing.)

**States:** default; passkey row trailing pill reflects state (On = a synced credential exists; Off). All rows enabled. No loading (local). If WebAuthn unsupported in the browser, passkey row shows "Unavailable on this device" disabled + tooltip.

---

## 7. Reveal seed phrase — password gate + warning

**Purpose:** show the 12/24-word seed behind a password + explicit warning. The single most dangerous screen — design for friction.

**Borrow from:** Freighter `DisplayBackupPhrase` + `MnemonicPhrase` (pre-reveal warning modal then blurred words) + `UnlockAccount` (`EnterPassword`). Phantom "view recovery phrase" gate.

**Layout & components:**
- **Step A — Warning + password (`SubviewHeader` "Reveal seed phrase"):**
  - Bold warning card: "Anyone with these words controls all your funds. Never share them. ZK Freighter staff will never ask for them. There is no recovery if you lose them." (Lift Freighter warnings.)
  - Password input (masked, autofocus). Primary **Reveal** (disabled until non-empty).
- **Step B — Phrase reveal:**
  - Words shown in a numbered grid, initially **blurred** behind a "Tap to reveal" scrim (don't auto-expose).
  - **Copy phrase** (with caution "Copying puts your seed on the clipboard") + **Hide** toggle.
  - Auto-reblur on blur/tab-switch; auto-return to gate after a short idle.

**States:**
- **Idle/default:** password empty → Reveal disabled.
- **Verifying:** spinner on Reveal.
- **Error (wrong password):** inline "Incorrect password" (don't reveal); rate-limit after N attempts with "Try again in 30s" (ties to security posture in MEMORY). Ref: Freighter unlock error.
- **Success:** Step B with words blurred-until-tap.
- **Revealed:** words visible + Copy/Hide.
- **Loading/empty:** Step B has no empty (seed always exists).
- **Disabled:** Reveal disabled while empty/verifying; Copy disabled until revealed.
- **Passkey-only edge:** if the account were passkey-derived with NO seed, show "This account has no seed phrase" honest state instead (per references: a C…/passkey path has no seed). In v1 seed is primary so this is an edge note, not the default.
- **Pending-proof:** N/A.

**Mock data:** 12 words `ridge ... cabin` (clearly fake/labeled "Mocked seed — prototype").

---

## 8. (Reserved) — seed confirm
Not needed in Settings (confirm lives in onboarding cluster). Cross-link only.

---

## 9. Change password

**Purpose:** change the local unlock password (encrypts the local keystore). Does NOT change the seed. Honest: "This password unlocks the app on this device. It is NOT your recovery — your seed phrase is."

**Borrow from:** NO Freighter reference exists (commented TODO in `Security`). Use MetaMask/Phantom password-reset interaction model (current → new → confirm).

**Layout & components:** `SubviewHeader` "Change password". Three masked inputs: Current password, New password, Confirm new password. Strength meter on New. Note distinguishing password vs seed. Primary **Update password**.

**States:**
- **Default:** Update disabled until all valid + match.
- **Mismatch:** inline "Passwords don't match."
- **Weak:** strength meter warns; allow but warn (or block below a floor — pick block with "Choose a stronger password").
- **Wrong current:** inline "Current password is incorrect" (rate-limited).
- **Saving:** spinner.
- **Success:** toast "Password updated" + return to Security. Note "You'll use the new password next unlock."
- **Error:** generic "Couldn't update password" + Retry.
- **Disabled/empty/loading:** as above.
- **Pending-proof:** N/A.

**Mock data:** mocked keystore; any non-empty "current" accepted except a seeded wrong value to demo the error.

---

## 10. Auto-lock timer

**Purpose:** choose idle timeout before the wallet auto-locks.

**Borrow from:** Freighter `views/AutoLockTimer/index.tsx` (single-select list of timeout options, checkmark on selected, disabled-while-saving). 1:1 reuse.

**Layout & components:** `SubviewHeader` "Auto-lock timer". Single-select option list: **1 min, 5 min, 15 min, 30 min, 1 hour, Never**. Selected row shows `Icon.Check`. Helper: "Locks the app after inactivity. You'll need your password (or passkey) to unlock." For "Never": honest caution "Not recommended on shared devices."

**States:**
- **Default:** current selection checked.
- **Saving:** all options disabled (ref Freighter `isSaving`).
- **Success:** check moves; subtle "Saved" microcopy (auto-persist, no explicit save button — ref Freighter).
- **Loading:** skeleton list while settings load (ref Freighter Loading guard).
- **Error:** `Notification` "Couldn't save setting" + Retry.
- **Disabled:** options disabled during save.

**Mock data:** current = 5 min.

---

## 11. Passkey (Face ID) — enable / disable

**Purpose:** OPTIONAL convenience factor via WebAuthn PRF (deterministic). Honest framing: seed phrase stays primary; passkey is an additional unlock, NOT a recovery method, and the same wallet only returns via a **synced** credential.

**Borrow from:** NO Freighter reference (no passkey screen). Use Phantom Auth framing ("optional layer, not a replacement"). Invent specifics from spec; mark the WebAuthn ceremony **Mocked**.

**Layout & components:** `SubviewHeader` "Passkey". Toggle card: **Use Face ID / passkey to unlock** (On/Off). Explainer: "Adds Face ID / Touch ID / device passkey as a faster unlock. Your seed phrase is still your only recovery. If your passkey isn't synced across your devices, this wallet won't return on a new device from the passkey alone."
- When **enabling:** a "Set up passkey" button triggers the (mocked) browser WebAuthn prompt, then "Confirm with your current password" step (bind passkey to keystore).
- When **disabling:** confirm "Turn off passkey unlock? You'll use your password." (no security loss since seed is primary).

**States:**
- **Off/default:** toggle off, Set-up CTA.
- **Enabling (ceremony):** mocked OS prompt overlay "Waiting for passkey…" (labeled Mocked) → password-bind step.
- **On/success:** toggle on, "Passkey enabled" toast; Security row pill → "On".
- **Disabling:** confirm → off → toast.
- **Error / declined:** user cancels OS prompt → "Passkey setup cancelled" inline, toggle stays Off. WebAuthn error → "Couldn't set up passkey — your password still works."
- **Unsupported:** toggle disabled + "This browser/device doesn't support passkeys."
- **Loading:** brief while reading credential state.
- **Pending-proof:** N/A.

**Mock data:** mocked credential id; default Off.

---

## 12. Network (testnet / mainnet toggle + indicator)

**Purpose:** the ONLY network control — flip testnet⇄mainnet. One switch flips RPC / passphrase / USDC issuer+SAC / CCTP contracts under the hood; user never sees a contract id. Surface the persistent indicator + the **mainnet-privacy-gated** note.

**Borrow from:** Stellar networks docs framing. Persistent TESTNET pill pattern. Explicitly REJECT Freighter `ManageNetwork`/custom-RPC/add-network (DO-NOT-COPY) — this is a single binary toggle, no list, no custom endpoints.

**Layout & components:** `SubviewHeader` "Network". 
- Big segmented control / toggle: **Testnet** ⇄ **Mainnet**, current state obvious + matching the global header pill.
- Read-only summary card: "Active: Testnet · privacy pool: available." Underlying RPC/issuer shown as a single muted "managed automatically" line (NOT editable, no contract ids).
- **Mainnet privacy gate note** (honest): "Shielded transfers run on **testnet** today. On mainnet, the privacy pool isn't deployed yet — you can still do plain public Stellar transfers, but Shield/Unshield/Private send are disabled until it ships." (Pull from references: gate mainnet privacy, keep plain transfer.)

**States:**
- **Default:** Testnet selected.
- **Switching:** brief spinner / re-init state "Switching network…" (balances refetch downstream).
- **Mainnet selected:** toggle reflects it; a prominent inline banner "Privacy features are disabled on mainnet (not yet deployed)"; global pill turns to MAINNET (distinct treatment).
- **Confirm on switch to mainnet:** confirm dialog "Switch to mainnet? Shielded features are off here." (avoid accidental privacy-off).
- **Error:** "Couldn't switch network" + Retry; stays on prior network.
- **Disabled:** none (toggle always available); but downstream privacy actions disabled-with-reason on mainnet.
- **Loading/empty:** loading while reading current network.
- **Pending-proof:** N/A.

**Mock data:** Testnet active; mocked RPC label "managed automatically".

---

## 13. Compliance & disclosure (hub)

**Purpose:** user-held selective disclosure — Penumbra "transaction perspective" preferred over a blanket view key. Let the user EXPORT a viewing key (blunt, dangerous) OR generate a **single-transaction disclosure proof** (safer, scoped). User-controlled, never custodial.

**Borrow from:** Penumbra transaction-perspective model (scoped disclosure of ONE transaction view) + Railway view-only-key warnings (blunt, irrevocable). This is a novel surface — invent specifics; borrow only the warning tone + click-to-copy shell.

**Layout & components:** `SubviewHeader` "Compliance & disclosure".
- Intro card: "Prove your activity to an auditor or exchange — on YOUR terms. Nothing here is custodial; we never hold a key."
- Two distinct option cards:
  1. **Disclose a single transaction (recommended)** → screen 14. Subtitle "Share proof of ONE payment without exposing your whole history."
  2. **Export a viewing key (full history)** → screen 15. Subtitle, with a danger flag: "Reveals ALL past AND future shielded activity. Can't be revoked once shared."
- Honest footer: "Disclosure is for your compliance needs. ZK Freighter can't and won't disclose on your behalf."

**States:** default; both cards enabled. On mainnet (privacy gated) compliance applies to testnet activity only — note it. No loading/empty (entry hub).

---

## 14. Single-transaction disclosure proof (Penumbra perspective)

**Purpose:** generate a scoped, shareable proof/"transaction view" for ONE shielded transaction — amount, asset, memo, timestamp — WITHOUT exposing the rest of the wallet.

**Borrow from:** Penumbra TransactionView selective-disclosure. Pending-proof pattern from our Send/Unshield references (client-side proof takes seconds-to-minutes; honest pending state, never a frozen spinner).

**Layout & components:** `SubviewHeader` "Disclose a transaction".
- **Step 1 — pick transaction:** searchable list of the user's shielded transactions (date, amount, type Shield/Send/Unshield). Selecting opens a preview of EXACTLY what the disclosure will reveal ("Recipient sees: amount, asset, memo, time. NOT revealed: your balance, other transactions, counterparty's other activity").
- **Step 2 — generate:** **Generate disclosure proof** button → first-class **pending-proof** state (progress, "This runs on your device and can take up to a few minutes. Keep this tab open." + a moving progress indicator, NOT a static spinner).
- **Step 3 — result:** a disclosure artifact (proof blob / shareable link/file) with **Copy** + **Download** + an explicit "What this reveals" recap. Caution: "Share over a trusted channel — don't paste into email/chat."

**States:**
- **Empty (no shielded txns yet):** "Nothing to disclose yet — your shielded transactions will appear here." (Don't fabricate.)
- **Loading list:** skeleton rows.
- **Selecting/preview:** reveal-scope card.
- **Pending-proof (headline state):** progress + time estimate + "keep tab open"; cancellable.
- **Success:** artifact + copy/download + reveal recap.
- **Error (proof failure):** "Proof generation failed" + Retry + plain-language reason (e.g., "sync required first").
- **Disabled:** Generate disabled until a txn is selected.
- **Mainnet-gated:** if privacy off on mainnet, note "Disclosure available for testnet shielded activity."

**Mock data:** list of 3 mocked shielded txns; mocked proof artifact string + a 12s mocked proving timer to exercise the pending state. All labeled Mocked.

---

## 15. Export viewing key (full history — danger path)

**Purpose:** the blunt, full-account viewing key. Reveals ALL past + future shielded activity; irrevocable once shared. Deliberately higher-friction than screen 14, and de-emphasized in favor of it.

**Borrow from:** Railway view-only-key gate + warnings ("grant full transaction viewing access," "permanently display all transactions including future," "cannot be revoked once shared," "don't paste into text/email"). Password gate from Freighter `EnterPassword`.

**Layout & components:** `SubviewHeader` "Export viewing key".
- Stacked **danger warnings** (checklist the user must acknowledge): "Reveals every shielded transaction — past and ALL future." / "Cannot be revoked once shared." / "Anyone with this key sees your activity forever." / "Never paste it into email or chat."
- **Acknowledge** checkbox(es) → then **password gate** → then reveal key behind a tap-to-reveal scrim with **Copy** (caution) + **Download**.
- Persistent steer: "Prefer disclosing a single transaction instead → " (link to screen 14).

**States:**
- **Default:** warnings shown, Continue disabled until acknowledged.
- **Password gate:** masked input; wrong password error + rate-limit (ref Freighter unlock).
- **Revealed:** key behind scrim; Copy/Download enabled after tap-to-reveal.
- **Success:** "Viewing key exported" + recap of risk.
- **Error:** "Couldn't export viewing key" + Retry.
- **Disabled:** Continue disabled pre-acknowledgement; Copy disabled pre-reveal.
- **Mainnet-gated:** note testnet scope if applicable.
- **Pending-proof:** N/A (key export is not a proof).

**Mock data:** mocked viewing-key string `zvk1…` labeled Mocked.

---

## 16. About / credits

**Purpose:** identity, credits, and HONEST disclaimers (unaudited; who powers what).

**Borrow from:** Freighter `views/About/index.tsx` (logo + one-line description + Links list + copyright footer). Keep the shape; change content.

**Layout & components:** `SubviewHeader` "About".
- Restrained ZK Freighter wordmark/logo (do NOT over-design a Freighter-derivative mark).
- One-liner: "A privacy-by-default, self-custody wallet for shielded payments on Stellar."
- **Honest disclaimers block (prominent, not buried):**
  - "**Unaudited prototype.** Use testnet funds only. Do not rely on this for real value."
  - "Deposits and withdrawals are **public** on Stellar. Only transfers between private addresses are shielded. We never claim 'fully private' or 'anonymous.'"
  - "**No recovery.** Lose your seed phrase and your funds are gone."
- **Credits / "Powered by":**
  - Privacy engine: **Nethermind privacy pool** (credit).
  - Bridge attestation: **Circle (CCTP)** — "on-ramp only; the bridge leg is public" (credit). Mark bridge integration "to-be-validated on testnet."
  - Network: Stellar.
- Links: docs, privacy policy, terms, source repo. Version + commit + network footer (ref Freighter version footer).

**States:** static. External links open new tab. No loading/empty/error beyond a dead-link fallback. The "unaudited" + "to-be-validated" tags are PERSISTENT, not dismissible.

---

## 17. Lock (manual lock action + locked state hand-off)

**Purpose:** immediately lock the wallet; clears in-memory keys; routes to Unlock. The exit point of this cluster.

**Borrow from:** Freighter Settings "Log Out" onClick (`signOut` → navigate) + `views/UnlockAccount/index.tsx` for the resulting locked screen ("Welcome back" + password unlock). Unlock screen itself belongs to the onboarding/unlock cluster — here we spec only the trigger + the hand-off contract.

**Layout & components:** Lock is a row in Settings root (screen 5) and (optionally) in the Home kebab. Tapping locks with no confirm (matches Freighter Log Out immediacy). The app transitions to the **locked** screen (out-of-cluster): "Welcome back" + password (or passkey if enabled) + Unlock.

**States:**
- **Trigger:** immediate; subtle "Locking…" transition.
- **Locked hand-off:** if passkey enabled, locked screen offers BOTH password and "Unlock with Face ID" (ties to screen 11). If passkey off, password only.
- **Auto-lock convergence:** auto-lock timer (screen 10) produces the SAME locked state — single locked screen for both manual + idle lock.
- **Error:** locking can't really fail; if key-clear fails, force-clear + log (never leave keys resident).
- **Pending-proof caveat (honest):** if a client-side proof is mid-generation when locking, warn "Locking will cancel an in-progress proof. Continue?" (proofs are in-memory) — ties to the pending-proof model.

**Mock data:** N/A (state transition).

---

## Cross-cluster dependencies / notes for the designer
- **Receive** (full QR + private/public dual-address) is a SEPARATE cluster; screen 4 only owns the *generate-new-address* entry + the account-vs-address explainer the list links to.
- **Unlock/onboarding** screens are a SEPARATE cluster; screen 17 hands off to them.
- **Pending vs Spendable** balance split is defined in the Home cluster; here it appears as the per-account row sub-line (screen 1) and the proving state in disclosure (screen 14).
- Everything labeled **Mocked** must be visually tagged in the prototype.
- Do not prescribe color/font — visual direction is intentionally free.

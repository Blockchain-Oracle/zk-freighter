# Screen cluster spec — Unlock + Home/Portfolio

> Product: **ZK Fighter** (brand locked). Privacy-by-default, self-custody zero-knowledge wallet for **shielded payments on Stellar**. Browser web app first.
>
> This cluster is the **emotional and conceptual anchor** of the product. The Home screen is where the privacy model gets taught every time the user opens the app — shielded balance is the hero, public balance is the small on-ramp, and the Pending-vs-Spendable split is how we make multi-second ZK proving feel honest instead of broken. Unlock is the daily gate.
>
> Visual direction (colors / type / shape language) is intentionally left free. This spec prescribes structure, copy, states, and behavior only.
>
> **Mock-data policy:** every number, address, and timestamp in this prototype is mocked; mark each surface with a small `MOCK` affordance per the prototype convention. ZK proving, sync, bridge attestation, and balance reads are all mocked integrations.

References used (grounded 1:1 where one exists):
- Unlock → `reference/freighter/extension/src/popup/views/UnlockAccount/index.tsx` + shared `components/EnterPassword/index.tsx`
- Home shell / header / kebab → `reference/freighter/extension/src/popup/views/Account/index.tsx` + `components/account/AccountHeader/index.tsx` + `AccountHeaderModal`
- Balance dual-number (total/available/reserved) → Freighter balance helpers + Stellar minimum-balance docs
- Shielded vs Spendable vs Pending → Zashi 2.0 "Spendable" component + RAILGUN "Pending Balance → Spendable" (Private POI)
- Empty / loading / "No transactions to show" / Notification scaffolding → Freighter `components/Loading`, `Notification`, `AccountHistory` empty state, `NotFundedMessage`

---

## Screen 1 — Unlock / Lock ("Welcome back")

### Purpose
The daily re-entry gate. The wallet auto-locks (idle timer / tab close / manual lock); on return the user proves they own this device-local vault with their password, or optionally Face ID. This screen NEVER touches the seed phrase and NEVER touches the network — it only decrypts the local vault. It must also be the honest escape hatch when someone is on the wrong device or lost their password.

Borrow from `UnlockAccount/index.tsx`: `View.Header` + shared `EnterPassword` body (identicon + title + description + password field + primary button) + `View.Footer` with two tertiary escape buttons.

### Layout & components
- **Header (minimal):** product wordmark/mark only. A small **network pill** (`TESTNET` / `MAINNET`) is visible even on the lock screen so the user never unlocks "blind" into the wrong network. The pill is read-only here (not a switcher).
- **Identity avatar:** deterministic identicon derived from the wallet (Freighter uses `IdenticonImg` keyed on the address). Here it is keyed on the **private address fingerprint**, not the raw G-account, so the lock screen visually matches Home. Subtle, decorative-but-functional (helps a user with multiple devices recognize "this is my privacy wallet").
- **Title:** "Welcome back".
- **Subtitle:** "Enter your password to unlock." (Borrowed pattern; we say "unlock" not "unlock Freighter" until brand lands.)
- **Account label (small, above or below identicon):** the wallet's nickname (e.g. "Personal") + a truncated **private-address** chip `zkf1q…7p4a` — NOT the G-account. Reinforces "this is your shielded identity" from the first second.
- **Password field:** masked, with a show/hide eye toggle. Single field (no confirm — this is unlock, not setup). Autofocus on load.
- **Primary button:** "Unlock" (full-width, disabled until field non-empty).
- **Optional Face ID button:** secondary button "Unlock with Face ID" — ONLY rendered if a passkey credential was registered for this wallet on this device (WebAuthn PRF). If present, it sits ABOVE the password field as the faster path, but the password field is always still visible underneath (never hide the primary seed-derived path). If no passkey, this control is absent entirely (not a disabled stub).
- **Footer escape hatches (tertiary, low-emphasis):**
  - Label line: "Lost your password, or on a new device?"
  - Button: "Restore from recovery phrase" → opens onboarding import flow.
  - Button: "Create a new wallet" → opens onboarding create flow.
  - These mirror Freighter's footer exactly in intent (recover / create) but reworded for our seed-primary model.
- **Honest microcopy footnote (small, dismissible-once):** "Your password unlocks this device only. It is not your recovery phrase and cannot restore your wallet." — teaches the password≠seed distinction the references flag (MetaMask: SRP is the single non-recoverable point of failure).

### States
- **Default / idle:** identicon + empty password field (autofocused) + disabled Unlock + Face ID button if available.
- **Typing:** Unlock button enables once the field is non-empty.
- **Submitting / decrypting:** Unlock button shows inline spinner + label "Unlocking…"; field + Face ID button disabled. Decryption of a local vault is fast (sub-second) — this is a brief state, NOT a proving state.
- **Error — wrong password:** field goes to error style, inline message "Incorrect password. Try again." Field is cleared and refocused. (Borrow Freighter `authError` selector pattern.) After **5** consecutive failures, show a soft cool-down note: "Too many attempts. Wait 30s or restore from your recovery phrase." (mocked timer) — this nudges toward the legit recovery path rather than locking the user out forever.
- **Face ID — in progress:** button shows "Waiting for Face ID…" with the platform biometric sheet (mocked overlay). 
- **Face ID — failed/cancelled:** silent fallback — collapse back to password field focused, small toast "Face ID cancelled — enter your password." NEVER block; the password path is always there.
- **Face ID — unavailable on this device:** the button is simply not rendered (a synced credential is required to return via passkey — state this once in onboarding, not here).
- **Success:** brief check/scale animation on the identicon, then route to Home (preserving any deep-link destination, as Freighter does via `location.state.from`).
- **Locked-by-timeout banner (first paint after auto-lock):** a one-line, dismissible top notice "Locked after inactivity for your privacy." Distinguishes an idle auto-lock from a fresh open.
- **Disabled:** Unlock disabled while field empty or while submitting.

### Interactions
- Enter key submits the password.
- Eye toggle reveals/masks password.
- Idle auto-lock (mocked at e.g. 5 min, configurable in Settings/Security) returns the user here.
- Footer buttons open onboarding in a fresh flow (Freighter opens a new tab; for the web app these are full-screen routes).
- Network pill is informational here; tapping it shows a tooltip "Switch networks after unlocking" (no switching on the lock screen — avoids changing context before auth).

### Mock data
- Wallet nickname: "Personal" · private-address chip `zkf1q9x…7p4a` · identicon seeded from that fingerprint.
- Network pill: `TESTNET`.
- Failed-attempt counter: in-memory mock, resets on success.

### Borrow from
`UnlockAccount/index.tsx` (whole structure: Header / EnterPassword / Footer with recover+create), `components/EnterPassword/index.tsx` (identicon + title + description + password field + submit, `authError` inline error), `IdenticonImg`. Face ID + lock-reason banner are net-new (no Freighter reference — invent from spec).

---

## Screen 2 — Home / Portfolio

### Purpose
The home base after unlock and the single most important teaching surface. It must, at a glance, communicate: (1) **you are private by default** — the big number is your shielded balance; (2) **only deposits/withdrawals are public** — a small "available to shield" number represents public funds; (3) **ZK proving takes time and that's normal** — the Pending-vs-Spendable split absorbs latency; (4) **what you can do right now** — Send / Receive / Add funds / Unshield. It is never a wall of identical asset cards: shielded balance is the hero, public balance is secondary, assets (XLM + USDC) are a compact breakdown, and recent activity is a short preview.

Borrow the shell from `Account/index.tsx`: `Loading` gate → `AccountHeader` (identicon + name + network + kebab) → hero content → action row → activity preview. Strip everything in the DO-NOT-COPY list (no Swap action, no NFT tab, no Discover sheet, no token-management, no buy/sell).

### Layout & components (top → bottom)

**A. Account header** (from `AccountHeader`)
- Left: identicon (private-address fingerprint) + wallet nickname ("Personal"). Tapping opens the account/options menu.
- Center/Right: **network pill** `TESTNET` (tappable → network switch sheet; persistent and unmissable per references). On `MAINNET` the pill carries a small lock glyph if privacy is gated (see "mainnet-gated" state).
- Right: **kebab / "View options"** (Freighter `DotsHorizontal` → `AccountHeaderModal`). Menu items, re-scoped for us:
  - "Copy private address"
  - "Account details" (→ Receive screen with QR — both private + public)
  - "Settings"
  - "Lock wallet" (→ Screen 1) — replaces Freighter `signOut`.
  - (NO connected-apps, NO add-account-as-primary clutter; multi-wallet switching lives in the account menu but is not part of this cluster.)

**B. Hero — shielded balance (the headline)**
- Eyebrow label: "Shielded balance" with a small shield glyph and an **info `(i)`** that opens a one-paragraph explainer ("Shielded funds are private. Amounts and counterparties are hidden on-chain. Only deposits in and withdrawals out are public.").
- **Primary number:** total shielded value, large. Show as a combined value with a currency selector affordance is OUT of scope (no price charts/analytics per DO-NOT-COPY) — instead show **per-asset shielded amounts** (XLM + USDC) as the truth, with USDC as the primary line and XLM secondary, OR a single "private balance" composed of both with a small breakdown toggle. (Designer's call on composition; do NOT invent a fiat total with live pricing.)
- **Privacy peek toggle (eye):** hide/blur the balance digits (shoulder-surf protection — a privacy wallet should let you blank the hero). Persists per session.
- **The Pending-vs-Spendable split (critical):** directly under the hero number, two clearly distinct sub-values:
  - **Spendable** — "Ready to send" — funds with a completed proof/POI. (RAILGUN: "can be spent with no limitations." Zashi: "Spendable".)
  - **Pending** — "Proving… / confirming" — funds awaiting a client-side proof or chain confirmation, with the count and an ETA. Tappable → opens a status sheet explaining what's pending and the best next action (Zashi tappable status-banner pattern).
  - When Pending is zero, collapse it to a single quiet line or hide it (no empty scary "0 pending").

**C. Secondary — public / available-to-shield**
- A smaller, visually subordinate card: "Available to shield (public)" with the public Stellar account's XLM + USDC.
- Honest label + `(i)`: "These funds sit on your public Stellar account. They're visible on-chain until you shield them."
- Inline **"Shield" call-to-action** on this card (one tap → Shield flow) — this is the Zashi "shield before spend" / one-tap-shield pattern. If public balance is zero, the card becomes a thin "Add funds to get started" prompt instead.
- **Reserved-balance footnote** (Stellar reality): if public XLM is near the minimum, show "Reserved: 1.5 XLM* — Stellar accounts keep a minimum balance." with a Learn-more. The +0.5 XLM USDC trustline reserve is surfaced here as a cost line, but the word "trustline" never appears (handled invisibly).

**D. Primary action row** (4 actions, equal-weight icons + labels; NOT a card grid)
- **Send** — private send from shielded balance (default action). Disabled with reason if Spendable is 0 (tooltip: "No spendable funds yet — wait for proving to finish or add funds").
- **Receive** — opens Receive (private address + public address, "same wallet").
- **Add funds** — opens the Add-funds area (Receive-to-shield, plus the **Bridge** on-ramp; bridge marked "to-be-validated on testnet").
- **Unshield** — withdraw shielded → public Stellar address. Carries a subtle "reveals info" hint dot; the leak warning lives in the flow itself. Disabled with reason if Spendable is 0.
- (Explicitly NO "Swap" — that slot does not exist.)

**E. Recent activity preview**
- Section header "Activity" + "See all" → full Activity screen.
- Up to ~4 most-recent rows. Row anatomy (re-scoped from `AccountHistory`):
  - Icon/type: Shielded send (private), Shielded receive (private), Shield (public→private), Unshield (private→public), Bridge-in.
  - Title + your-side amount (your own decrypted amount; counterparty hidden for private rows — "only reveals a transaction legitimately happened").
  - Status chip: **Spendable / confirmed**, **Pending (proving)**, **Pending (confirming)**, **Bridging** (multi-step), **Failed/Expired**.
  - Public rows (Shield / Unshield / Bridge-in) carry a small "Public" tag — honest that these legs are visible.
- Newly-sent items appear at the top in a pending state and are visibly marked (Zcash checklist: "visibly mark newly sent transactions in a pending state").

### States (Home)
- **Loading (first paint):** `Loading` gate from Freighter — skeletons for hero number, split, public card, and activity rows. Network pill renders immediately (it's local config). Do not show a frozen full-screen spinner; skeletons only.
- **Syncing / catching up:** a thin top status banner "Syncing your private balance…" with progress (Zashi visible sync progress). Hero shows last-known values dimmed with a "syncing" shimmer; actions that depend on fresh state (Send/Unshield) show "Available after sync" if sync is materially behind.
- **Pending-proof (the signature state):** when one or more notes are mid-proof, the **Pending** sub-value is non-zero and animated (a calm progress indicator, NOT a spinner-of-doom), with ETA "~30s remaining" (desktop) and copy "Keep this tab open while your proof finishes." Tapping opens the status sheet listing each pending item + its stage (Building proof → Submitting → Confirming → Spendable). This is how seconds-to-minutes latency is made honest.
- **Empty / first-run (no funds yet):** friendly empty state, not an error (borrow `NotFundedMessage` tone). Hero shows "0.00" shielded with copy "No shielded funds yet." Body: "Add funds privately to get started — deposit USDC or XLM, then shield it in one tap." Primary CTA "Add funds". Secondary "Show my addresses" (Receive). Teaches the deposit→shield two-step honestly. The public card, if also zero, folds into this single empty state.
- **Public funds present but nothing shielded yet:** hero is 0 shielded, but the public card shows a balance with a prominent "Shield now" CTA and a teaching line "You have public funds — shield them to make them private." (shield-before-spend).
- **Balance hidden (privacy peek off):** hero digits replaced with dots `••••`, split and public values also masked; an eye-with-slash icon and "Tap to reveal." State persists for the session.
- **Error — balance/indexer read failed:** inline `Notification` (Freighter pattern), non-destructive: "Couldn't refresh your balance. Showing last known values." + Retry. Last-known values stay visible and dimmed; actions remain available if last-known Spendable > 0 (with a caution note).
- **Error — proof generation failed (surfaced from a flow):** if a proof failed, the related Pending item flips to a "Failed" chip in both the split sheet and Activity, with "Retry proof" — never silently disappears.
- **Mainnet-gated (privacy disabled on mainnet today):** when network = `MAINNET` and the privacy pool isn't deployed, show a banner under the header: "Private transfers are testnet-only for now. On mainnet you can hold and move public funds, but shielding is disabled." Shield/Unshield/private-Send actions are disabled-with-reason; Receive (public) and the public card stay active. Plain transfer stays available. (Network references: gate mainnet with a clear reason; don't pretend.)
- **Network just switched:** brief reload of balances (skeleton on hero + split) and a toast "Switched to Testnet." Activity list reloads for the new network.
- **Disabled actions summary:** Send/Unshield disabled when Spendable = 0 (reason tooltip) or on mainnet-gated. Shield disabled when public balance = 0 (becomes "Add funds" prompt instead).
- **Success (post-action return):** returning from a completed Shield/Send/etc. shows a success toast and the new item at the top of Activity in its correct pending/spendable state; the split updates (e.g. Pending +amount).

### Interactions
- Pull-to-refresh / refresh control re-reads balances (mocked latency).
- Tapping **Pending** opens the status sheet (per-item stages + ETA + "keep tab open").
- Tapping the hero `(i)` or public-card `(i)` opens concise privacy explainers (each screen teaches the model).
- Privacy-peek eye toggles balance visibility for the session.
- Action row routes into the four flows (out of this cluster's scope beyond entry).
- Kebab → Copy private address (toast "Private address copied"), Account details, Settings, Lock.
- Network pill → network switch sheet (single testnet/mainnet toggle; no custom RPC).
- "See all" → Activity. Activity rows → row detail.

### Mock data
- Wallet "Personal" · private addr `zkf1q9x…7p4a` · public Stellar `GA3D…7AOO`.
- Shielded: **USDC 1,240.50** + **XLM 85.000** → Spendable USDC 1,200.00 / XLM 85.000; **Pending USDC 40.50** ("Proving… ~28s").
- Public (available to shield): **USDC 50.00** + **XLM 12.5** (Reserved 1.5 XLM*).
- Activity preview (4): 
  1. Shielded send · −25.00 USDC · Pending (proving)
  2. Shield · +200.00 USDC · Public · Confirmed
  3. Shielded receive · +75.00 USDC · Spendable
  4. Bridge-in · +100.00 USDC · Public · Bridging (Circle attesting, ~minutes)
- Network: `TESTNET`. Sync: 100% (toggle a "syncing 64%" mock for that state).

### Borrow from
`Account/index.tsx` (Loading gate → header → content → activity composition; `Notification` error pattern; `reRouteOnboarding` guard), `AccountHeader/index.tsx` + `AccountHeaderModal` (identicon + name + network pill + kebab menu — re-scope items to Copy private address / Account details / Settings / Lock), Freighter balance helpers + Stellar minimum-balance docs (total vs available vs reserved + footnote), `AccountHistory` row + "No transactions to show" empty pattern, `NotFundedMessage` (friendly unfunded tone for first-run). Net-new (invent from spec): the shielded-hero, the Spendable/Pending split + status sheet, the public "available to shield" card with one-tap Shield, the four-action row (Send/Receive/Add funds/Unshield), pending-proof animation, mainnet-gated banner.

---

## Cross-cutting notes for the designer
- **Teach on every screen:** each `(i)`, each label, each disabled-reason is a chance to reinforce "private by default, public only at the edges." Never claim "fully private" or "anonymous" — say "shielded," and call public legs public.
- **Honest pending, never frozen:** the Pending-vs-Spendable split is the product's core UX bet. Treat proving as a first-class, calm, time-estimated state — never a generic spinner.
- **Two addresses, one wallet:** the lock screen and home both lead with the **private** address/fingerprint; the public G-account is plumbing, surfaced only where deposits happen.
- **Mark all mocks:** balances, activity, sync %, bridge progress, and Face ID are mocked — flag them per prototype convention.
- **Do not introduce** swaps, fiat buy/sell, NFT, multi-chain/custom-RPC, dApp-connect, hardware wallet, token import, custom gas, staking, or price charts — none appear in this cluster.

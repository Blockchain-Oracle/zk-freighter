# Redesign Design-Map — screen → v2 source

**Authoritative design source (v2):** `/Users/abu/Downloads/GitHub repository link(2)/`
(DesignContext `*.dc.html` files at the directory root. The path has a space + parens — quote it in shell: `"/Users/abu/Downloads/GitHub repository link(2)/ZK Freighter Desktop.dc.html"`.)

**How to use this file:** before building any chunk, open the listed `.dc.html` and read the named screen. Never hold the whole design in context — re-ground per chunk. The `.dc.html` is a sequence of labelled screens (root `data-screen-label`s); HTML is *reference only*, never copied — reimplement in React + the shared `packages/ui` components.

**Canonical token source:** `ZK Freighter Design System.dc.html` (resolve any cross-file token drift to its values — `--bg #0C0D0F`, `--tx2 #A6ABB4`, `--tx3 #878D98` [legibility floor], `--bd .08/.14`, `--ac #5E7CFA`, `--pub #8A93A2`; full light theme).

---

## Web (`apps/web`)

| Screen / flow | v2 file | Notes |
|---|---|---|
| Onboarding (Welcome→Recovery 12-word→Vault pw+passkey+strength→Ready) | `Onboarding HiFi.dc.html` | floating panel; reuse core create/unlock/derive |
| Home (sidebar incl. **Discover**, hero crossing-strip Shield/Unshield/Bridge, frosted ShieldedCard flip→Notes, amber PublicCard, quick actions, activity preview) | `Desktop.dc.html` | sidebar nav now aligned w/ Flows |
| Send (Compose→Review→Proving **5-phase** ring→Sent; +Failed/Unconfirmed cards) | `Send.dc.html` | the canonical proving ring lives here |
| Unshield (REVEALS-INFO red badge, public-dest warning, ack checkbox, destructive btn) | `Desktop Flows.dc.html` | tab on the Shield screen |
| Shield (Shield/Unshield tabs, asset toggle, Max, "Pending→Spendable", PUBLIC BOUNDARY) | `Desktop Flows.dc.html` | |
| Receive (Private code / Public address tabs, QR, "Make discoverable") | `Desktop Flows.dc.html` | QrCard |
| Bridge (source chips, derived Base funding addr+balance, 4-step EventStepTracker, **resume**, mainnet guard) | `Desktop Flows.dc.html` | |
| Disclosure (Create proof / Verify tabs, note picker, JSON receipt, green checks) | `Desktop Flows.dc.html` | READ-ONLY PROOF badge |
| Discover (Make discoverable + **Find a code** lookup → Pay) | `Desktop Flows.dc.html` | |
| Confidential (balance+merge-to-spend, Transfer/Deposit/Withdraw tabs, mainnet-blocked) | `Desktop Flows.dc.html` | migrate proving → ProvingRing |
| Activity (4 chips All/Shielded/Public/**Pending**, live PROVING/PENDING/BRIDGING rows, boundary labels) | `Desktop Flows.dc.html` | click-row detail = self-fill |
| Settings (Account, Security passkey+browser-check, Preferences network/**appearance**, **Developer · Demo evidence FOR JUDGES**, Lock) | `Desktop Flows.dc.html` | |

## Mobile (`apps/mobile`)

| Screen / flow | v2 file | Notes |
|---|---|---|
| Home (swipeable card stack shielded/public, 4 action tiles [Send=filled primary], activity preview, bottom tab bar) | `Mobile Home.dc.html` | |
| Send + result states (Sent / Unconfirmed "safe to close" / Failed "funds didn't move") | `Mobile Flows.dc.html` ROW 6 | |
| Proving sheet (**5-phase** ring) | `Mobile Flows.dc.html` ROW 6 | **ignore** the residual 3-phase sheet in ROW 3 |
| QR **Scan-to-pay** (scanning/permission/blocked/detected → prefill Send) | `Mobile Flows.dc.html` ROW 4 | add a not-found fallback → "Paste code" |
| **More** overflow menu (Send/Receive/Bridge/Disclosure/Confidential/Discover/Settings/Lock, boundary-badged) | `Mobile Flows.dc.html` ROW 5 | |
| Unlock / Locked | `Mobile Flows.dc.html` ROW 8 | |
| Bridge + **resume** (paste burn hash, mainnet guard) | `Mobile Flows.dc.html` ROW 1 + ROW 8 | |
| Shield/Unshield bottom sheets, Disclosure, Confidential, Activity (**add Pending chip**), Settings, Dev-evidence (standalone, ROW 7) | `Mobile Flows.dc.html` | tab bar Home·Activity·Receive·Settings + More |

## Extension (`apps/extension`)

Scope: **popup = fast glance**, **400px side panel = full parity (heavy flows)**. The only thing "fails closed" is acting as an external-dApp signer (presentational card).

| Surface / screen | v2 file | Notes |
|---|---|---|
| Popup: Unlock, Home (Shielded\|Public toggle, frosted balance, PublicCard, QuickShield presets, action list, Recent), QuickShield review/custom/done, Receive, Public view, Settings | `Extension Popup.dc.html` rows 1–3 | 360px `.pop` |
| Side panel: **Send**, **Unshield** (REVEALS-INFO ack), full **Activity** (4 chips + live rows) | `Extension Popup.dc.html` side-panel ROW 4 | 400px |
| Side panel: **Disclosure**, **Discover lookup** | `Extension Popup.dc.html` side-panel ROW 5 | |
| Side panel: Bridge (4-step + resume), **Proving** (5-phase), Confidential, Workspace ("STAYS OPEN ACROSS TABS"), **Signing-disabled / FAILS CLOSED** card | `Extension Popup.dc.html` | proving runs in offscreen |

## Shared / deferred

| Item | v2 file | Notes |
|---|---|---|
| Tokens (dark+light), components, motion keyframes | `Design System.dc.html` | **canonical** |
| Marketing landing | `Landing.dc.html` | **DEFERRED** (later task) |
| Lo-fi exploration / extra states | `Wireframes.dc.html` | reference only; mostly superseded by hi-fi |
| (empty stub / runtime) | `Canvas.dc.html`, `support.js` | not content |

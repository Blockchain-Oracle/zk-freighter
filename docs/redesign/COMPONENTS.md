# Reusable Component Catalog (`packages/ui`)

**Rule:** ONE component per pattern, shared across web/extension/mobile. No per-surface re-coding — surfaces differ only via props (`size`, `variant`, layout wrappers). If you're about to write a card/badge/pill/ring inline in a screen, it belongs here instead. Props stay stable for screens that already pass them (`AmountInput`, `AssetSelector`, `ProvingRing`, `ProofStepList`, `Callout`, `BoundaryBadge`, `StatusPill`, `Card`, `Button`, `ReviewCard`).

All components are themed via CSS-var tokens (resolved through the `ThemeProvider` div) + Tailwind utilities mapped in `theme.css` (`@theme inline`). Keyframes are defined once in `theme.css`.

## Tokens (canonical = `Design System.dc.html`)
Dark: `--bg #0C0D0F · --panel #141519 · --card #1A1C22 · --card2 #202329 · --tx #F3F4F6 · --tx2 #A6ABB4 · --tx3 #878D98 (floor) · --bd rgba(255,255,255,.08) · --bd2 .14 · --ac #5E7CFA · --ac2 #9AA6FF · --pos #35C77B · --warn #E5B45C · --dng #E5675C · --pub #8A93A2`.
Light: `--bg #F5F6F8 · --panel #FFFFFF · --card #EEF0F4 · --tx #14151A · --tx2 #565C68 · --tx3 #7A8290`, accent constant.
Fonts: `--font-sans` Hanken Grotesk (human), `--font-mono` IBM Plex Mono (numbers/addresses/codes/timings). Radii: cards ≤22px, buttons 12px, fields 11–13px, badges full pill. Primary buttons carry a periwinkle glow.

## Motion keyframes (in `theme.css`, respect `prefers-reduced-motion`)
`zkSheen` (shielded card sweep) · `zkPulse 1.6s` (pending/proving dot, stops on resolve) · `zkSpin .8s` (active step spinner) · `zkSheetUp .4s` (mobile sheet) · `zkPop` (success check) · `zkRise`/`zkFloat` (entrances, `cubic-bezier(.5,1.2,.5,1)`) · `zkScanline`/`zkReticle` (QR scan). Card cross-dissolve `.35s`.

## Catalog

### Inputs & controls
- **Button** — `variant: 'primary'|'secondary'|'ghost'|'danger'|'tertiary'`, `loading` (Spinner), `icon?`. primary=`.prim` filled accent+glow; danger=`.prim.dng` (`--dng`, used by Unshield).
- **Segmented** — generic n-segment control `{options,value,onChange,size?}`. 2-up (Shielded|Public, USDC|XLM, Create|Verify, Light|Dark, Testnet|Mainnet) and 3-up (Transfer|Deposit|Withdraw). `AssetSelector` = thin wrapper.
- **AmountInput** — big centered mono value + asset + caption + `Max`; optional `presets?: string[]` + `onPreset`.
- **Chip** — `{label,active?,onClick?}` for filters (All/Shielded/Public/Pending), chain selector, amount presets.
- **Toggle** — iOS switch (passkey/appearance). **Checkbox** — `.ck` incl. red variant (Unshield ack, onboarding "I've saved my phrase").
- **PasswordStrength** — 4-segment meter + label.

### Cards & surfaces
- **Card** — bordered `bg-card` container.
- **ShieldedCard** — frosted periwinkle gradient + hatch + `zkSheen` sweep + `backdrop-blur`; `size` prop; **click-to-flip** (cross-dissolve) → Notes face (Note 01/02 w/ SPENDABLE/PENDING).
- **PublicCard** — amber dashed boundary card.
- **Callout** — `tone: 'info'|'warn'|'public'|'danger'|'shielded'`.
- **Sheet** — mobile bottom sheet (radius 26px, grabber, `zkSheetUp`); render **in-tree** (no body portal) so theme vars inherit.
- **QrCard** — white rounded box + QR (`qrcode.react`) + center logo coin.

### Status & boundary
- **StatusPill** — `SPENDABLE | PENDING(zkPulse) | BRIDGING | CONFIRMED | PROVING(zkPulse)`; dot + glow.
- **BoundaryBadge** — `kind: 'shielded'(◇)|'public'(👁 amber)|'reveals-info'(red)|'both-public'|'read-only'|'confidential'|'testnet'|'neutral'`, `size` prop. Mapping: Send→SHIELDED · Shield/Discover→PUBLIC BOUNDARY · Unshield→REVEALS INFO · Bridge→BOTH ENDS PUBLIC · Disclosure→READ-ONLY PROOF · Confidential→CONFIDENTIAL.
- **NetworkPill** — testnet/mainnet dot.
- **Pill** — generic small status dot+label (SYNCED, etc.).

### Proving & activity (load-bearing, shared across all surfaces)
- **ProvingRing** — determinate SVG arc `viewBox 0 0 120 120`, `r=52`, `stroke-dasharray 327`, `stroke-dashoffset = 327 - 327*pct/100`, drop-shadow glow; big `%` + "PROVING". Props `{progress,label,sublabel,state}`.
- **ProofStepList** — the **5 canonical phases**: `Syncing pool state(→12) · Building proof inputs(→30) · Generating ZK proof(→90) · Submitting to Stellar(→99) · Confirming(→100)`. Per-step `done(✓ pos) | active(zkSpin spinner) | todo(.4 opacity)`. Mobile may show 3 visually but the model is 5.
- **EventStepTracker** — Bridge vertical step list keyed to on-chain events: `Burn on Base ✓ → Circle attestation (zkSpin, ~1 min) → Mint on Stellar → Shield arrived`; per-step done/active/pending + optional hash/time-hint subrow. Distinct from ProvingRing (no ring/%).
- **ActivityRow** — icon circle + title + mono timestamp + right amount + StatusPill + BoundaryBadge; clickable → detail sheet (txHash/explorer/stage — self-fill). Backed by the `ActivityStore` (F4).

### Navigation & chrome
- **AccountSwitcher** — avatar + label + truncated `zkf1…`/`G…` + chevron menu.
- **Nav** — sidebar (web, 236px, active = periwinkle gradient + 2.5px left bar) + bottom-tab (mobile, 4 slots + More).
- **ScreenHeader** — back + title + boundary badge / SYNCED pill.
- **ReviewCard / ReviewRow** — labelled review rows for confirm steps.

### Utilities (non-visual)
- `truncateMiddle` (single source — drop the app-helpers copy), `cn` class-merge helper.

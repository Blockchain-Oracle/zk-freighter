# Prompt For Designer / Design Agent

You are designing **ZK Freighter**, a privacy-by-default Stellar wallet for shielded XLM and USDC payments.

## Source Of Truth

Use the GitHub repository as the source of truth:

- Repo: `https://github.com/Blockchain-Oracle/zk-freighter`
- Branch: `main`

Before doing design work, inspect the repo through the GitHub connector. If your environment allows cloning, clone it locally and inspect it directly:

```bash
git clone https://github.com/Blockchain-Oracle/zk-freighter.git
cd zk-freighter
git checkout main
```

If you can clone locally, prefer local code search after cloning. If you cannot clone, use the GitHub connector to browse files, search code, inspect directories, and read docs.

Do not rely on memory, screenshots, or a stale pasted summary. Check the GitHub repo first and verify what exists now.

## Important Warning About Current UI

Do **not** take visual inspiration from the current ZK Freighter UI.

The current web app and extension UI are functional proof/evidence scaffolds. They prove flows, evidence, and integration boundaries, but they are not the desired visual direction. You may inspect the current UI source only to understand product flows, states, and data requirements.

The redesign should be high-quality wallet UX, not a restyle of the current app.

## Required Project Read Order

Start with these if they exist in GitHub:

1. `AGENTS.md`
2. `README.md`
3. `.thoughts/design/brief.md`
4. `.thoughts/design/2026-06-25-designer-brief-v2.md`
5. `.thoughts/wiki/wallet-design-references.md`
6. `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
7. `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`
8. `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`
9. `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`
10. `.thoughts/research/2026-06-25-mainnet-readiness.md`
11. `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`

If the `.thoughts/design/*` handoff files are not present on GitHub, ask Abu to provide them or use the pasted handoff content from this session. Do not invent missing product facts.

## Code To Inspect

Inspect these files to understand real flows and state:

- `apps/web/src/App.tsx`
- `apps/web/src/WalletFlowPanels.tsx`
- `apps/web/src/BridgePanel.tsx`
- `apps/extension/src/ExtensionApp.tsx`
- `apps/extension/src/ExtensionQuickShieldPanel.tsx`
- `apps/extension/src/ExtensionBridgePanel.tsx`
- `packages/core/src/receive-code.ts`
- `packages/core/src/networks.ts`

Use code inspection for product reality only. Do not copy the current visual structure.

## Product Surfaces To Design

Design across three surfaces:

- **Web app**: primary full wallet experience.
- **Browser extension**: compact companion for receive, QuickShield, and bridge handoff.
- **Mobile app**: future product direction if time allows.

The web app should not start as a marketing landing page. The first useful screen after unlock should feel like the wallet product.

## Core Flows To Cover

Cover these flows in the design:

- Create wallet.
- Import wallet.
- Save and confirm seed phrase.
- Optional passkey/device unlock convenience.
- Unlock and lock.
- Home with shielded funds, public funds, Pending, Spendable, and recent activity.
- Receive private `zkf1...` code.
- Receive public Stellar `G...` deposit address.
- Copy and QR states.
- Camera scanner and paste fallback.
- Send shielded transfer to `zkf1...`.
- Shield/deposit XLM.
- Shield/deposit USDC.
- Unshield/withdraw to public `G...` address.
- Bridge public USDC, track bridge progress, then prompt separate shield/deposit.
- Proof generation progress.
- Transaction confirmation progress.
- Activity/history list and detail.
- Public explorer links only for public boundaries.
- Disclosure/export flow for auditor review.
- Settings: seed phrase, passkey, network, security, lock.

## Address And State Rules

Preserve these details:

- Private receive code: raw Bech32m `zkf1...`.
- Public Stellar address: `G...`.
- Contract IDs: `C...`.
- Ethereum addresses and hashes: `0x...`.
- Assets: XLM and USDC only.
- Networks: Stellar testnet and Stellar mainnet via config.
- Seed phrase is the default recovery path.
- Passkey is optional convenience only, not recovery.
- Use "shielded transfers".
- Shield/deposit, unshield/withdraw, and bridge arrival are public boundaries.
- Do not claim the product is anonymous, fully private, or untraceable.
- Do not use "registry" in primary UX copy; use plain language such as "Make my private code discoverable".

## Extension Boundary

The extension is not a general public dApp signing wallet.

Design it as:

- Receive code QR/copy.
- QuickShield XLM/USDC.
- Bridge handoff to web.
- Runtime/proof readiness only when useful.
- Fail-closed dApp status if surfaced.

Do not design active Freighter-compatible public signing, external public-key access, Soroban auth signing, or arbitrary dApp signing unless Abu explicitly changes the product decision.

## Bridge Boundary

Bridge is a safe two-step flow:

1. Public CCTP bridge arrival.
2. Separate shield/deposit into ZK Freighter.

Atomic bridge-and-shield is deferred and must not be designed as a normal MVP mode.

Bridge progress should show clear stages:

- Ethereum approval.
- Ethereum burn.
- Circle attestation.
- Stellar mint/forward.
- Public USDC arrival.
- Shield prompt.
- Shield/deposit progress.
- Spendable.

## External Wallet References

Use the reference wiki and source index for exact links. Prioritize:

- Stellar-specific: Freighter, xBull, LOBSTR Signer/Vault, Albedo.
- Extension confirmation/risk UX: Rabby, MetaMask, Rainbow, Backpack, Taho, Zerion.
- Web/mobile wallet structure: Safe, Uniswap Wallet, Rainbow, MetaMask, OneKey, Ambire.
- Privacy wallet flows: Zodl/Zashi, Railway, RAILGUN, Penumbra/Prax, Brume, Cake, Zingo.
- Mobile scanner and confirmation patterns: Rainbow, Phantom, Coinbase/Base, Cake, Zodl/Zashi, Daimo.
- Bridge status references: LI.FI, Relay, Bungee, MetaMask bridge, Rainbow/Uniswap bridge surfaces.

If possible, inspect open-source wallet repos through GitHub too. The goal is wallet UI synthesis from strong references, not copying ZK Freighter's current UI.

## Creative Direction

You own the visual system:

- Color.
- Typography.
- Layout.
- Motion.
- Illustration.
- Components.
- Interaction patterns.

Do not ask the engineering agent for colors. Use the wallet research and product flows to create the visual direction.

## Expected Output

Produce a design plan or prototype brief that includes:

- Information architecture for web, extension, and mobile.
- Screen list for each surface.
- User flows for onboarding, receive, send, shield, unshield, bridge, activity, disclosure, and settings.
- Key states for empty/loading/syncing/pending/error/success/locked/network-switched/clipboard-failed/camera-denied.
- Component and interaction recommendations.
- Motion/transition recommendations where they improve trust and comprehension.
- Mobile-specific scanner and confirmation pattern.
- Extension-specific popup and side-panel model.
- Notes about what must remain honest, public, or explicitly disclosed.

Do not produce a generic crypto dashboard. Do not add swaps, NFTs, staking, fiat buy/sell, token import, custom gas controls, arbitrary multi-chain management, dApp browser, or public dApp signing as MVP features.


# Designer Start Here: ZK Freighter

This is the handoff file to give a designer or design agent first. It links to the detailed brief, research synthesis, wallet reference wiki, raw source index, and local reference material.

## Read Order

1. `.thoughts/design/2026-06-25-designer-brief-v2.md`
   - The main product and UX brief.
   - Covers web, extension, possible mobile app, wallet flows, address formats, public/private boundaries, bridge states, proof states, activity/history, extension scope, mobile scanner/confirmation opportunities, non-goals, and open questions.
2. `.thoughts/design/designer-agent-prompt.md`
   - Copy-ready prompt for a designer or design agent that must work from the GitHub repo.
   - Tells the agent to inspect `https://github.com/Blockchain-Oracle/zk-freighter`, clone if possible, and avoid taking visual inspiration from the current UI.
3. `.thoughts/wiki/wallet-design-references.md`
   - The design reference wiki.
   - Maps each ZK Freighter screen or flow to source-inspectable wallets, visual references, and screenshot resources.
4. `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
   - The research synthesis.
   - Separates verified project facts, verified external wallet facts, inferences, unknowns, and things not included.
5. `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`
   - The raw URL and local file index.
   - Use this when looking for screenshots, repo code, extension listings, mobile app pages, bridge-status references, or wallet help docs.

## What To Design

Design ZK Freighter as a real wallet product, not a landing page first.

Primary surfaces:

- Web app: full product experience.
- Browser extension: compact companion for receive, QuickShield, and bridge handoff.
- Mobile app: future direction if time allows.

Core flows:

- Create/import wallet.
- Recovery phrase save and confirm.
- Optional passkey/device unlock convenience.
- Home with shielded funds, public funds, Pending, Spendable, and recent activity.
- Receive private `zkf1...` code and public `G...` address without confusion.
- Send shielded transfer to `zkf1...`.
- Shield/deposit XLM or USDC.
- Unshield/withdraw to public Stellar address with explicit public-boundary confirmation.
- Bridge public USDC, track CCTP stages, then prompt separate shield/deposit.
- Activity/history with public explorer links only where public.
- Disclosure/export flow for auditor-style review.

## Reference Paths

Current ZK Freighter UI source to inspect:

- `apps/web/src/App.tsx`
- `apps/web/src/WalletFlowPanels.tsx`
- `apps/web/src/BridgePanel.tsx`
- `apps/extension/src/ExtensionApp.tsx`
- `apps/extension/src/ExtensionQuickShieldPanel.tsx`
- `apps/extension/src/ExtensionBridgePanel.tsx`

Core protocol details to inspect:

- `packages/core/src/receive-code.ts`
- `packages/core/src/networks.ts`

Local reference material already in the repo:

- `reference/screenshots/freighter/freighter-landing-hero.png`
- `reference/screenshots/freighter/freighter-landing-full.png`
- `reference/freighter/extension/src/popup/views/`
- `reference/freighter/extension/e2e-tests/*-snapshots/`
- `reference/xbull-wallet/src/app/`
- `reference/xbull-wallet/src/extension/`

## External UI References

Start with these for wallet UI synthesis:

- Stellar-specific: Freighter, xBull, LOBSTR Signer/Vault, Albedo.
- Extension confirmation/risk UX: Rabby, MetaMask, Rainbow, Backpack, Taho, Zerion.
- Web/mobile wallet structure: Safe, Uniswap Wallet, Rainbow, MetaMask, OneKey, Ambire.
- Privacy wallet flows: Zodl/Zashi, Railway, RAILGUN, Penumbra/Prax, Brume, Cake, Zingo.
- Mobile scanner and confirmation patterns: Rainbow, Phantom, Coinbase/Base, Cake, Zodl/Zashi, Daimo.
- Bridge status references: LI.FI, Relay, Bungee, MetaMask bridge, Rainbow/Uniswap bridge surfaces.

The exact links are in `.thoughts/wiki/wallet-design-references.md` and `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`.

## Product Truths To Preserve

- Use "shielded transfers".
- Shield/deposit, unshield/withdraw, and bridge arrival are public boundaries.
- Private receive code is raw Bech32m `zkf1...`.
- Public Stellar address is `G...`.
- Contract IDs are `C...`.
- Ethereum addresses and hashes are `0x...`.
- Assets are XLM and USDC only.
- Seed phrase is recovery.
- Passkey is optional convenience only.
- The extension is not a general public dApp signing wallet.
- Atomic bridge-and-shield is not a normal MVP mode.
- Do not imply mainnet shielded transfer, unshield/withdraw, or bridge-to-shield beyond recorded evidence.

## Creative Freedom

The designer owns color, typography, composition, motion, illustration, and component styling. The brief intentionally avoids color prescriptions. The hard constraints are product honesty, wallet usability, and avoiding fake evidence.

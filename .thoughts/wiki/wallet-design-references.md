# Wallet Design References

## Purpose

This page is the persistent wiki for ZK Fighter wallet design references. It tells a designer where to look for real wallet flows, source code, screenshots, and interaction patterns while preserving ZK Fighter's product boundaries.

Sources:

- Raw source index: `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`
- Research note: `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
- Designer handoff: `.thoughts/design/2026-06-25-designer-brief-v2.md`

## ZK Fighter Context To Preserve

- Product: ZK Fighter.
- Network: Stellar testnet/mainnet via config.
- Assets: XLM and USDC only.
- Privacy language: use "shielded transfers".
- Public boundaries: shield/deposit, unshield/withdraw, public bridge arrival.
- Default recovery: seed phrase.
- Passkey: optional convenience only.
- Private receive format: raw Bech32m `zkf1...` string with HRP `zkf`, not a Stellar URI.
- Web app exists now.
- Extension exists now as a QuickShield + receive + bridge handoff companion.
- Possible mobile app is future scope if time allows.
- Do not turn ZK Fighter into a general public dApp signing wallet unless Abu reverses the product decision.

## Start-Here References

1. Local ZK Fighter docs:
   - `README.md`
   - `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
   - `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
   - `.thoughts/research/2026-06-25-mainnet-readiness.md`
   - `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`
2. Local current UI source:
   - `apps/web/src/App.tsx`
   - `apps/web/src/WalletFlowPanels.tsx`
   - `apps/web/src/BridgePanel.tsx`
   - `apps/extension/src/ExtensionApp.tsx`
   - `apps/extension/src/ExtensionQuickShieldPanel.tsx`
   - `apps/extension/src/ExtensionBridgePanel.tsx`
3. Local visual/reference material:
   - `reference/screenshots/freighter/freighter-landing-hero.png`
   - `reference/screenshots/freighter/freighter-landing-full.png`
   - `reference/freighter/extension/src/popup/views/`
   - `reference/xbull-wallet/src/app/`
   - `reference/xbull-wallet/src/extension/`

## Open-Source Or Source-Inspectable References

| Reference | Surfaces | Inspect For | Source |
|---|---|---|---|
| Freighter | Stellar browser extension + mobile | Stellar extension onboarding, receive, send, settings, account switching, dApp request flow, compact extension layout, mobile split | https://github.com/stellar/freighter and https://github.com/stellar/freighter-mobile |
| xBull | Stellar extension, web/Ionic, mobile shells | Stellar operation review, account management, QR/export, advanced transaction handling, multi-surface code organization | https://github.com/Creit-Tech/xBull-Wallet |
| LOBSTR Signer / Vault | Extension + mobile handoff | Extension as signer companion to mobile wallet; mobile-mediated approve/reject; dApp connection without full wallet replacement | https://lobstr.co/signer-extension/, https://github.com/Lobstrco/lobstr-browser-extension, and https://github.com/Lobstrco/Vault-Android |
| Albedo | Web delegated signer | Web-based signer/keystore, app permission request mental model | https://github.com/stellar-expert/albedo |
| MetaMask | Extension + mobile | Seed onboarding, unlock, account activity, send/review/sign, extension confirmation conventions | https://github.com/MetaMask/metamask-extension and https://github.com/MetaMask/metamask-mobile |
| Rabby | Extension | Risk-forward transaction simulation, confirmation detail density, address labels, gas summary, dApp-provider confusion handling | https://github.com/RabbyHub/Rabby and https://support.rabby.io/hc/en-us/sections/11150568920591-Transactions |
| Rainbow | Mobile + extension | Polished consumer wallet IA, receive/send ergonomics, extension search/command menu, bridge affordances | https://github.com/rainbow-me/rainbow and https://github.com/rainbow-me/browser-extension |
| Uniswap Wallet | Web + mobile + extension | Persistent browser side panel, request queue, QR import, cross-surface wallet monorepo organization | https://github.com/Uniswap/interface and https://wallet.uniswap.org/ |
| Backpack | Extension + mobile | Compact multichain wallet shell, extension/mobile shared product feel, local dev extension structure | https://github.com/coral-xyz/backpack |
| Taho | Extension | Community wallet positioning, permission-first extension architecture | https://github.com/tahowallet/extension |
| Enkrypt | Extension | Multichain extension flows and account/network switching | https://github.com/enkryptcom/enKrypt |
| Zerion Extension | Extension | Cross-chain activity history, portfolio-plus-activity organization, security checks near transactions | https://github.com/zeriontech/zerion-wallet-extension |
| Ambire | Web wallet + extension | Account abstraction wallet UX, smart-account transaction review, web dashboard patterns | https://github.com/AmbireTech/extension and https://github.com/AmbireTech/wallet |
| OneKey | Extension, mobile, desktop, web | Cross-platform wallet shell, hardware/keyless onboarding, consistent multi-surface component system | https://github.com/OneKeyHQ/app-monorepo |
| Safe Wallet | Web + mobile | Serious web app transaction queue, multi-step confirmation, mobile/web monorepo structure, high-stakes status/history UI | https://github.com/safe-global/safe-wallet-monorepo |
| Coinbase Smart Wallet / SDK | Passkey smart wallet + SDKs | Passkey owners, multi-owner smart accounts, mobile/dApp connection patterns; not a production wallet UI source | https://github.com/coinbase/smart-wallet and https://github.com/coinbase/coinbase-wallet-sdk |
| Phantom SDK | SDKs | Embedded/injected wallet connection patterns; production wallet UI is visual-only, not source-inspectable | https://github.com/phantom/phantom-connect-sdk |
| Zodl/Zashi | Native mobile privacy wallet | Shielded balance language, one-click shielding, informed-choice privacy copy, no-tracking posture, mobile privacy payment UX | https://zodl.com/, https://github.com/zodl-inc/zodl-ios, https://github.com/zodl-inc/zodl-android |
| Railway Wallet | Desktop/web/mobile privacy wallet | Private DeFi wallet flows, 0zk receive/send, broadcaster/self-sign distinction, compliance posture | https://www.railway.xyz/ and https://github.com/Railway-Wallet/Railway-Wallet |
| RAILGUN Wallet SDK | SDK | Shielded balance, shield, private transfer, private contract interaction vocabulary | https://github.com/Railgun-Community/wallet |
| Penumbra Web + Prax | Web + extension privacy ecosystem | Shielded account extension plus web dApp split, seed phrase extension onboarding, private asset/activity patterns | https://github.com/penumbra-zone/web and https://guide.penumbra.zone/usage/web/prax |
| Brume | Web, extension, mobile packaging | Privacy-preserving network posture, browser/mobile packaging, source-available wallet app structure | https://github.com/brumeproject/wallet and https://wallet.brume.money/ |
| Nocturne | Historical MetaMask Snap + protocol | Private-account Snap pattern and proof-account mental model; historical reference only | https://github.com/nocturne-xyz/snap and https://github.com/nocturne-xyz/protocol |
| Daimo | Archived passkey/USDC mobile app | Passkey onboarding, payment-first USDC UX, mobile confirmation and activity patterns; archived reference | https://github.com/daimo-eth/daimo |
| Cake Wallet | Mobile/desktop privacy wallet | QR scanning, local notes, restore height, custom nodes, Tor/privacy settings, polished mobile wallet utility surfaces | https://github.com/cake-tech/cake_wallet |
| Zingo Mobile | React Native mobile privacy wallet | Shielded mobile wallet structure, sync/performance framing, mobile receive/send | https://github.com/zingolabs/zingo-mobile |

## Closed-Source Visual References

These are useful for product feel, app-store screenshots, and interaction inspiration, but not for code borrowing:

- Phantom: https://phantom.com/, Chrome Web Store, Google Play.
- Coinbase Wallet / Base app: Coinbase Wallet help docs and Base app Google Play listing.
- LOBSTR mobile wallet: https://lobstr.co/.
- Trust Wallet app: https://trustwallet.com/download.
- Zerion: https://zerion.io/.

## Screen Pattern Map

Use this map when the designer asks "what should I inspect for this screen?"

| ZK Fighter Screen Or Flow | Best References |
|---|---|
| Seed onboarding and recovery phrase | Freighter, MetaMask, Coinbase Wallet extension docs, Prax guide |
| Unlock and optional passkey | MetaMask mobile/extension, Zodl/Zashi, mobile OS wallet apps, ZK Fighter current passkey panel |
| Home / balance model | Zodl/Zashi shielded/transparent prompts, Railway private balances, Freighter account shell, Cake wallet home |
| Receive private code | Zodl/Zashi receive, Railway 0zk receive, ZK Fighter `zkf1...` code rules, Phantom/Coinbase receive QR docs |
| Receive public deposit | Freighter receive, xBull receive, Coinbase receive QR docs, LOBSTR wallet, Phantom network-selector receive |
| Send privately | Railway, RAILGUN SDK vocabulary, Zodl/Zashi send, MetaMask/Rabby/Rainbow review screens |
| Shield/deposit | Zodl one-click shielding, Railway shield, ZK Fighter QuickShield panels |
| Unshield/withdraw | Zodl transparent/shielded boundary copy, Railway withdrawal patterns, ZK Fighter docs on public boundary |
| Bridge tracking | Rainbow bridge, Uniswap wallet, MetaMask bridge, LI.FI/Relay status APIs, Coinbase/Base app bridge/onchain send surfaces, current ZK Fighter bridge panel |
| Activity/history | Freighter history, MetaMask activity, Zodl transaction list, Safe transaction queue/status, Zerion cross-chain history, Phantom history docs |
| Compliance/disclosure | Railway compliance copy, RAILGUN docs, ZK Fighter disclosure panel/spec |
| Extension popup | Freighter popup views, LOBSTR Signer extension, xBull extension, MetaMask/Rabby confirmations, Taho provider bridge |
| Extension side panel | Uniswap extension, Freighter side panel direction, Brave Wallet panel, current ZK Fighter extension side panel |
| Mobile scanner | Cake Wallet, Zodl/Zashi, Phantom, Coinbase Wallet mobile, Zingo, LOBSTR mobile |
| Mobile premium confirmation | Rainbow hold-to-send, Safe mobile, Coinbase/Base, Phantom, mobile banking patterns; use only for irreversible or public-boundary actions |

## Image And Screenshot Resources

Local images already in repo:

- `reference/screenshots/freighter/freighter-landing-hero.png`
- `reference/screenshots/freighter/freighter-landing-full.png`

Web pages with inspectable screenshots:

- Zodl/Zashi: https://zodl.com/ and https://f-droid.org/packages/co.electriccoin.zcash.foss/
- Rabby: https://rabby.io/ and https://support.rabby.io/hc/en-us/sections/11150568920591-Transactions
- Railway: https://www.railway.xyz/
- Rainbow: https://rainbow.me/
- Uniswap Wallet: https://wallet.uniswap.org/
- Zerion: https://zerion.io/
- Phantom: https://phantom.com/
- LOBSTR signer extension: https://lobstr.co/signer-extension/
- Safe: https://safe.global/

## Design Guardrails From The Research

- Do not design swaps, NFTs, staking, fiat buy/sell, token import, custom gas controls, dApp browser, or public dApp signing as core ZK Fighter features.
- Do not hide public boundaries to make the app feel more private.
- Do not show fake balances, hashes, bridge states, or proof success as if real.
- Do not make passkey look like recovery.
- Do not make the extension look Freighter-compatible unless the product decision changes.
- Do not use "registry" in primary UX copy. Use "Make my private code discoverable" or similar plain language.

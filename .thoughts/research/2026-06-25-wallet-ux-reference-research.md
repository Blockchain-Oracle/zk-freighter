# Reality Research: Wallet UX And Open-Source References For Design

## Scope

Research current wallet UX and open-source/code-inspectable references for ZK Freighter's redesign across three product surfaces: web app, browser extension, and a possible mobile app. The goal is to document current reality and inspiration sources for a designer, not to decide a visual direction or implement UI.

This pass is broad but not a claim to cover every wallet in existence. It prioritizes wallets that are useful for ZK Freighter's actual flows: seed onboarding, receive QR/copy, send/review/sign, pending states, bridge tracking, activity/history, privacy warnings, extension constraints, and mobile confirmation ergonomics.

## Sources Checked

Local project sources:

- `README.md`
- `.thoughts/specs/2026-06-22-zk-freighter-product-spec.md`
- `.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md`
- `.thoughts/quality/2026-06-22-project-quality-profile.md`
- `.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md`
- `.thoughts/handoffs/2026-06-22-codex-build-prompts.md`
- `.thoughts/research/2026-06-22-domain-model-and-ux-reality.md`
- `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`
- `.thoughts/research/2026-06-25-mainnet-readiness.md`
- `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`
- `.thoughts/design/2026-06-21-designer-brief.md`
- `.thoughts/design/2026-06-21-designer-prompt.md`
- `.thoughts/design/screens/*.md`
- `docs/START-HERE-concept.md`
- `docs/GLOSSARY.md`
- `packages/core/src/receive-code.ts`
- `packages/core/src/networks.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/WalletFlowPanels.tsx`
- `apps/web/src/BridgePanel.tsx`
- `apps/extension/src/ExtensionApp.tsx`
- `apps/extension/src/ExtensionQuickShieldPanel.tsx`
- `apps/extension/src/ExtensionBridgePanel.tsx`

Local reference sources:

- `reference/freighter/extension/src/popup/views/`
- `reference/freighter/extension/e2e-tests/*-snapshots/`
- `reference/screenshots/freighter/`
- `reference/xbull-wallet/src/app/`
- `reference/xbull-wallet/src/extension/`
- `reference/stellar-private-payments/`
- `reference/browser-wallet/`
- `reference/moonlight-sdk/`

External sources are indexed in `.thoughts/raw/2026-06-25-wallet-design-research-sources.md`. Key URLs used include Freighter, xBull, LOBSTR, Stellar Wallets Kit, Albedo, MetaMask, Rabby, Rainbow, Uniswap Wallet, Backpack, Taho, Enkrypt, Zerion, Ambire, OneKey, Safe, Zodl/Zashi, Railway, RAILGUN, Penumbra/Prax, Brume, Nocturne, Daimo, Cake, Zingo, Phantom, Coinbase Wallet/Base, Brave Wallet, LI.FI, Relay, Bungee, and Trust Wallet Core.

## Verified Facts

### ZK Freighter current product reality

- ZK Freighter is a privacy-by-default Stellar wallet for shielded XLM and USDC payments. It is not a general public wallet replacement. Source: `README.md`.
- The current repo has implemented a web app, a WXT MV3 extension scaffold, and shared core package. Source: `README.md`, `apps/web`, `apps/extension`, `packages/core`.
- The web app currently exposes wallet creation/import/unlock, raw `zkf1...` receive QR/copy, passkey panel, proof status, public discovery, disclosure, bridge, QuickShield, XLM/USDC private panels, tampered proof panel, and demo evidence panel. Source: `apps/web/src/App.tsx`, `apps/web/src/WalletFlowPanels.tsx`.
- The extension currently exposes runtime readiness, import/unlock/lock, private receive code copy, QuickShield, bridge handoff, and fail-closed dApp network/status behavior. Source: `apps/extension/src/ExtensionApp.tsx`, `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`.
- Current extension product boundary: receive, QuickShield, and bridge handoff companion. It is not a public dApp signing wallet, not Wallets Kit-ready, and external public-key access/signing intentionally fail closed. Source: `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`.
- Mainnet XLM/USDC pool deployment and extension QuickShield XLM/USDC shield/deposit evidence are recorded. Mainnet shielded transfer, unshield/withdraw, and bridge-to-shield still require separate evidence before claims. Source: `.thoughts/research/2026-06-25-mainnet-readiness.md`.
- Atomic bridge-and-shield is deferred. The safe product bridge is public CCTP bridge arrival followed by a separate USDC shield/deposit. Source: `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`.

### ZK Freighter address and network facts

- Private receive code is Bech32m HRP `zkf`, version `1`, max encoded length `180`, and payload is: version byte, network byte, 32-byte note public key, 32-byte encryption public key. Source: `packages/core/src/receive-code.ts`.
- Network byte `0` maps to testnet, byte `1` maps to mainnet. Source: `packages/core/src/receive-code.ts`.
- Testnet and mainnet network config includes passphrase, RPC URL, Horizon URL, explorer URL, XLM SAC, USDC issuer/SAC, XLM/USDC pool IDs, Circle CCTP Stellar contracts, Circle Iris URL, and Ethereum/Sepolia source config. Source: `packages/core/src/networks.ts`.
- Current configured pools:
  - testnet XLM pool `CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY`.
  - testnet USDC pool `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`.
  - mainnet XLM pool `CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE`.
  - mainnet USDC pool `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`.
  Source: `packages/core/src/networks.ts`.

### Stellar wallet references

- Freighter is a non-custodial Stellar browser extension. Its repo is Apache-2.0 and contains the extension, `@stellar/freighter-api`, docs, and shared packages. A separate Freighter mobile repo is also public. Sources: https://github.com/stellar/freighter and https://github.com/stellar/freighter-mobile.
- Local Freighter source is cloned in `reference/freighter`, and local Freighter landing screenshots exist under `reference/screenshots/freighter/`. These are the closest Stellar extension architecture and screen-structure reference already available in the repo.
- xBull is a Stellar extension wallet with source available under AGPL-3.0; its repo includes web, extension, Android, and iOS directories. It supports mnemonic/import, multi-wallet, different APIs, operation review, and a site SDK. Source: https://github.com/Creit-Tech/xBull-Wallet and `reference/xbull-wallet`.
- LOBSTR Signer Extension connects dApps to the LOBSTR mobile wallet for signing; its public page links to the Chrome extension and source code. Its repo is GPL-3.0 and includes a browser extension plus client-facing SDK. LOBSTR Vault Android is also public and useful for mobile-mediated approval patterns. Sources: https://lobstr.co/signer-extension/, https://github.com/Lobstrco/lobstr-browser-extension, and https://github.com/Lobstrco/Vault-Android.
- Albedo is an MIT-licensed Stellar delegated signer/keystore that stores sensitive data encrypted in the browser and lets apps request signing or identity verification. Source: https://github.com/stellar-expert/albedo.
- Stellar's wallet integration docs list Stellar Wallets Kit support for Albedo, Freighter, Hana, Ledger, Trezor, Lobstr, Rabet, WalletConnect, xBull, and HOT Wallet; the same docs point to Account Viewer source as a stripped-down wallet reference. Source: https://developers.stellar.org/docs/tools/developer-tools/wallets.

### Open-source extension and general wallet references

- MetaMask extension and mobile repositories are public and actively maintained. The extension supports Firefox, Chrome, and Chromium-based browsers; the mobile app is described as a mobile wallet for Ethereum-enabled websites. Sources: https://github.com/MetaMask/metamask-extension and https://github.com/MetaMask/metamask-mobile.
- Rabby repo describes Rabby as an open-source browser plugin for Ethereum/EVM DeFi and includes guidance around wallet-provider branding confusion when dApps detect the injected `ethereum` object. Source: https://github.com/RabbyHub/Rabby.
- Rainbow has separate public repos for mobile and browser extension. The mobile repo points to iOS, Google Play, and extension availability; the browser extension repo highlights send, bridge, swap, keyboard shortcuts, wallet search, and watch/impersonation modes. Sources: https://github.com/rainbow-me/rainbow and https://github.com/rainbow-me/browser-extension.
- Uniswap interface is a public monorepo that includes web, mobile, extension, wallet, and UI packages. The product and launch materials are useful for persistent browser side-panel patterns, QR mobile import, request queues, and cross-surface wallet consistency. Sources: https://github.com/Uniswap/interface, https://wallet.uniswap.org/, and https://blog.uniswap.org/uniswap-extension-is-now-available-for-everyone.
- Backpack repo is public and currently shows GPL-3.0 license. Its README includes local development and extension-install instructions, including `packages/app-extension`. Source: https://github.com/coral-xyz/backpack.
- Taho is a browser extension wallet with GPL licensing metadata and a public repo. Its README positions it as community-owned and extension-based. Source: https://github.com/tahowallet/extension.
- Enkrypt is a public browser wallet repo for Ethereum, Polkadot, Bitcoin, and related chains. Source: https://github.com/enkryptcom/enKrypt.
- Zerion wallet extension is a public extension repo. Its user docs and product materials are useful for cross-chain transaction history and portfolio-plus-activity organization. Sources: https://github.com/zeriontech/zerion-wallet-extension and https://help.zerion.io/en/articles/8245135-view-transaction-history.
- Ambire has public extension and web wallet repos. It is useful for account abstraction wallet UX, smart-account transaction review, and web dashboard organization. Sources: https://github.com/AmbireTech/extension and https://github.com/AmbireTech/wallet.
- OneKey's app monorepo is public/source-visible and spans extension, mobile, desktop, web, components, and core packages. It is useful as a cross-platform wallet shell reference, but license terms should be checked before reuse. Source: https://github.com/OneKeyHQ/app-monorepo.
- Safe Wallet monorepo is GPL-3.0 and houses web and mobile applications plus shared packages. It is the strongest open-source reference for a serious web + mobile wallet with large transaction confirmation surfaces. Source: https://github.com/safe-global/safe-wallet-monorepo.
- Coinbase Smart Wallet and Wallet SDK repos are MIT-licensed code references for passkey owners, multi-owner smart accounts, and wallet connection flows. They are not full production Coinbase Wallet UI source references. Sources: https://github.com/coinbase/smart-wallet and https://github.com/coinbase/coinbase-wallet-sdk.
- Phantom's Connect SDK is MIT-licensed and useful for embedded/injected wallet integration. No official full Phantom app UI source was verified in this pass. Source: https://github.com/phantom/phantom-connect-sdk.
- Brave Wallet is browser-native, not an extension. Brave developer docs state desktop WebUI/page/panel, Android native UI, and iOS native UI are front ends over a Brave Wallet interface. Sources: https://github.com/brave/brave-browser/wiki/Brave-Wallet-developer-information and https://support.brave.app/hc/en-us/articles/12747992885389-What-is-Brave-Wallet.

### Privacy wallet references

- Zodl/Zashi iOS and Android repos are MIT-licensed native Zcash wallet apps. The iOS README says it is the official home of the Zashi/Zodl Zcash iOS wallet leveraging the Zcash Swift SDK; Android leverages the Zcash Android SDK. Sources: https://github.com/zodl-inc/zodl-ios and https://github.com/zodl-inc/zodl-android.
- Zodl product page emphasizes complexity hiding, informed choice, shielded Zcash, no tracking, one-click shielding from transparent balances, and private shielded notes. Source: https://zodl.com/.
- Railway Wallet repo is AGPL-3.0 and describes a private DeFi wallet for Mac, Windows, Linux, web, iOS, and Android. Its product site says it is free, open-source, cross-platform, non-custodial, and supports zk-SNARK transactions through RAILGUN. Sources: https://github.com/Railway-Wallet/Railway-Wallet and https://www.railway.xyz/.
- RAILGUN Wallet SDK is an MIT-licensed TypeScript SDK for building wallets with shielded balances, shielding ERC-20/NFTs, private transfers, and private contract interactions. Source: https://github.com/Railgun-Community/wallet.
- Penumbra Web is a monorepo for Penumbra web apps and packages; Minifront is a dApp to swap, stake, and send on Penumbra testnet. Source: https://github.com/penumbra-zone/web.
- Prax Wallet guide says Prax is a Chromium browser extension for managing Penumbra account data, free and completely open source, with create/import seed phrase flows. Source: https://guide.penumbra.zone/usage/web/prax.
- Brume wallet repo is MIT-licensed and includes web, extension, Android, and iOS packaging. It is useful for privacy-preserving RPC/network posture and browser/mobile packaging patterns. Sources: https://github.com/brumeproject/wallet and https://wallet.brume.money/.
- Nocturne Snap and protocol repos are historical privacy references. They can inform private-account Snap mental models but should not be treated as current product references. Sources: https://github.com/nocturne-xyz/snap and https://github.com/nocturne-xyz/protocol.
- Daimo is an archived GPL-3.0 passkey/USDC mobile app repo. It is useful for payment-first UX, passkey onboarding, and mobile activity/confirmation design. Source: https://github.com/daimo-eth/daimo.
- Cake Wallet repo is MIT-licensed and describes an open-source noncustodial private multi-currency wallet for Android, iOS, macOS, and Linux. It includes QR scanning, address book, local transaction notes, custom nodes, backup options, Tor/privacy settings, and restore-height support for Monero. Source: https://github.com/cake-tech/cake_wallet.
- Zingo Mobile is an MIT-licensed React Native shielded Zcash light-client wallet for Android and iOS powered by Zingolib. Source: https://github.com/zingolabs/zingo-mobile.
- Nighthawk App Store listing indicates "Data Not Collected"; the current Android repo has shifted to a DarkFi-edition branch and should be treated carefully as a design reference, not a clean current Zcash implementation reference. Sources: https://apps.apple.com/us/app/nighthawk-wallet/id1524708337 and https://github.com/nighthawk-apps/nighthawk-android-wallet.

### Closed-source or partly inspectable visual references

- Phantom provides browser extension and mobile app store listings and is a strong mainstream mobile/extension visual reference, but no official full app source repo was verified in this pass. Sources: https://phantom.com/, Chrome Web Store, and Google Play listing.
- Coinbase Wallet / Base app provides useful mobile and extension user-help references for receive and seed/import flows. The app itself is not verified as open source in this pass; Coinbase Wallet SDKs are open and useful for connection flows. Sources: Coinbase Wallet help docs, Google Play Base app listing, and https://github.com/coinbase/coinbase-wallet-sdk.
- LI.FI and Relay public docs are useful for status vocabulary in bridge timelines: source transaction, destination transaction, route step, substatus, retry, refund, and explorer-link behavior. Sources: https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer and https://docs.relay.link/references/api/api_guides/bridging-integration-guide.
- Trust Wallet Core is open-source wallet infrastructure, not a current open-source app UI reference. Source: https://github.com/trustwallet/wallet-core.

## Inferences

- For ZK Freighter, the highest-value code/design references are:
  - Stellar extension structure: Freighter, xBull, LOBSTR signer extension.
  - Web + mobile wallet app structure: Safe Wallet monorepo, Uniswap interface, MetaMask mobile, Rainbow mobile, OneKey.
  - Extension confirmation/transaction risk UX: Rabby, MetaMask, Rainbow extension, Backpack, Taho, Zerion.
  - Privacy-specific flows: Zodl/Zashi, Railway, RAILGUN, Penumbra/Prax, Brume, Cake, Zingo.
  - Mobile confirmation and scanner ergonomics: Rainbow, Coinbase/Base, Phantom, Cake, Zodl/Zashi, Daimo.
  - Bridge status timelines: LI.FI, Relay, MetaMask bridge, Rainbow/Uniswap bridge surfaces.
- ZK Freighter's designer should not copy a general wallet IA wholesale. ZK Freighter needs fewer public wallet features than MetaMask/Rainbow/xBull and more privacy-specific state clarity than most wallets.
- The strongest reusable UX patterns for ZK Freighter are:
  - Seed phrase onboarding with explicit recovery finality.
  - Receive QR + copy as primary action.
  - Address middle truncation with copy confirmation.
  - Transaction review screens that separate hidden/private effects from public effects.
  - Pending/progress surfaces that persist across navigation.
  - Activity rows with status, visibility, asset, amount, transaction hash, and explorer links only when public.
  - Extension popup as a narrow command/status surface and side panel as the richer workspace.
  - Mobile confirmation using bottom sheets, scanner-first receive/send, and deliberate hold/slide/gesture confirmation only for irreversible public-boundary actions.
- Privacy-wallet references consistently show that shielding status and transparent-vs-shielded balance must be visible. ZK Freighter's version must be "public funds", "shielded funds", "Pending", "Spendable", and "public boundary" rather than Zcash-specific transparent/shielded jargon.
- For the extension, the designer should avoid assuming public dApp signing. The product evidence says dApp public-key access and signing fail closed by design.
- For mobile, the product should be treated as future surface planning. The designer can map mobile flows now, but any mobile build should reuse core wallet logic later rather than imply a separate wallet product.

## Unknowns And Questions

- Whether Abu wants the high-fidelity design prototype to include a landing page in this round, or only app surfaces.
- Whether the final submission demo will include the extension or keep web as the primary judged surface.
- Whether mobile should be designed as a full first-class wallet, a focused QuickShield/receive companion, or both in increasing fidelity.
- Whether public discovery should be visible in the first designer prototype, and if visible whether it should be a secondary receive affordance or a settings/manage surface.
- Whether mainnet-specific warnings should be a global banner, per-action gate, or both.
- Whether the designer should include a mobile "drag to confirm" / "hold to confirm" interaction for unshield/withdraw and bridge spend confirmation. It is plausible as a premium interaction but should not slow common receive/send flows.

## Not Included

- No production UI implementation.
- No code-level audit of every external wallet repo.
- No license legal review beyond reading visible repo metadata.
- No new screenshots were downloaded into the repo.
- No claim that the wallet list is exhaustive.
- No current-doc lookup for library/API implementation details, because this task is design/research rather than SDK usage or migration.

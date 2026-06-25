# Raw Source Notes: Wallet Design Research

Date checked: 2026-06-25.

This file is a raw source index for the designer handoff and wallet reference wiki. It records URLs and local repo files checked; synthesis lives in:

- `.thoughts/research/2026-06-25-wallet-ux-reference-research.md`
- `.thoughts/wiki/wallet-design-references.md`
- `.thoughts/design/2026-06-25-designer-brief-v2.md`

## Local ZK Fighter Sources

- `README.md`
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- `.thoughts/quality/2026-06-22-project-quality-profile.md`
- `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`
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

## Local Reference Material Already In Repo

- `reference/freighter/extension/src/popup/views/`
- `reference/freighter/extension/src/popup/components/`
- `reference/freighter/extension/e2e-tests/*-snapshots/`
- `reference/screenshots/freighter/freighter-landing-hero.png`
- `reference/screenshots/freighter/freighter-landing-full.png`
- `reference/xbull-wallet/src/app/`
- `reference/xbull-wallet/src/extension/`
- `reference/stellar-private-payments/`
- `reference/browser-wallet/`
- `reference/moonlight-sdk/`

## Stellar Wallet Sources

- Freighter repo: https://github.com/stellar/freighter
- Freighter mobile repo: https://github.com/stellar/freighter-mobile
- Freighter site: https://www.freighter.app/
- xBull repo: https://github.com/Creit-Tech/xBull-Wallet
- xBull site: https://xbull.app/
- xBull Chrome Web Store: https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifpe
- LOBSTR signer extension page: https://lobstr.co/signer-extension/
- LOBSTR signer extension repo: https://github.com/Lobstrco/lobstr-browser-extension
- LOBSTR Vault Android repo: https://github.com/Lobstrco/Vault-Android
- Albedo repo: https://github.com/stellar-expert/albedo
- Albedo site: https://albedo.link/
- Stellar wallet integration docs: https://developers.stellar.org/docs/tools/developer-tools/wallets
- Stellar Wallets Kit repo: https://github.com/Creit-Tech/Stellar-Wallets-Kit
- Stellar Account Viewer source link from Stellar docs: https://github.com/stellar/account-viewer-v2

## Extension And General Wallet Sources

- MetaMask extension repo: https://github.com/MetaMask/metamask-extension
- MetaMask mobile repo: https://github.com/MetaMask/metamask-mobile
- MetaMask product/download: https://metamask.io/download/
- Rabby repo: https://github.com/RabbyHub/Rabby
- Rabby product site: https://rabby.io/
- Rabby transaction docs/screens: https://support.rabby.io/hc/en-us/sections/11150568920591-Transactions
- Rainbow mobile repo: https://github.com/rainbow-me/rainbow
- Rainbow browser extension repo: https://github.com/rainbow-me/browser-extension
- Rainbow product site: https://rainbow.me/
- Uniswap interface monorepo: https://github.com/Uniswap/interface
- Uniswap wallet product page: https://wallet.uniswap.org/
- Uniswap extension launch article: https://blog.uniswap.org/uniswap-extension-is-now-available-for-everyone
- Backpack repo: https://github.com/coral-xyz/backpack
- Backpack product site: https://backpack.app/
- Taho extension repo: https://github.com/tahowallet/extension
- Taho site: https://taho.xyz/
- Enkrypt extension repo: https://github.com/enkryptcom/enKrypt
- Enkrypt site: https://www.enkrypt.com/
- Ambire extension repo: https://github.com/AmbireTech/extension
- Ambire web wallet repo: https://github.com/AmbireTech/wallet
- Ambire site: https://www.ambire.com/
- OneKey app monorepo: https://github.com/OneKeyHQ/app-monorepo
- OneKey site: https://onekey.so/
- Zerion wallet extension repo: https://github.com/zeriontech/zerion-wallet-extension
- Zerion transaction history help: https://help.zerion.io/en/articles/8245135-view-transaction-history
- Safe wallet monorepo: https://github.com/safe-global/safe-wallet-monorepo
- Safe product site: https://safe.global/
- Coinbase Smart Wallet repo: https://github.com/coinbase/smart-wallet
- Coinbase Wallet SDK repo: https://github.com/coinbase/coinbase-wallet-sdk
- Coinbase Wallet Mobile SDK repo: https://github.com/coinbase/wallet-mobile-sdk
- Coinbase Wallet extension help: https://www.coinbase.com/wallet/articles/getting-started-extension
- Coinbase Wallet mobile help: https://www.coinbase.com/wallet/articles/getting-started-mobile
- Coinbase send/receive help: https://www.coinbase.com/learn/wallet/how-to-send-or-receive-crypto-using-cb-wallet
- Base app / Coinbase Wallet mobile listing: https://play.google.com/store/apps/details?id=org.toshi
- Phantom Connect SDK repo: https://github.com/phantom/phantom-connect-sdk
- Phantom product site: https://phantom.com/
- Phantom Chrome Web Store: https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa
- Phantom Google Play: https://play.google.com/store/apps/details?id=app.phantom
- Phantom receive help: https://help.phantom.com/hc/en-us/articles/28355153389075-Find-your-wallet-address-in-Phantom
- Phantom send help: https://help.phantom.com/hc/en-us/articles/5530158379539-Send-tokens-from-Phantom
- Phantom history help: https://help.phantom.com/hc/en-us/articles/35862137120019-View-your-transaction-history-in-Phantom
- Brave Wallet developer info: https://github.com/brave/brave-browser/wiki/Brave-Wallet-developer-information
- Brave Wallet help: https://support.brave.app/hc/en-us/articles/12747992885389-What-is-Brave-Wallet
- Trust Wallet Core repo: https://github.com/trustwallet/wallet-core
- Trust Wallet download: https://trustwallet.com/download
- LI.FI transfer status API: https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer
- Relay bridge integration guide: https://docs.relay.link/references/api/api_guides/bridging-integration-guide
- Bungee bridge product reference: https://www.bungee.exchange/

## Privacy Wallet Sources

- Zodl/Zashi iOS repo: https://github.com/zodl-inc/zodl-ios
- Zodl/Zashi Android repo: https://github.com/zodl-inc/zodl-android
- Zodl product page: https://zodl.com/
- Zodl F-Droid screenshots/listing: https://f-droid.org/packages/co.electriccoin.zcash.foss/
- Railway Wallet repo: https://github.com/Railway-Wallet/Railway-Wallet
- Railway Wallet site: https://www.railway.xyz/
- RAILGUN Wallet SDK repo: https://github.com/Railgun-Community/wallet
- Penumbra web monorepo: https://github.com/penumbra-zone/web
- Prax install guide: https://guide.penumbra.zone/usage/web/prax
- Prax site: https://praxwallet.com/
- Brume wallet repo: https://github.com/brumeproject/wallet
- Brume wallet app: https://wallet.brume.money/
- Nocturne Snap repo: https://github.com/nocturne-xyz/snap
- Nocturne protocol repo: https://github.com/nocturne-xyz/protocol
- Daimo repo: https://github.com/daimo-eth/daimo
- Daimo site: https://daimo.com/
- Cake Wallet repo: https://github.com/cake-tech/cake_wallet
- Cake Wallet site: https://cakewallet.com/
- Zingo mobile repo: https://github.com/zingolabs/zingo-mobile
- Zingo product page: https://zingolabs.org/zingo/
- Nighthawk Android repo: https://github.com/nighthawk-apps/nighthawk-android-wallet
- Nighthawk App Store: https://apps.apple.com/us/app/nighthawk-wallet/id1524708337

## Image And Screenshot Sources To Inspect

- Local Freighter screenshots:
  - `reference/screenshots/freighter/freighter-landing-hero.png`
  - `reference/screenshots/freighter/freighter-landing-full.png`
- Zodl/Zashi screenshots and copy: https://zodl.com/ and https://f-droid.org/packages/co.electriccoin.zcash.foss/
- Rabby product screenshots: https://rabby.io/ and https://support.rabby.io/hc/en-us/sections/11150568920591-Transactions
- Railway product screenshots: https://www.railway.xyz/
- Rainbow product screenshots: https://rainbow.me/
- Uniswap Wallet screenshots/product: https://wallet.uniswap.org/
- Zerion screenshots/product: https://zerion.io/
- Phantom product/screens: https://phantom.com/ and store listings above
- LOBSTR signer extension visuals: https://lobstr.co/signer-extension/
- Safe app screenshots/product: https://safe.global/

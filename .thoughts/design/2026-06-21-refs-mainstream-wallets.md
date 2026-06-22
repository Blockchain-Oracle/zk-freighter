# Mainstream Extension-Wallet UX References — Designer Brief

**Date:** 2026-06-21
**Area:** Mainstream extension-wallet UX references (MetaMask primary; Phantom, Rabby, Freighter secondary)
**For:** **ZK Fighter**, a privacy-by-default Stellar shielded wallet (XLM + USDC, fixed assets).
**Method:** Official help centers (support.metamask.io, help.phantom.com), rabby.io docs + CoinGecko Rabby guide, and the cloned Freighter source under `reference/freighter`. Every pattern below cites a real URL or file path.

> How to read this: Freighter is the **closest structural match** — it is a real Stellar wallet whose screens map nearly 1:1 to ours, and we have its source. Treat Freighter as the layout/IA skeleton; treat MetaMask/Phantom as the polish + microcopy reference for the mainstream-familiar moments. Then read the **DO NOT COPY** list before importing anything.

---

## Per-screen canonical patterns

### Onboarding — Welcome / choose path
- **Freighter (primary skeleton):** Single centered screen: logo + wallet name, then two stacked rounded buttons — **"Create new wallet"** (secondary/filled) and **"I already have a wallet"** (tertiary). Two paths only, no third rail. File: `reference/freighter/extension/src/popup/views/Welcome/index.tsx`.
- **MetaMask:** Create-new offers a choice of securing via **12-word Secret Recovery Phrase** *or* social login (Google/Apple). https://support.metamask.io/start/creating-a-new-wallet/
- **Phantom:** "Create a new wallet" → "Create a seed phrase wallet"; an existing wallet enters via "Other import options → Import Seed Phrase". https://help.phantom.com/hc/en-us/articles/45135465489555-Create-a-new-wallet-with-a-Secret-Recovery-Phrase
- **Rabby:** "Create a New Seed Phrase" vs "Import Seed Phrase" / "Import Private Key" on the entry screen. https://www.coingecko.com/learn/how-to-use-rabby-wallet

### Onboarding — create-new: set password
- **Freighter:** Password is set **before** the phrase is revealed; one reusable `PasswordForm` (password + confirm + terms-of-use checkbox) is shared by create and import. Files: `views/AccountCreator/index.tsx`, `components/accountCreator/PasswordForm`.
- **Rabby:** "Enter a password for your wallet → Next" precedes "Show Seed Phrase". https://www.coingecko.com/learn/how-to-use-rabby-wallet
- **MetaMask:** Password is the local unlock credential; it is explicitly **not** account recovery (the SRP is). https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/

### Onboarding — seed-phrase generate + backup
- **Freighter:** A pre-reveal **modal** explains what the recovery phrase is (full access; recovers wallet if password forgotten; "Keep it in a safe place") with two reassurance rows (lock + passcode icons) and the warning that a confirmation step follows. Then `DisplayMnemonicPhrase` shows the words. Files: `views/MnemonicPhrase/index.tsx`, `components/mnemonicPhrase/DisplayMnemonicPhrase`.
- **MetaMask:** Generates a unique 12-word SRP; copy emphasizes single point of failure, no centralized recovery, store physically offline. https://support.metamask.io/start/learn/what-is-a-secret-recovery-phrase-and-how-to-keep-your-crypto-wallet-secure/
- **Phantom:** "View your recovery phrase and write it down, store it securely offline; Phantom can't recover it for you." https://help.phantom.com/hc/en-us/articles/45135465489555-Create-a-new-wallet-with-a-Secret-Recovery-Phrase
- **Rabby:** "Show Seed Phrase" → copy/save → **"I've Saved the Phrase"** to advance. https://www.coingecko.com/learn/how-to-use-rabby-wallet

### Onboarding — seed-phrase confirm
- **Freighter:** Dedicated confirm step (`ConfirmMnemonicPhrase`) re-checks the phrase; the framing "For your security, we'll check if you got it right in the next step" is set in the pre-reveal modal. Files: `components/mnemonicPhrase/ConfirmMnemonicPhrase`, `views/MnemonicPhrase/index.tsx`.
- **MetaMask:** Restore/confirm flow validates the phrase word-by-word. https://support.metamask.io/configure/wallet/how-to-restore-your-metamask-wallet-from-secret-recovery-phrase/

### Onboarding — import seed phrase
- **Freighter:** Numbered per-word input grid (`RecoverAccount`): each cell is "01..12" + masked `Input`, a **show/hide toggle** for the whole phrase, **paste-the-whole-phrase** support that fans words into cells, and a toggle for 12- vs 24-word length. Then the same `PasswordForm`. File: `views/RecoverAccount/index.tsx`.
- **Phantom:** "Enter your 12-word recovery phrase in the exact order, then tap Import Recovery Phrase." https://help.phantom.com/hc/en-us/articles/15079894392851-Import-an-existing-wallet-into-Phantom
- **MetaMask:** Connect/import existing wallet via SRP. https://support.metamask.io/start/use-an-existing-wallet/

### Onboarding — OPTIONAL passkey enable
- **Phantom (closest reference):** "Phantom Auth" is an anonymous public-key login factor "similar to a password or passkey"; seedless wallets still generate an SRP recommended as backup. Frame passkey as an **optional convenience layer over** (not a replacement for) the seed phrase. https://help.phantom.com/hc/en-us/articles/32367778944403-About-Phantom-Auth and https://help.phantom.com/hc/en-us/articles/32775281256851-Seedless-Wallet-FAQs
- **MetaMask:** Social-login (Google/Apple/Telegram) as an alternative seedless path — same "optional, additional auth factor" mental model. https://support.metamask.io/start/creating-a-new-wallet/
- *Freighter has no passkey screen — do not look there for this pattern.*

### Unlock / lock
- **Freighter:** "Welcome back" + "Enter password to unlock" via a shared `EnterPassword` component, primary "Unlock". Footer offers recover-by-seed and create-new escape hatches; cross-surface unlock broadcast converges navigation. File: `views/UnlockAccount/index.tsx`.
- **MetaMask:** Manual lock = menu → "Log out"; re-entry is the password screen. https://support.metamask.io/configure/wallet/how-do-i-log-out-of-lock-my-wallet/
- **Phantom:** Lock state gated by "Require authentication" with a duration from Immediately to 1 day. https://help.phantom.com/hc/en-us/articles/28951350406803-Turn-on-auto-lock-in-Phantom

### Home / portfolio
- **Freighter:** Header (account identicon, name, network) + total fiat value + asset list, with primary actions surfaced near the header; a kebab menu exposes Copy address, Account details (QR), Settings, Lock, Fullscreen. Files: `views/Account/index.tsx`, `components/account/AccountHeader/index.tsx`, `components/account/AccountAssets`.
- **MetaMask:** Landing page shows the active account with a central **Send** button; you confirm "you're in the account you want to transact from". https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet/
- *For our home, the action row is Send / Receive / Shield / Unshield — see DO NOT COPY for the Buy/Swap buttons that sit there in these wallets and must be dropped.*

### Send
- **Freighter (primary skeleton):** Multi-step in-place slider, not separate pages: **DESTINATION** (recipient) → **AMOUNT** (with asset picker `SET_SOURCE_ASSET`) → **PAYMENT_CONFIRM** (review) → submit → back to Account. Each step animates; visited steps persist. Files: `views/Send/index.tsx`, `components/send/{SendTo,SendAmount,AddressTile}`, `components/InternalTransaction/SubmitTransaction`.
- **MetaMask:** "Send" → input recipient public address → enter amount → **Next** (review) → confirm. https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet/
- *Map to ours: recipient = **private address** paste/scan; review→sign→**pending-proof** state→success. The pending-proof interstitial is novel to us — no mainstream wallet has it, so do not expect a reference.*

### Receive — address + QR
- **Freighter (primary skeleton):** `ViewPublicKey` renders a `QRCodeSVG`, the address with a `CopyText` "Copied!" affordance, and an **inline-editable account name** (pencil → check). File: `views/ViewPublicKey/index.tsx`. Funding entry point (`AddFunds`) offers "Transfer from another account" → QR with copy. File: `views/AddFunds/index.tsx`.
- **MetaMask:** QR + copyable public address live under **Account details → Address**. https://support.metamask.io/configure/accounts/how-to-view-your-account-details-and-public-address/ and https://support.metamask.io/manage-crypto/move-crypto/transfer/direct-deposit-receive-tokens-to-your-metamask-wallet/
- **Phantom:** "Tap Receive, then copy the address from your account on the correct network." https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom
- *Map to ours: the headline receive address is the **PRIVATE** address (QR + copy + "same wallet" labeling); the **public** Stellar address is shown secondarily for deposits/shield-in. Two-address layering is ours to invent; QR+copy+label mechanics come from these refs.*

### Accounts — multiple / add / switch / new address
- **Freighter (primary skeleton):** `Wallets` view = list of accounts (identicon, truncated key, copy, inline-edit name) with "make active" switching; **"Add another wallet"** opens a 3-option sheet: Create new wallet (from seed phrase), Import Stellar Secret Key, Connect hardware wallet. Files: `views/Wallets/index.tsx`, `views/AddAccount`.
- **Phantom:** Profile avatar (upper-left) → **Add Account → Create New Account**; "an account is a set of addresses on each supported blockchain." https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom
- **Rabby:** Up to 50 addresses from one seed phrase; "click the address at the top → Add New Address → choose seed phrase or private key." https://www.coingecko.com/learn/how-to-use-rabby-wallet
- **MetaMask:** Add accounts from the account menu. https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/
- *Map to ours: keep the list + switch + inline-rename + "Add account" sheet. Our "new address" = derive another private/public address pair under one wallet (Rabby's "Add New Address" is the mental model). Drop the hardware-wallet and import-private-key options (see DO NOT COPY).*

### Settings
- **Freighter (primary skeleton):** `Settings` is a `ListNavLink` menu — Preferences, **Security**, **Network**, Help, Leave Feedback, About, What's new, Log Out, with version at the bottom. **Security** sub-view: Asset lists, **Show recovery phrase**, Advanced settings, **Auto-lock timer** (Change-password is present in source only as a TODO). Files: `views/Settings/index.tsx`, `views/Security/index.tsx`.
- **Phantom:** Settings → **Security & Privacy** holds Show Recovery Phrase (with password + warning gate) and the Auto-Lock Timer. https://help.phantom.com/hc/en-us/articles/25334064171795-View-your-recovery-phrase-or-private-keys-in-Phantom and https://help.phantom.com/hc/en-us/articles/28951350406803-Turn-on-auto-lock-in-Phantom
- **MetaMask:** Auto-lock timer lives under **Settings → Advanced**. https://support.metamask.io/configure/wallet/how-do-i-log-out-of-lock-my-wallet/
- *Map to ours: Security (reveal seed, change password, auto-lock, enable passkey) + single-chain testnet/mainnet **toggle** + our novel view-key/compliance export + disclaimers + about. Use the list-menu IA; see DO NOT COPY for the network-management surface to NOT build.*

### Activity / history
- **Freighter (primary skeleton):** `AccountHistory` = month-sectioned list of `HistoryItem`s with a "No transactions to show" empty state; "History" header. Files: `views/AccountHistory/index.tsx`, `components/accountHistory/HistoryItem`.
- **MetaMask:** Activity is surfaced as a tab/notifications of successful sends/receives and other actions; enabled by default. https://support.metamask.io/configure/wallet/notifications/
- *Map to ours: rows are Shield / Send / Unshield with statuses including our novel **pending-proof**; a private send must show limited/obfuscated detail. The statuses ASP-not-registered / sync-required / proof-failure are ours — no mainstream reference.*

---

## DO NOT COPY — features these wallets prominently show that we are NOT building

1. **Token swap / DEX / "Swap" button.** Freighter (`views/Swap`, `components/swap`), Phantom, Rabby and MetaMask all put a Swap action on the home row. We are not building swaps — drop the button entirely.
2. **Fiat buy/sell on-ramp.** Freighter's `AddFunds` "Buy with Coinbase" and MetaMask "Buy"/Portfolio buy flows. We have no fiat on-ramp. (We keep only the "transfer to this address" half of that screen, re-skinned as shield-in / receive.) Source: `views/AddFunds/index.tsx`.
3. **NFT / collectibles gallery.** Freighter `views/AddCollectibles`, `components/account/AccountCollectibles`, `sendCollectible`; Phantom collectibles accounts. We have no NFT surface.
4. **Arbitrary multi-chain network management.** Freighter `views/ManageNetwork` / `AdvancedSettings` (add custom RPC), Rabby's multi-chain switcher, MetaMask custom networks. We only **toggle testnet/mainnet of ONE chain** via config — a single switch, never an add-network/custom-RPC UI.
5. **In-wallet dApp browser / Discover.** Freighter `views/Discover` (+ Sheet on home), Phantom Explore. Not building.
6. **dApp-connect / connected-apps / grant-access surface.** Freighter `views/GrantAccess`, `ManageConnectedApps`, `SignMessage`, `SignAuthEntry`, the AccountHeader "Connected apps" menu. This is an explicit later stretch, NOT v1 — keep it out of the mocks.
7. **Hardware-wallet support.** Freighter "Connect a hardware wallet" in `Wallets`, MetaMask hardware-wallet hub. Drop the option from the Add-account sheet. Source: `views/Wallets/index.tsx`.
8. **Import private key / Stellar secret key as an account-add path.** Freighter "Import Stellar Secret Key", Rabby "Import Private Key". Our add-account paths are seed-phrase-derived only (plus our derive-new-address). Source: `views/Wallets/index.tsx`.
9. **Arbitrary token import / manage-assets / asset-lists.** Freighter `views/ManageAssets`, `ManageAssetsLists`, `AddToken`, Security → "Asset lists". Our assets are fixed (XLM + USDC) — no add-token, no asset-list management.
10. **Custom gas / fee-market UI.** MetaMask advanced gas controls. Stellar fees are tiny/flat — no fee editor.
11. **Staking / earn, price charts, portfolio analytics.** Present across MetaMask/Phantom. Not building — home shows balances + activity only.
12. **Social / seedless login as the DEFAULT path** (MetaMask Google/Apple, Phantom seedless). We may offer passkey as an **optional** enable, but the seed phrase remains the primary, mandatory backup — do not demote it the way the seedless flows do.

---

## Notes

- **Name-check verdict:** Product name is now **ZK Fighter**. A quick 2026-06-22 web search did not show a direct crypto-wallet collision, but this is not legal/trademark clearance; run a final trademark, domain, GitHub, app-store, and social-handle check before public launch. (If "DeepBookie" leaked in from the host repo's CLAUDE.md, that is the other project in this monorepo and is irrelevant to the Stellar wallet.)
- **Freighter is the load-bearing reference.** It is a shipping Stellar wallet and its `views/` directory maps almost 1:1 to our screen list (Welcome, AccountCreator, RecoverAccount, MnemonicPhrase, UnlockAccount, Account, ViewPublicKey, Send, Wallets, AddAccount, Settings, Security, AccountHistory, AddFunds, AutoLockTimer, DisplayBackupPhrase, About). Designer should pull layout/IA/microcopy from these files first, then sand off the DO-NOT-COPY surfaces above.
- **What has NO mainstream reference (our novel surface — designer must invent, do not search for a pattern to clone):** private/public address layering on Receive; Shield / Unshield as first-class home actions; the **pending-proof** state on Send and in Activity; what a private tx reveals in history; the view-key / disclosure-proof / compliance-export screen; and the failure states ASP-not-registered, sync-required, and proof-failure. These should be designed from our own spec, borrowing only generic loading/empty/error/success scaffolding from Freighter's `components/Loading`, `Notification`, and the "No transactions to show" empty pattern.
- **Microcopy worth lifting (verbatim-quality):** Freighter's phrase warning "Your recovery phrase gives you full access to your wallets and funds" / "Keep it in a safe place" / "For your security, we'll check if you got it right in the next step"; MetaMask's framing of SRP as the single, non-recoverable point of failure distinct from the local password.

### Source index
- MetaMask create wallet: https://support.metamask.io/start/creating-a-new-wallet/
- MetaMask SRP vs password vs keys: https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/
- MetaMask restore from SRP: https://support.metamask.io/configure/wallet/how-to-restore-your-metamask-wallet-from-secret-recovery-phrase/
- MetaMask use existing wallet (import): https://support.metamask.io/start/use-an-existing-wallet/
- MetaMask send tokens: https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet/
- MetaMask account details / public address (QR): https://support.metamask.io/configure/accounts/how-to-view-your-account-details-and-public-address/
- MetaMask receive / direct deposit: https://support.metamask.io/manage-crypto/move-crypto/transfer/direct-deposit-receive-tokens-to-your-metamask-wallet/
- MetaMask add accounts: https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/
- MetaMask lock / log out (auto-lock under Advanced): https://support.metamask.io/configure/wallet/how-do-i-log-out-of-lock-my-wallet/
- MetaMask activity notifications: https://support.metamask.io/configure/wallet/notifications/
- Phantom create wallet (SRP): https://help.phantom.com/hc/en-us/articles/45135465489555-Create-a-new-wallet-with-a-Secret-Recovery-Phrase
- Phantom import wallet: https://help.phantom.com/hc/en-us/articles/15079894392851-Import-an-existing-wallet-into-Phantom
- Phantom accounts & addresses (receive): https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom
- Phantom show recovery phrase: https://help.phantom.com/hc/en-us/articles/25334064171795-View-your-recovery-phrase-or-private-keys-in-Phantom
- Phantom auto-lock: https://help.phantom.com/hc/en-us/articles/28951350406803-Turn-on-auto-lock-in-Phantom
- Phantom Auth (passkey-like factor): https://help.phantom.com/hc/en-us/articles/32367778944403-About-Phantom-Auth
- Phantom seedless / social login: https://help.phantom.com/hc/en-us/articles/32775281256851-Seedless-Wallet-FAQs
- Rabby complete guide (create/import/add address): https://www.coingecko.com/learn/how-to-use-rabby-wallet
- Rabby official docs: https://rabby.io/
- Freighter source: `reference/freighter/extension/src/popup/views/` (Welcome, AccountCreator, RecoverAccount, MnemonicPhrase, UnlockAccount, Account, ViewPublicKey, Send, Wallets, Settings, Security, AccountHistory, AddFunds)

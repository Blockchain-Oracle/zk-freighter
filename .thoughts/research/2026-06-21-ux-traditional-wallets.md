# Traditional crypto wallet flows (the mental model users arrive with)

Research date: 2026-06-21. Scope: document CURRENT REALITY of how mainstream wallets behave so a new ZK wallet can ground itself in flows users already know. Facts + concrete UX patterns, not design proposals.

Wallets studied: **MetaMask** (EVM extension/mobile), **Phantom** (multi-chain: Solana/EVM/Bitcoin), **Coinbase Wallet** (self-custody + Smart Wallet), **Rabby** (EVM power-user extension), and one **embedded/passkey** stack (**Privy** + **Coinbase Smart Wallet**).

The headline: across all of these, the user-facing flow is nearly identical. There is a small, stable set of screens every wallet has, in the same order. The only thing that genuinely varies is **how the key is created/secured** (seed phrase vs. social vs. passkey/MPC) — and even there, **the address model is unchanged**: there is one public address per chain, derived from the key, that IS your identity and is what you give people to get paid.

---

## The flow (step by step)

This is the canonical "wallet flow table" — the standard screens/states EVERY wallet has, in order. Names below are the real labels these products use.

### 1. First-run onboarding (the fork)
On install/first launch the user picks one of:
- **Create a new wallet** — wallet generates a fresh key.
- **Import an existing wallet** — paste a 12/24-word recovery phrase (or a private key).
- **(newer) Social / passkey login** — no seed phrase held by the user.

Per wallet:
- **MetaMask**: "Create a new wallet" vs import. On create you then choose *how to secure it*: **Secret Recovery Phrase (SRP)** (traditional self-custody, 12 words) OR **social login** (Google / Apple / Telegram + a MetaMask password, no SRP to custody). [MetaMask: Create a new wallet]
- **Phantom**: Create new / import. One **account** = a set of addresses across all supported chains; every wallet starts with Account 1, you can add more. [Phantom: About wallets, accounts, and addresses]
- **Coinbase Wallet**: "create a new self-custody wallet" OR "import an existing wallet using a 12-word recovery phrase." Newer **Smart Wallet** path creates a passkey-secured smart-contract wallet with **no seed phrase by design**. [Coinbase: Getting Started Mobile; smart-wallet README]
- **Rabby**: Create new, or **Import Seed Phrase** / import private key / connect hardware. Mobile (v0.2.2+) added seed-phrase + private-key import. [CoinGecko Rabby guide; Rabby on X]
- **Privy (embedded)**: User authenticates first (email / Google / passkey); the wallet is created *inside the app*, no extension. [Privy: how embedded wallets work]

### 2. Backup / recovery
- **Seed-phrase wallets** (MetaMask SRP, Phantom, Coinbase self-custody, Rabby): show the 12/24 words, force the user to **write them down**, then a **confirm step** (re-enter / tap words in order) before finishing. Messaging is uniformly: *this is your single point of failure, we cannot recover it for you.* [MetaMask: Securing your SRP; Coinbase: keep wallet secure]
- **Set a local password / biometric**: a separate device-level unlock (password, Face ID / Touch ID, passcode). This unlocks the app; it is NOT the recovery phrase. Coinbase recommends biometrics and offers **encrypted iCloud / Google Drive backup** of the recovery phrase. [Coinbase: Getting Started Mobile]
- **Rabby** gates revealing the seed behind the local password: "Backup Seed Phrase → enter password → reveal." [CoinGecko Rabby guide]
- **Passkey / embedded recovery is different** (see "where passkey/embedded differ" below): recovery = re-sync the passkey via iCloud Keychain / Google Password Manager, or reconstruct an MPC key from shares — **no 12 words to lose**.

### 3. Home / portfolio screen
Default landing after unlock. Common elements:
- Large **total balance** (fiat) at top.
- **Token list** (asset, icon, balance, fiat value).
- Primary action buttons: **Receive / Send** (and usually **Swap / Buy**).
- Tabs for **Tokens** and **NFTs/Collectibles**, plus an **Activity** tab.
- MetaMask defaults to a **multichain portfolio view** across all enabled networks. [MetaMask: change networks]

### 4. RECEIVE (your address + QR + copy)
The universal pattern: tap **Receive** → wallet shows **your address as a string + a QR code + a Copy button**. This is the screen you show someone (or scan) to get paid.
- **Phantom**: "select Receive to copy your wallet address or show a QR code for the network you want to use." Underneath, Phantom labels **which network the address can receive on**. [Phantom: How to receive tokens]
- Across wallets the copy-paste-the-address (or scan QR) behavior is identical. Repeated guidance: **always copy/paste, never hand-type** an address.

### 5. SEND (recipient, amount, asset, fees, confirm)
Universal multi-field flow:
1. Pick **asset** to send.
2. Enter **recipient** — paste address, scan QR, or (Phantom) a **username**.
3. Enter **amount** (token or fiat-equivalent toggle; "Max" button).
4. Review **network fee / gas** (the wallet warns you need the network's native token — SOL/ETH — to cover fees).
5. **Confirm** screen showing recipient, amount, fee → sign/approve (biometric or password).
- Phantom's stated steps: paste address on the correct network / scan QR / enter username; ensure enough native token for fees; **double-check address + network because transactions can't be reversed**. [Phantom: Send tokens]

### 6. ACTIVITY / history
An **Activity** (or Transactions) tab listing past sends/receives/swaps/contract interactions with status (pending/confirmed), and a link to view the tx on a block explorer. Present in all five.

### 7. Settings
Address book, security (change password, reveal SRP, auto-lock timer), connected sites/dApps, networks management, currency/display, hardware-wallet management. MetaMask "All Permissions" lives here (3-dots menu). [MetaMask: manage dapp permissions]

### 8. Network switch
- **MetaMask**: a **network switcher / "Enabled networks" dropdown**; you check/uncheck networks to filter the portfolio, or add a **custom network (RPC)**. Switching network changes which chain sends/balances target. [MetaMask: change networks; add custom network]
- **Phantom**: no manual chain switch for receiving — **each account already has an address on every supported chain** (Solana, Ethereum, Polygon, Base, Bitcoin); you pick the network on the Receive/Send screen. [Phantom: derivation paths; About accounts]
- **Rabby**: notably **auto-detects the right chain per dApp** from its database, so the user rarely switches manually — a deliberate UX differentiator. [ByteDegen Medium; CoinGecko]

### 9. Lock / unlock
App auto-locks after inactivity (or manual lock). Unlock with **password or biometrics**. This is purely local device auth; it does not touch the recovery phrase or move funds.

### 10. Connect-to-dApp
Canonical Web3 handshake:
1. User clicks "Connect Wallet" on a site → wallet pops a **connection request** showing the dApp origin + which **account(s)** and **network(s)** will be shared.
2. User taps **Connect** to approve. [MetaMask: connecting to a dapp]
3. Later, every transaction/signature the dApp requests pops a **signing prompt** the user must approve.
4. Permissions are revocable in Settings ("Permissions" tab / "All Permissions"). [MetaMask: manage dapp permissions]
- **Rabby's differentiator** is this screen: a **pre-transaction risk/simulation panel** showing the expected balance changes and security warnings before you sign — the reason power users adopt it.

---

## Address model & mental model

This is the load-bearing part for grounding a ZK wallet.

- **One key → one public address per chain, and that address IS your identity.** Seed phrase (entropy) → master key → deterministic derivation (BIP-39 / BIP-32 / BIP-44) → keypair → **public address**. The address is the public half; it is safe to share. [Abi Raja: Seed Phrase to Solana Address; Phantom: derivation paths]
- **Address formats users actually see:**
  - **Ethereum / EVM** (MetaMask, Rabby, Coinbase, Phantom-EVM, Privy): `0x` + 40 hex chars, e.g. `0xAbC1…dEf2`. Privy types the embedded address as `` `0x${string}` ``. [Privy docs]
  - **Solana** (Phantom): a **base58** string (the base58 encoding of the public key), e.g. `7xKXtg2C…W3aF`. [Phantom: derivation paths]
  - **Bitcoin** (Phantom): SegWit / Taproot addresses derived from the same seed.
- **What "your address" means to a user:** the thing you **copy / show as a QR** to receive funds, the thing that appears in others' Send screens, and the thing you can paste into a **block explorer** (Etherscan, Solscan) to see your full public balance + history. It is the wallet's outward-facing name.
- **Multi-chain = multiple addresses, one wallet.** Phantom makes this explicit: an **account is a set of addresses, one per supported chain**, all derived from the same seed at the same index. Account 1 has the same derivation index across Solana/EVM/Bitcoin. Users hold the mental model "I have one wallet, but a different address string for each network." [Phantom: About accounts; derivation paths]
- **Mental model in one line:** *My recovery phrase is the master secret (never share, can't be recovered if lost). My address is my public handle (share freely, that's how I get paid). The password/biometric just unlocks the app on this device.*

### Where passkey / embedded wallets differ (and where they don't)
The key distinction the ZK wallet should internalize: **passkeys/embedded auth change the AUTH + SIGNING layer, NOT the address model.**

- **Address model is unchanged.** A Privy embedded wallet still has a normal `0x…` Ethereum address you receive to; a Coinbase Smart Wallet still has an on-chain address. Receiving, sending to it, and explorer lookups work exactly as above. [Privy docs; Coinbase smart-wallet README]
- **What changes is how you authorize:**
  - **Passkey (Coinbase Smart Wallet)**: a WebAuthn passkey (private key in the device **secure enclave**, secp256r1) is the **signer**. There is **no seed phrase**. The wallet is an **ERC-4337 smart-contract account** whose owner is the passkey's public key; the contract verifies the secp256r1 signature on-chain. The user just sees a **Face ID / Touch ID prompt** to sign. Recovery = sign into the same Apple/Google account → passkey re-syncs via iCloud Keychain / Google Password Manager. [Coinbase smart-wallet; Corbado: Smart Wallets and Passkeys]
  - **Embedded/MPC (Privy)**: the private key is **split into 3 shares via Shamir Secret Sharing** (device share, Privy-TEE share, user recovery share); any 2 of 3 reconstruct it **only on the user's device at sign time**. User must be **authenticated first** (email/Google/passkey) before any signing. Privy alone can't move funds. [Privy: how embedded wallets work; passkeys recipe]
- **Net effect for UX:** the user never writes down 12 words and never sees a "back up your phrase" gate; backup becomes "your passkey is synced to your cloud account" or "set a recovery method." **But Receive/Send/Activity/connect-to-dApp screens are the same**, and the address is the same kind of public string. The familiar flow survives; only the create/backup/unlock-and-sign moments change.

---

## Notable UX patterns (reusable conventions users already expect)

- **The create/import fork on first run** — never skip; users look for both.
- **Forced backup + confirm-the-phrase step** before the wallet is usable (seed wallets).
- **Two distinct secrets, clearly separated**: recovery phrase (account-level, portable) vs. local password/biometric (device-level unlock). Conflating them is a known source of user error.
- **Receive = address string + QR + one-tap Copy**, with the network labeled.
- **Send = asset → recipient (paste/scan/username) → amount (+ Max) → fee preview → confirm**, with an irreversibility warning.
- **"Copy, never type" the address.**
- **Network/native-token-for-gas reminder** on Send.
- **Connect-to-dApp = origin + account + network shown, explicit Connect, revocable later.**
- **Per-transaction signing prompt** for every dApp action.
- **Activity tab links out to a block explorer.**
- **Rabby's pre-sign simulation** (expected balance changes + risk flags) is the emerging best-practice on the signing screen.
- **Auto-lock + biometric unlock** as the default daily-use gate.

---

## Confusion points & open questions

These are documented real-world pain points — useful as "what NOT to break / what to improve":
- **Wrong network on Send/Receive loses funds.** Phantom explicitly warns; multi-chain wallets make "same-looking address, different network" a live hazard (e.g. EVM `0x…` valid on many chains, but the token/bridge may not be).
- **Seed phrase = single point of failure.** Every seed wallet repeats "we cannot recover this for you." This is the #1 onboarding fear and abandonment point — the exact friction passkey/embedded/ZK wallets exist to remove.
- **Password vs. recovery phrase confusion.** Users think their app password can recover funds; it can't.
- **Irreversibility.** No undo on a confirmed transaction; wallets lean on the confirm screen + warnings.
- **Smart-wallet address ≠ EOA address nuances.** ERC-4337 smart-contract wallets can have a **counterfactual address** (exists before deployment) and may not sign messages the same way EOAs do — a known integration/UX wrinkle for passkey wallets.
- **Open question for the ZK wallet (not answered here, by scope):** how to present the address + privacy model when the *novelty* is hiding linkage/history, while still keeping the familiar "copy your address to get paid" flow users arrive expecting.

---

## Sources

- MetaMask — Create a new wallet: https://support.metamask.io/start/creating-a-new-wallet/
- MetaMask — Securing your Secret Recovery Phrase and password: https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/
- MetaMask — How to change networks (Extension & Mobile): https://support.metamask.io/configure/networks/how-to-change-networks/
- MetaMask — How to add a custom network (RPC): https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc/
- MetaMask — How to connect to a dapp: https://support.metamask.io/more-web3/dapps/connecting-to-a-dapp/
- MetaMask — How to manage dapp permissions: https://support.metamask.io/more-web3/dapps/manage-dapp-permissions/
- Phantom — How to receive tokens: https://help.phantom.com/hc/en-us/articles/4406393831187-How-to-receive-tokens-in-Phantom
- Phantom — Send tokens: https://help.phantom.com/hc/en-us/articles/5530158379539-Send-tokens-in-Phantom
- Phantom — Find your wallet address: https://help.phantom.com/hc/en-us/articles/28355153389075-Find-your-wallet-address-in-Phantom
- Phantom — About wallets, accounts, and addresses: https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom
- Phantom — Supported derivation paths: https://help.phantom.com/hc/en-us/articles/12988493966227-What-derivation-paths-does-Phantom-support
- Coinbase — Getting Started: Wallet Mobile App: https://www.coinbase.com/wallet/articles/getting-started-mobile
- Coinbase — Recover your smart wallet: https://help.coinbase.com/en/wallet/getting-started/smart-wallet-recovery
- Coinbase — Tips to keep your self-custody wallet secure: https://www.coinbase.com/learn/wallet/tips-to-keep-wallet-secure
- Coinbase smart-wallet (GitHub, README — passkey/ERC-4337): https://github.com/coinbase/smart-wallet
- Corbado — Smart Wallets and Passkeys (secp256r1, no seed): https://www.corbado.com/blog/smart-wallets-passkeys
- Rabby — A Complete Beginner's Guide (CoinGecko): https://www.coingecko.com/learn/how-to-use-rabby-wallet
- Rabby — multi-chain auto chain-switch (ByteDegen, Medium): https://medium.com/@ByteDegen/rabby-wallet-the-multi-chain-experience-e93957b0a893
- Rabby — mobile seed/private-key import (Rabby on X): https://x.com/Rabby_io/status/1813584354104541192
- Privy — How Privy embedded wallets work (Shamir 3-share, TEE): https://privy.io/blog/how-privy-embedded-wallets-work
- Privy — Using passkeys with wallets (auth-before-sign, 0x address): https://docs.privy.io/recipes/passkey-server-wallets
- Abi Raja — From Seed Phrase to Solana Address (BIP-39/32/44, base58): https://www.abiraja.com/blog/from-seed-phrase-to-solana-address

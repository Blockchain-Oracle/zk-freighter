# Stellar wallet specifics (Freighter et al.) — account model + address + funding + trustlines

> Scope: documents CURRENT REALITY of how Stellar wallets behave for users, grounded in the cloned Freighter extension source and the passkey-kit / smart-account-kit SDKs. This is descriptive — it does NOT design our ZK wallet. Goal: anchor our wallet in flows users already know.

The headline mental-model fact: **a Stellar address is not the same as a Stellar account.** You can generate a keypair (a `G...` address) offline, but until someone *funds* it, the network has no record of it — it literally "does not exist." This is the single biggest divergence from Ethereum, where any address is implicitly valid and a zero-balance address is a normal state. On Stellar a zero-balance address is an *un-created* address.

---

## The flow (step by step)

### A. Classic Freighter onboarding (the `G...` keypair wallet users know)

Mapped from `reference/freighter/extension/src/popup/views/*`:

1. **Welcome** (`views/Welcome/index.tsx`) — two buttons: **"Create new wallet"** → `accountCreator`, **"I already have a wallet"** → `recoverAccount`. No email, no account, nothing on-chain yet.
2. **Create password** (`views/AccountCreator` → `components/accountCreator/PasswordForm`) — password + confirm + Terms-of-Use checkbox. This password *encrypts the key locally*; it is not an on-chain identity. On submit, `createAccount` generates the keypair and `showBackupPhrase` returns the mnemonic.
3. **Recovery phrase** (`views/MnemonicPhrase` + `components/mnemonicPhrase/DisplayMnemonicPhrase`/`ConfirmMnemonicPhrase`) — a modal first warns: *"Your recovery phrase gives you access to your account and is the only way to access it in a new browser. Keep it in a safe place."* with rows: full access to funds / recover if password forgotten / never share / SDF will never ask. User can **"Show recovery phrase"** then re-enter words to confirm, or **"Do this later"** (which silently auto-confirms). 12/24-word BIP-39 mnemonic.
4. **Account exists locally, but is UNFUNDED on-chain.** The home/Account view detects this and renders **NotFundedMessage** (`components/account/NotFundedMessage/index.tsx`): a notification *"To start using this account, fund it with at least 1 XLM."* + a **"Learn more about account creation"** link, an **"Add XLM"** button, and — only on testnet/futurenet (`canUseFriendbot`) — a **"Fund with Friendbot"** button that calls `fundAccount({ publicKey })`.
5. **Funding the account into existence:**
   - **Testnet/Futurenet:** one-click **Fund with Friendbot** (`https://friendbot.stellar.org`, `https://friendbot-futurenet.stellar.org` — see `@shared/constants/stellar.ts FRIENDBOT_URLS`). Friendbot creates + funds the account with test XLM.
   - **Mainnet:** there is no faucet. "Add XLM" routes to **AddFunds** (`views/AddFunds`) which offers **Buy with Coinbase** (on-ramp token via `useGetOnrampToken`) OR **"Transfer from another account"** → shows the receive screen. Funding = someone sends ≥1 XLM to your address.
6. **Receive / view address** (`views/ViewPublicKey/index.tsx`) — QR code of the `G...` public key, label **"Wallet Address"**, a truncated address, a **COPY** button, and **"View on stellar.expert"**. This is the canonical "Receive" screen — there is no separate concept; you just hand out your `G...`.
7. **Add an asset / trustline** (`views/ManageAssets` → `ChooseAsset` / `SearchAsset` / `AddAsset`) — before you can hold any non-XLM asset (e.g. USDC) you must **add a trustline**. UI: search by asset name (`placeholder: "Search for asset name"`), warning *"Multiple assets have a similar code, please check the domain before adding."*, then **Add Asset trustline** (confirmed via a `Trustline` pill in `ModalInfo`). Each trustline raises your account's required minimum XLM balance.
8. **Send** (`views/Send` → `components/InternalTransaction/*`) — choose recipient, asset, amount, optional memo, review, sign with password. Edge cases the UI handles explicitly (from `locales/en/translation.json`):
   - **"The destination account doesn't exist."** / **"Destination account doesn't exist"** — sending to an un-created address.
   - **"To create a new account you need to send at least 1 XLM to it."** — sending XLM to an unfunded address *creates* it (the create-account semantics).
   - Blockaid warnings: *"This is a new account and needs 1 XLM in order to get started. Any transaction to send non-XLM to an unfunded account will fail."* and *"…needs at least 1 XLM to be created. Sending less than 1 XLM to create it will fail."*
   - **"Destination account does not accept this asset"** / *"The destination account must opt to accept this asset before receiving it."* — recipient lacks the trustline.
   - **Memo requirement** warnings — some exchange destinations require a memo to route the deposit.

### B. Connect to a dApp (the "connect wallet" users know)

`views/GrantAccess/index.tsx` — a dApp requests access (url + uuid via query params). Freighter shows the requesting **domain**, the account identicon, a Blockaid domain-security scan, and **grant/reject** buttons (`grantAccess`/`rejectAccess`). After granting, the dApp can request signatures (`SignTransaction`, `SignMessage`, `SignAuthEntry`). The wallet **never holds keys for the dApp** — it signs and returns.

### C. Passkey / smart-account (`C...`) onboarding — the contract-account model

From `reference/passkey-kit/README.md` and `reference/smart-account-kit/`:

1. **Create wallet** — `kit.createWallet('My App', 'user@example.com', { autoSubmit: true })`. This (a) creates a **WebAuthn passkey** (secp256r1) via the browser/OS prompt, then (b) **deploys a smart-account contract**, returning a **`contractId` (a `C...` address)** + a `credentialId`. There is no mnemonic and no password — the passkey *is* the signer.
2. **The address is a `C...`, not a `G...`.** It is a Soroban contract address, deterministically tied to the deployed wallet contract (WASM hash + WebAuthn verifier). Discovery is via an indexer: `discoverContractsByCredential(credentialId)` / `discoverContractsByAddress(address)` — because the address isn't derivable from a public key the way a `G...` is.
3. **Connect / restore** — `connectWallet()` silently restores from stored session (IndexedDB); `connectWallet({ prompt: true })` prompts passkey selection; `{ contractId: 'C...' }` connects to a specific wallet. Session persistence means returning users don't re-onboard.
4. **Funding a `C...` cannot use Friendbot directly.** Friendbot only creates *classic* `G...` accounts. The smart-account-kit's `fundWallet(nativeTokenContract)` (impl in `src/kit/tx-ops.ts`) works around this on testnet by:
   - generating a **temporary random `G...` keypair**,
   - **Friendbot-funding that temp `G...`** (`${FRIENDBOT_URL}?addr=<temp G>`),
   - then doing a **token transfer from the temp account into the `C...` via the native-XLM Stellar Asset Contract** (`invokeHostFunction` → `transfer`), keeping a `FRIENDBOT_RESERVE_XLM = 5` reserve on the temp account.
   - It refuses on non-testnet: *"fundWallet() only works on testnet."*
   `createWallet(..., { autoFund: true, nativeTokenContract })` wires this in automatically (testnet only).
5. **Gasless via relayer** — smart-account-kit supports a `relayerUrl` (OpenZeppelin Relayer) for **fee-sponsored / gasless** transactions; passkey-signed `{ func, auth }` (or `{ xdr }` for deployments) are posted to the relayer for submission. This is the mechanism that lets a `C...` user act without holding/managing XLM for fees.

---

## Address model & mental model

| | Classic account (`G...`) | Contract / smart account (`C...`) |
|---|---|---|
| Format | `G` + 55 base32 chars (Ed25519 public key, StrKey-encoded) | `C` + 55 base32 chars (Soroban contract address) |
| Derived from | the keypair public key (offline-derivable) | deployment (WASM hash + ctor args); **NOT** derivable from a key — must be discovered/indexed |
| Signer | Ed25519 secret key (mnemonic-backed) | WebAuthn passkey (secp256r1) / policy signers / multisig |
| Recovery | 12/24-word BIP-39 mnemonic | passkey + indexer discovery (no seed phrase) |
| Exists when | **funded** (account entry created on ledger) | **deployed** (contract instance on ledger) |
| Fund via Friendbot? | **Yes** (testnet, directly) | **No** — must route XLM through a temp `G...` + SAC transfer, or a relayer/sponsor |

**Core mental model to preserve:**
- **Address ≠ account.** A `G...` you generated is inert until funded; the network returns "account does not exist" for it. Users see this as the **NotFundedMessage** state, not an error.
- **Account creation = the first funding.** The act of sending ≥1 XLM (the `createAccount` operation under the hood) is what brings the account into existence. There is no separate "register" step.
- **Minimum balance is real and grows.** From `@shared/helpers/stellar.ts`: `minimumBalance = (BASE_RESERVE_MIN_COUNT[=2] + subentry_count + num_sponsoring − num_sponsored) × BASE_RESERVE[=0.5 XLM] + sellingLiabilities`. So a bare account locks **1 XLM** (2 × 0.5), and **every trustline / offer / data entry is a subentry that locks another 0.5 XLM.** Spendable balance < total balance, always.
- **To hold any non-XLM asset (USDC, etc.) you must first add a trustline** — an explicit opt-in to the (asset_code, issuer) pair. No trustline → the asset literally cannot land in your account, and senders get *"Destination account does not accept this asset."* Each trustline costs 0.5 XLM of reserve.
- **You cannot send a non-XLM asset to an unfunded/un-trusting recipient.** The recipient must (1) exist (be funded) and (2) hold the trustline first.
- **Memos matter for shared/custodial destinations** — exchanges use one address + a memo per user; omitting it loses funds.

---

## Notable UX patterns (worth reusing)

- **Unfunded-account empty state as a first-class screen**, not an error: a friendly "fund it with at least 1 XLM" notification + a **one-click Friendbot button on testnet** + an "Add XLM"/on-ramp path on mainnet + a "Learn more about account creation" link. (`NotFundedMessage`.)
- **Receive screen = QR + label "Wallet Address" + truncated address + COPY + explorer link.** Minimal, single-purpose. (`ViewPublicKey`.)
- **Add-funds is a two-method chooser:** "Buy with Coinbase" (on-ramp) vs "Transfer from another account" (QR/receive). Clear separation of fiat vs crypto funding. (`AddFunds`.)
- **Trustline add is search-first with a domain-disambiguation warning** ("Multiple assets have a similar code, please check the domain before adding") — anti-phishing for look-alike asset codes. (`SearchAsset`.)
- **Recovery-phrase ceremony**: a blocking modal of risk statements before the words are ever shown; a confirm step; an explicit (but quiet) "Do this later" escape hatch. (`MnemonicPhrase`.)
- **dApp connect** shows domain + identicon + security scan + grant/reject; signing is per-request and key-custody never leaves the wallet. (`GrantAccess`, `SignTransaction`.)
- **Reserve transparency**: balances UI distinguishes `total`, `available`, and `Reserved Balance*` with the footnote *"All Stellar accounts must maintain a minimum balance of lumens."* and a "Learn more about account reserves" link.
- **Passkey path = no seed, session-persistent**: `connectWallet()` silent-restores returning users; new users get an OS passkey prompt instead of a 24-word ceremony. (`smart-account-kit`.)

---

## Confusion points & open questions

1. **"My address doesn't work / funds didn't arrive."** Likely the recipient account is unfunded (doesn't exist yet) or lacks the trustline for that asset. Two distinct failure modes that look the same to a user.
2. **"Why is part of my XLM locked?"** The 1-XLM base reserve + 0.5 XLM per trustline/subentry. Users often don't realize adding USDC costs them 0.5 XLM of locked reserve.
3. **`G...` vs `C...` are not interchangeable in users' heads.** A passkey `C...` wallet has no seed phrase to "back up," and its address can't be regenerated from a key — recovery depends on the passkey + indexer, which is an unfamiliar model for anyone coming from MetaMask/Freighter classic.
4. **Friendbot does not fund a `C...`.** Any onboarding that mints a contract account on testnet must implement the temp-`G...`→SAC-transfer dance (or a relayer/sponsor). This is non-obvious and a common stumbling block. (Confirmed in `smart-account-kit/src/kit/tx-ops.ts`.)
5. **Mainnet has no faucet** — first funding must come from an exchange/on-ramp/another wallet. The "create your account" moment is gated on real money on mainnet.
6. **Memo-required destinations** can silently misroute funds; the wallet warns but the burden is on the user.
7. **Open Q for our wallet (not answered here):** for a ZK + smart-account `C...` wallet, what is the funding bootstrap on mainnet (sponsored reserves via `beginSponsoringFutureReserves`? relayer-paid deployment?), and how do we present "your wallet isn't deployed yet" vs Freighter's "your account isn't funded yet" — same mental model, different on-chain cause.

---

## Sources

- `reference/freighter/extension/src/popup/views/Welcome/index.tsx` — onboarding entry (create vs recover).
- `reference/freighter/extension/src/popup/views/AccountCreator/index.tsx` + `components/accountCreator/PasswordForm` — password/key creation.
- `reference/freighter/extension/src/popup/views/MnemonicPhrase/index.tsx` — recovery-phrase ceremony copy.
- `reference/freighter/extension/src/popup/components/account/NotFundedMessage/index.tsx` — unfunded-account empty state + "Fund with Friendbot" / "Add XLM".
- `reference/freighter/extension/src/popup/views/AddFunds/index.tsx` — Coinbase on-ramp vs transfer chooser.
- `reference/freighter/extension/src/popup/views/ViewPublicKey/index.tsx` — receive (QR + copy + explorer).
- `reference/freighter/extension/src/popup/views/ManageAssets/index.tsx` + `components/manageAssets/{SearchAsset,AddAsset,ChooseAsset}` — trustline add flow.
- `reference/freighter/extension/src/popup/views/GrantAccess/index.tsx` — dApp connect/sign.
- `reference/freighter/extension/src/popup/locales/en/translation.json` — exact funding/trustline/destination copy strings (lines ~87–88, 167–168, 591–593, 640).
- `reference/freighter/@shared/constants/stellar.ts` — `FRIENDBOT_URLS`, `BASE_RESERVE = 0.5`, `BASE_RESERVE_MIN_COUNT = 2`, network details.
- `reference/freighter/@shared/helpers/stellar.ts` (≈ln 124–129) — minimum-balance formula incl. subentries/sponsorship.
- `reference/passkey-kit/README.md` — `createWallet`/`createKey`/`connectWallet`, `contractId` (`C...`), relayer dependency, legacy-precursor note.
- `reference/smart-account-kit/README.md` — `C...` model, `discoverContractsBy*` (indexer), `fundWallet`/`autoFund`, relayer fee-sponsoring, `FRIENDBOT_RESERVE_XLM`.
- `reference/smart-account-kit/src/kit/tx-ops.ts` (`fundWallet`, ≈ln 461–550) — the temp-`G...` → Friendbot → native-SAC-transfer funding mechanism that proves Friendbot cannot fund a `C...` directly; testnet-only guard.
- `reference/smart-account-kit/src/constants.ts` — `FRIENDBOT_URL`, `FRIENDBOT_RESERVE_XLM = 5`, `BASE_FEE`.
- developers.stellar.org (accounts / base reserves / Friendbot / trustlines) — corroborates: account must be funded to exist, base reserve 0.5 XLM, min 2 base reserves, each subentry +0.5 XLM, trustline = opt-in to hold an asset, Friendbot funds testnet `G...` accounts.

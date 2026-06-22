# Stellar Browser-Extension Wallet Architecture — Research Brief

> Goal: map how real Stellar extension wallets are built so we can fork/learn rather than start from zero, for a NEW MetaMask-style Stellar extension wallet (with privacy/ZK features later).
> Primary source: **Freighter** — the canonical open-source Stellar extension wallet by SDF.
> Clone: `/Users/abu/dev/hackathon/stellar-research/repos/freighter` (shallow, `git clone --depth 1`, succeeded). Pinned commit `2cca02a`, extension version **5.42.0**.

---

## 1. Freighter at a glance

- **Repo:** https://github.com/stellar/freighter (Apache-2.0).
- **Monorepo** via Yarn 4 workspaces (`packageManager: yarn@4.10.0`, Node >=22). Root `package.json` `workspaces`:
  - `@shared/api`, `@shared/constants`, `@shared/helpers` — shared logic reused by both the extension and the public API package.
  - `extension` — the actual browser extension (popup UI + background + content script).
  - `@stellar/freighter-api` — the **public npm SDK** dApps install to talk to the wallet (the dApp-side bridge).
  - `docs` — Netlify docs site.
- **Build tooling:** **Webpack 5** (NOT Vite). Configs at `extension/webpack.common.js`, `extension/webpack.dev.js`, `extension/webpack.extension.js`. TypeScript via `ts-loader` (transpileOnly) + `babel`. Lots of Node polyfills in `resolve.fallback` (buffer, stream, crypto, process) because `stellar-sdk` is Node-shaped.
- **Manifest: V3.** Source of truth is committed JSON, copied by webpack `CopyWebpackPlugin` to `build/manifest.json`:
  - `extension/public/static/manifest/v3.json` (also a legacy `v2.json` kept for Firefox parity).

### Manifest V3 shape (`extension/public/static/manifest/v3.json`)
```json
{
  "manifest_version": 3,
  "background": { "service_worker": "background.min.js", "scripts": ["background.min.js"] },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["contentScript.min.js"], "run_at": "document_start" }],
  "action": { "default_popup": "index.html" },
  "side_panel": { "default_path": "index.html?mode=sidebar" },
  "permissions": ["storage", "alarms", "sidePanel"]
}
```
Note how minimal the permissions are: just `storage`, `alarms` (auto-lock timer), `sidePanel`. The popup, side panel, and signing windows are **all the same `index.html`** (one React app, routed by URL/hash).

---

## 2. The three extension contexts (the canonical split)

Webpack builds **three entry points** (`extension/webpack.common.js` → `entry`):

| Context | Entry file | Built file | Role |
|---|---|---|---|
| **Background (service worker)** | `extension/public/background.ts` → `extension/src/background/index.ts` | `background.min.js` | Holds all secrets & signing. Long-lived logic, message router, session/auto-lock. |
| **Popup / UI** | `extension/src/popup/index.tsx` | `index.html` + `index.min.js` | React app. The wallet UI, also reused for the signing-confirmation windows and side panel. |
| **Content script** | `extension/public/contentScript.ts` | `contentScript.min.js` | Injected into every page (`<all_urls>`); a thin relay between the page and the background. |

> Filenames for background/contentScript are **not hashed** because `manifest.json` hardcodes `background.min.js` / `contentScript.min.js` (comment in `webpack.common.js`).

### Background module (`extension/src/background/`)
- `index.ts` — wires up listeners; `public/background.ts` calls `initContentScriptMessageListener`, `initExtensionMessageListener`, `initInstalledListener`, `initAlarmListener`, `initSidebarBehavior`, `initSidebarConnectionListener`.
- `messageListener/`
  - `freighterApiMessageListener.ts` — handles **external (dApp) requests** (request access, sign tx, sign blob, sign auth entry, add token). Opens confirmation windows, queues the request, resolves when user approves.
  - `popupMessageListener.ts` — handles **internal (UI) requests**; owns the in-memory queues (`transactionQueue`, `responseQueue`, `authEntryQueue`, `blobQueue`, `tokenQueue`).
  - `handlers/` — ~70 individual handlers, one file each (`signTransaction.ts`, `signFreighterTransaction.ts`, `signAuthEntry.ts`, `signBlob.ts`, `createAccount.ts`, `importAccount.ts`, `recoverAccount.ts`, `getMnemonicPhrase.ts`, `grantAccess.ts`, `rejectTransaction.ts`, …). Clean one-handler-per-file pattern.
- `ducks/session.ts` — Redux store living **inside the service worker** holding session state (active public key, the in-memory hash key, allAccounts).
- `helpers/` — `session.ts` (crypto + auto-lock), `dataStorage.ts` / `dataStorageAccess.ts` (storage abstraction over `browser.storage`), `account.ts` (network details, RPC health), `allowListAuthorization.ts` (dApp allow-list), `cachedFetch.ts`, `migration.ts`.

### Content script (`extension/src/contentScript/helpers/redirectMessagesToBackground.ts`)
The entire content script is one function. It:
1. Listens for `window` `message` events from the page.
2. Filters: only `event.source === window`, only messages tagged `source === EXTERNAL_MSG_REQUEST`, only known `EXTERNAL_SERVICE_TYPES` (unless dev mode).
3. Forwards via `browser.runtime.sendMessage(event.data)` to the background.
4. Posts the response back to the page with `window.postMessage({ source: EXTERNAL_MSG_RESPONSE, ... })`.

This is the classic **page ⇄ content-script (window.postMessage) ⇄ background (runtime.sendMessage)** bridge. Freighter does NOT inject a `window.freighter` provider object into the page — instead the dApp imports the `@stellar/freighter-api` npm package, which does the `window.postMessage` itself.

---

## 3. The dApp ⇄ extension bridge (how signing is exposed)

This is the most copyable part. Flow for `signTransaction`:

```
dApp code
  └─ import { signTransaction } from "@stellar/freighter-api"
       (@stellar/freighter-api/src/signTransaction.ts)
  └─ @shared/api/external.ts  → submitTransaction()
  └─ @shared/api/helpers/extensionMessaging.ts → sendMessageToContentScript(msg)
       posts window.postMessage({ source: EXTERNAL_MSG_REQUEST, messageId, ...msg })
       and awaits a matching EXTERNAL_MSG_RESPONSE (matched by messageId; 2s timeout
       for isConnected/requestPublicKey so it resolves even when Freighter isn't installed)
        │
content script (redirectMessagesToBackground.ts)
  └─ browser.runtime.sendMessage(data)  → background
        │
background (freighterApiMessageListener.ts)
  └─ check allow-list (isSenderAllowed). If new origin → openSigningWindow("/grant-access?…")
  └─ push request onto transactionQueue + a response callback onto responseQueue (keyed by uuid)
  └─ open a popup window at index.html#/sign-transaction?… (the React UI)
        │
user reviews & approves in the React popup
  └─ popup dispatches an internal message → handlers/signTransaction.ts
       - reads KEY_ID from local storage
       - decrypts the private key from the in-memory session (getEncryptedTemporaryData)
       - Sdk.Keypair.fromSecret(privateKey); transaction.sign(keys); toXDR()
       - calls the queued response(signedXdr, publicKey) → resolves the dApp's promise
```

**Public API surface** (`@stellar/freighter-api/src/index.ts`): `requestAccess`, `getAddress`, `getNetwork`, `getNetworkDetails`, `isConnected`, `isAllowed`, `setAllowed`, `addToken`, `signTransaction`, `signMessage`, `signAuthEntry`, `watchWalletChanges`.

- `signTransaction(xdr, { networkPassphrase?, address? })` → `{ signedTxXdr, signerAddress, error? }`.
- `signAuthEntry` / `signMessage` exist specifically for **Soroban** (auth entries) and arbitrary message signing.
- Errors are returned as `{ error: { code, message } }` (e.g. `code -4 = user rejected`), never thrown — a good UX pattern to copy.

> **Takeaway:** the security boundary is hard — the page can only post structured messages; raw keys never leave the background service worker, and every signing op requires an explicit user-approval window.

---

## 4. Key storage, KDF & signing (the crypto)

**Libraries** (`extension/package.json`):
- `@stellar/typescript-wallet-sdk-km@1.9.0` — the **KeyManager** (`KeyManager`, `KeyType.plaintextKey`, `ScryptEncrypter`). This is SDF's official key-management lib; it does **scrypt**-based at-rest encryption of the keystore.
- `stellar-hd-wallet@1.0.2` — BIP-39 mnemonic → Stellar HD keypairs.
- `stellar-sdk` = `@stellar/stellar-sdk@16.0.0-rc.1` (aliased; also `stellar-sdk-next` as a second alias for forward-compat). Used for `Keypair`, `TransactionBuilder`, `Horizon.Server`, signing.

**Two-layer key model** (key files: `extension/src/background/messageListener/helpers/store-account.ts`, `extension/src/background/helpers/session.ts`):

1. **At-rest keystore** — `KeyManager.storeKey({ key: {type: plaintextKey, publicKey, privateKey, extra:{mnemonicPhrase}}, password, encrypterName: ScryptEncrypter.name })`. Encrypted with the user's **password via scrypt**, persisted in extension storage. Loaded back with `keyManager.loadKey(keyID, password)` (`helpers/unlock-keystore.ts`).

2. **In-session “temporary store”** — so the user doesn't re-type the password for every action while unlocked:
   - On unlock, `deriveKeyFromString(password)` derives a CryptoKey via **WebCrypto PBKDF2-SHA256, 600,000 iterations**, 32-byte key, random salt.
   - That key (the "hash key") is held **in memory only**, in the background Redux store (exported as JWK string, never persisted).
   - The private key + mnemonic are then encrypted with **AES-CBC** (random 16-byte IV prepended) and written to a `TEMPORARY_STORE_ID` blob in local storage (`storeEncryptedTemporaryData`).
   - To sign, `getEncryptedTemporaryData` pulls the hash key from memory, decrypts the AES-CBC blob, returns the secret, signs, discards.
   - **Auto-lock:** `SessionTimer` uses `browser.alarms` (named `session-timer`); on timeout `clearSession()` wipes the in-memory hash key and removes `TEMPORARY_STORE_ID` — so after lock, nothing in persistent storage is decryptable without the password. (Service workers die anyway, so memory-only secrets are effectively cleared on idle.)

> Crypto summary to copy: **scrypt (KeyManager) for at-rest** + **PBKDF2 600k → AES-CBC for the warm session** + **memory-only session key** + **alarm-based auto-lock**. All standard WebCrypto (`crypto.subtle`), no exotic deps.

Signing itself is dead simple (`handlers/signTransaction.ts` / `signFreighterTransaction.ts`):
```ts
const Sdk = getSdk(networkPassphrase);                 // @shared/helpers/stellar.ts
const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
transactionToSign.sign(sourceKeys);                    // adds signature
const signedXdr = transactionToSign.toXDR();
```

---

## 5. Network / RPC layer

- **Network constants:** `@shared/constants/stellar.ts`
  - Horizon URLs: pubnet `https://horizon.stellar.org`, testnet `https://horizon-testnet.stellar.org`, futurenet.
  - Soroban RPC URLs: testnet `https://soroban-testnet.stellar.org/`, futurenet `https://rpc-futurenet.stellar.org/` (pubnet uses an internal SDF host).
  - Friendbot (testnet funding), network passphrases (`Networks.PUBLIC` / `TESTNET`), base reserve.
  - `NetworkDetails` interface = `{ network, networkName, networkUrl, networkPassphrase, sorobanRpcUrl?, friendbotUrl? }`. Custom networks supported (`CUSTOM_NETWORK = "STANDALONE"`).
- **Horizon client:** `@shared/api/helpers/stellarSdkServer.ts` → `new Sdk.Horizon.Server(networkUrl, { allowHttp })`, plus a `submitTx` that auto-retries on Horizon 504s.
- **Soroban RPC:** `getSorobanRpcUrl` (`@shared/helpers/soroban/sorobanRpcUrl`); RPC health checked via the indexer (`getIsRpcHealthy`, `verifySorobanRpcUrls` in `background/helpers/account.ts`).
- **Indexer/backend:** Freighter has its **own backend** (`INDEXER_URL` / `INDEXER_V2_URL`, required env vars) used for balance enrichment, Blockaid asset scanning (scam detection), icon/domain caching, memo-required lists. A hackathon clone can drop this and hit Horizon/RPC directly.
- **`getSdk(networkPassphrase)`** (`@shared/helpers/stellar.ts`) selects `stellar-sdk` vs `stellar-sdk-next` — a forward-compat shim; we only need one SDK.

---

## 6. UI stack

- **React 19** (`react@19.2.7`, `react-dom`), bootstrapped in `extension/src/popup/index.tsx` (`createRoot`).
- **State:** Redux Toolkit (`@reduxjs/toolkit@2.12`, `react-redux@9`) with a "ducks" pattern (`popup/ducks/*`, `background/ducks/*`). Redux is used in **both** the popup and the background service worker.
- **Routing:** `react-router-dom@7` (hash routes; signing windows are just routes like `#/sign-transaction`).
- **Design system:** `@stellar/design-system@3.2.8` (SDF's official component lib) + **Tailwind** (`tailwind.config.js`, postcss) + some Radix UI primitives (dialog, popover) + SASS modules. `@stellar/design-system/build/styles.min.css` imported globally.
- **Forms:** Formik. **i18n:** i18next (en, pt). **Errors/analytics:** Sentry + Amplitude.
- **Testing:** Jest + Testing Library (unit), **Playwright** for e2e (`extension/e2e-tests/`, `playwright.config.ts`).

---

## 7. Integration libraries to lean on

### a) Stellar Wallets Kit — `@creit-tech/stellar-wallets-kit` (by Creit Tech)
- Site: https://stellarwalletskit.dev/ · Repo: https://github.com/Creit-Tech/Stellar-Wallets-Kit
- Framework-agnostic **unified connector** so a dApp supports many wallets at once: **Freighter, xBull, Albedo, Rabet, Lobstr, Hana, Hot Wallet, Klever, WalletConnect, Ledger/Trezor**.
- Core API: `kit.getAddress()`, `kit.signTransaction(xdr, { networkPassphrase, address })`, `kit.createButton()` / `openModal()`, module system (`defaultModules()`).
- Install: `npx jsr add @creit-tech/stellar-wallets-kit` (JSR).
- **Relevance to us:** This is the *dApp* side, not the wallet side. We don't need it to *build* a wallet, BUT (1) it documents the de-facto wallet interface our extension should implement so existing dApps work with us, and (2) if our wallet exposes a Freighter-compatible or standard-wallet API, Wallets Kit picks us up for free. Study its `modules/` for the exact method contracts.

### b) `@stellar/stellar-sdk` (current docs via context7: `/stellar/js-stellar-sdk`)
- The core lib for **everything chain**: `Keypair`, `TransactionBuilder`, `Operation`, `Asset`, `Networks`, `Horizon.Server`, `rpc.Server` (Soroban), XDR codecs, `AssembledTransaction` for contract calls.
- Canonical build+sign+submit (Horizon):
  ```js
  const { Horizon, Networks, Asset, Keypair, Operation, TransactionBuilder } = require('@stellar/stellar-sdk');
  const server = new Horizon.Server('https://horizon-testnet.stellar.org');
  const account = await server.loadAccount(pubKey);
  const fee = await server.fetchBaseFee();
  const tx = new TransactionBuilder(account, { fee, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination, asset: Asset.native(), amount: '2' }))
      .setTimeout(30).build();
  tx.sign(Keypair.fromSecret(secret));
  await server.submitTransaction(tx);
  ```
- Soroban reads use `rpc.Server.simulateTransaction` (via `AssembledTransaction.build`). Browser bundling needs Node polyfills (buffer/stream/crypto) — exactly the `resolve.fallback` block Freighter has.
- This is **non-negotiable** for us; Freighter pins `@stellar/stellar-sdk@16.0.0-rc.1`.

### c) Passkeys / smart wallets — `passkey-kit` (kalepail / Tyler van der Hoeven)
- Repo: https://github.com/kalepail/passkey-kit
- Enables **keyless** smart-wallet signing on **Soroban**: a deployed smart-contract account whose signer is a **WebAuthn passkey (secp256r1)**. `PasskeyKit` (client: create/connect wallet, sign, manage signers), `PasskeyServer` (Mercury indexer lookup + relayer submission), `SACClient`. Depends on `@stellar/stellar-sdk` + WebAuthn + (optional) OpenZeppelin Relayer + launchtube/Mercury.
- **Status: experimental/demo, unaudited.** Repo states it's a "legacy precursor to OpenZeppelin Smart Accounts."
- **Hackathon verdict:** Viable and *very* demo-friendly (no seed phrase, biometric signing = great story), BUT it's a fundamentally different account model (contract account, not classic ed25519 G-address) with infra dependencies (relayer, indexer) and only works for Soroban-aware flows. **Recommendation: ship classic ed25519 keystore first (Freighter model), add passkey smart-wallet as a headline secondary mode / stretch — don't make it the only path.**

---

## 8. Other Stellar extension wallets (survey)

| Wallet | Open source? | Repo | Worth studying for |
|---|---|---|---|
| **Freighter** | ✅ Apache-2.0 | https://github.com/stellar/freighter | **Primary reference.** Canonical, SDF-backed, MV3, clean handler/queue architecture, official key-mgmt. |
| **xBull** | ✅ | https://github.com/Creit-Tech/xBull-Wallet | Feature-rich; **Angular** stack (different from React). Same team as Wallets Kit. Good for multi-account/contract UX ideas. |
| **Rabet** | ✅ open source | https://rabet.io/ (github org `rabet-io`) | Lightweight, minimal — good "small wallet" reference. |
| **Lobstr** | ✅ (extension) | https://github.com/Lobstrco/lobstr-browser-extension | Polished consumer UX; mostly a companion to their mobile/custodial app. |
| **Hana** | ❌ (closed, multichain) | — | Reference only via Wallets Kit interface; not forkable. |
| **Albedo** | ✅ (web, not extension) | github `stellar-expert/albedo` | Web-based signer (popup window, not extension) — interesting alt bridge model. |

**Conclusion of survey:** Freighter is the clear study/fork target (React, MV3, SDF-maintained, best-documented). xBull is the strong #2 but Angular. Rabet for minimalism.

---

## 9. Recommendation for our build

**Build fresh with a modern toolchain, but copy Freighter's architecture and lift its `@shared` crypto/bridge logic verbatim.** Reasoning:
- Freighter's repo is heavy (own backend/indexer, Sentry/Amplitude, i18n, side panel, hardware wallet, migrations, ~70 handlers). Forking the whole thing buries a first-time builder.
- But its **architecture is exactly right** and battle-tested: MV3, three entries, content-script `window.postMessage` ⇄ `runtime.sendMessage` bridge, per-request approval windows with a uuid-keyed response queue, scrypt-at-rest + PBKDF2/AES-CBC warm session + alarm auto-lock, one-handler-per-file.

> **Decision update, 2026-06-24:** this concrete extension plan is historical. Abu chose the QuickShield + bridge companion direction instead of a Freighter-compatible signing wallet. Keep the architecture notes for MV3/offscreen/session inspiration, but do not implement external public-key access or arbitrary dApp signing from this file.

Historical concrete plan:
1. Scaffold a fresh MV3 extension. (Freighter uses Webpack; **Vite + `@crxjs/vite-plugin` or `wxt`** is a faster modern DX — but keep Webpack if you want to copy Freighter's polyfill config wholesale. Either works.)
2. Three contexts mirroring Freighter: `background` (service worker, all secrets + signing), `popup` (React 19 + your design system; reuse routes for signing windows), `content-script` (the ~40-line relay from `redirectMessagesToBackground.ts`).
3. **Lift directly:** `@shared/helpers/session.ts` (KDF/AES session crypto + `SessionTimer`), `store-account.ts` / `unlock-keystore.ts` (KeyManager scrypt), `extensionMessaging.ts` + `redirectMessagesToBackground.ts` (the bridge). These are clean and dependency-light.
4. Keys/chain: `@stellar/typescript-wallet-sdk-km` + `stellar-hd-wallet` + `@stellar/stellar-sdk` (Horizon + Soroban `rpc.Server`). Talk to public Horizon/RPC directly — **skip the Freighter backend/indexer** for the hackathon.
5. Historical only: expose a **Freighter-compatible API** (same method names/shapes) so the **Stellar Wallets Kit** and existing dApps detect us with zero dApp changes.
6. Historical only: privacy/ZK + passkeys: keep the classic ed25519 keystore as the base; layer **passkey-kit smart-wallet mode** as the differentiating headline feature, and design the signing handler so a ZK/privacy signing path can slot in alongside `signTransaction`.

---

## Key file paths (in `/Users/abu/dev/hackathon/stellar-research/repos/freighter`)

- Manifest: `extension/public/static/manifest/v3.json`
- Entries: `extension/public/background.ts`, `extension/public/contentScript.ts`, `extension/src/popup/index.tsx`
- Webpack: `extension/webpack.common.js`, `extension/webpack.extension.js`
- Bridge (dApp side): `@stellar/freighter-api/src/*` + `@shared/api/helpers/extensionMessaging.ts`
- Bridge (content script): `extension/src/contentScript/helpers/redirectMessagesToBackground.ts`
- Bridge (background): `extension/src/background/messageListener/freighterApiMessageListener.ts`, `.../popupMessageListener.ts`, `.../handlers/*`
- Crypto/session: `extension/src/background/helpers/session.ts`, `.../messageListener/helpers/store-account.ts`, `.../unlock-keystore.ts`
- Signing: `extension/src/background/messageListener/handlers/signTransaction.ts`, `signFreighterTransaction.ts`
- Network/SDK: `@shared/constants/stellar.ts`, `@shared/helpers/stellar.ts` (`getSdk`), `@shared/api/helpers/stellarSdkServer.ts`

## Doc links
- Freighter: https://github.com/stellar/freighter · docs https://docs.freighter.app/
- Stellar Wallets Kit: https://stellarwalletskit.dev/ · https://github.com/Creit-Tech/Stellar-Wallets-Kit
- Stellar JS SDK: https://github.com/stellar/js-stellar-sdk · https://developers.stellar.org/docs/tools/sdks
- passkey-kit: https://github.com/kalepail/passkey-kit
- Wallet integration overview: https://developers.stellar.org/docs/tools/developer-tools/wallets
- xBull: https://github.com/Creit-Tech/xBull-Wallet · Rabet: https://rabet.io/ · Lobstr: https://github.com/Lobstrco/lobstr-browser-extension

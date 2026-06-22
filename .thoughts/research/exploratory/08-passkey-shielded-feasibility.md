# 08 — Passkey + Shielded: Feasibility of a Seed-Phrase-Free Shielded Wallet (2026)

**Question:** Can we build a Stellar shielded-payments browser-extension wallet (MV3, WXT/Vite +
React) where the user logs in with a passkey / Face ID — **no seed phrase** — and the shielded
**spending + viewing keys are derived from the passkey**? The crux: a shielded pool needs
*deterministic* spend/view keys, but a passkey's private key is **non-extractable**. The proposed
bridge is the **WebAuthn PRF extension**. Validate or refute.

**VERDICT: FEASIBLE — and it's the right architecture for a hackathon build.** The WebAuthn PRF
extension is real, shipping by default in Chrome 132+ (and ≈147 for PRF-on-create), and returns a
**stable, deterministic 32-byte secret** for the same `credential + salt`. That 32-byte secret is
exactly the "master seed" that every shielded protocol (Zcash ZIP-32, Railgun) already expands into
spend/view keys via a KDF. So the data flow `passkey → PRF → HKDF → shielded seed → spend/view keys`
is sound and has direct prior art (wwWallet, Dashlane, multiple demo libs). The **on-chain** half is
*separately* solved by Stellar's Protocol 21 `secp256r1` host function + passkey smart accounts
(passkey-kit / OpenZeppelin Smart Accounts), which use the passkey's **signature** (not PRF) to
authorize shield/unshield txns. Two independent uses of one passkey.

**The honest caveat — this is the one real risk:** binding *encryption material* to a passkey is
controversial. If the user deletes the passkey, the shielded keys are **gone forever** (Tim Cappalli's
"stop using passkeys for encryption" warning). PRF availability is also still uneven on some
authenticator/OS combos. Both are **mitigable** (envelope encryption + an exportable recovery secret +
a PRF-capability gate), and for a hackathon they're acceptable with eyes open. Do **not** ship without
a recovery path.

---

## 1. WebAuthn PRF reality check

### What PRF is
PRF (Pseudo-Random Function) is a WebAuthn extension. The authenticator holds a per-credential secret;
given an RP-supplied **salt**, it computes `HMAC(credential_secret, "WebAuthn PRF"‖0x00‖salt)` and
returns a **deterministic 32-byte output**. It is a *random oracle*: same `credential + salt` ⇒ same 32
bytes, every time, forever; different salt ⇒ unrelated 32 bytes. The browser maps the FIDO2
`hmac-secret` CTAP extension to the web-facing `prf` extension — `hmac-secret` is the authenticator-level
primitive, `prf` is what you call from JS. ([MDN WebAuthn extensions], [Yubico PRF], [Levi Schuck])

### Is it deterministic / stable across sessions and synced devices? — YES (with named caveats)
- **Across sessions on the same credential: deterministic by construction.** This is the whole point
  of the extension. ([MDN])
- **Across synced devices (iCloud Keychain / Google Password Manager): YES.** The credential secret
  syncs with the passkey, so the PRF output is identical on every device that holds the synced passkey.
  Community testing reports **~100% PRF-on-create success** on the synced providers (Apple Passwords,
  Google Password Manager). ([Corbado 2026])
- **Caveats that are real:**
  - **iOS 18.0–18.3 had a cross-device-auth data-loss bug**, fixed in **18.4+**. ([Corbado])
  - **Apple does not pass PRF/extension data to external security keys (YubiKey) on iOS/iPadOS** —
    hardware-key-backed PRF is blocked on Apple mobile. Platform authenticators (Face ID / Touch ID)
    are fine. ([Yubico Dev Guide])
  - PRF binds to the *credential*, not the user. A second passkey = a second, **different** PRF secret.
    You must plan for multiple credentials (see §4 envelope encryption), not assume one global key.

### Platform / browser support matrix (mid-2026)
| Platform | Browser | PRF auth | PRF-on-create | Notes |
|---|---|---|---|---|
| macOS 15+ | Chrome 132+ | ✅ | ✅ | platform authenticator **and** security keys |
| macOS 15+ | Safari 18+ | ✅ | ✅ | iCloud Keychain (platform only) |
| macOS | Firefox 139+ | ✅ | ✅ | platform authenticator |
| Windows 11 (KB5077181+) | Chrome/Edge 147+ | ✅ | ✅ | needs `WEBAUTHN_API_VERSION_8`; Windows Hello returns PRF post-update |
| Windows 11 | Chrome/Edge 146 | ✅ | ❌ | auth only, no create |
| Windows 11 | Firefox 148+ | ✅ | ✅ | |
| iOS/iPadOS 18.4+ | Safari / all (WebKit) | ✅ | ✅ | iCloud Keychain only; **no** PRF to external keys |
| Android | Chrome/Edge/Samsung | ✅ | ✅ | Google Password Manager passkeys include PRF by default |
| Android | Firefox | ❌ | ❌ | not yet |

Source: [Corbado 2026], [Yubico], [chromestatus PRF]. Bottom line: **our target stack (Chrome/Edge
desktop + Android, platform authenticators / Face ID / Touch ID / Windows Hello) is fully covered.**
Firefox-on-Android and external YubiKeys on Apple mobile are the gaps.

### Does PRF work in a browser-EXTENSION context (MV3 popup / service worker)? — YES
This is the part most teams get wrong, so it's the most important confirmation:
- **Chrome 122+ and Firefox 150+ let extensions call `navigator.credentials.create()/.get()` and set
  an `rp.id` for any domain in the extension's `host_permissions`** — the normal "RP ID must match the
  page origin" rule is relaxed for extensions. ([MDN — Use WebAuthn in extensions], [Chrome 129 blog])
- In an extension, the WebAuthn **origin becomes `chrome-extension://<extension-id>`**, which equals
  the popup's `location.origin`. Pick a **stable RP ID** (a domain you control, listed in
  `host_permissions`) so the credential isn't tied to the volatile extension ID. ([MDN])
- **Call WebAuthn from the popup (a DOM/UI context with a user gesture), not the service worker.**
  WebAuthn needs a user activation + a window; MV3 service workers have no DOM. The popup does the
  `create/get`, derives the seed, and hands only what's needed to the worker. (General WebAuthn
  user-gesture requirement; [MDN WebAuthn API].)
- Gotcha: extension-created credentials report a `chrome-extension://` origin in `clientDataJSON` — any
  server-side verifier must allow that origin format. For us this is mostly moot (PRF/seed work is
  client-side), but the smart-account `secp256r1` signature is verified **on-chain** against the raw
  authenticatorData/clientDataJSON, which the Soroban verifier handles regardless of origin string.

### API shape (the load-bearing detail)
```js
// REGISTER — request PRF; some authenticators only return enabled:true here, not a value
const cred = await navigator.credentials.create({ publicKey: {
  rp: { id: "wallet.example.com", name: "Shielded Wallet" }, // domain in host_permissions
  user: { id, name, displayName },
  challenge, pubKeyCredParams: [{ type: "public-key", alg: -7 }], // -7 = ES256 / secp256r1
  authenticatorSelection: { residentKey: "required", userVerification: "required" },
  extensions: { prf: { eval: { first: SALT } } },   // SALT = fixed per-purpose app constant
}});
const reg = cred.getClientExtensionResults();
// reg.prf.enabled === true  -> PRF supported; reg.prf.results?.first may be present (Chrome 147+)

// DERIVE (every session) — get() reliably returns the value on all PRF authenticators
const asn = await navigator.credentials.get({ publicKey: {
  challenge, allowCredentials: [{ type: "public-key", id: credIdBytes }],
  userVerification: "required",
  extensions: { prf: { evalByCredential: { [base64urlCredId]: { first: SALT } } } },
}});
const prf = asn.getClientExtensionResults().prf.results.first; // 32 bytes — the master IKM
```
**Two-call pattern:** treat `create()` as "is PRF enabled?" and always call `get()` to obtain the
actual 32 bytes — older/cross-platform authenticators return `enabled:true` on create but only emit the
value on assertion. ([MDN], [oblique-security demo], [SimpleWebAuthn PRF])

---

## 2. Prior art — deriving deterministic keys / seeds from PRF

PRF-as-key-material is an established pattern, including the *exact* "derive a wallet/shielded seed"
shape:

- **wwWallet** — production EUDI digital-identity wallet; its non-custodial security model is **built on
  the WebAuthn PRF extension** to derive the vault encryption key. ([Corbado])
- **Dashlane** — replaced master passwords by deriving the **vault decryption key from passkey PRF**.
  ([Corbado])
- **Bitwarden** — uses PRF for passkey-based vault unlock. ([Bitwarden blog])
- **Confer.to** — E2E-encrypted AI chat where login *is* the key-derivation via PRF (incl. TPM/Linux).
  ([Confer blog], [vitorpy TPM/FIDO2/PRF])
- **`prf-passkey`** (Dorky-Robot) — production-leaning **TypeScript** lib, SimpleWebAuthn-based,
  `neverthrow` error handling, 96%+ coverage. `registerPasskey()` / `authenticateAndDeriveKey()`
  return the derived key as ArrayBuffer + hex. `npm i prf-passkey`. ([repo])
- **`oblique-security/webauthn-prf-demo`** — minimal but textbook: `create` with `prf.eval.first`, then
  `get`, then **PRF output → HKDF-SHA256 (info = "note-encryption-key") → AES-GCM**. Exactly our KDF
  step. ([repo])
- **`leanthebean/passkey_prf_playground`**, **`passkeyprf.com`**, **Levi Schuck's demo** — reference
  implementations of the register/derive flow.

**Shielded-specific:** the missing-link insight is that you don't need a project that *both* uses PRF
*and* is a shielded wallet — you need (a) "PRF → 32-byte seed" (above) glued to (b) "32-byte seed →
shielded keys", which is **already standardized**:
- **Zcash ZIP-32** derives spending key → full/incoming **viewing keys** → payment addresses from a
  master seed using `PRF^expand` (a labelled HKDF-like expansion). ([ZIP-32])
- **Railgun** derives **Spending Key** and **Viewing Key** from a single seed via BIP-32-style
  derivation. ([Railgun wallets-and-keys])

So: feed the PRF 32 bytes in as the master seed where these protocols expect a BIP-39/seed input. No
seed phrase ever exists — the passkey *is* the seed source. (No turnkey "passkey → Zcash/Railgun"
library exists yet; you wire the two proven halves together. That gluing is also the novelty.)

---

## 3. Stellar-specific — passkey smart accounts (the on-chain half)

**Protocol 21 added the `secp256r1` verification curve as a Soroban host function**
(`env.crypto().secp256r1_verify(&pk, &payload, &sig)`). secp256r1 is the curve WebAuthn passkeys use,
so a Soroban contract can verify a passkey assertion **on-chain** — first-class passkey smart wallets.
([kalepail "passkey future", Stellar discussion #1499])

- **`kalepail/passkey-kit`** (TS SDK) — `createWallet()` makes a WebAuthn credential **and deploys a
  smart-contract account**, mapping the passkey's secp256r1 pubkey to a contract address; `sign()` /
  `signAuthEntry()` produce passkey-signed Soroban auth entries; `PasskeyServer` + **OpenZeppelin
  Relayer** (formerly Launchtube) submit txns. Signer kinds: `Secp256r1 | Ed25519 | Policy`. **Demo,
  unaudited; now positioned as the legacy precursor to OpenZeppelin Smart Accounts.** ([repo])
- **OpenZeppelin Smart Accounts for Stellar** (the current path) — composable auth: *context rules +
  signers + policies*. External signers (secp256r1 / ed25519 / etc.) map to verifier contracts;
  supports session policies (e.g., a 24h passkey). SDK: **`kalepail/smart-account-kit`**;
  contracts: `OpenZeppelin/stellar-contracts` `packages/accounts`. ([OZ Smart Account docs])

**Crucially, the smart account uses the passkey *signature*, not PRF.** The two roles are orthogonal:
- **On-chain (auth):** passkey **assertion signature** → smart account authorizes `shield(deposit)` /
  `unshield(withdraw)` Soroban calls against the Privacy Pool contract. The 32-byte PRF secret is
  **never** sent on-chain.
- **Off-chain (privacy):** passkey **PRF output** → shielded spend/view keys that build/sign the
  private *notes* inside the pool. These never touch Stellar consensus.

One `navigator.credentials.get()` can do double duty: return the **assertion** (to sign the tx) **and**
the **PRF value** (to derive note keys) in a single Face-ID prompt — clean UX.

---

## 4. Recommended architecture

```
                        ┌────────────────── one passkey (Face ID / Touch ID / Hello) ──────────────────┐
                        │                                                                               │
              navigator.credentials.get({ prf, allowCredentials })  ── single user-verification prompt ─┘
                        │                                                   │
        ┌───────────────┴───────────────┐                   ┌──────────────┴───────────────┐
        │  ASSERTION (secp256r1 sig)     │                   │  PRF output (32 bytes, IKM)   │
        │  → smart-account auth entry    │                   │  → HKDF-SHA256(salt, info)    │
        │  → OZ Relayer submits          │                   │     ├ info="stellar-shielded-spend-v1" → SPEND KEY
        │  → Privacy Pool shield/unshield│                   │     └ info="stellar-shielded-view-v1"  → VIEW  KEY
        │     (ON-CHAIN, public deposit) │                   │  → build/sign notes (OFF-CHAIN, private)
        └────────────────────────────────┘                  └───────────────────────────────┘
```

**(a) On-chain account that shields/unshields:** an **OpenZeppelin Smart Account** (or passkey-kit
contract for a faster MVP) whose secp256r1 signer is the passkey. Public deposit/withdraw to the
Privacy Pool is authorized by the passkey **signature**.

**(b) Off-chain shielded spend/view keys:** `prf.results.first` (32 bytes) → **HKDF-SHA256** (never use
the raw PRF bytes directly — per Yubico, treat it as IKM) with a fixed app salt and **distinct `info`
strings per key** → feed as the master seed into the chosen note scheme (ZIP-32-style or Railgun-style
expansion) to get spend + view keys. Derivation is pure/deterministic, so keys are reconstructed every
login; **nothing secret is persisted** beyond the (non-secret) credential ID and encrypted backup blob.

**Recovery (the must-have):** use **envelope encryption / key-wrapping** so the wallet is *not* locked
to a single passkey:
1. Generate a random **Data Encryption Key (DEK)** once. The DEK (or the shielded seed) is the root.
2. Each registered authenticator's PRF produces a **Key Encryption Key (KEK)**; store the DEK
   **wrapped by each KEK**. Any registered passkey can unwrap it.
3. Provide an **exportable recovery secret** (a one-time downloadable/printable 12–24-word backup of
   the DEK or seed) for the worst case — this is the deliberate, opt-in "seed phrase" escape hatch that
   defuses the "delete passkey = permanent loss" risk. Frame it as *backup*, not daily UX.
4. **Multi-device:** synced passkeys (iCloud/Google) already give the same PRF across devices for free.
   For unsynced/second authenticators, register them and add their KEK-wrapped DEK copy.

**Fallback if PRF is unavailable:** gate on capability at registration —
`PublicKeyCredential.getClientCapabilities?.()` and the `prf.enabled` flag after `create()`. If PRF is
absent (e.g., Firefox-Android, YubiKey-on-iOS), **don't hard-fail**: fall back to a password/passphrase
→ Argon2id → DEK path, or steer the user to a supported browser. The shielded-key derivation must
accept *either* a PRF seed or a passphrase-derived seed as IKM.

---

## 5. Libraries / tools that make each piece easy

| Piece | Library / tool | Notes |
|---|---|---|
| WebAuthn ceremonies (browser) | **`@simplewebauthn/browser`** | `startRegistration` / `startAuthentication`; pass `extensions.prf`. Note: SimpleWebAuthn **deliberately does not abstract PRF** (philosophical safety stance) — you wire the salt/results yourself per spec. ([SimpleWebAuthn PRF]) |
| WebAuthn verification (server, if any) | **`@simplewebauthn/server`** | `isoBase64URL` helpers; must allow `chrome-extension://` origins. |
| PRF → key, batteries-included | **`prf-passkey`** (Dorky-Robot) | TS, `registerPasskey`/`authenticateAndDeriveKey`, neverthrow. Fastest path to a working PRF→key. |
| PRF capability detection | `PublicKeyCredential.getClientCapabilities("public-key")` + `prf.enabled` | native; the registration-time gate. |
| KDF (PRF → spend/view keys) | **Web Crypto `crypto.subtle` HKDF-SHA256** | native, no dep; `deriveKey` with per-purpose `info`. Yubico-recommended. |
| Shielded key tree | ZIP-32 / Railgun-style expansion (port the labelled-HKDF derivation) | reuse the proven seed→spend/view derivation; seed = HKDF(PRF). |
| Stellar passkey smart account (MVP) | **`kalepail/passkey-kit`** | fastest deploy-a-passkey-wallet; demo/unaudited. |
| Stellar passkey smart account (durable) | **`kalepail/smart-account-kit`** + `OpenZeppelin/stellar-contracts` (`packages/accounts`) | composable signers/policies; the path OZ/Stellar are converging on. |
| Tx submission (fee sponsorship) | **OpenZeppelin Relayer** (ex-Launchtube) | submit passkey-signed Soroban auth entries; gasless UX. |
| Extension framework | **WXT** (see note 03) | popup does WebAuthn; `host_permissions` carries the RP-ID domain. |

---

## 6. Top risks & mitigations (be honest)

| Risk | Severity | Reality | Mitigation |
|---|---|---|---|
| **Passkey deletion ⇒ permanent loss of shielded funds** | HIGH | Cappalli's core warning: users delete passkeys not knowing data is attached; credential managers give no warning. ([Cappalli], [SimpleWebAuthn]) | **Envelope encryption + exportable recovery secret** (§4). Never make a single passkey the sole root. Up-front "this protects money" warning. |
| **PRF availability gaps** | MED | Firefox-Android ❌; YubiKey-on-iOS ❌; Windows needed a Feb-2026 update. | Capability gate at registration; passphrase→Argon2id fallback seed; target Chrome/Edge desktop + Android first. |
| **Sync/determinism edge cases** | LOW–MED | Determinism is guaranteed by spec; the only real incident was the iOS 18.0–18.3 CDA bug (fixed 18.4+). | Require iOS 18.4+; envelope encryption makes per-device-key drift a non-issue (each device wraps the same DEK). |
| **PRF-on-create not universal** | LOW | Some authenticators return `enabled:true` on create but value only on `get`. | Always derive via `get()`; treat create as capability check only. |
| **passkey-kit unaudited / legacy** | MED | Repo says demo-only, unaudited. | Use for MVP demo; cite OZ Smart Accounts as the production path; don't custody real value in a hackathon. |
| **Extension RP-ID / origin handling** | LOW | Solved since Chrome 122 via `host_permissions`; origin is `chrome-extension://`. | Use a stable RP-ID domain in `host_permissions`; do WebAuthn in the popup, not the SW. |

---

## Sources
- [MDN — WebAuthn extensions (prf)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions)
- [MDN — Use the WebAuthn API in web extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api)
- [MDN — Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Corbado — Passkeys & WebAuthn PRF for E2E Encryption (2026)](https://www.corbado.com/blog/passkeys-prf-webauthn)
- [Yubico — PRF Extension concept](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/)
- [Yubico — Developer's Guide to PRF](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html)
- [Bitwarden — PRF WebAuthn and its role in passkeys](https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/)
- [SimpleWebAuthn — PRF docs](https://simplewebauthn.dev/docs/advanced/prf)
- [Tim Cappalli — Please stop using passkeys for encrypting user data](https://blog.timcappalli.me/p/passkeys-prf-warning/)
- [Levi Schuck — Experimental WebAuthn PRF demo](https://levischuck.com/blog/2023-02-prf-webauthn)
- [chromestatus — WebAuthn PRF extension](https://chromestatus.com/feature/5138422207348736)
- [Chrome blog — hints, Related Origin Requests, JSON serialization (Chrome 129)](https://developer.chrome.com/blog/passkeys-updates-chrome-129)
- [web.dev — Related Origin Requests](https://web.dev/articles/webauthn-related-origin-requests)
- [oblique-security/webauthn-prf-demo](https://github.com/oblique-security/webauthn-prf-demo)
- [Dorky-Robot/prf-passkey](https://github.com/Dorky-Robot/prf-passkey)
- [leanthebean/passkey_prf_playground](https://github.com/leanthebean/passkey_prf_playground)
- [Confer — passkey encryption](https://confer.to/blog/2025/12/passkey-encryption/) · [vitorpy — TPM/FIDO2/PRF on Linux](https://vitorpy.com/blog/2025-12-25-confer-to-linux-tpm-fido2-prf/)
- [Zcash ZIP-32 — Shielded HD Wallets](https://zips.z.cash/zip-0032)
- [Railgun — Wallets and Keys](https://docs.railgun.org/wiki/learn/wallets-and-keys)
- [kalepail/passkey-kit](https://github.com/kalepail/passkey-kit) · [kalepail/smart-account-kit](https://github.com/kalepail/smart-account-kit)
- [kalepail — The Passkey-Powered Future of Web3](https://kalepail.com/blockchain/the-passkey-powered-future-of-web3)
- [OpenZeppelin — Stellar Smart Accounts docs](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account) · [OpenZeppelin/stellar-contracts (packages/accounts)](https://github.com/OpenZeppelin/stellar-contracts/tree/main/packages/accounts)
- [Stellar protocol discussion #1499 — WebAuthn smart wallet contract interface](https://github.com/stellar/stellar-protocol/discussions/1499)
- [Stellar Foundation — Passkey feature on mainnet](https://stellar.org/blog/foundation-news/introducing-the-new-stellar-passkey-feature-seamless-web3-smart-wallet-functionality-on-mainnet)

# Reality Research: WebAuthn passkey + PRF — exact APIs, determinism, support matrix, extension context

> Facts-only brief. Documents CURRENT REALITY of WebAuthn PRF as of 2026-06-21. No solutions, no architecture proposals. Every important claim is cited to a primary source (file path, URL, or command output). Items that could not be verified are in **Unknowns And Questions** — not guessed.

## Scope

- The `prf` WebAuthn extension: exact request/response shape for `navigator.credentials.create()` and `.get()`, how to obtain the PRF output bytes, determinism, salt usage.
- Browser / OS / authenticator support matrix (Chrome, Firefox, Safari; platform authenticators vs security keys; synced passkeys).
- Calling WebAuthn from an MV3 / WebExtension popup: `rp.id` via `host_permissions`, context restrictions (popup vs service worker), origin form the RP sees.
- Libraries: `@simplewebauthn/browser` (what it does / does not do re PRF), Web Crypto HKDF.
- Production patterns: how Bitwarden / wwWallet / Microsoft derive keys from PRF and their envelope-encryption / recovery patterns.
- Cross-check against local cloned repos (Stellar passkey/wallet projects) to record whether PRF is actually used there.

Out of scope: how to design a specific key-management scheme for the current project (no solutioning).

## Sources Checked

Primary (official specs / vendor docs):
- MDN — Web Authentication extensions (PRF section): https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
- MDN — Use the Web Authn API in web extensions: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api
- W3C WebAuthn Level 3 — PRF extension section: https://w3c.github.io/webauthn/#prf-extension (excerpt fetched; full algorithm not in fetched excerpt — see Unknowns)
- Yubico Developers — Developers Guide to PRF: https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html
- SimpleWebAuthn docs — PRF: https://simplewebauthn.dev/docs/advanced/prf
- Bitwarden contributing docs — Passkeys for decryption (PRF, relying party): https://contributing.bitwarden.com/architecture/deep-dives/passkeys/implementations/relying-party/prf/
- Chrome extensions reference — chrome.webAuthenticationProxy: https://developer.chrome.com/docs/extensions/reference/api/webAuthenticationProxy

Secondary (technical blogs / vendor writeups, used for corroboration only):
- Levi Schuck — Experimental WebAuthn PRF demo: https://levischuck.com/blog/2023-02-prf-webauthn
- Bitwarden blog — PRF WebAuthn and its role in passkeys: https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/
- Corbado — Passkeys & WebAuthn PRF for E2EE (2026): https://www.corbado.com/blog/passkeys-prf-webauthn
- Oblique Security — Passkey PRFs for E2EE: https://oblique.security/blog/passkey-prf/ (listed, not deep-fetched)

Local repos (under `/Users/abu/dev/hackathon/stellar-research/repos`):
- `passkey-kit/src/kit.ts` (uses `@simplewebauthn/browser@^13.2.0`) — read
- `passkey-kit/package.json` — read
- `browser-wallet/` — grepped
- `moonlight-sdk/`, `pay-platform/`, `council-platform/`, `freighter/`, `provider-platform/`, `stellar-private-payments/` — grepped for `prf`/`hkdf`/`getClientExtensionResults`/`deriveKey`

Commands run:
- `grep -rIl -e "prf" -e "PRF" passkey-kit browser-wallet` → no matches
- `grep -rIl -e "getClientExtensionResults" -e "hkdf" -e "HKDF" -e "deriveKey" .` → matches in moonlight-sdk, pay-platform, council-platform, freighter, provider-platform, stellar-private-payments (HKDF used for non-PRF key derivation; see Verified Facts #16)
- `grep -n "simplewebauthn" passkey-kit/package.json` → `"@simplewebauthn/browser": "^13.2.0"`

## Verified Facts

### PRF request/response shape (MDN, W3C)

1. **The `prf` extension is a WebAuthn extension** that returns outputs from a pseudo-random function tied to a credential. MDN describes it as "effectively a random oracle — a function that returns a random value for any given input, but will always return the same value for the same input." Spec section: `https://w3c.github.io/webauthn/#prf-extension`. (Source: MDN WebAuthn_extensions)

2. **Request during `create()` (registration):** passed under `publicKey.extensions.prf.eval`:
   ```js
   extensions: { prf: { eval: { first: <ArrayBuffer|TypedArray> /* required */,
                                second: <ArrayBuffer|TypedArray> /* optional */ } } }
   ```
   `eval.first` is required; `eval.second` is optional. (Source: MDN WebAuthn_extensions)

3. **Request during `get()` (authentication):** passed under `publicKey.extensions.prf.evalByCredential`, an object mapping **Base64URL-encoded credential IDs** to `{ first, second }`:
   ```js
   extensions: { prf: { evalByCredential: {
       "<credentialIdBase64Url>": { first: bufOne, second: bufTwo } } } }
   ```
   (Source: MDN WebAuthn_extensions). Note: `get()` may also accept `prf.eval` directly when `allowCredentials` has exactly one entry — see Unknowns #U6.

4. **Response from `create()` via `getClientExtensionResults()`:**
   - If supported: `{ prf: { enabled: true, results: { first: <ArrayBuffer>, second?: <ArrayBuffer> } } }`
   - If unsupported: `{ prf: { enabled: false } }`
   - `results` is only present at create-time on authenticators that return PRF output during creation (see #10). `second` is omitted if no `second` input was given. (Source: MDN WebAuthn_extensions)

5. **Response from `get()` via `getClientExtensionResults()`:**
   - If supported: `{ prf: { results: { first: <ArrayBuffer>, second?: <ArrayBuffer> } } }`
   - If unsupported: `{ prf: {} }`
   - The `enabled` flag is **only** present in `create()` output, not in `get()` output. (Source: MDN WebAuthn_extensions)

6. **The raw API returns `results.first` / `results.second` as `ArrayBuffer`** (binary), accessed via `credential.getClientExtensionResults()`. (Source: MDN WebAuthn_extensions)

### Output size & determinism

7. **PRF output is 32 bytes.** Yubico: "you request the 32-byte secret by providing a `salt`" and "You now have a 32-byte, high-entropy secret." Corbado: "typically a 32-byte string." (Sources: Yubico Developers Guide to PRF; Corbado). Note: when both `first` and `second` are supplied, each produces its own 32-byte output (so up to 64 bytes total). (Inference flag — see Inferences #I1.)

8. **Determinism guarantee:** The PRF output is identical across ceremonies as long as (A) the same credential is used AND (B) the RP passes the same input bytes. Web search summary of Levi Schuck / SimpleWebAuthn: "Output from the prf extension will be the same for every authentication ceremony so long as A) the same WebAuthn credential is used, and B) the bytes the RP passes to the authenticator are the same." This is what makes it possible to deterministically recreate a symmetric key. (Sources: levischuck.com blog; Corbado; Yubico — all consistent.)

### Salt / domain separation

9. **The input ("salt") is application-chosen bytes, but the browser applies domain separation before handing it to the authenticator.** Corbado, quoting the spec behavior: "the inputs provided by the website (first and second salts) are first hashed with a specific context string (`"WebAuthn PRF"` and a null byte)." Bitwarden blog: "PRF Extension implementations are expected to wrap the CTAP HMAC Secret Extension with some domain separation." (Sources: Corbado; Bitwarden blog). The exact algorithm/order (prefix bytes, hash function) is in W3C spec §"prf-extension" but was NOT in the fetched excerpt — see Unknowns #U1.

### Relationship to CTAP hmac-secret

10. **`prf` is the WebAuthn-layer name for the CTAP2 `hmac-secret` extension.** Bitwarden blog: "Unlike CTAP which names the HMAC Secret Extension by its internal construction, WebAuthn names the PRF Extension by what it provides." Yubico: "The underlying CTAP `hmac-secret` extension can be accessed directly … using Yubico's SDKs." Consequence: an authenticator must support `hmac-secret` for `prf` to work. (Sources: Bitwarden blog; Yubico Developers Guide)

### Create-time vs get-time availability

11. **PRF output at `create()` time is NOT universally available.** Per Corbado: synced providers with full CTAP 2.2 (iCloud Keychain, Google Password Manager) can return "the first PRF output already during `navigator.credentials.create()`." Windows Hello only gained PRF-on-create via Chrome 147+ (`WEBAUTHN_API_VERSION_8`); Chrome 146 on Windows did not surface PRF during creation. Some older security keys only generate the HMAC secret if explicitly requested at creation. PRF during `get()` (authentication) is the more broadly supported path and can work even when not requested at create() for synced providers. (Source: Corbado)

### Support matrix (browser / OS / authenticator)

12. **Platform authenticators (synced passkeys):**
   - macOS 15+ / iCloud Keychain: ✅ (Yubico, Corbado). Safari 18+ supports it.
   - iOS/iPadOS 18+ / iCloud Keychain: ✅; Corbado notes data-loss bugs fixed in **iOS 18.4**. Yubico flags a critical limitation: the iOS platform does NOT pass extension data to/from EXTERNAL (roaming) keys.
   - Android / Google Password Manager: ✅, "PRF by default" (Corbado); Yubico ✅.
   - Windows 11 / Windows Hello: Yubico states "❌ (Windows Hello lacks hmac-secret)" in its matrix; Corbado states PRF-on-create became available on Windows via Chrome/Edge 147+ in Feb 2026 (`WEBAUTHN_API_VERSION_8`). These two sources disagree in timeframe — see Unknowns #U2.
   (Sources: Yubico Developers Guide; Corbado)

13. **Roaming authenticators (e.g. YubiKey 5 / Bio series support hmac-secret):**
   - Windows 11 Chrome/Edge/Firefox: ✅
   - macOS Chrome: ✅; macOS Safari: ❌ (does not pass PRF to external keys)
   - iOS/iPadOS: ❌ (platform does not pass extension data to external keys)
   - Android: USB ✅; NFC ❌
   (Source: Yubico Developers Guide)

14. **Browser version data (from Corbado, 2026 snapshot):**
   - Windows 11 25H2 (Feb 2026+): Firefox 148+ full; Chrome/Edge 147+ PRF-on-create by default; Chrome/Edge 146 authentication-only.
   - macOS 15+: Safari 18+; Chrome 132+ (iCloud Keychain); Firefox 139+ (platform & security keys).
   - iOS/iPadOS 18.4+: Safari 18+; Chrome & Firefox use the WebKit engine so inherit support.
   - Android: Chrome/Edge ✅; Samsung Internet ✅; **Firefox Android ❌ (no support)**.
   (Source: Corbado — single-source for exact version numbers; cross-checks with Yubico on direction but not on exact build numbers — see Unknowns #U2.)

### Libraries

15. **`@simplewebauthn/browser` does NOT abstract PRF.** Its docs explicitly do not simplify PRF usage and provide no HKDF helper; they redirect to the WebAuthn spec. It does expose `base64URLStringToBuffer()` to convert a base64url salt into the `ArrayBuffer` needed for `eval.first`. `startRegistration({ optionsJSON })` and `startAuthentication({ optionsJSON })` accept the `prf` extension inside `optionsJSON.extensions`, but the library provides no documented examples for reading PRF results. (Source: simplewebauthn.dev/docs/advanced/prf)

16. **Local Stellar repos do NOT use PRF.** `passkey-kit` (the most relevant local repo) uses `@simplewebauthn/browser@^13.2.0` (`passkey-kit/package.json:22`) purely for credential **signing** (P-256 / `alg: -7`), not key derivation:
   - `passkey-kit/src/kit.ts:128` `startRegistration({ optionsJSON: { challenge, rp:{id,name}, user, authenticatorSelection, pubKeyCredParams:[{alg:-7,type:"public-key"}] } })` — no `extensions.prf`.
   - `passkey-kit/src/kit.ts:170` and `:319` `startAuthentication({ optionsJSON: { challenge, rpId, userVerification:"preferred" } })` — no `extensions`.
   - `grep -rIl prf passkey-kit browser-wallet` → no matches.
   - HKDF/`deriveKey` appear in `moonlight-sdk/src/derivation/base/index.ts`, `pay-platform/src/core/crypto/*`, `council-platform/src/core/crypto/encrypt-secret.ts`, `freighter/extension/src/background/helpers/session.ts`, etc., but these are general key-derivation / session-encryption code, NOT WebAuthn PRF (no `getClientExtensionResults` near them; grep showed them as separate concerns).
   (Sources: file reads + grep output above.)

### Web Crypto HKDF (the KDF used downstream of PRF)

17. **HKDF (RFC 5869) is available natively via the Web Crypto API** and is the KDF named by Yubico/Bitwarden/wwWallet for stretching the 32-byte PRF output. The documented flow: `crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"])` then `crypto.subtle.deriveKey({ name:"HKDF", hash:"SHA-256", salt, info }, baseKey, { name:"AES-GCM", length:256 }, ...)`. The `info` parameter is used for purpose-binding/domain separation of the derived key. (Sources: web search summary of corbado/oblique/millerti.me; consistent across sources. Exact WebCrypto signatures are standard MDN SubtleCrypto API — see Inferences #I2.)

### Production key-derivation / envelope patterns

18. **Bitwarden** does NOT use the PRF output directly as the data key. Per Bitwarden contributing docs:
   - The 32-byte PRF output is "stretched to a 64-byte two-part key using HKDF" → first 32 bytes = AES-256 key, second 32 bytes = MAC key.
   - Envelope / RSA key-wrapping scheme producing three persisted artifacts: `EncryptionKey(PrivateKey)`, `PublicKey(UserSymmetricKey)`, `UserSymmetricKey(PublicKey)`. I.e. the stretched PRF key encrypts an RSA private key; the RSA public key encrypts the user's symmetric key; the symmetric key encrypts the public key.
   (Source: contributing.bitwarden.com PRF deep-dive). Recovery/multi-wrap details not in fetched doc — see Unknowns #U4.

19. **wwWallet (EU EUDI / FUNKE) uses an envelope-encryption pattern over PRF**, recommending HKDF (RFC 5869) via Web Crypto. Encryption keys are not sent to the server; PRF-derived secret decrypts a locally-stored encrypted "envelope." The same envelope pattern is attributed to **Microsoft (Windows login)**: sensitive data stored as an encrypted envelope on-device, decrypted locally by the PRF-derived secret while the master secret stays in hardware. (Source: web search summary citing wwWallet keystore pattern + Bitwarden blog; GitHub org https://github.com/wwWallet — exact code not fetched, see Unknowns #U5.)

### Extension (WebExtension / MV3) context

20. **Extensions can call `navigator.credentials.create()/get()` and assert an RP ID for any domain in their `host_permissions`, starting Firefox 150 and Chrome 122.** MDN: "Starting with Firefox 150 and Chrome 122, browser extensions can use the WebAuthn API and specify an RP ID for domains specified in the extension's host_permissions." (Source: MDN Use_the_web_authn_api)

21. **`rp.id` is gated by `host_permissions`, not by the extension's own origin.** MDN: declare `host_permissions` for the domain(s) whose RP ID you want; that permission "is the prerequisite for asserting the domain as an RP ID." Example manifest: `"host_permissions": ["https://*/*"]`. (Source: MDN Use_the_web_authn_api)

22. **The origin the RP sees from an extension is the extension origin, not the asserted RP-ID domain:**
   - Chrome: `chrome-extension://<id>` (e.g. `chrome-extension://mabekielmoibbmlepeohhncklpnjmcpk`)
   - Firefox: `moz-extension://<hash>`
   Visible in `clientDataJSON.origin`. (Source: MDN Use_the_web_authn_api)

23. **Documented extension context = a popup / extension page; background scripts/service workers are NOT shown as a supported context** in MDN's guide (the example is `popup.html` + popup JS). (Source: MDN Use_the_web_authn_api). NOTE: MDN does not explicitly say service workers are forbidden — it simply doesn't list them; the strict prohibition is an inference — see Inferences #I3.

24. **Known popup pitfall (Firefox):** "the flow does not work as the popup closes when the prompt for credentials appears. A workaround is to open the page in a new tab." (Firefox bug 2026687). (Source: MDN Use_the_web_authn_api)

25. **`chrome.webAuthenticationProxy` is a separate MV3 API** for remote-desktop software to intercept WebAuthn requests and handle them on a local client — it is NOT the mechanism for an extension popup to call WebAuthn for itself. (Source: Chrome extensions reference — webAuthenticationProxy)

## Inferences

> Clearly-labeled reasoning from the verified facts above. NOT verified primary-source statements.

- **#I1 — 64 bytes when both salts used.** Since each input (`first`, `second`) yields a 32-byte output (#7) and both can be requested (#2, #5), requesting both yields up to 64 bytes of total PRF material. MDN confirms `results.second` exists but does not state its length explicitly; inferring 32 bytes by symmetry with `first`.
- **#I2 — Standard WebCrypto HKDF signatures.** The `crypto.subtle.importKey(... "HKDF" ...)` + `deriveKey({name:"HKDF",hash:"SHA-256",salt,info},...)` shape in #17 is the standard MDN SubtleCrypto HKDF API; the blog summaries match it, but I did not re-fetch MDN SubtleCrypto in this pass to quote exact param objects.
- **#I3 — Service worker cannot run WebAuthn.** WebAuthn requires a user gesture and a focusable UI context; MV3 background service workers have no DOM/window and no user-activation. MDN only documents the popup/page context (#23). Strongly implied that `navigator.credentials.*` is unavailable or will fail in an MV3 service worker, but I did not find a primary source that states this verbatim — treat as inference until confirmed (#U3).
- **#I4 — Salt should be stable & ideally per-credential-random.** Determinism (#8) means changing the input bytes changes the derived key; Yubico recommends a per-credential random salt stored alongside the credential ID. Inference: the RP must persist the chosen salt (it is not secret, but must be reproducible) or the derived key is unrecoverable. This is an operational consequence, not a proposal.
- **#I5 — `prf.enabled:true` at create does not guarantee `results` at create.** From #4/#11: `enabled` signals the credential supports PRF, but the actual `results` object at create-time depends on the authenticator/platform (CTAP 2.2 synced providers vs others). Inference: code must handle "enabled but no results" by doing a follow-up `get()`.

## Unknowns And Questions

- **#U1 — Exact W3C domain-separation algorithm.** The precise byte construction (does the browser compute `SHA-256("WebAuthn PRF" || 0x00 || input)`? what hash? is the prefix UTF-8 exactly `0x57 0x65 0x62 0x41 0x75 0x74 0x68 0x6e 0x20 0x50 0x52 0x46`?) was NOT in the fetched W3C excerpt; Corbado paraphrases it as `"WebAuthn PRF"` + null byte but does not confirm the hash function. Needs: full read of `https://w3c.github.io/webauthn/#prf-extension` §"client extension processing" + §16.17.1 test vectors. (Matters only for native/CTAP-direct implementations; pure-browser RPs never see this layer.)
- **#U2 — Conflicting Windows Hello support state.** Yubico says "Windows Hello lacks hmac-secret (❌)"; Corbado says PRF-on-create landed on Windows via Chrome/Edge 147+ in Feb 2026. Cannot reconcile which is current as of 2026-06-21 from these two sources alone. Needs: Chrome release notes / Windows WebAuthn (`webauthn.dll`) version notes.
- **#U3 — Service worker prohibition (primary source).** No primary doc found that explicitly states `navigator.credentials.create/get` is unavailable/fails in an MV3 background service worker. (Inference #I3 only.) Needs: Chrome extensions WebAuthn doc or a spec note on user-activation requirement in extension service workers.
- **#U4 — Bitwarden recovery / dual-wrap.** The fetched Bitwarden contributing doc describes the envelope scheme (#18) but NOT how recovery / backward-compat with master-password works (whether the user symmetric key is wrapped multiple independent ways). Needs: deeper read of the Bitwarden contributing architecture pages.
- **#U5 — wwWallet exact code.** The wwWallet keystore HKDF/envelope pattern (#19) is from a search summary, not from reading the repo. Needs: read `github.com/wwWallet` keystore source for the exact `info`, salt, and wrap construction.
- **#U6 — `get()` with `prf.eval` (single-credential) vs `evalByCredential`.** MDN documents `evalByCredential` for `get()` (#3). The spec also allows `prf.eval` directly at `get()` when exactly one credential is in `allowCredentials`; not confirmed from a primary source in this pass.
- **#U7 — User-gesture requirement specifics.** MDN's extension page does not state the user-gesture requirement (it says "Not mentioned"). The general WebAuthn requirement (transient user activation) is widely known but was not re-verified against a primary source here.
- **#U8 — `@simplewebauthn/browser` v13 exact PRF result shape.** Whether v13 surfaces PRF results as base64url strings or ArrayBuffers on the returned JSON, and the exact property path, is NOT documented (#15). Needs: read `@simplewebauthn/browser` v13 source/types for `clientExtensionResults`.
- **#U9 — Discoverable vs non-discoverable + `allowCredentials` interplay with `evalByCredential`** (which credential ID key to use when the credential is discoverable and ID is unknown ahead of time) — not covered by sources fetched.

## Not Included

- Server-side verification of attestation/assertion (out of scope; PRF is a client-side extension and does not appear in the authenticator-data signature).
- Specific cryptographic design recommendations for the current project (explicitly excluded — no solutioning per task rules).
- Non-PRF WebAuthn extensions (largeBlob, credProps, etc.) except where they contrast with PRF.
- Full reproduction of the W3C algorithm steps (excerpt did not contain them; flagged in #U1).
- Performance/latency numbers for PRF ceremonies (no primary source found).
- Native mobile (Android Credential Manager / iOS ASAuthorization) PRF APIs beyond what browser docs state.

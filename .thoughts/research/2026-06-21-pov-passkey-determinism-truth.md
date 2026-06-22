# Passkey determinism & cross-device recovery — the precise truth

> Facts-only brief. Documents CURRENT REALITY as of 2026-06-21. No solutions, no architecture proposals, no positioning claims. Follows the founder's stated POV: seed-phrase is the DEFAULT, passkey is OPTIONAL, and there are NO recovery secrets. Every important claim is cited to a primary source (file path or URL). Anything not verifiable is in **Unknowns**.

## Scope

The founder's hypothesis: a passkey/Face ID wallet should be deterministic — "same passkey → same wallet each time, on any device." This brief verifies precisely:

1. Is a WebAuthn-PRF-derived key deterministic for the same credential + same salt? (yes/no + why)
2. Does "same fingerprint/Face ID on a different device → same wallet" actually hold? The credential-vs-biometric distinction, and the role of passkey SYNC (iCloud Keychain, Google Password Manager): when the SAME wallet reconstructs vs when a DIFFERENT credential (hence different wallet) is created.
3. What happens on passkey loss with NO seed backup (confirm: unrecoverable).
4. Do any shipping wallets use passkey-deterministic onboarding (vs passkey-as-unlock-over-a-seed)?

Out of scope: designing the project's key scheme. The deeper PRF API mechanics (request/response shape, support matrix, extension context) are already documented in `.thoughts/research/2026-06-21-passkey-prf.md` — not repeated here except where determinism depends on them.

## Verified Facts

### Determinism of the PRF output

1. **A PRF output is deterministic for the same credential + same input bytes.** MDN states the prf extension "is effectively a random oracle — a function that returns a random value for any given input, but will always return the same value for the same input." (Source: MDN WebAuthn_extensions — https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions)

2. **The PRF output is bound to the specific credential.** MDN: the extension lets "a relying party get outputs … from a pseudo-random function (PRF) **associated with a credential**." Different credentials produce different outputs for the same input bytes. (Source: MDN WebAuthn_extensions). Corbado states it more sharply: "PRF-derived keys are bound exclusively to the specific passkey used during authentication." (Source: https://www.corbado.com/blog/passkeys-prf-webauthn)

3. **Therefore the determinism property is: SAME credential + SAME salt → SAME 32-byte output → (after a fixed KDF) SAME key/seed → SAME wallet.** This is what makes seedless reconstruction possible. The RP must persist/reuse the same salt input (the salt is not secret but must be reproducible). (Sources: facts #1–#2; salt-reproducibility is noted in the prior brief §I4, and Corbado/Yubico describe a fixed/per-credential salt.)

### The credential-vs-biometric distinction (the crux of the founder's hypothesis)

4. **The biometric (fingerprint / Face ID) is NOT the key and is NOT the identity.** Biometric data is stored locally in the authenticator and is used only to unlock the authenticator locally; the relying party never sees it and cannot authenticate on biometrics. (Source: web research summary citing Auth0 / webauthn.me / MojoAuth: "Fingerprint and face data are stored locally in the authenticator… Biometrics are used locally to let you access your authenticator." — https://www.webauthn.me/passkeys, https://auth0.com/blog/common-developer-misconceptions-about-passkeys/)

5. **The thing that determines the key is the CREDENTIAL (the passkey private key inside the authenticator), not the finger or face.** A PRF takes "a secret key held securely within the authenticator and tied to the credential" plus the RP's salt to produce the output. (Source: web research summary of Corbado/Bitwarden: "A PRF takes a secret key held securely within the authenticator and tied to the credential, and one or more input values provided by the Relying Party.")

6. **CONSEQUENCE — "same fingerprint on a different device → same wallet" is FALSE as stated.** A different device with a *different* credential yields a *different* PRF output even if the same finger unlocks it. Same wallet reconstructs ONLY when the *same credential* is present on the second device. Whether the same credential is present depends entirely on passkey SYNC (see #7–#11), not on biometrics. (Sources: facts #2, #4, #5.)

### Passkey sync: when the SAME credential (hence same wallet) reconstructs

7. **Synced passkeys vs device-bound passkeys are two distinct kinds.** Synced passkeys (iCloud Keychain, Google Password Manager) replicate the SAME credential across devices; device-bound passkeys (e.g. security keys, some Windows Hello) cannot leave the device. (Source: web research summary citing webauthn.me / MojoAuth: "There are two types of passkeys: device-bound passkeys and synced passkeys.")

8. **iCloud Keychain syncs the SAME passkey across a user's Apple devices.** Apple: "Passkeys sync across a user's devices using iCloud Keychain"; iCloud Keychain "is end-to-end encrypted with strong cryptographic keys not known to Apple." Requires two-factor authentication on the Apple Account. (Source: Apple Support 102195 — https://support.apple.com/en-us/102195)

9. **Google Password Manager syncs the SAME passkey across Android devices + signed-in Chrome.** Google: "Passkeys can be stored in password managers like Google Password Manager, which synchronizes passkeys between the user's Android devices and Chrome browsers that are signed into the same Google account." (Source: https://developers.google.com/identity/passkeys)

10. **Cross-ecosystem sync does NOT happen.** An Android/Google passkey is not synced to Apple devices and vice-versa. Google documents only cross-device *use* via proximity (the phone authenticates a nearby laptop) — the credential is NOT copied to the laptop. (Source: https://developers.google.com/identity/passkeys — "passkeys available on phones can be used when logging into a laptop … as long as the phone is near the laptop … rather than syncing the passkey itself.")

11. **A device-bound passkey CANNOT reconstruct on another device — a NEW credential is created instead.** "If a user sets up a Windows Hello passkey and later gets a new PC, they will need to re-register." A re-registered credential is a different credential → different PRF output → different wallet. (Source: web research summary citing MojoAuth/Security Boulevard: "device-bound passkeys with biometric authentication are tied to a single device … the same user would need to create a new credential on their new device.")

### So, precisely when does the SAME wallet reconstruct on another device?

12. **Same wallet reconstructs on Device B if and only if the SAME credential is available on Device B.** That requires: (a) the passkey is a *synced* passkey, (b) Device B is in the *same sync ecosystem and account* (same Apple ID + iCloud Keychain, or same Google account + GPM), and (c) the RP re-passes the same salt. If any condition fails — different ecosystem, device-bound credential, or a freshly created credential — a DIFFERENT credential is used and a DIFFERENT wallet results. (Sources: facts #6–#11.)

### Loss with no backup

13. **If the passkey is lost and there is no other backup, the PRF-derived key/wallet is permanently unrecoverable.** Corbado: "Losing the passkey will permanently render the encrypted data inaccessible." And: "If that passkey is lost, the encrypted data becomes permanently inaccessible because the same PRF output cannot be reproduced without the original credential." (Source: https://www.corbado.com/blog/passkeys-prf-webauthn). This is a direct consequence of facts #1–#2: the output cannot be reproduced without the original credential, and no seed/recovery secret exists to derive it another way.

### Shipping wallets using passkey-deterministic onboarding

14. **Yes — PRF-deterministic seed derivation is a real, shipping pattern, not theoretical.** Documented production/real implementations deriving a wallet seed deterministically from the PRF output (no traditional seed phrase): Corbado ("uses WebAuthn's PRF extension to derive wallet seeds deterministically on authentication"), wwWallet (keys "derived via the WebAuthn PRF extension," encryption keys never sent to server), and a Polkadot-forum "stateless private keys" implementation. The common technique is a fixed salt → PRF output → deterministic seed (often via XOR/HKDF) on every sign-in. (Sources: web research summary — https://passkeywallets.com/2026/02/04/frictionless-crypto-sign-in-with-webauthn-passkeys-for-everyday-users/ ; https://www.corbado.com/blog/passkeys-prf-webauthn ; https://github.com/wwWallet ; https://forum.polkadot.network/t/webauthn-passkeys-with-prf-extension-for-stateless-private-keys/14368)

15. **Bitwarden uses passkey-PRF as UNLOCK over an existing key, NOT as the seed.** The PRF output (stretched via HKDF to a 64-byte AES+MAC pair) *encrypts/decrypts* the user's existing vault key — it does not generate the identity from scratch. This is the "passkey-as-unlock-over-a-stored-key" model, distinct from "passkey-as-seed." (Source: https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/ and the prior brief §18.) Both patterns ship today; they are architecturally different.

### What the local Stellar reference kits actually do (a THIRD, different model — for contrast)

16. **`passkey-kit` and `smart-account-kit` do NOT use PRF at all.** `grep -rIn -e prf -e PRF passkey-kit/src smart-account-kit/src` → no matches. `passkey-kit/package.json` pins `@simplewebauthn/browser@^13.2.0`, used purely for credential *signing* (P-256, `alg:-7`), not key derivation. (Source: files under `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/passkey-kit/src` and `/smart-account-kit/src`; grep output.)

17. **In the Stellar kits, the passkey is an on-chain SIGNER and the account address is derived deterministically from the credential ID — not from a private key.** `passkey-kit/src/kit.ts:86` sets `salt: hash(keyId)` and `:598`–`:610` compute the contract address via `StrKey.encodeContract(hash(HashIdPreimage.envelopeTypeContractId({ … salt: hash(keyIdBuffer) })))`. The deterministic mapping is **credential ID → smart-contract account address** (the wallet is a deployed Soroban contract whose authorized signer is the passkey's public key), NOT **credential → private key → wallet**. (Source: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/passkey-kit/src/kit.ts` lines 86, 191–222, 598–610.) This is a smart-account model: losing the passkey loses the *signer*, but the account is a contract that can (in that model) be recovered by adding another signer — a different recovery story from PRF-seed wallets. (Recoverability mechanics of that model are out of scope here; noted only to distinguish the three patterns.)

## Direct answers to the founder's questions

**Q1 — Is a WebAuthn-PRF-derived key deterministic for the same credential + salt?**
Yes. MDN defines the PRF as a random oracle: same input always returns the same value (#1). The output is bound to the specific credential (#2). So same credential + same salt → same 32-byte output → same key/seed → same wallet (#3). The RP must reuse the same salt for this to hold.

**Q2 — Does "same fingerprint/Face ID on a different device → same wallet" hold?**
No — not as stated. The biometric is only a local unlock; it is neither the key nor the identity (#4). The key is determined by the CREDENTIAL, not the finger/face (#5–#6). The same wallet reconstructs on another device IF AND ONLY IF the *same credential* is present there. That happens only via passkey SYNC within the same ecosystem/account: iCloud Keychain across the user's Apple devices (#8), or Google Password Manager across the user's Android/Chrome devices (#9). It does NOT happen cross-ecosystem (#10), and it does NOT happen for device-bound passkeys — those force a NEW credential on the new device, which yields a DIFFERENT wallet (#11). Net: it's the credential + its sync scope that determines "same wallet," never the biometric (#12).

**Q3 — Passkey loss with no seed backup?**
Confirmed unrecoverable. The PRF output cannot be reproduced without the original credential; with no seed and no recovery secret, the derived wallet is permanently lost (#13). Corbado states this verbatim.

**Q4 — Do shipping wallets use passkey-deterministic onboarding (vs passkey-as-unlock-over-a-seed)?**
Yes, both models ship. PRF-deterministic seed derivation (no seed phrase) is real: Corbado, wwWallet, and a Polkadot implementation derive the wallet seed deterministically from PRF (#14). The contrasting model — passkey-PRF as an UNLOCK that decrypts an already-stored key (Bitwarden) — also ships (#15). And the local Stellar kits use a THIRD model entirely: passkey-as-on-chain-signer with a contract address deterministically derived from the credential ID, with no PRF and no derived private key (#16–#17).

## Unknowns

- **U1 — Exact salt/domain-separation byte construction** (browser-side `"WebAuthn PRF"` + null-byte prefix, hash function) is in the W3C spec but was not quoted from primary source in either research pass; affects native/CTAP-direct impls only. (Carried from prior brief #U1.)
- **U2 — Windows Hello PRF current state** as of 2026-06-21 is contested between Yubico (no hmac-secret) and Corbado (PRF-on-create via Chrome/Edge 147+, Feb 2026). Bears on whether a Windows-only user gets a synced vs device-bound credential. (Carried from prior brief #U2.)
- **U3 — Whether iCloud Keychain / GPM guarantee the SAME PRF output across synced devices in all current OS versions.** Corbado asserts synced credentials reproduce identical PRF outputs (#6 paraphrase), but I did not find an Apple/Google primary doc stating PRF output equivalence across synced devices explicitly (the sync docs confirm the *credential* syncs E2E (#8–#9); PRF-output equivalence is the documented consequence, not an Apple/Google-stated guarantee). Needs: a primary statement, or an empirical two-device PRF test.
- **U4 — Behavior when a synced credential is restored to a brand-new device from cloud backup** (e.g. new iPhone restored from iCloud): whether the credential ID and PRF output survive byte-identical. Not verified from a primary source.
- **U5 — Salt persistence requirement in practice.** Determinism requires the RP to re-pass the identical salt (#3); whether shipping PRF wallets use a fixed global salt vs a per-credential stored salt, and where they store it, was only summarized ("fixed salt"/XOR), not read from source. Needs: read wwWallet keystore + Corbado demo source.

## Sources

Primary / official:
- MDN — Web Authentication extensions (PRF determinism, credential-bound): https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
- Apple Support 102195 — passkeys sync via iCloud Keychain, E2E encrypted, 2FA required: https://support.apple.com/en-us/102195
- Google Identity — passkeys synced via Google Password Manager; cross-device proximity use; no cross-ecosystem sync: https://developers.google.com/identity/passkeys

Vendor / technical (corroboration):
- Corbado — Passkeys & WebAuthn PRF for E2EE (determinism, synced-credential equivalence, permanent loss on passkey loss, deterministic seed wallets): https://www.corbado.com/blog/passkeys-prf-webauthn
- Bitwarden — PRF WebAuthn role (passkey-as-unlock-over-stored-key model): https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/
- webauthn.me / Auth0 / MojoAuth / Security Boulevard — biometric-is-local, device-bound vs synced, new credential on new device: https://www.webauthn.me/passkeys , https://auth0.com/blog/common-developer-misconceptions-about-passkeys/ , https://mojoauth.com/blog/why-passkeys-don-t-work-on-some-devices-device-level-limitations , https://securityboulevard.com/2026/03/why-passkeys-dont-work-on-some-devices-device-level-limitations/
- Shipping PRF-deterministic wallets: https://passkeywallets.com/2026/02/04/frictionless-crypto-sign-in-with-webauthn-passkeys-for-everyday-users/ , https://github.com/wwWallet , https://forum.polkadot.network/t/webauthn-passkeys-with-prf-extension-for-stateless-private-keys/14368

Local reference repos (read/grep):
- `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/passkey-kit/src/kit.ts` (lines 86, 191–222, 598–610) — credential-ID→contract-address derivation; no PRF
- `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/passkey-kit/package.json` — `@simplewebauthn/browser@^13.2.0` (signing only)
- `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/smart-account-kit/src/*` — grep: no PRF
- Prior brief: `/Users/abu/dev/hackathon/stellar-zk-wallet/.thoughts/research/2026-06-21-passkey-prf.md`

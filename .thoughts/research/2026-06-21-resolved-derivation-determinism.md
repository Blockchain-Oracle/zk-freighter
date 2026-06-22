# Key-derivation version + passkey PRF determinism (resolve or assign to Phase 0)

Date: 2026-06-21
Scope: (1) derivation message version + signature count in the Stellar reference prover; (2) WebAuthn PRF determinism across synced/restored passkey credentials.

---

## Resolved

### Q1 — Key-derivation message constant: [v1] or [v2], one or two signatures, does the version matter for our integration

**Status: CONFIRMED**

**Answer:**

- The **active constant is `[v1]`**, not `[v2]`. The string actually signed is `"Privacy Pool Key Derivation [v1]"`.
  - Evidence: `app/crates/core/prover/src/encryption.rs:50` — `pub const KEY_DERIVATION_MESSAGE: &str = "Privacy Pool Key Derivation [v1]";`
  - The three domain tags are likewise all `/v1`: `encryption.rs:52` (`b"privacy-pool/note-key/v1"`), `encryption.rs:53` (`b"privacy-pool/encryption-key/v1"`), `encryption.rs:54` (`b"privacy-pool/asp-secret/v1"`).
  - These are flagged as immutable: `encryption.rs:46-47` — "Key derivation constants. These MUST remain constant for backwards compatibility."

- **There is exactly ONE signature**, not two. A single Ed25519 wallet signature over `KEY_DERIVATION_MESSAGE` derives BOTH keypairs via domain separation (SHA-256 over `domain || signature`).
  - Single entry point: `encryption.rs:57-73` — `derive_encryption_and_note_keypairs(signature: KeyDerivationSignature)` takes one signature and returns `(NoteKeyPair, EncryptionKeyPair)`.
  - Note key: `encryption.rs:167` hashes with `NOTE_KEY_DOMAIN`; encryption key: `encryption.rs:125` hashes with `ENCRYPTION_KEY_DOMAIN` — same `signature`, different domain tag (`hash_signature_with_domain`, `encryption.rs:181-186`).
  - Explicit history note in the module header confirms the design changed FROM two signatures TO one: `encryption.rs:27-31` — "the original scheme had separate signatures for spending and encryption keys. To improve UX we reduced to a single signature derivation accepting some associated risks..."
  - Confirmed at the call site: `app/js/wallet.js:235-237` — "Derives spending and encryption keys from a **single** Freighter wallet signature." The web client surfaces exactly one message to sign via `keyDerivationMessage()` → `KEY_DERIVATION_MESSAGE` (`app/crates/platforms/web/src/client/mod.rs:302-305`).

- **There is a stale doc-vs-code mismatch inside the file**: the ASCII diagram in the module header says `[v2]` and `/v2`, but the real constants are `[v1]` and `/v1`.
  - Evidence (the wrong one): `encryption.rs:19` — `signMessage("Privacy Pool Key Derivation [v2]")`; and `encryption.rs:22,24` reference `"privacy-pool/note-key/v2"` / `"privacy-pool/encryption-key/v2"` in the comment only.
  - The compiled behavior follows the constants (`[v1]` / `/v1`), since the comment is non-executable. The `[v2]` text is documentation drift.

- **Does the version matter for OUR seed/passkey-derived integration?** Only as a fixed input string we must reproduce byte-for-byte, AND as a cautionary precedent — not as a cryptographic constraint we inherit.
  - The "version" here is just a literal label baked into the signed message + domain tags. If we port this scheme, the derived keys are a pure function of `(exact message string, exact domain bytes, signature bytes)`. Any drift in the label (e.g. accidentally signing `[v2]` because someone trusted the comment) produces a **completely different, unrecoverable key**. So the version string is load-bearing and must be pinned in one constant, never duplicated in prose.
  - For our **seed-derived** path (mnemonic → Ed25519 → sign `KEY_DERIVATION_MESSAGE`) the scheme transfers directly: deterministic because the seed deterministically reproduces the signature, which deterministically reproduces both keypairs.
  - For our **passkey-derived** path the version label is irrelevant to the hard problem — the hard problem is whether the *input secret* (the PRF output that would replace the Ed25519 signature) is itself reproducible across devices. That is Q2.

---

### Q2 — Passkey PRF determinism: byte-identical across SYNCED credentials and across a RESTORED credential

**Status: NEEDS_PHASE0_RUN** (partially confirmed; the cross-device byte-identical claim is NOT stated by any primary source we could cite).

**What IS confirmed from primary sources:**

1. **PRF is deterministic for a fixed (credential, input/salt) on a given authenticator.** This is the definitional property.
   - MDN: "A PRF is effectively a random oracle — a function that returns a random value for any given input, but will always return the same value for the same input." — https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
   - W3C WebAuthn L3 publishes fixed PRF **test vectors** (§16.17.1 "Pseudo-random function extension (prf)" with test vectors), confirming a defined, reproducible computation — https://www.w3.org/TR/webauthn-3/#prf-extension
   - PRF wraps the CTAP2 `hmac-secret` extension (HMAC ⇒ deterministic): Levi Schuck — "PRF Extension implementations are expected to wrap the CTAP HMAC Secret Extension..." and "Its output is a deterministic binary string that is indistinguishable from random." — https://levischuck.com/blog/2023-02-prf-webauthn

2. **The PRF secret is bound to the authenticator/credential, not the RP.** The output is "the result of evaluating the value with the PRF of the associated credential" (MDN, same URL). For a NON-synced authenticator the secret is per-authenticator (Levi Schuck: "the PRF secret is tied to one and only one authenticator"), which is why a hardware YubiKey gives a different PRF than another YubiKey for the same RP/salt.

3. **For SYNCED passkeys the *architectural expectation* is that the secret syncs, so the output should match — but this is stated as expectation, not a vendor guarantee.**
   - Corbado: "With synced passkeys, such as those synced through iCloud Keychain or Google Password Manager, the secret material is synchronized across devices. That means the PRF output is the same across those devices if you use the same salt." — https://www.corbado.com/blog/passkeys-prf-webauthn (note: this is presented as architectural expectation, not measured byte-equality).
   - Community testing cited by Corbado: synced providers (Apple Passwords, Google Password Manager) reach ~100% "PRF-on-create" success — but that measures availability, not cross-device output equality.

**What is NOT confirmed (the gap that forces a Phase-0 run):**

- **No primary spec or vendor doc (Apple, Google, W3C, MDN) states that the PRF output is byte-identical across two physical devices holding the same synced credential, nor across a credential restored from cloud backup to a fresh device.** The spec defines determinism per-authenticator; it does not promise the synced copy reproduces the same internal `hmac-secret` byte-for-byte.
- **There is a documented divergence risk for cross-platform / hybrid (QR) flows.** Reports indicate that direct platform login across Apple devices can yield consistent PRF, while authenticating via the **hybrid/QR (cross-platform authenticator)** path yields a *different but internally-consistent* PRF output — implying a device/transport-specific component in some flows. (Surfaced in community/issue reporting aggregated by the 2026 PRF survey; treat as a hazard to test, not a citable guarantee.) Apple also historically did **not** pass `prf` extension data to/from external roaming authenticators on iOS/iPadOS (Yubico Developers Guide to PRF — https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html).
- **Platform-version floor matters:** PRF over iCloud Keychain only became broadly available on macOS 15 / iOS 18.4+ (Safari 18+, Chrome 132+, Firefox 139). Older OS/browser combos may return no PRF or a non-synced result. (Survey aggregation, Corbado URL above.)

**Conclusion for Q2:** Determinism *on a single device* is CONFIRMED. Byte-identical PRF across SYNCED devices and across a RESTORED device is **plausible but unproven from primary docs** and has a real divergence hazard on hybrid/QR flows — therefore it must be empirically verified in Phase 0 before we let PRF output seed any non-recoverable key.

---

## UX implication

- **Q1 (seed path):** Because one signature deterministically reproduces both keypairs from the wallet seed, recovery is "enter your seed phrase, re-sign one message, all keys return" — zero stored secrets, one signing prompt. We must (a) pin the message + domain strings in a single constant module and (b) fix the `[v2]` comment drift so no future dev signs the wrong string and silently bricks recovery. A single mismatched byte in the message = permanently different, unrecoverable keys (the failure is silent — it derives *a* valid-looking key, just the wrong one).
- **Q2 (passkey path):** PRF feels magical for UX (Face ID → keys, no seed phrase) but if the PRF output is NOT byte-identical across a user's other devices / a restored device, the user authenticates successfully yet **decrypts nothing** — the worst possible UX (looks fine, silently wrong). Until Phase 0 proves byte-equality on our exact target platforms, we MUST NOT derive the spend/encryption key *directly* from PRF. The safe pattern is **envelope encryption**: generate a random Data Encryption Key once, wrap it with a PRF-derived Key Encryption Key, and store the wrapped blob in sync/cloud so any device that reproduces the PRF can unwrap it — and if PRF diverges on a device, we detect it (unwrap fails) instead of silently producing garbage, and can re-enroll that device. This also limits the "blast radius" concern (Tim Cappalli, via lilting.ch — https://lilting.ch/en/articles/passkeys-prf-extension-encryption-risk).

---

## Anything that needs a Phase-0 run (and the exact test)

**WE (not the founder) will run this. It is the only open item.**

**Test P0-PRF-DETERMINISM — two-device + restore byte-equality of WebAuthn PRF.**

Setup: a tiny static HTML+JS harness (no backend) served over HTTPS/localhost that:
1. On create: `navigator.credentials.create({ publicKey: { ..., extensions: { prf: {} } } })`, store the returned `credentialId` (and surface it for manual carry-over).
2. On evaluate: `navigator.credentials.get({ publicKey: { allowCredentials: [{id: credentialId,...}], extensions: { prf: { eval: { first: FIXED_SALT } } } } })` where `FIXED_SALT` is a hardcoded 32-byte constant.
3. Read `getClientExtensionResults().prf.results.first`, hex-encode it, and display it.

Matrix to execute and record the hex output for each cell:
- **A. Same device, repeated:** call evaluate 3× on Device 1 (Mac, Safari 18+ / Chrome 132+). Expect identical (sanity check of determinism).
- **B. Synced second device, direct platform login:** create on Device 1 (iCloud Keychain), then on Device 2 (a second Apple device signed into the same iCloud) run evaluate with the SAME `credentialId` + SAME `FIXED_SALT` via the platform authenticator. Compare hex to A.
- **C. Cross-platform / hybrid (QR) flow:** from a desktop with NO local copy, trigger the QR/hybrid flow and authenticate with the phone holding the synced passkey; evaluate same salt. Compare hex to B (this is the documented divergence hazard).
- **D. Restored device:** wipe/sign out Device 2, restore the credential purely from iCloud sync (or a fresh device added to the iCloud account), evaluate same salt. Compare hex to A/B.
- **E. (If targeting Android/Chrome) repeat B–D with Google Password Manager sync.**

Pass criteria: cells A, B, D produce **byte-identical** hex. Record C explicitly — if C differs, we must forbid the hybrid/QR flow as a key source OR pin to envelope encryption so a divergent C simply fails-closed (unwrap error) instead of producing wrong keys.

Decision gate: only if A/B/D are byte-identical on our shipping target platforms (record exact OS + browser versions) may we consider PRF-derived keys at all; regardless of outcome, ship the **envelope-encryption** wrapper so device divergence is detectable, not silent.

Platform-version note to record during the run: confirm each device meets the floor (macOS 15 / iOS 18.4+, Safari 18+ / Chrome 132+ / Firefox 139) — below the floor PRF may be absent or non-synced.

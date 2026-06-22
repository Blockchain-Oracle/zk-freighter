# Reality Research: Stellar passkey smart accounts (secp256r1, passkey-kit / smart-account-kit)

## Scope

How a WebAuthn passkey (secp256r1 / P-256 / ES256) controls a Stellar (Soroban) account today. Covers: the on-chain secp256r1 verification host function (which protocol, the soroban-sdk API); how a Soroban smart-wallet contract verifies a WebAuthn signature via the `CustomAccountInterface::__check_auth` custom-account flow; account deployment/funding; adding/removing signers; the actual API surface of `passkey-kit` and `smart-account-kit`; and the exact browser→Soroban signing/auth path for a contract call.

Two distinct codebases are covered because they represent two generations of the same idea by the same author (Tyler van der Hoeven / "kalepail"):
1. **passkey-kit** v0.12.0 — the original self-contained smart-wallet contract + TS SDK. Repo README now self-labels it "legacy precursor."
2. **smart-account-kit** v0.3.0 — TS SDK on top of the audited **OpenZeppelin stellar-contracts** "Smart Account" framework (external verifier contracts + context rules + policies).

Facts only; no recommendations or architecture proposals.

## Sources Checked

Primary repos cloned to `/Users/abu/dev/hackathon/stellar-research/repos`:
- `passkey-kit` (github.com/kalepail/passkey-kit), `package.json` version **0.12.0**.
- `smart-account-kit` (github.com/kalepail/smart-account-kit), `package.json` version **0.3.0**.

Files read (primary):
- passkey-kit contracts: `contracts/smart-wallet/src/lib.rs`, `verify.rs`, `signer.rs`, `context.rs`; `contracts/smart-wallet-interface/src/types.rs`, `lib.rs`; `contracts/sample-policy/src/lib.rs`; `contracts/example-contract/src/lib.rs`; `contracts/Cargo.toml`, `contracts/smart-wallet/Cargo.toml`, `contracts/rust-toolchain.toml`, `contracts/Makefile`; `cheatsheet.txt`; `README.md`.
- passkey-kit TS: `src/kit.ts`, `src/base.ts`, `src/server.ts`; `packages/passkey-kit-sdk/package.json`, `packages/sac-sdk/package.json`.
- smart-account-kit TS: `src/constants.ts`, `src/contract-types.ts`, `src/kit.ts` (signAuthEntry/transfer/execute), `src/kit/webauthn-ops.ts`, `src/kit/auth-payload.ts`, `package.json`; `demo/README.md`, `demo/.env.example`, `demo/src/App.tsx`.

External (WebFetch/WebSearch/context7):
- developers.stellar / stellar.org Protocol 21 announcement + CAP-0051 (secp256r1).
- docs.openzeppelin.com/stellar-contracts/accounts: `smart-account`, `authorization-flow`, `signers-and-verifiers`.
- docs.rs `soroban_sdk::crypto::Crypto` (host fn signatures).
- context7 `/stellar/rs-soroban-sdk` (`CustomAccountInterface` trait).
- crates.io `stellar-accounts` (OZ accounts crate).

Not reachable / not deeply read: live on-chain state of the cited contract addresses (not queried against RPC); full OZ `stellar-contracts` Rust source (read via docs only, repo not cloned); passkey-kit `zephyr/` Mercury indexer source; smart-account-kit `indexer/` source.

## Verified Facts

### A. The on-chain secp256r1 verification host function

1. **secp256r1 verification is a native Soroban host function added in Protocol 21**, specified by **CAP-0051** ("Smart Contract Host Functionality: Secp256r1 Verification"). Protocol 21 was voted in by mainnet validators on **June 18, 2024**. CAP-0051 adds one host function `verify_sig_ecdsa_secp256r1` (export name "3" in module "c"). Source: stellar.org Protocol 21 announcement; github.com/stellar/stellar-protocol/blob/master/core/cap-0051.md.

2. **soroban-sdk API** (`soroban_sdk::crypto::Crypto`, confirmed via docs.rs):
   ```rust
   pub fn secp256r1_verify(
       &self,
       public_key: &BytesN<65>,      // SEC-1 uncompressed P-256 pubkey (0x04 || X || Y)
       message_digest: &Hash<32>,    // 32-byte digest
       signature: &BytesN<64>,       // r||s, 64 bytes
   )                                  // returns () ; panics on invalid signature
   ```
   Related: `ed25519_verify(&BytesN<32>, &Bytes, &BytesN<64>)` and `sha256(&Bytes) -> Hash<32>`. Source: docs.rs/soroban-sdk crypto::Crypto; usage confirmed in `passkey-kit/contracts/smart-wallet/src/verify.rs:25-29`.

3. **The smart wallet's secp256r1 builds the digest itself**, it does NOT trust a caller-supplied digest. In `verify.rs:23-29`: it appends `sha256(client_data_json)` to `authenticator_data`, then verifies over `sha256(authenticator_data || sha256(client_data_json))`. This matches the WebAuthn signing convention (authenticator signs `authenticatorData || SHA-256(clientDataJSON)`).

4. **Challenge binding is double-checked in Rust** (`verify.rs:31-47`): after `secp256r1_verify`, the contract deserializes `client_data_json` (via `serde-json-core`, struct `ClientDataJson { challenge: &str }`), base64url-encodes the expected 32-byte `signature_payload` into a 43-char buffer, and panics with `ClientDataJsonChallengeIncorrect` if `clientDataJSON.challenge != expected`. (Code comment questions whether this is strictly necessary given `secp256r1_verify`.)

### B. passkey-kit smart-wallet contract (`__check_auth` custom-account flow)

5. **Contract = `smart-wallet` crate v0.5.0**, `soroban-sdk = "23.0"`, edition 2021, rust toolchain `1.89`, target `wasm32v1-none`. `panic = "abort"`, `opt-level = "z"`, `lto = true`. Source: `contracts/Cargo.toml`, `contracts/smart-wallet/Cargo.toml`, `contracts/rust-toolchain.toml`.

6. **It implements `soroban_sdk::auth::CustomAccountInterface`** (`lib.rs:109-209`):
   ```rust
   type Error = Error;
   type Signature = Signatures;            // pub struct Signatures(pub Map<SignerKey, Signature>)
   fn __check_auth(env, signature_payload: Hash<32>, signatures: Signatures, auth_contexts: Vec<Context>) -> Result<(), Error>
   ```
   The trait signature is confirmed against soroban-sdk (`__check_auth(env, signature_payload: Hash<32>, signatures, auth_contexts: Vec<Context>)`). `__check_auth` runs automatically when `require_auth` is called on the wallet's contract address.

7. **Three signer kinds** (`smart-wallet-interface/src/types.rs:37-65`):
   - `Signer::Policy(Address, SignerExpiration, SignerLimits, SignerStorage)`
   - `Signer::Ed25519(BytesN<32>, …)`
   - `Signer::Secp256r1(Bytes /*credential id*/, BytesN<65> /*pubkey*/, …)`
   `SignerKey` is the map key (`Policy(Address)` | `Ed25519(BytesN<32>)` | `Secp256r1(Bytes)`); the secp256r1 key is the WebAuthn **credential ID**, and the P-256 pubkey lives in the stored `SignerVal::Secp256r1(BytesN<65>, …)`.

8. **The secp256r1 signature payload** (`types.rs:67-73`):
   ```rust
   pub struct Secp256r1Signature { authenticator_data: Bytes, client_data_json: Bytes, signature: BytesN<64> }
   ```

9. **`__check_auth` is two-phase** (`lib.rs:121-207`):
   - Phase 1 (per auth context): find at least one signer in `signatures` whose stored `SignerLimits` authorize that context; checks expiration via `verify_signer_expiration` (panics `SignerExpired` if `ledger().sequence() > expiration`); else panics `MissingContext`.
   - Phase 2 (per signature): cryptographically verify. `Ed25519` → `env.crypto().ed25519_verify`; `Secp256r1` → `verify_secp256r1_signature`; `Policy` → forwards the full `Vec<Context>` to the policy contract's `policy__`.

10. **Signer limits / context gating** (`context.rs`): `SignerLimits(Option<Map<Address, Option<Vec<SignerKey>>>>)`. `None`/empty ⇒ signer can authorize anything. Otherwise the signer can only authorize contexts whose target `contract` is a key in the map; the map value lists co-signer `SignerKey`s that MUST also be present in `signatures` (multisig). A signer scoped to the wallet's own address may only call `remove_signer` on itself (`context.rs:33-40`). Policy keys in the limits are invoked rather than required-present (`signer.rs:137-180`).

11. **Signer management functions** (`SmartWalletInterface`, `lib.rs:36-107`): `__constructor(signer)`, `add_signer(signer)`, `update_signer(signer)`, `remove_signer(signer_key)`, `update_contract_code(hash)`. `__constructor` adds the first signer and sets `INITIALIZED`; after init, `add_signer`/`update_signer`/`remove_signer`/`update_contract_code` all call `env.current_contract_address().require_auth()` — i.e. the wallet authorizes its own signer changes through `__check_auth`. Signers stored in `Persistent` or `Temporary` storage; events emitted under tag `sw_v1`.

12. **Policy interface** (`smart-wallet-interface/src/lib.rs:17-20`): `fn policy__(env, source: Address, signer: SignerKey, contexts: Vec<Context>)`. Sample policy (`sample-policy/src/lib.rs`) rejects a `transfer` whose amount arg > 10_000_000, and rejects any non-Contract context.

### C. passkey-kit TypeScript SDK (`PasskeyKit` / `PasskeyServer`)

13. **Versions / deps**: `passkey-kit` 0.12.0 depends on `@stellar/stellar-sdk ^14.2.0`, `@simplewebauthn/browser ^13.2.0`, `@openzeppelin/relayer-plugin-channels ^0.5.0`, workspace SDKs `passkey-kit-sdk` (0.7.2) and `sac-sdk` (0.4.2). Library ships TS source (not transpiled) to avoid double-bundling stellar-sdk; consumers must `transpilePackages`. Source: `package.json`, `packages/*/package.json`, README.

14. **`PasskeyKit` constructor** needs `{ rpcUrl, networkPassphrase, walletWasmHash, timeoutInSeconds?=30, WebAuthn? }` (`kit.ts:31-56`). `timeoutInSeconds` default 30 explicitly because "OpenZeppelin Relayer requires <= 30 second timeout."

15. **Wallet address is deterministic from the passkey** (`kit.ts:58-110`, `597-611`). `createWallet` calls `createKey` (WebAuthn `startRegistration`, `pubKeyCredParams alg:-7` = ES256) then `PasskeyClient.deploy(...)` with `salt = hash(keyId)` and a hard-coded deployer source keypair `Keypair.fromRawEd25519Seed(hash(Buffer.from('kalepail')))`. The contract id is derived via `HashIdPreimageContractId(networkId, fromAddress(walletPublicKey, salt=hash(keyId)))`. `connectWallet` re-derives the same contract id from the keyId and verifies via `rpc.getContractData(..., scvLedgerKeyContractInstance())`, falling back to a `getContractId(keyId)` lookup (Mercury) if derivation misses.

16. **P-256 pubkey extraction** (`getPublicKey`, `kit.ts:613-660`): pulls the 65-byte uncompressed key from `response.publicKey`, else parses COSE from `authenticatorData`/`attestationObject` and reconstructs `0x04 || X || Y`.

17. **Signature is compacted to 64-byte low-S** (`compactSignature`, `kit.ts:662-697`): decodes DER `r,s`, enforces low-S using curve order `n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551`, outputs `r||s` (64 bytes). Low-S is required by the protocol (links stellar-protocol discussion #1435).

18. **The browser→Soroban signing path** (`signAuthEntry`, `kit.ts:235-423`):
    - Take a `SorobanAuthorizationEntry`; set `signatureExpirationLedger` (default `latestLedger + timeoutInSeconds/5`, assuming 5s ledgers).
    - Build `HashIdPreimage.envelopeTypeSorobanAuthorization({ networkId: hash(passphrase), nonce, signatureExpirationLedger, invocation: rootInvocation })`; `payload = hash(preimage.toXDR())`.
    - Call WebAuthn `startAuthentication({ challenge: base64url(payload), allowCredentials:[{id:keyId}], userVerification:"preferred" })`.
    - Build a `SignerKey::Secp256r1(credentialId)` → `Signature::Secp256r1({ authenticator_data, client_data_json, signature: compact })` map entry and splice it into the auth entry's signature (a `Vec<Map<SignerKey,Signature>>`), keeping the map sorted by key. Also supports `keypair` (Ed25519) and `policy` signing modes.
    - `sign(txn,…)` (`kit.ts:425-460`) wraps an `AssembledTransaction` and calls `txn.signAuthEntries({ address: walletContractId, authorizeEntry })`.

19. **`PasskeyServer`** (`server.ts`): `getSigners(contractId)` and `getContractId({keyId|publicKey|policy})` query a **Mercury / Zephyr** indexer (`/zephyr/execute` functions `get_signers_by_address`, `get_addresses_by_signer`). `send(txn)` submits via OpenZeppelin Relayer "Channels" client (`@openzeppelin/relayer-plugin-channels`). Server config: `relayerUrl/relayerApiKey`, `mercuryProjectName/mercuryUrl/mercuryJwt|mercuryKey`. The wallet contract holds no fee balance directly; the relayer/deployer pays fees.

20. **Authorizing a contract CALL (e.g. token transfer / pool deposit) in passkey-kit**: the target contract calls `from.require_auth()` (see `example-contract/src/lib.rs:24-25` doing `token::transfer`); when `from` is the smart wallet, Soroban invokes the wallet's `__check_auth` with the call as an `auth_context`. The dApp builds the invoke tx, calls `PasskeyKit.sign()` (which prompts the passkey and fills the auth entry as in fact 18), then submits via relayer or RPC. The passkey signs the auth-entry preimage hash; the wallet contract re-verifies secp256r1 + the challenge + signer limits on-chain.

21. **Testnet smart-wallet WASM hash** in repo Makefile: `SMART_WALLET_WASM=e45c42b944a767bd5f37f8c4a469b48917d28e23481dbfd550419c84cdacde92` (testnet). Source: `contracts/Makefile`. (Not verified against live RPC.)

### D. smart-account-kit + OpenZeppelin Smart Account (the successor)

22. **passkey-kit README explicitly marks itself the "legacy precursor"** to OpenZeppelin Smart Accounts and points new projects to `smart-account-kit`. Source: `passkey-kit/README.md:3-18`. README also warns the passkey-kit code is unaudited demo material.

23. **OZ Smart Account = a 3-component model** (Context Rules + Signers + Policies). **Signers and verifiers are separated**: a verifier is an external contract that does signature validation; signature schemes (secp256r1/WebAuthn, ed25519, secp256k1, BLS, RSA, etc.) each have a verifier contract, and one verifier validates keys for many accounts. Source: docs.openzeppelin.com/stellar-contracts/accounts (`smart-account`, `signers-and-verifiers`).

24. **Signer types** (OZ): `Signer::Delegated(Address)` (defers to `require_auth_for_args` on any Soroban/Stellar address — enables nested smart accounts and G-accounts) and `Signer::External(Address /*verifier*/, Bytes /*public key*/)`. Confirmed in `smart-account-kit/src/kit/auth-payload.ts:172-185` (`Delegated` / `External` enum encoding).

25. **Verifier trait** (OZ): `verify()` (validate signature against hash+pubkey, constant-time), `canonicalize_key()`, `batch_canonicalize_key()` (dedupe keys). The `sig_data` passed to the verifier is the **XDR-encoded** scheme-specific struct. Source: docs.openzeppelin signers-and-verifiers.

26. **WebAuthn signature struct (OZ)** `WebAuthnSigData { authenticator_data: Bytes (>=37B), client_data: Bytes (JSON, <=1024B), signature: BytesN<64> }`. Note field name is **`client_data`** (vs passkey-kit's `client_data_json`). P-256 pubkey is 65-byte uncompressed. Source: docs.openzeppelin; mirrored in `smart-account-kit/src/contract-types.ts:3-7` and built in `src/kit/auth-payload.ts:37-52` as an scvMap of symbols `authenticator_data`/`client_data`/`signature`.

27. **OZ authorization flow** (docs.openzeppelin authorization-flow). The signature payload is an **`AuthPayload { signers: Map<Signer,Bytes>, context_rule_ids: Vec<u32> }`**. Per auth context the caller supplies exactly one rule id, aligned by index. **Anti-downgrade binding: the signed digest is `sha256(signature_payload || context_rule_ids.to_xdr())`** — confirmed in code `smart-account-kit/src/kit/auth-payload.ts:26-35` (`buildAuthDigest` hashes `signaturePayload || scvVec(u32 ruleIds).toXDR()`). Evaluation: lookup rule (must match context type, not expired) → authenticate signers (delegated via `require_auth_for_args`, external via verifier `verify`) → enforce policies via `enforce()` (which both validates and mutates state, panics on failure) → success is atomic. Limits: max **15 signers and 5 policies per context rule**, unlimited rules.

28. **smart-account-kit TS** v0.3.0, `@stellar/stellar-sdk` (v14-class), depends on workspace `smart-account-kit-bindings`. Constructor config: `{ rpcUrl, networkPassphrase, accountWasmHash, webauthnVerifierAddress (required), timeoutInSeconds?=30, storage?, rpId?, rpName?, relayerUrl? }`. Source: `package.json`, README, `src/kit.ts`.

29. **smart-account-kit API surface** (README + `src/kit.ts`): top-level `createWallet`, `connectWallet({prompt|fresh|credentialId|contractId})`, `disconnect`, `authenticatePasskey`, `sign`, `signAndSubmit` (recommended), `signAuthEntry`, `execute(target, fn, args)` / `executeAndSubmit` (arbitrary smart-account-mediated call), `transfer`, `fundWallet` (Friendbot, testnet). Sub-managers: `kit.signers` (`addPasskey`/`addDelegated`/`remove`), `kit.rules` (context-rule CRUD), `kit.policies` (`add`/`remove`), `kit.credentials`, `kit.multiSigners`, `kit.externalSigners`, `kit.indexer`, `kit.events`. Raw contract client at `kit.wallet`.

30. **smart-account-kit browser→Soroban path** (`src/kit/webauthn-ops.ts:119-199`, `src/kit/auth-payload.ts`): set expiration; read/seed `AuthPayload`; resolve the WebAuthn signer for the chosen `context_rule_ids`; `buildSignaturePayload` = `hash(HashIdPreimage.envelopeTypeSorobanAuthorization(...))`; `buildAuthDigest` = `hash(signaturePayload || ruleIds.xdr)`; WebAuthn `startAuthentication({ challenge: base64url(authDigest), allowCredentials:[{id:credentialId}] })`; compact DER→64-byte low-S; assemble `WebAuthnSigData` scvMap; `upsertAuthPayloadSigner`; write `AuthPayload` (signers sorted by key XDR) into `credentials.signature(...)`. Storage adapters (`IndexedDBStorage`/`LocalStorageAdapter`/`MemoryStorage`) persist credentials + a session (default 7-day expiry) for silent reconnect.

31. **smart-account-kit testnet demo addresses** (`demo/.env.example`, `demo/README.md`, `demo/src/App.tsx`):
    - WebAuthn Verifier contract: `CCMR63YE5T7MPWREF3PC5XNTTGXFSB4GYUGUIT5POHP2UGCS65TBIUUU` (wasm hash `f83d679f0ead1836b255a0f4160b9766065436a3b1afb9b15d73b646d68c0725`).
    - Ed25519 Verifier: `CCJOUKLCZVCXS4VIBBEA7S3SPWZQS5DPE5A4YG67RA3Z7E3SJZAUJFQA` (wasm `2c1dae0a0fd609d818df05fff5deff91c7565151d82b6259a61d03c8edfdeeca`).
    - Account WASM hash: `8537b8166c0078440a5324c12f6db48d6340d157c306a54c5ea81405abcc2611`.
    - SAC client id referenced in passkey-kit Makefile bindings: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (native XLM SAC). (None verified against live RPC.)

32. **OpenZeppelin `stellar-accounts` crate is published** on crates.io. Search reports version **0.7.1** (and an RC v0.7.0 audit). The Rust source lives at github.com/OpenZeppelin/stellar-contracts under `packages/accounts`, with a `examples/multisig-smart-account/account`. Source: crates.io/crates/stellar-accounts; openzeppelin.com news (RC v0.7.0 audit). (Exact crate version pin used by the demo's `accountWasmHash` not verified.)

### E. Funding / fees

33. **Smart wallet (a contract) cannot be funded by Friendbot directly.** smart-account-kit `fundWallet` (`src/kit.ts:1062-1084`, doc comment) creates a temp G-account, funds it via Friendbot (`https://friendbot.stellar.org`), then transfers XLM to the contract. Constants: 1 XLM = 10_000_000 stroops; reserve 5 XLM (`src/constants.ts`).
34. **Fees are paid by a separate party** (deployer keypair as tx source, or a Relayer). Both kits support a relayer URL for gasless/fee-sponsored submission; smart-account-kit posts `{func, auth}` for invoke flows and `{xdr}` for signed txs to the relayer (README "Fee Sponsoring").

## Inferences

(Clearly labeled; not directly verified.)

- **[Inference]** The OZ Smart Account's `External` signer verifier is the architectural replacement for passkey-kit's inline `verify_secp256r1_signature`: the account contract stays scheme-agnostic and delegates secp256r1 verification to the WebAuthn verifier contract, which internally calls the same `env.crypto().secp256r1_verify` host fn. The docs describe verifier `verify()` + the secp256r1 host fn; I did not read the verifier's Rust source to confirm the exact call.
- **[Inference]** A "pool deposit" authorizes identically to a token transfer: the pool calls `require_auth` on the smart account, producing an auth context the passkey signs; nothing in either kit is token/pool-specific (passkey-kit `example-contract` and smart-account-kit `execute(target, fn, args)` are generic). The pool contract itself must be designed to call `require_auth`/`require_auth_for_args`.
- **[Inference]** smart-account-kit's `accountWasmHash` corresponds to a build of the OZ `stellar-accounts` smart-account contract (likely the 0.7.x line given crates.io 0.7.1), but the precise commit/version behind the demo wasm hash is not verified.
- **[Inference]** passkey-kit's deterministic-address scheme (salt = `hash(keyId)`, fixed `'kalepail'` deployer seed) means anyone can derive/deploy a given passkey's wallet address; the security comes entirely from `__check_auth` requiring a valid passkey signature, not from address secrecy. (Consistent with code; not separately confirmed by the authors.)

## Unknowns And Questions

1. **Live on-chain validity** of every cited address / wasm hash (testnet + mainnet) — none were queried against an RPC node in this research. Testnet addresses churn.
2. **Exact OZ verifier `verify()` signature** (param order, whether it returns bool or panics, how `sig_data` XDR is decoded) — sourced from docs prose, not from reading `stellar-contracts/packages/accounts` Rust source (repo not cloned).
3. **OZ `ContextRule` / `AuthPayload` exact Rust contracttype definitions and the `Verifier` trait method signatures** — only the TS mirror (`smart-account-kit-bindings`) and docs prose were read.
4. **soroban-sdk version pin for the OZ account contract** and whether it matches passkey-kit's 23.0.
5. **Mainnet deployment status / canonical addresses** for either the passkey-kit smart wallet or the OZ verifier/account contracts.
6. **Gas/resource cost** of a passkey-authorized invocation (secp256r1_verify CPU cost, storage TTL/archival economics for `Temporary` vs `Persistent` signers) — not measured.
7. **Indexer requirement**: smart-account-kit rule discovery (`rules.list`, `multiSigners.getAvailableSigners`) is indexer-backed; the on-chain contract exposes `get_context_rule(id)` + `get_context_rules_count()` but no active-id iterator. The indexer implementation/source (`smart-account-kit/indexer/`, passkey-kit `zephyr/`) was not read.
8. **Whether the in-Rust challenge re-check (fact 4) is load-bearing** — the contract's own code comment flags it as possibly redundant given `secp256r1_verify`.
9. **`@stellar/stellar-sdk` major version**: passkey-kit pins `^14.2.0`; the host project here (deepbook-predict-agent) is Sui, unrelated — no cross-version constraint analyzed.

## Not Included

- Any recommendation on which kit to use, architecture proposals, or migration guidance — out of scope (reality only).
- Sui / DeepBook content — the surrounding project is Sui-based but unrelated to this Stellar research task.
- Full WebAuthn / FIDO2 protocol explanation beyond what the contracts consume.
- The OZ `stellar-contracts` Rust source line-by-line (read via docs + TS bindings only).
- Performance benchmarks, audit-finding details (beyond noting an RC v0.7.0 audit exists), and mainnet economics.

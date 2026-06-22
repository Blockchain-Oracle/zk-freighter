# Reality Research: Domain model + UX reality for the Stellar ZK wallet

## Scope

Current-reality synthesis for the product domain before implementation: public-to-private shielding, private-to-private transfer, private-to-public unshielding, Stellar public wallet/SAC/trustline constraints, CCTP bridge facts, WXT extension constraints, and documentation drift that could cause scope mistakes.

This is facts-only. It does not propose implementation architecture, screen changes, or build order.

## Sources Checked

- Handoff and plan:
  - `.thoughts/handoffs/2026-06-21-codex-handoff.md`
  - `.thoughts/handoffs/2026-06-21-codex-build-prompts.md`
  - `.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`
- Existing local research:
  - `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
  - `.thoughts/research/2026-06-21-interop-boundary-flows.md`
  - `.thoughts/research/2026-06-21-resolved-trustline-sac.md`
  - `.thoughts/research/2026-06-21-wxt-wallet-arch.md`
  - `.thoughts/research/2026-06-21-cctp-bridge.md`
  - `.thoughts/research/2026-06-21-ux-flow-and-questions.md`
- Existing design specs:
  - `.thoughts/design/screens/2026-06-21-unlock-home.md`
  - `.thoughts/design/screens/2026-06-21-receive.md`
  - `.thoughts/design/screens/2026-06-21-send.md`
  - `.thoughts/design/screens/2026-06-21-shield-unshield.md`
- Reference code:
  - `reference/stellar-private-payments/contracts/pool/src/pool.rs`
  - `reference/stellar-private-payments/circuits/src/policy_tx_2_2.circom`
  - `reference/stellar-private-payments/circuits/src/policyTransaction.circom`
  - `reference/stellar-private-payments/app/crates/core/prover/src/flows.rs`
  - `reference/stellar-private-payments/app/crates/core/prover/src/notes.rs`
  - `reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs`
  - `reference/stellar-private-payments/app/crates/core/stellar/src/tx_prepare.rs`
  - `reference/stellar-private-payments/deployments/testnet/deployments.json`
  - `reference/stellar-private-payments/deployments/scripts/deploy.sh`
  - `reference/stellar-cctp/examples/.env.example`
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/contract.rs`
  - `reference/stellar-cctp/examples/evm.ts`
  - `reference/stellar-cctp/examples/stellar.ts`
  - `reference/freighter/extension/public/static/manifest/v3.json`
  - `reference/freighter/extension/src/contentScript/helpers/redirectMessagesToBackground.ts`
  - `reference/freighter/extension/src/background/helpers/session.ts`
  - `reference/freighter/extension/src/background/messageListener/handlers/signTransaction.ts`
- Current docs checked via Context7:
  - WXT docs: `/websites/wxt_dev_guide`
  - Stellar developer docs: `/websites/developers_stellar`
  - Circle developer docs: `/websites/developers_circle`
- Read-only explorer agents:
  - Nethermind pool mechanics explorer.
  - Stellar shield/unshield UX facts explorer.
  - WXT extension surface explorer.

## Verified Facts

### The pool has one value-moving entry point

- The Nethermind pool has one user value-moving contract method: `transact(env, proof, ext_data, sender)`; deposit, transfer, and withdrawal are not separate pool methods. `sender.require_auth()` runs at the start of `transact`. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:535`.
- The direction is determined by `ext_data.ext_amount`:
  - `> 0`: public-to-private deposit/shield.
  - `= 0`: private-to-private in-pool transfer.
  - `< 0`: private-to-public withdrawal/unshield.
  Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:546`, `:627`.
- The proof’s public inputs include root, public amount, ext data hash, input nullifiers, output commitments, and ASP roots. Source: `reference/stellar-private-payments/circuits/src/policy_tx_2_2.circom:10`.
- The circuit enforces the value invariant `sumIns + publicAmount === sumOuts`. Source: `reference/stellar-private-payments/circuits/src/policyTransaction.circom:209`.

### Public to private: shielding/deposit

- For `ext_amount > 0`, the pool transfers tokens from `sender` to the pool contract with `TokenClient::transfer(&sender, &this, &amount)`, then proceeds through the proof checks and commitment insertion. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:546`.
- The shield/deposit edge is public: the sender authorizes, the external amount is public, the pool invocation is public, the token transfer is public, and two commitment events are emitted. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:541`, `:646`.
- The output note owner is not plaintext on-chain. Output commitments are computed from output amount, recipient note public key, and output blinding; encrypted note data is created for the recipient encryption key. Source: `reference/stellar-private-payments/app/crates/core/prover/src/flows.rs:619`.
- The client has a self-shield path that uses the user’s own note and encryption keys for both output slots. Source: `reference/stellar-private-payments/app/crates/platforms/web/src/client/transact.rs:436`.

### Private to private: shielded transfer

- A private transfer uses the same `transact` path with `ext_amount = 0`; no public token transfer into or out of the pool occurs in that leg. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:546`, `:633`.
- The chain still sees the `transact` invocation, proof public inputs, nullifier events, and output commitment events. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:621`, `:646`.
- The recipient and amount are private circuit/encrypted-note data; output commitments are derived from private output fields. Source: `reference/stellar-private-payments/circuits/src/policyTransaction.circom:180`.
- The client path accepts arbitrary recipient note keys and encryption keys for output slots. Source: `reference/stellar-private-payments/app/crates/platforms/web/src/client/transact.rs:379`.

### Private to public: unshield/withdrawal

- For `ext_amount < 0`, after proof validation, the pool transfers `abs(ext_amount)` from the pool contract to public `ext_data.recipient`. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:627`.
- The withdrawal recipient and exact withdrawn amount are public boundary data. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:633`.
- The nullifier is emitted when notes are spent. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:621`.
- The spent commitment/leaf is not revealed by the withdrawal; membership is proven against a root and nullifier prevents double-spend. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:584`, `:588`, `:616`.

### Notes, keys, and scanning

- Key derivation in the reference engine uses a 64-byte Ed25519 signature over `Privacy Pool Key Derivation [v1]`, with separate domain tags for note key, encryption key, and ASP blinding. Source: `reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs:49`.
- The note private key is a BN254 scalar derived from the signature. Source: `reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs:159`.
- The encryption key is X25519, also derived from the same signature. Source: `reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs:119`.
- Encrypted notes are decrypted locally while scanning pool commitment events. On successful decryption, the client recomputes the commitment and expected nullifier; mismatches and zero-amount dummy outputs are ignored. Source: `reference/stellar-private-payments/app/crates/core/prover/src/notes.rs:31`.
- `register()` publishes a user’s encryption key and note key in a `PublicKeyEvent`; it requires the account owner’s auth. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:674`.

### The deployed testnet pool is native XLM only

- The checked-in deployed pool is testnet native XLM: `asset.kind = native`, pool `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`, token `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`. Source: `reference/stellar-private-payments/deployments/testnet/deployments.json:1`.
- The deploy script supports `contract:<id>`, `native:<id>`, and `classic:<code>:<issuer>:<token_contract_id>` pool specs, so USDC is an intended deployment-time asset option, not a circuit rewrite. Source: `reference/stellar-private-payments/deployments/scripts/deploy.sh:201`.
- The pool itself is single-asset per deployment because it stores one token address and moves value through that token client. Source: `reference/stellar-private-payments/contracts/pool/src/pool.rs:542`.

### Stellar public-wallet UX constraints

- XLM has no trustline. The current XLM pool does not create a trustline UX problem.
- Current Stellar docs fetched through Context7 still show that a new account creation path requires native XLM and rejects starting balances below 1 XLM.
- Current Stellar docs fetched through Context7 show SAC trustline checks via simulation/`authorized`; the docs state attempts to send USDC to a receiver without the right acceptance state should be caught before sending.
- Existing local research and the Stellar explorer agent agree on reserve numbers: base reserve is 0.5 XLM, bare account minimum is 1 XLM, and each trustline/subentry adds 0.5 XLM. Source: `.thoughts/research/2026-06-21-resolved-trustline-sac.md`.
- For issued assets such as USDC, a `G...` recipient needs a trustline; a contract address holds SAC balances in contract storage rather than a classic trustline. Source: `.thoughts/research/2026-06-21-resolved-trustline-sac.md`; Context7 Stellar docs excerpt on SAC balance storage.
- The UX design specs intentionally prohibit showing the word “trustline” in ordinary flows; they require plain-language messages and reserve cost disclosure only when needed. Source: `.thoughts/design/screens/2026-06-21-shield-unshield.md`.

### Honest UX framing already exists in the specs

- Existing specs require “shielded” framing and explicitly prohibit “anonymous” / “fully private.” Source: `.thoughts/design/screens/2026-06-21-shield-unshield.md`.
- Existing receive/send/shield specs teach two boundary concepts:
  - Deposits and withdrawals are public.
  - Private sending happens between those boundary events.
  Sources: `.thoughts/design/screens/2026-06-21-receive.md`, `.thoughts/design/screens/2026-06-21-send.md`, `.thoughts/design/screens/2026-06-21-shield-unshield.md`.
- Existing specs require Pending vs Spendable states to make proof/sync latency legible instead of looking broken. Source: `.thoughts/design/screens/2026-06-21-unlock-home.md`.

### CCTP bridge facts

- Circle’s Stellar CCTP reference repo includes testnet addresses for TokenMessengerMinterV2, MessageTransmitterV2, CctpForwarder, and the Stellar testnet USDC SAC. Source: `reference/stellar-cctp/examples/.env.example:43`.
- The EVM side uses `depositForBurnWithHook` with amount, destination domain, mint recipient, burn token, destination caller, max fee, finality threshold, and hook data. Source: `reference/stellar-cctp/examples/evm.ts:60`.
- The Stellar forwarder’s `mint_and_forward(message, attestation)` validates the message, mints through CCTP, and transfers minted USDC from the forwarder to the final recipient. Source: `reference/stellar-cctp/contracts/cctp-forwarder/src/contract.rs:140`.
- The TS example calls Stellar `mint_and_forward` with only message bytes and attestation bytes. Source: `reference/stellar-cctp/examples/stellar.ts:258`.
- Current Circle docs fetched through Context7 still show the Iris sandbox polling pattern at `https://iris-api-sandbox.circle.com/v2/messages/{sourceDomain}?transactionHash=...` and a Stellar `mint_and_forward` flow.
- A real bridge run was not executed in this session.

### WXT and extension facts

- Freighter is not a WXT project; it is a Webpack-built MV3 extension. It is useful as a wallet architecture reference, not proof that WXT can run this wallet’s proving workload. Source: `.thoughts/research/2026-06-21-wxt-wallet-arch.md`.
- Current WXT docs fetched through Context7 state that WXT background entrypoints become MV3 service workers and that runtime code must be inside the entrypoint `main`.
- Current WXT docs fetched through Context7 show explicit WASM asset handling and `WebWorker` TypeScript lib handling; they do not, in the fetched excerpts, establish a complete offscreen-document proving recipe.
- The WXT explorer confirmed a still-open WXT issue around WASM/top-level-await in MV3 background service workers. Source: `.thoughts/research/2026-06-21-wxt-wallet-arch.md`.
- Freighter’s MV3 manifest uses a service worker, a `<all_urls>` content script at `document_start`, action popup `index.html`, and permissions `storage`, `alarms`, and `sidePanel`. Source: `reference/freighter/extension/public/static/manifest/v3.json:11`.
- Freighter’s dApp bridge is the `@stellar/freighter-api` postMessage flow through a content script, not an injected `window.ethereum`-style provider. Source: `reference/freighter/extension/src/contentScript/helpers/redirectMessagesToBackground.ts:9`.
- Freighter keeps active signing secrets out of the content script path; signing decrypts secret material in the background handler before `Keypair.fromSecret`. Source: `reference/freighter/extension/src/background/messageListener/handlers/signTransaction.ts:29`.

### Documentation drift that can cause wrong implementation

- The latest handoff locks seed phrase as default onboarding and passkey as optional.
- Some older UX/design docs still describe passkey-first / no-seed onboarding. Example: `.thoughts/research/2026-06-21-ux-flow-and-questions.md` describes “No seed phrase” and passkey creation as the first-run default.
- This is a real internal-document conflict. The handoff and plan are newer locked decisions, so any implementation prompt must override passkey-first UX docs unless the founder changes the decision.

## Inferences

- The honest user model is not “private wallet hides everything.” It is: public edges are visible; in-pool transfer contents are shielded; the link between a deposit and later withdrawal is hidden by ZK/nullifiers/Merkle membership.
- The ordinary user should not need to understand SAC, trustlines, nullifiers, Merkle roots, BN254, X25519, or ASP roots. The UX-facing concepts already implied by the specs are “public funds,” “shielded funds,” “Pending,” “Spendable,” “public deposit,” “public withdrawal,” and “private address/private code.”
- For XLM, the current deployed testnet path can avoid almost all trustline complexity.
- For USDC, third-party withdrawals need prechecks. The user-facing copy should explain capability, not protocol jargon: “This address can’t receive USDC yet” rather than “missing trustline.”
- The extension should not be assumed equivalent to the web app. MV3 service worker lifecycle plus WASM proving risk means extension proving needs its own spike before it can be promised.
- A future extension that wants dApp compatibility probably needs to match Freighter’s API/message contract closely enough for Wallets Kit/Freighter integrations, not just expose a standalone extension UI.

## Unknowns And Questions

- The reference app was not fully built or run in this session after the user redirected work back to research mode.
- A real in-browser `policy_tx_2_2` proof timing/memory benchmark is still unmeasured.
- No real testnet `transact` digest was produced in this session.
- Update 2026-06-22: Stellar CLI `27.0.0` is now installed. Native and USDC SAC IDs for testnet/mainnet were re-derived with `stellar contract id asset ...`, and all four returned token interfaces through `stellar contract info interface`. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.
- The deployed XLM pool has not been tested here against a fresh unfunded recipient for the CAP-73 XLM auto-create path.
- No USDC pool is deployed in the workspace, so USDC shield/unshield and recipient-failure behavior remains untested end-to-end.
- Circle CCTP was not run end-to-end; real Sepolia/Stellar attestation latency and operational friction are still unknown.
- WXT offscreen-document ergonomics for this exact prover stack are untested.
- Browser/mobile passkey PRF determinism across synced/restored devices is untested. This is particularly important because it is device/ecosystem-specific and cannot be honestly marked verified from code alone.
- The privacy impact of `register()` is not fully product-decided: it publishes note/encryption public keys linked to an owner event, which may be acceptable for discoverability but should not be treated as invisible.
- Address-format decision remains open in the handoff: one bundled private-address string vs two separate keys.
- Product naming remains open.
- Demo network remains open.

## Not Included

- No implementation plan.
- No code changes.
- No architecture proposal.
- No recommendation to start building.
- No security audit.
- No live on-chain execution.
- No phone/passkey test execution.

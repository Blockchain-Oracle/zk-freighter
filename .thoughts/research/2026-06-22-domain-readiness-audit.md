# Reality Research: domain readiness audit for Stellar ZK wallet

## Scope

Current-reality audit for the Stellar ZK wallet before implementation. This covers the private-payment engine, address/registration model, Stellar assets/trustlines, CCTP bridge reality, WXT extension/passkey constraints, and protocol/tooling status.

This is not a build plan. No app, contract, or extension scaffold was created in this pass.

## Sources Checked

- Local project docs:
  - `.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`
  - `.thoughts/research/2026-06-21-00-INDEX-build-readiness.md`
  - `.thoughts/research/2026-06-22-domain-model-and-ux-reality.md`
  - `.thoughts/research/2026-06-22-wxt-extension-reality-check.md`
  - `docs/START-HERE-concept.md`
  - `docs/VERIFIED-FACTS.md`
  - `docs/GLOSSARY.md`
- Project-local Stellar skills:
  - `.agents/skills/zk-proofs/SKILL.md`
  - `.agents/skills/assets/SKILL.md`
  - `.agents/skills/data/SKILL.md`
  - `.agents/skills/dapp/SKILL.md`
  - `.agents/skills/soroban/SKILL.md`
  - `.agents/skills/standards/SKILL.md`
  - `.agents/skills/setup-stellar-contracts/SKILL.md`
  - `.agents/skills/develop-secure-contracts/SKILL.md`
  - `.agents/skills/upgrade-stellar-contracts/SKILL.md`
- Local reference repos:
  - `reference/stellar-private-payments`
  - `reference/stellar-cctp`
  - `reference/freighter`
- Current docs and primary sources checked through Context7, `gh`, and official pages:
  - Stellar docs: `developers.stellar.org`
  - Stellar protocol repo: `stellar/stellar-protocol`
  - Circle CCTP docs: `developers.circle.com/cctp`
  - WXT docs: `wxt.dev`
  - Chrome extension docs: `developer.chrome.com/docs/extensions`
  - MDN WebAuthn extension docs
  - OpenZeppelin Stellar Contracts docs and repo
- Read-only subagent passes:
  - Engine/address model
  - Asset/account/trustline model
  - CCTP/bridge model
  - WXT/extension/passkey model

## Verified Facts

### Current repository state

- The premature app/contract scaffold has been removed. `find` found no `apps`, `contracts`, or `.git` directories under the project root.
- The repo is currently documentation/research/reference-code first. There is no source scaffold and no git repository initialized.
- The reference clones under `reference/` remain available for code inspection.
- Update 2026-06-22: Stellar CLI `27.0.0` and Rust target `wasm32v1-none` are installed locally. Testnet RPC health succeeds through the built-in `testnet` network. Mainnet RPC health succeeds with explicit `https://mainnet.sorobanrpc.com` plus passphrase `Public Global Stellar Network ; September 2015`; this CLI install's built-in `mainnet` network entry is not a usable RPC endpoint. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.

### Protocol and crypto support

- The local `zk-proofs` skill is stale on one important point: it says BN254/Poseidon are proposed. Current protocol files show:
  - CAP-0051 secp256r1 verification: `Final`, Protocol 21.
  - CAP-0059 BLS12-381 host functions: `Final`, Protocol 22.
  - CAP-0074 BN254 host functions: `Final`, Protocol 25.
  - CAP-0075 Poseidon/Poseidon2 host functions: `Final`, Protocol 25.
  - CAP-0080 efficient ZK BN254 helpers: `Implemented`, Protocol 26.
- This means passkey signature verification and newer ZK host functions are real protocol features, not speculative ideas. Actual cost/resource limits still need live measurement for this project.

### Privacy-pool engine model

- The Nethermind pool has one value-moving entry point: `transact(env, proof, ext_data, sender)`.
- `ext_data.ext_amount` defines the flow:
  - positive amount: public -> private shield/deposit.
  - zero amount: private -> private in-pool transfer.
  - negative amount: private -> public unshield/withdraw.
- Public -> private reveals the sender, token transfer into the pool, exact external amount, proof public inputs, commitments, tree indexes, and encrypted output blobs. It does not reveal the private note keys, blindings, or plaintext output-note ownership.
- Private -> private reveals the transaction/proof, nullifiers, commitments, and encrypted outputs. It does not reveal the recipient or amount in plaintext.
- Private -> public reveals the withdrawal recipient and exact external amount because the pool transfers from itself to the public recipient.
- The spent note is not revealed directly. The chain sees nullifiers, which prevent double-spends without naming the old commitment.

### Private receiving and `register()`

- Private receiving is key-based. A recipient needs:
  - a BN254 note public key for the commitment/spend identity.
  - an X25519 encryption public key so senders can encrypt notes.
- The reference app scans commitment events, trial-decrypts encrypted notes, recomputes commitments, and keeps notes that match the user's keys.
- `register()` publishes `owner`, `encryption_key`, and `note_key` as a `PublicKeyEvent`.
- The pool contract comment says registration is "Not required to interact with the pool"; it is for key discovery.
- Therefore `register()` is not a protocol requirement for direct private receiving if the sender already has the recipient's note/encryption public keys out of band.
- Product translation:
  - "Private receive code" = bundled public note key + public encryption key.
  - "Register" or "registry" = optional public address-book/discovery event that links a Stellar owner to those private-receive public keys.
  - Registering improves discoverability but weakens pseudonymity for that private receive identity.

### ASP membership

- ASP membership is separate from pool `register()`.
- The proving path needs the acting user's note key to have an ASP membership proof when spending.
- Outputs are not checked for ASP membership at receive time, but recipients need ASP eligibility later when they spend.

### Address model and UX reality

- One wallet has two receive surfaces:
  - Public deposit address: normal Stellar `G...` account or later `C...` smart account. This is for public XLM/USDC, bridge arrivals, shield deposits, and public withdrawals.
  - Private receive code: bundled shielded public keys for private in-pool payments.
- These are not two separate wallets. They are two ways money enters the same product experience.
- The wording must make the boundary honest:
  - Shield/deposit is public at the boundary.
  - Private in-pool transfer hides sender/recipient/amount relationship from chain observers.
  - Unshield/withdraw is public at the boundary.

### XLM and USDC asset model

- The inspected deployed Nethermind testnet pool is native XLM only.
- The pool is single-asset per deployment. XLM and USDC require separate pool deployments.
- XLM does not require a trustline.
- USDC is a classic issued Stellar asset exposed to Soroban through its Stellar Asset Contract.
- A classic `G...` account receiving USDC must exist, hold enough XLM reserve, and have a USDC trustline for the exact `code:issuer`.
- Current reserve facts from Stellar docs:
  - Base reserve: 0.5 XLM.
  - Bare account minimum: 1 XLM.
  - Each trustline/subentry adds 0.5 XLM.
  - A user with one USDC trustline needs at least 1.5 XLM locked, plus fee buffer.
- A `C...` contract address does not use a classic trustline for SAC balances; SAC contract balances/auth state live in contract storage.
- Protocol 26 SAC `trust(addr)` exists. It can create a missing trustline for a `G...` address during a contract invocation, but it requires that address's authorization and reserve. It is a no-op for contracts and existing trustlines.
- The inspected pool withdrawal path only calls token `transfer`; it does not call SAC `trust`. USDC withdrawal to an unready `G...` recipient should be expected to fail unless the app pre-ensures the trustline or the contract flow changes.
- Update 2026-06-22: Stellar CLI derivation plus read-only `contract info interface` checks verified these SACs resolve as token contracts:
  - Testnet native XLM: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
  - Testnet USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - Mainnet native XLM: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`
  - Mainnet USDC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`

### Data/indexing model

- Stellar RPC is the right starting API for Soroban and new dapp work.
- RPC is not an infinite archive for every query. Common transaction/event history windows are limited; the local `data` skill flags roughly 7 days for `getTransaction`/`getEvents`, with ledger/data-lake paths for older history.
- RPC does not provide native streaming. The app should expect polling or an indexer path for robust scanning.

### CCTP bridge model

- Circle CCTP V2 supports Stellar domain `27`; Ethereum/Sepolia is CCTP domain `0`.
- Current local Circle reference config includes Stellar testnet contracts:
  - TokenMessengerMinterV2: `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP`
  - MessageTransmitterV2: `CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY`
  - USDC SAC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - CctpForwarder: `CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ`
- EVM -> Stellar flow:
  - approve Sepolia USDC.
  - call CCTP `depositForBurnWithHook`.
  - poll Circle Iris sandbox for message/attestation.
  - call Stellar `mint_and_forward(message, attestation)`.
- The bridge leg is public. The EVM burn calldata/message and Stellar mint/forward transaction expose amount, token, domains, forwarder, and final Stellar recipient/hook data.
- The stock Circle forwarder only mints and transfers USDC to `forwardRecipient`. It does not call the privacy pool's `transact`.
- Therefore "atomic bridge straight into a shielded note" is not proven with the stock Circle forwarder plus stock Nethermind pool. Safe reality is: bridge public USDC to Stellar, then shield into the USDC pool as a separate transaction.
- Founder decision on 2026-06-22: lock safe two-step bridge then shield for MVP. Atomic bridge-and-shield remains a research/spike candidate only; see `2026-06-22-atomic-bridge-shield-reality.md`.

### WXT extension and passkey model

- WXT is real and current official docs resolve to version `0.20.26`.
- In MV3, the WXT background entrypoint maps to a service worker.
- Chrome MV3 service workers are not durable. Chrome may terminate them after idle time, long events/API calls, or long fetches. They should not be treated as a proving runtime.
- Chrome MV3 extension pages/workers need `wasm-unsafe-eval` in extension page CSP for WebAssembly.
- Chrome Offscreen API can create a hidden extension document and supports the `WORKERS` reason, which makes offscreen page + dedicated worker a plausible proving shape.
- WXT issue `wxt-dev/wxt#1448` remains open for WASM imported from a WXT background script failing because the bundle is emitted as IIFE with top-level-await constraints.
- MDN documents WebAuthn in extensions with RP IDs covered by `host_permissions`.
- MDN also warns that extension popup WebAuthn may fail because the popup can close when the credential prompt appears. A full extension page, tab, or side panel is the safer ceremony surface.
- Freighter compatibility is not just a popup UI. Freighter's public surface is the `@stellar/freighter-api` method contract and a content-script/background messaging bridge.

### OpenZeppelin Stellar Contracts

- OpenZeppelin Stellar Contracts are relevant for later passkey/smart-account and upgradeable-contract work.
- The setup skill says to use Rust 1.84+ and `wasm32v1-none`, and to pin exact OpenZeppelin Stellar crate versions.
- The security skill says to prefer proven library primitives and not copy library source into the project.
- The upgrade skill confirms Soroban contracts are mutable only if upgrade logic is included; storage compatibility becomes a real contract risk after deployment.

## Inferences

- The best plain-English model for the product is:
  - Public address = "where normal public Stellar money lands."
  - Private code = "what someone uses to pay you privately inside the pool."
  - Shield = "move public money into privacy."
  - Private send = "move money inside privacy."
  - Unshield = "move private money back to a public Stellar address."
- The word "registry" should be avoided in user-facing copy unless it is explicitly about optional public key discovery. It can sound like a protocol requirement even though the engine does not require it for direct receiving.
- A bundled private receive code is likely better UX than exposing two separate public keys. That is an encoding/product choice; the engine itself only requires the two public keys.
- XLM is the cleanest first asset to prove the private loop because the deployed reference pool is XLM and no trustline setup is needed.
- USDC is important for the hackathon story, but it needs a separate pool deployment plus trustline/reserve UX.
- Bridge materially improves the story, but the locked MVP version is public bridge -> public Stellar USDC -> shield. Atomic bridge-and-shield is custom contract work and remains unverified until proven by a dedicated adapter spike.
- WXT extension is feasible later, but the web app is the safer first judged surface. The extension should route proving to a page/offscreen document/worker, not the MV3 service worker.
- Optional passkey remains valid as an additive convenience layer. It should not replace the seed phrase, and it cannot be marked cross-device verified until tested on the actual target phone/browser/authenticator.

## Unknowns And Questions

- No live testnet XLM shield/private-send/unshield digest has been produced in this cleaned repo state.
- No USDC pool has been deployed or round-tripped.
- The exact missing-trustline failure mode for USDC pool withdrawal has not been executed.
- Circle CCTP has not been run end to end from Sepolia -> Stellar in this session.
- Actual Iris attestation latency, Sepolia gas cost, faucet friction, and Stellar testnet USDC liquidity/funding are unmeasured.
- Nethermind prover time and peak memory need real browser benchmarks for the target circuit.
- ZK host-function per-call resource budget needs live measurement if we rely on native host functions.
- WXT offscreen/dedicated-worker prover packaging is untested.
- WebAuthn PRF needs a real target-device test. Do not claim phone support until the founder's actual phone/browser/authenticator path succeeds.
- Final product decisions still to settle in conversation:
  - final demo network for the video.
  - whether private receive code is always out-of-band, optionally registered, or registered by default for discoverability.

## Not Included

- No implementation.
- No new scaffold.
- No git initialization.
- No contract deployment.
- No live transaction digest.
- No phone/passkey test.
- No claim that CCTP auto-shields atomically.

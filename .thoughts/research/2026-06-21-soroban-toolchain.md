# Reality Research: Stellar Soroban build/deploy/call toolchain + ZK host functions

## Scope

Current-reality facts (as of 2026-06-21) on:
- The `stellar` CLI build → deploy → invoke flow, testnet setup + friendbot funding.
- `@stellar/stellar-sdk` (JS/TS) Soroban-RPC interaction: RPC server, contract client, `TransactionBuilder`, simulate / prepare, signing, send + poll, auth entries.
- Soroban fee/resource model and storage durability + TTL (state archival).
- The `soroban-sdk` (Rust) ZK host-function API: BN254 (`g1_add`/`g1_mul`/`pairing_check` etc.), BLS12-381, and Poseidon/Poseidon2 — exact signatures as exposed to contract code.
- Protocol 25/26/27 availability of these features.

NOT in scope: how to write circuits, proving systems, security review, or any recommendation on what to build.

## Sources Checked

Primary repo (cloned, read locally at `/Users/abu/dev/hackathon/stellar-research/repos/soroban-examples`, HEAD `7b168174` dated 2026-03-24):
- `groth16_verifier/src/lib.rs`, `groth16_verifier/README`, `groth16_verifier/Cargo.toml`
- `import_ark_bn254/src/lib.rs`, `import_ark_bn254/Cargo.toml`
- `bls_signature/src/lib.rs`, `bls_signature/Cargo.toml`
- `privacy-pools/README.md`, `privacy-pools/Cargo.toml`
- `rust-toolchain.toml`, `Makefile`, `groth16_verifier/Makefile`, `README.md`

Official docs (WebFetch):
- docs.rs/soroban-sdk/latest — `crypto`, `crypto::bn254::Bn254`, `crypto::bn254` module, `crypto::Crypto`, `crypto::CryptoHazmat`, `Env`, BN254 size constants
- developers.stellar.org — software-versions, getting-started/setup, deploy-to-testnet, fees-resource-limits-metering, state-archival, RPC simulateTransaction, invoke-contract-tx-sdk
- WebSearch — Protocol 25 (X-Ray) BN254/Poseidon, CAP-0074, CAP-0075

Library docs (context7): `/stellar/js-stellar-sdk`.

Local toolchain probe on 2026-06-21: `rustc 1.96.0`; `cargo` present; `stellar`/`soroban` CLI was absent at that time.

Update 2026-06-22: Stellar CLI `27.0.0` is now installed at `/Users/abu/.local/bin/stellar`; `wasm32v1-none` is installed; testnet/mainnet SAC derivations and read-only SAC-interface checks have been run. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.

## Verified Facts

### Versions & protocol availability
- `soroban-sdk` latest on docs.rs = **26.1.0** (page header). soroban-examples pin `soroban-sdk = "25.1.0"` across examples.
- Network status (developers.stellar.org/docs/networks/software-versions, via WebFetch 2026-06-21):
  - **Testnet: Protocol 27 (Zipper)**, released 2026-06-18.
  - **Mainnet: Protocol 26 (Yardstick)**, activated 2026-05-06.
  - **Protocol 25 (X-Ray)** activated on mainnet **2026-01-22**, introducing "BN254 Elliptic Curve Operations" and "Poseidon/Poseidon2 Hash Functions."
  - Current mainnet software: Stellar Core 26.1.0, Stellar RPC v26.0.0, Stellar CLI 26.1.0, Rust SDK 26.0.1.
- BN254 host functions = **CAP-0074**; Poseidon/Poseidon2 permutation host functions = **CAP-0075** (WebSearch; CAP-0075 link also cited inside `privacy-pools/README.md`).
- INFERENCE-ADJACENT FACT: because BN254/Poseidon shipped in Protocol 25 (live on both mainnet since 2026-01-22 and testnet which is now on Protocol 27), these host functions are available on testnet today.

### CLI install & required target
- Install (developers.stellar.org getting-started/setup):
  - `curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh`
  - `brew install stellar-cli`
  - `cargo install --locked stellar-cli@27.0.0`
  - Windows: `winget install --id Stellar.StellarCLI --version 27.0.0`
- Required wasm target = **`wasm32v1-none`**, installed via `rustup target add wasm32v1-none`. This is distinct from `wasm32-unknown-unknown`. Requires Rust ≥ 1.84.0. Confirmed by `rust-toolchain.toml` in the repo: `targets = ["wasm32v1-none"]`, `channel = "stable"`.
- Update 2026-06-22: `rustup target add wasm32v1-none` completed successfully. Installed targets now include both `wasm32-unknown-unknown` and `wasm32v1-none`.

### Build / deploy / invoke (CLI)
- Build: `stellar contract build` → output at `target/wasm32v1-none/release/*.wasm` (verified in `groth16_verifier/Makefile`).
- Keypair + friendbot funding in one step: `stellar keys generate alice --network testnet --fund`. View address: `stellar keys address alice`.
- Deploy: `stellar contract deploy --wasm target/wasm32v1-none/release/hello_world.wasm --source-account alice --network testnet --alias hello_world`.
- Invoke: `stellar contract invoke --id <CONTRACT_ID> --source-account alice --network testnet -- <fn_name> --<arg> <value>`. The `--` before the function name is mandatory.
- (deploy-to-testnet docs note the `--fund` flag is the friendbot path; no separate friendbot curl shown there.)

### JS/TS SDK Soroban-RPC flow (`@stellar/stellar-sdk`)
High-level contract-client path (developers.stellar.org invoke-contract-tx-sdk):
```js
import { Keypair } from "@stellar/stellar-sdk"
import { Client, basicNodeSigner } from "@stellar/stellar-sdk/contract"
import { Server } from "@stellar/stellar-sdk/rpc"

const server = new Server("https://soroban-testnet.stellar.org")
const client = await Client.from({ contractId, networkPassphrase, rpcUrl, publicKey, signTransaction })
const tx = await client.increment({ user, value: 1 })
const { result } = await tx.signAndSend()
```
- The `Client`/`AssembledTransaction` abstraction internally builds the op via `new Contract(contractId).call(method, ...args)`, wraps it in a `TransactionBuilder` (with `BASE_FEE` + `networkPassphrase`), simulates, then signs via the `signTransaction` callback and polls to completion (context7 `/stellar/js-stellar-sdk`, `src/contract/assembled_transaction.ts`).
- Low-level RPC simulate (developers.stellar.org RPC simulateTransaction) returns:
  - `minResourceFee` — stringified recommended minimum resource fee to add.
  - `transactionData` — base64 `SorobanTransactionData` (ledger footprint, IO access, refundable fee info).
  - `results[].xdr` — return value of the host-function call.
  - `results[].auth` — array of base64 `SorobanAuthorizationEntry` (per-address authorizations recorded during simulation).
  - SDK applies `minResourceFee` + `transactionData` to assemble the final envelope before submission (this is the `assembleTransaction` / `server.prepareTransaction` step).
- Classic (Horizon) transaction pattern (for non-Soroban ops) uses `Horizon.Server`, `server.loadAccount`, `server.fetchBaseFee`, `TransactionBuilder` + `Operation.payment`, `.setTimeout(30).build()`, `transaction.sign(Keypair.fromSecret(...))`, `server.submitTransaction(tx)` (context7).

### Fee / resource model (developers.stellar.org fees-resource-limits-metering)
- Total fee = **Resource Fee + Inclusion Fee**.
- Inclusion fee = (#operations) × effective base fee; min **100 stroops/op**.
- Six metered resource types for smart-contract txs: (1) CPU instructions, (2) ledger entry accesses (read/write keys), (3) ledger I/O bytes, (4) transaction byte size, (5) events + return-value size, (6) ledger space rent (TTL extensions / entry-size growth).
- Memory is capped per tx but NOT charged. Each resource has per-tx limits set by validator consensus (ledger close-time bound).

### Storage durability & TTL / state archival (developers.stellar.org state-archival)
- Three durabilities: **Temporary**, **Persistent**, **Instance**.
  - Temporary: cheapest; on TTL=0 entry is permanently deleted and unrecoverable; unlimited capacity.
  - Persistent: priced like Instance; on TTL expiry becomes **archived but recoverable**; independent TTL from the instance; unlimited capacity.
  - Instance: shares the contract instance's TTL; limited capacity; for shared state (admin/metadata).
- TTL is measured in **ledgers** (live-until-ledger minus current ledger).
- `extend_ttl(N)` guarantees TTL is *at least* N ledgers; never shortens a longer existing TTL. Network enforces min/max thresholds (config params).
- Expired **persistent** entries: restored automatically via `InvokeHostFunction` (Protocol 23+) or manually via `RestoreFootprintOp`; on restore receive min TTL ≈ `current_ledger + 4095` (network param).
- Expired **temporary** entries cannot be restored.

### ZK / crypto host-function API in `soroban-sdk` (Rust) — exact signatures from docs.rs/latest

Access points:
- `Env::crypto(&self) -> Crypto`
- `Env::crypto_hazmat(&self) -> CryptoHazmat` — **gated by the `hazmat-crypto` Cargo feature.**

`Crypto` struct methods (docs.rs `crypto::Crypto`):
```rust
pub fn sha256(&self, data: &Bytes) -> Hash<32>
pub fn keccak256(&self, data: &Bytes) -> Hash<32>
pub fn ed25519_verify(&self, public_key: &BytesN<32>, message: &Bytes, signature: &BytesN<64>)
pub fn secp256k1_recover(&self, message_digest: &Hash<32>, signature: &BytesN<64>, recovery_id: u32) -> BytesN<65>
pub fn secp256r1_verify(&self, public_key: &BytesN<65>, message_digest: &Hash<32>, signature: &BytesN<64>)
pub fn bls12_381(&self) -> Bls12_381
pub fn bn254(&self) -> Bn254
```

`Bn254` struct methods (docs.rs `crypto::bn254::Bn254`):
```rust
pub fn env(&self) -> &Env
pub fn g1_add(&self, p0: &Bn254G1Affine, p1: &Bn254G1Affine) -> Bn254G1Affine
pub fn g1_mul(&self, p0: &Bn254G1Affine, scalar: &Bn254Fr) -> Bn254G1Affine
pub fn g1_msm(&self, vp: Vec<Bn254G1Affine>, vs: Vec<Bn254Fr>) -> Bn254G1Affine
pub fn g1_is_on_curve(&self, point: &Bn254G1Affine) -> bool
pub fn pairing_check(&self, vp1: Vec<Bn254G1Affine>, vp2: Vec<Bn254G2Affine>) -> bool
pub fn fr_add(&self, lhs: &Bn254Fr, rhs: &Bn254Fr) -> Bn254Fr
pub fn fr_sub(&self, lhs: &Bn254Fr, rhs: &Bn254Fr) -> Bn254Fr
pub fn fr_mul(&self, lhs: &Bn254Fr, rhs: &Bn254Fr) -> Bn254Fr
pub fn fr_pow(&self, lhs: &Bn254Fr, rhs: u64) -> Bn254Fr
pub fn fr_inv(&self, lhs: &Bn254Fr) -> Bn254Fr
```
BN254 types (`crypto::bn254` module): `Bn254Fr` (scalar field element), `Bn254G1Affine`, `Bn254G2Affine`. Size constants: `BN254_FP_SERIALIZED_SIZE`, `BN254_G1_SERIALIZED_SIZE = 64`, `BN254_G2_SERIALIZED_SIZE`.

`CryptoHazmat` methods (docs.rs `crypto::CryptoHazmat`, feature `hazmat-crypto`):
```rust
pub fn secp256k1_recover(&self, message_digest: &BytesN<32>, signature: &BytesN<64>, recovery_id: u32) -> BytesN<65>
pub fn secp256r1_verify(&self, public_key: &BytesN<65>, message_digest: &BytesN<32>, signature: &BytesN<64>)
pub fn poseidon_permutation(
    &self, input: &Vec<U256>, field: Symbol, t: u32, d: u32,
    rounds_f: u32, rounds_p: u32,
    mds: &Vec<Vec<U256>>, round_constants: &Vec<Vec<U256>>,
) -> Vec<U256>
pub fn poseidon2_permutation(
    &self, input: &Vec<U256>, field: Symbol, t: u32, d: u32,
    rounds_f: u32, rounds_p: u32,
    mat_internal_diag_m_1: &Vec<U256>, round_constants: &Vec<Vec<U256>>,
) -> Vec<U256>
```
- Poseidon host functions expose only the **permutation primitive** (not a full ready-made hash). The `field: Symbol` selects the field; per docs both BLS12-381 and BN254 fields are supported. Round constants / MDS / internal-diagonal matrices must be supplied by the caller.

### What soroban-examples actually demonstrate (real code)
- `groth16_verifier/src/lib.rs`: a Groth16 verifier using **BLS12-381** native host fns: `env.crypto().bls12_381()` then `bls.g1_mul`, `bls.g1_add`, `bls.pairing_check`. Types `crypto::bls12_381::{Fr, G1Affine, G2Affine}`. Verifies `e(-A,B)·e(alpha,beta)·e(vk_x,gamma)·e(C,delta)==1`. Pins `soroban-sdk = "25.1.0"`. README: translated from circom2 (compiler 2.2.1) auto-generated Solidity verifier; demonstration only, unaudited.
- `import_ark_bn254/src/lib.rs`: BN254 pairing done via the **`ark-bn254` Rust crate compiled into the WASM** (`Bn254::pairing`, `ark-bn254 = "0.5.0"`, `soroban-sdk` features `["alloc"]`), NOT via a native host function. This example predates / does not use the native `crypto().bn254()` path.
- `bls_signature/src/lib.rs`: custom account contract doing BLS FastAggregateVerify with `crypto::bls12_381::{G1Affine, G2Affine}` + `crypto::Hash`.
- `privacy-pools` (WIP prototype): Groth16 zkSNARK over **BLS12-381**; Poseidon via a vendored `soroban-poseidon = "25.0.0"` crate / local `libs/poseidon` (explicitly "not audited"); pins `soroban-sdk = "25.1.0"`. README explicitly states the Merkle tree depth is limited until **Poseidon is added as a host function (CAP-75)** to fit hashing within the function budget — i.e., at the time this example was written the team was hashing Poseidon in-WASM, not via the host fn.
- Build is per-example via `stellar contract build` (Makefiles). No top-level Cargo workspace at repo root (`Cargo.toml` absent at root; each example self-contained).

## Inferences

- INFERENCE: BN254 + Poseidon native host functions are usable on **testnet today**, because they shipped in Protocol 25 (live on mainnet 2026-01-22) and testnet is now on Protocol 27. (Verified the protocol versions; did not independently execute a testnet call to confirm.)
- INFERENCE: To call BN254/Poseidon host fns from contract code you need a `soroban-sdk` ≥ 25.0.0 (BN254/Poseidon were "added in v25" per WebSearch) and the `hazmat-crypto` feature for Poseidon specifically. The examples pin 25.1.0; docs.rs latest is 26.1.0. Exact minimum version for each symbol not byte-verified against a changelog.
- INFERENCE: The native `crypto().bn254()` path is strictly cheaper / more budget-friendly than the in-WASM `ark-bn254` path used by `import_ark_bn254`, given host fns are metered as single host operations rather than thousands of WASM CPU instructions. (Strongly implied by the whole CAP-0074 rationale and the privacy-pools Merkle-depth note, but no measured numbers gathered.)
- INFERENCE: `g1_is_on_curve` exists for BN254 but the docs page for BLS12-381's full method list was not re-read here; the BLS Groth16 example only used `g1_add`/`g1_mul`/`pairing_check`, so the BLS surface is at least that.

## Unknowns And Questions

- UNKNOWN: Exact gas/CPU-instruction cost (budget) of a single `bn254().pairing_check`, `g1_mul`, `g1_msm`, and `poseidon_permutation` call — not gathered. This is the riskiest unknown for feasibility (how many pairings/hashes fit in one transaction's resource limit).
- UNKNOWN: Exact numeric values of `BN254_FP_SERIALIZED_SIZE` and `BN254_G2_SERIALIZED_SIZE` (only G1 = 64 confirmed; G2 is presumably 128 by analogy to the `import_ark_bn254` `BytesN<128>` G2 but NOT verified from the constant page).
- UNKNOWN: Whether `Bn254` exposes G2 arithmetic (`g2_add`/`g2_mul`) or hash-to-curve / map-to-curve — the docs.rs method list fetched did not include them; could be absent or just not surfaced in the fetched excerpt.
- UNKNOWN: The exact recommended Poseidon parameter sets (t, d, rounds_f, rounds_p, MDS, round constants) for BN254 / BLS12-381 that match common circom/snarkjs tooling — host fn takes them as args; the canonical constants source was not located.
- UNKNOWN: Whether a higher-level Poseidon helper (full sponge hash) ships in any soroban-sdk version, or whether only the raw permutation is exposed. Only the permutation primitive was found.
- UNKNOWN: The classic friendbot HTTP endpoint URL (e.g. `https://friendbot.stellar.org/?addr=`) — only the CLI `--fund` flag was confirmed; the raw URL was not fetched.
- UNKNOWN: Whether `import_ark_bn254` still compiles/builds under the current toolchain — not built locally. `cargo`/`rustc`, Stellar CLI `27.0.0`, and `wasm32v1-none` are now installed, but this example has not been built.
- Update 2026-06-22: Testnet network info was pinged through Stellar CLI and returned passphrase `Test SDF Network ; September 2015`, Protocol 27, and a healthy RPC. Mainnet was healthy only with explicit RPC URL `https://mainnet.sorobanrpc.com` and passphrase `Public Global Stellar Network ; September 2015`; the built-in CLI `mainnet` entry is not a usable RPC endpoint in this environment.

## Not Included

- No solution/architecture proposals, no "should we use BN254 vs BLS" recommendation.
- No circuit-writing, snarkjs/circom proving workflow detail beyond what the example READMEs state.
- No security analysis of the (explicitly unaudited) example contracts.
- No on-chain execution / live testnet digest. The CLI is now installed, but no funded identity was configured and no transaction was submitted in this research pass.
- No deep dive into Horizon vs RPC differences beyond the contract-invocation path.

# Nethermind Prover Build Checkpoint

Date: 2026-06-23

## Scope

Phase 2 needs the real Nethermind browser prover runtime and `policy_tx_2_2` artifacts:

- `js/web.js`
- `js/web_bg.wasm`
- `js/storage-worker.js`
- `js/storage-worker_bg.wasm`
- `js/prover-worker.js`
- `js/prover-worker_bg.wasm`
- `circuits/policy_tx_2_2.wasm`
- `circuits/policy_tx_2_2.r1cs`
- `circuits/selectiveDisclosure_1.wasm`
- `circuits/selectiveDisclosure_1.r1cs`
- committed testnet keys under `circuit_keys/`

## Prior Blocker

The reference repo pins Wasmer from git at `763e9f2800644f51ce27f6f5c1752776da16ddd1`. Cargo repeatedly hung while hydrating that git source in this environment.

## Resolution

A sparse Wasmer checkout was created at `/tmp/wasmer-sparse-zkf` for the six locked Wasmer packages used by the reference build:

- `lib/api`
- `lib/compiler`
- `lib/compiler-cranelift`
- `lib/derive`
- `lib/types`
- `lib/vm`

Cargo was run with a temporary patch config that points those package names to the sparse checkout. With sparse crates.io protocol and the patch config, the release circuit build completed:

```bash
CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
  cargo --config /tmp/wasmer-patch-zkf.toml build -p circuits --release --offline
```

Generated release artifacts:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `policy_tx_2_2.wasm` | 646077 | `6356b72f8623d1a33d30bd7dc37f5a0baf70d116dbb64f85e1e1a25ec305e6d1` |
| `policy_tx_2_2.r1cs` | 5136008 | `a8cee4bd7ca39dd60dcefc73b4c1568247724511a5dd6023e8438d54262c729e` |
| `selectiveDisclosure_1.wasm` | 474209 | `f2468df7b9a28582e0e8f5301d483c3349574334b43ded5220084100e0c09aaf` |
| `selectiveDisclosure_1.r1cs` | 715760 | `e83f0d99277e77283514e0690d94805ca6ffc65792c59e8f795be4ed31788667` |

Trunk initially failed because Apple clang could not target `wasm32-unknown-unknown` while compiling `sqlite-wasm-rs`. Installing Homebrew LLVM and exporting the wasm target compiler fixed that:

```bash
export CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang
export AR_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/llvm-ar
PUBLIC_URL=/ CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
  trunk build --dist dist --release --public-url /
```

`trunk build` completed and produced the browser JS/WASM runtime under `reference/stellar-private-payments/dist/js`.

## ZK Freighter Staging

`pnpm prover:stage` now stages the reference runtime layout into `apps/web/public`:

- `/js/...`
- `/circuits/...`
- `/circuit_keys/...`

This root layout is intentional. The reference worker was compiled with `PUBLIC_URL=/`, and it fetches circuits from `/circuits/...`.

## Browser Evidence

Smoke target: `http://localhost:5173/` in system Chrome through Playwright.

Observed:

- Created a Phase 1 wallet and reached the receive view.
- Ran the ZK Freighter readiness panel.
- Readiness status: `ready`.
- Proof status: `Not generated`.
- Direct `new Worker('/js/prover-worker.js', { type: 'module' })` raised no browser errors.
- `mainThread(new Config('https://soroban-testnet.stellar.org/'))` initialized successfully.
- Exported WebClient was present.
- Embedded contract config network was `testnet`.
- Storage worker migrated and initialized.
- Prover worker fetched:
  - `http://localhost:5173/circuits/policy_tx_2_2.wasm`
  - `http://localhost:5173/circuits/policy_tx_2_2.r1cs`
  - `http://localhost:5173/circuits/selectiveDisclosure_1.wasm`
  - `http://localhost:5173/circuits/selectiveDisclosure_1.r1cs`

## Dry Deposit Proof Attempt

ZK Freighter now calls the exported Nethermind WebClient deposit path from the Phase 2 panel:

- derive and save Nethermind privacy keys from the Phase 1 key-derivation signature.
- call `executeDeposit` for the deployed testnet XLM pool.
- reject the submit callback if it is reached, so no transaction can be submitted and no fake hash is created.

Observed smoke result:

- Worker keys stored: yes.
- Submit reached: no.
- Proof generated: no.
- Status: `blocked`.
- Blocker: ASP membership/indexer precondition stopped before proving.
- Latest observed sync gap: `3,235,953` ledgers.

This is the correct fail-closed result for a fresh identity that has not been inserted into the ASP membership tree.

## ASP Membership Insert And Proof Observation

Follow-up on 2026-06-23:

- Browser ASP preflight now derives the exact ASP membership leaf from the Phase 1 identity and cross-checks it against Nethermind `deriveAspUserLeaf`.
- Live testnet ASP state reported insertion as permissionless.
- A throwaway funded testnet CLI identity inserted the held browser wallet's ASP leaf:
  - ASP membership contract: `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`
  - Insert signer: `GDLPSR6ZOCUJQ6PYZEMGRBCRPXH5KGCQDKVTZEJSIQ7F3IYWOIDKGH5A`
  - Held wallet public key: `GD354U6FAJVAZGW5GEFDKPCGWVU6VVRQJH7PYK6I5UJXP2STG2H6G5TO`
  - Leaf index: `10`
  - Transaction hash: `deea0e2918719319e5f54bf60c929c62f8006f13fa2b6f5b4af3169b94f0d757`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/deea0e2918719319e5f54bf60c929c62f8006f13fa2b6f5b4af3169b94f0d757`
- After the insert, the same held browser wallet reran the dry deposit path and reached:
  - fetching on-chain state.
  - fetching ASP non-membership proof.
  - building witness inputs.
  - `Proving...`.
  - `Simulating transaction...`.
- UI status: proof generation observed, not submitted.

This is proof-generation evidence only. It is not a shield transaction and does not prove on-chain proof acceptance.

## Current Status

The prior build blocker is cleared for asset generation, browser runtime initialization, ASP membership insertion for a smoke wallet, and observed client-side proof generation.

The remaining boundary is transaction submission and on-chain proof acceptance. ZK Freighter has not yet submitted a pool `transact` call for shield/deposit, private send, or unshield.

Do not claim accepted proof, shield, private send, or unshield success from this checkpoint alone.

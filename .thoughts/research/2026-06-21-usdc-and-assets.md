# Reality Research: USDC on Stellar (SAC) + multi-asset (USDC + XLM) feasibility

## Scope

Facts-only brief on two coupled questions, for a Stellar privacy-pool (Tornado-Nova / Nethermind "Private Payments for Stellar" style) build:

1. **USDC as a Stellar Asset Contract (SAC):** how classic Stellar assets are exposed to Soroman/Soroban contracts, the testnet USDC issuer, how to get testnet USDC, the SAC/SEP-41 token interface a contract invokes (transfer/approve/balance/...), how native XLM is itself a SAC.
2. **Multi-asset decision (USDC + XLM):** does the Nethermind privacy-pool contract handle ONE asset per pool instance or several? What does supporting BOTH USDC and XLM require, as a matter of fact (separate deployments vs a single multi-asset pool)?

No solutions, no architecture recommendations. Inferences and unknowns are labeled.

Primary repo under study: `/Users/abu/dev/hackathon/stellar-research/repos/stellar-private-payments` (git remote: `https://github.com/NethermindEth/stellar-private-payments`).

## Sources Checked

- **Nethermind pool contract** — `repos/stellar-private-payments/contracts/pool/src/pool.rs` (862 lines), `contracts/pool/src/lib.rs`, `contracts/pool/src/merkle_with_history.rs`.
- **Nethermind deploy script** — `repos/stellar-private-payments/deployments/scripts/deploy.sh`.
- **Nethermind live testnet deployment** — `repos/stellar-private-payments/deployments/testnet/deployments.json`.
- **Nethermind frontend chain types** — `repos/stellar-private-payments/app/crates/core/types/src/chain_data.rs`.
- **Nethermind e2e tests / mock token** — `repos/stellar-private-payments/e2e-tests/src/tests/utils.rs`, `contracts/soroban-utils/src/utils.rs`.
- **soroban-examples token interface** — `repos/soroban-examples/token/src/contract.rs` (SEP-41 reference token).
- developers.stellar.org — Stellar Asset Contract page, anatomy-of-an-asset, CLI cookbook "Deploy the Stellar Asset Contract for a Stellar asset".
- developers.circle.com — USDC contract addresses page; faucet.circle.com (via search).
- WebSearch for CLI syntax and Circle issuer addresses.

## Verified Facts

### A. Stellar Asset Contract (SAC) — what it is and the interface

- **SAC = CAP-46-6 + SEP-41 token interface.** The SAC is "an implementation of CAP-46-6 Smart Contract Standardized Asset and SEP-41 Token Interface for Stellar assets," a "special built-in contract that... allows it to use Stellar assets directly." Source: developers.stellar.org/docs/tokens/stellar-asset-contract.
- **Every classic asset has a reserved SAC address; anyone can deploy it.** "Every Stellar asset on Stellar has reserved a contract address that the Stellar Asset Contract can be deployed to. Anyone can initiate the deploy and the Stellar asset issuer does not need to be involved." Source: same page.
- **SAC token interface functions** (ERC-20-like): `transfer`, `transfer_from`, `approve`, `allowance`, `balance`, `mint` (admin-only), `burn`, `burn_from`. Source: developers.stellar.org SAC page; mirrored by the SEP-41 reference token in `soroban-examples/token/src/contract.rs` with these exact signatures:
  - `fn allowance(e, from: Address, spender: Address) -> i128`
  - `fn approve(e, from: Address, spender: Address, amount: i128, expiration_ledger: u32)`
  - `fn balance(e, id: Address) -> i128`
  - `fn transfer(e, from: Address, to_muxed: MuxedAddress, amount: i128)`
  - `fn transfer_from(e, spender: Address, from: Address, to: Address, amount: i128)`
  - `fn burn(e, from: Address, amount: i128)` / `fn burn_from(e, spender, from, amount)`
  - (`mint(e, to: Address, amount: i128)` is admin-gated, not part of the call surface a consumer uses)
- **Amounts are `i128` across the SAC/SEP-41 interface.** Source: `soroban-examples/token/src/contract.rs` signatures above.
- **Native XLM is itself a SAC.** The native asset is addressable as a SAC via `--asset native`. Contract balances of the native asset are stored in a contract data entry; account balances stay on the account. Source: developers.stellar.org SAC page ("Stellar account balances for the native asset are always stored on the account, and Stellar contract balances for the native asset are always stored in a contract data entry").

### B. CLI — getting / deploying the SAC address

- **Native XLM SAC id (deterministic per network):**
  ```
  stellar contract id asset --network testnet --asset native
  ```
  Source: developers.stellar.org/docs/tools/cli/cookbook/deploy-stellar-asset-contract.
- **Deploy a SAC for a classic asset (e.g. USDC):**
  ```
  stellar contract asset deploy --source S... --network testnet --asset USDC:<ISSUER_G_ADDRESS>
  ```
  `--asset` format is `<asset-code>:<issuer>` for classic assets, or `native` for XLM. `--alias` can store a local name. Source: same cookbook page + Stellar CLI manual.
- The Nethermind deploy script confirms this resolution path in code: it calls `stellar contract id asset --asset native --network "$NETWORK"` to resolve the native XLM token contract id when no explicit token is given. Source: `deployments/scripts/deploy.sh` lines 120-122.

### C. Classic asset model + trustline facts

- **Classic assets are identified by `CODE:ISSUER`** (issuer is a `G...` account); the same code from different issuers are different assets. XLM (native) needs no trustline for basic functionality. Source: developers.stellar.org/docs/tokens/anatomy-of-an-asset.
- **Trustlines: accounts must hold a trustline to receive/hold/transact a non-native asset; each costs 0.5 XLM.** As of Protocol 26, "smart contracts can create trustlines programmatically using the SAC's `trust` function." Source: same page.

### D. Circle USDC on Stellar — addresses + faucet

- **Stellar TESTNET USDC issuer:** `USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. Source: developers.circle.com/stablecoins/usdc-contract-addresses.
- **Stellar MAINNET USDC issuer:** `USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`. Source: same Circle page.
- **Update 2026-06-22:** Stellar CLI `27.0.0` derived and RPC-resolved the canonical SACs:
  - Testnet USDC SAC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - Mainnet USDC SAC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
  - Both returned token interfaces through read-only `stellar contract info interface` checks. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.
- **Faucet = faucet.circle.com**, public/permissionless, no account required; supports testnet USDC (and EURC) on supported chains including Stellar. Search-reported limit: ~20 USDC per address per chain every 2 hours; CCTP is the documented fallback if a chain isn't directly listed. Source: faucet.circle.com (via WebSearch); rate-limit number is from secondary search text, not confirmed on the page itself (see Unknowns).

### E. Nethermind privacy pool — asset handling (THE multi-asset answer)

- **The pool contract is SINGLE-ASSET per instance.** The constructor takes exactly one `token: Address` and stores it under `DataKey::Token`:
  ```
  pub fn __constructor(env, admin: Address, token: Address, verifier: Address,
      asp_membership: Address, asp_non_membership: Address,
      maximum_deposit_amount: U256, levels: u32) -> Result<(), Error>
  // env.storage().persistent().set(&DataKey::Token, &token);
  ```
  Source: `contracts/pool/src/pool.rs` lines 271-282; `DataKey` enum has a single `Token` variant (lines 179-194).
- **Every deposit/withdraw uses that one stored token.** `transact()` does `let token = Self::get_token(env)?; let token_client = TokenClient::new(env, &token);` then `token_client.transfer(&sender, &this, &amount)` on deposit (lines 542-555) and `token_client.transfer(&this, &recipient, &amount)` on withdraw (lines 628-636). There is no asset/token parameter on `transact` or on the withdraw path — the asset is fixed at construction. Source: `contracts/pool/src/pool.rs` lines 535-637.
- **`TokenClient` is `soroban_sdk::token::TokenClient`** (imported at `pool.rs` line 20: `token::TokenClient`). This is the generic SEP-41/SAC client, so the pool can be pointed at ANY SAC — native XLM SAC, USDC SAC, or a custom SEP-41 token — by passing that contract's address as `token`. The pool does not special-case native vs classic. Source: `pool.rs` line 20, 542-543.
- **Pool amounts cross an `I256`/`U256` ↔ `i128` boundary.** `ext_amount` is `I256`; the contract converts to `i128` via `Self::i256_to_i128_nonneg(...)` before calling `token_client.transfer` (lines 554, 635). The SAC interface is `i128`. Source: `pool.rs` lines 547-555, 633-636.
- **The deploy script is explicitly MULTI-POOL, one pool per asset.** It accepts repeated `--pool` specs in three forms and deploys one pool contract per spec, all sharing the SAME verifier + ASP-membership + ASP-non-membership contracts:
  - `contract:<TOKEN_CONTRACT_ID>`
  - `native:<TOKEN_CONTRACT_ID>`
  - `classic:<CODE>:<ISSUER>:<TOKEN_CONTRACT_ID>`
  Source: `deployments/scripts/deploy.sh` lines 24-54, 203-234, 254-279. "Legacy single-pool token contract address (cannot be mixed with --pool)" (line 24); "If neither --token nor --pool is provided, one native XLM pool is deployed by default" (line 54). The README example shows `--pool native:CB...` and `--pool classic:USDC:G...:CD...` (deploy.sh lines 42-44).
- **The deploy loop deploys one pool per spec and records `{poolContractId, tokenContractId, asset:{kind}}` per pool** in `deployments.json`. Source: `deploy.sh` lines 259-318. The `asset` JSON kind is `native`, `contract`, or `classic:CODE:ISSUER` (lines 212-228).
- **Current live testnet deployment = ONE pool, native XLM only.** `deployments/testnet/deployments.json` contains a single pool:
  - `poolContractId: CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`
  - `tokenContractId: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
  - `asset: {"kind":"native"}`
  - shared `verifier: CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`, `asp_membership: CBULZZIA...`, `asp_non_membership: CDREZXZI...`
  Source: `deployments/testnet/deployments.json`. No USDC pool is currently deployed.
- **The frontend models a list of pools, each single-asset.** `ContractsStateData.pools: Vec<PoolInfo>` where `PoolInfo` has a single `token: String` field (plus its own merkle root/levels/index/max-deposit). Source: `app/crates/core/types/src/chain_data.rs` lines 31-57. So the app already expects N pools, each with its own asset and its own Merkle tree.
- **Tests confirm the SEP-41 call surface the pool depends on.** e2e tests register a `MockToken` (`e2e-tests/src/tests/utils.rs` lines 23, 99) implementing `balance`, `transfer(from,to,amount:i128)`, `transfer_from`, `approve`, `allowance` (`contracts/soroban-utils/src/utils.rs` lines 32-46) — the SAC interface subset the pool actually invokes (`transfer` + implicitly `balance`).

## Inferences

- **(Inference, high confidence)** Supporting BOTH USDC and XLM with this codebase, as written, means deploying TWO pool contract instances — one with `token = native XLM SAC id`, one with `token = USDC SAC id` — sharing the same verifier + ASP contracts. Basis: the constructor stores exactly one token; the deploy script's `--pool` mechanism is built for exactly this (multiple specs → multiple pools); the live testnet config already uses the per-pool JSON shape. There is no asset argument anywhere on the runtime deposit/withdraw path that would allow one instance to hold two assets.
- **(Inference, high confidence)** A "single multi-asset pool" would require source changes, not just config: adding a per-UTXO asset id to commitments/circuits and threading an asset selector through `transact`/withdraw. The current `DataKey::Token` (one address) and the ZK commitment scheme (no asset field visible in `pool.rs`) do not carry an asset dimension. (Circuit-level confirmation not done — see Unknowns.)
- **(Inference, high confidence)** Because the pool calls the generic `TokenClient`, pointing a pool at the USDC SAC is a config/deploy change, not a contract-code change — the USDC SAC exposes the same `transfer(from,to,i128)` the pool already calls. The USDC SAC address is obtained by `stellar contract id asset --asset USDC:<testnet-issuer>` (and deployed once if not already, by anyone).
- **(Inference, medium confidence)** A USDC pool contract receiving USDC may need a trustline to the USDC asset to hold it as a classic asset; Protocol 26 lets contracts create trustlines via the SAC `trust` function. Whether the SAC auto-establishes the contract's balance entry on first transfer (making an explicit `trust` call unnecessary) is not verified here — flagged below.
- **(Inference, medium confidence)** USDC on Stellar testnet uses 7 decimals (Stellar classic assets are 7-decimal); the pool's `maximum_deposit_amount` and `i128` amounts are raw integer units, so a USDC pool's max-deposit constant would be in 1e7 units, distinct from XLM stroops (also 1e7). Decimal count for this specific USDC issuer not separately confirmed in a primary source here.

## Unknowns And Questions

- **Exact faucet rate limit / Stellar support tier.** The "20 USDC / 2h / address" figure and "Stellar supported" came from WebSearch snippets, not a direct read of faucet.circle.com (the page is JS-rendered; not fetched). Confirm by loading faucet.circle.com and selecting Stellar testnet.
- **Trustline requirement for the pool contract holding USDC.** Not verified whether the USDC SAC requires an explicit `trust`/trustline for the pool contract address before it can receive USDC, or whether the contract-data balance entry is created automatically on first inbound `transfer`. Needs a primary-source check (SAC docs `trust` function / a real testnet transfer).
- **Whether the ZK circuits encode an asset id.** This brief read `pool.rs` (Soroban side) only. The `circuits/` Circom code and the public-input layout were not inspected, so whether a single pool *could* be made multi-asset purely by circuit changes (vs. being structurally single-asset by design) is unconfirmed.
- **USDC testnet decimals for issuer `GBBD47IF...`.** Assumed 7 (Stellar classic default) but not confirmed against the issuer's `set_options`/asset metadata.
- **COMPLETED 2026-06-22:** The testnet USDC SAC resolves on-chain as a token contract through `stellar contract info interface --contract-id CBIELTK6Y... --network testnet`. This no longer blocks the USDC pool question.
- **`maximum_deposit_amount` semantics across assets.** Whether a per-pool max-deposit in raw units is intended to be set per-asset (it must be, since 1 XLM unit ≠ 1 USDC unit in value) — config detail, not a code constraint.

## Not Included

- No design/architecture for how a DeepBookie- or any-app-side integration "should" expose multi-asset. (Out of scope per instructions.)
- No mainnet deployment analysis (testnet focus); mainnet USDC issuer recorded for reference only.
- No circuit (`circuits/`) or proving-key audit; no ASP membership/non-membership semantics beyond noting they are shared across pools.
- No gas/fee, performance, or security-audit assessment of the Nethermind pool (repo itself is marked WIP/unaudited in its README).
- No EURC analysis (Circle issues EURC on Stellar too; not requested).

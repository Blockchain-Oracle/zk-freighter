# Reality Research: Confidential Token (deep pass)

Facts-only (Context Engineering reality-research gate). Extends `2026-06-25-confidential-token-repo-study.md`. Source: study-only clone `reference/openzeppelin-stellar-contracts-confidential` @ `539968f` (branch `feat/confidential-verifier-ultrahonk`). No solutioning.

## Scope
Close five reality gaps: compliance model, exact on-chain events, dual-auditor crypto, example contracts, toolchain/SDK reality.

## Sources Checked
- `packages/tokens/src/confidential/docs/COMPLIANCE.md`; `compliance/{mod.rs,storage.rs}`
- `packages/tokens/src/confidential/mod.rs` (events, errors, Hooks); `verifier/mod.rs`; `auditor/mod.rs`
- `examples/confidential/auditor/src/contract.rs`; `examples/confidential/verifier/src/contract.rs`
- `docs/DESIGN.md` §8 (auditor channels), §11 (interface)
- root `Cargo.toml` (rs-soroban-ultrahonk pin); CLI `which nargo/bb/noirup/bbup`

## Verified Facts

### Compliance model (real, configurable)
- `ComplianceConfig { policy: Option<Address>, sac_passthrough: bool }` (compliance/storage.rs).
- `freeze`/`unfreeze`/`is_frozen` (revert `NotConfigured` when compliance is None); emit `Frozen`/`Unfrozen`.
- SAC passthrough: when on, calls underlying `StellarAssetClient.authorized(account)`, reverts `NotAuthorizedBySac`.
- External policy hook: `Policy.is_authorized(account, token) -> bool`; reverts `NotAuthorizedByPolicy`.
- `gate_account` = freeze → policy → SAC, atomically. `ComplianceHooks` implements all 8 op callbacks (on_register/deposit/merge/withdraw/transfer/spender_transfer/set_spender/revoke_spender).
- Errors: NotConfigured=3600, AccountFrozen=3601, NotAuthorizedByPolicy=3602, NotAuthorizedBySac=3603.
- **Clawback = OUTLINE ONLY** (COMPLIANCE.md §5): a new (unimplemented) circuit + admin/auditor coordination; no on-chain entry point exists.
- Admin structure not prescribed; compose with OZ access-control (ownable / RBAC).

### On-chain events (recovery-critical; from mod.rs)
- `Register { account(topic), auditor_id:u32 }`
- `Deposit { from(topic), to(topic), amount:i128 }`
- `Merge { account(topic) }`
- `Withdraw { from, to, amount:i128, r_e:BytesN<64>, sigma:BytesN<32>, b_tilde:BytesN<32>, b_aud_s:BytesN<32> }`
- `Transfer { from, to, r_e:BytesN<64>, v_tilde, sigma, b_tilde, v_aud_r, r_aud_r, v_aud_s, b_aud_s }` (each BytesN<32> unless noted)
- `SpenderTransfer { spender, from, to, r_e, v_tilde, sigma_a, v_aud_r, r_aud_r, v_aud_s, a_aud_s }`
- `SetSpender { account, spender, live_until_ledger:u32, r_e, sigma, b_tilde, v_aud_s, b_aud_s }`
- `RevokeSpender { account, spender, r_e, sigma, b_tilde, v_aud_s, b_aud_s }`
- Config: `UnderlyingAssetSet`, `VerifierSet`, `AuditorSet`, `AddressAsFieldSet{address_as_field:BytesN<32>}`.
- Recovery depends on full event history; `INDEXER.md` is "to be added" (does not exist).

### Dual-auditor ECDH (DESIGN.md §8)
- Recipient-auditor channel keyed by `S_a,r = r_e·K_aud,r`: emits `v_aud_r`(amount), `r_aud_r`(randomness) → can reconstruct receiving-balance opening.
- Sender-auditor channel keyed by `S_a,s = r_e·K_aud,s`: emits `v_aud_s`(amount), `b_aud_s`(post-tx balance).
- Neither auditor can spend (needs `sk`, not in auditor channels). Auditor keys: Grumpkin affine BytesN<64>, validated canonical/on-curve(y²=x³−17)/non-identity; rotation is append-only (auditor keeps all historical secret keys).

### Example contracts
- `ConfidentialAuditorContract`: `__constructor(admin, manager)`; `register_key/rotate_key(auditor_id, point, operator)` gated by `#[only_role(operator,"manager")]`.
- `ConfidentialVerifierContract`: `__constructor(admin, manager)`; `register_verification_key/update_verification_key(circuit_type, vk, operator)`; `verify_proof` default impl.
- `CircuitType` (fixed on-chain): Register=0, Withdraw=1, Transfer=2, SpenderTransfer=3, SetSpender=4, RevokeSpender=5. "MUST NOT change."
- **No ConfidentialToken example crate** — only auditor + verifier. We author our own token contract.

### Toolchain
- Verifier backend pinned: `rs-soroban-ultrahonk` git rev `661db07200f890b1bd9a7349ed787c70a706dd12` (dev commit, unreleased, unaudited).
- `nargo`/`bb`/`noirup`/`bbup` NOT installed on this machine (which → not found). Circuit compile fails locally until installed.

## Inferences
- SDK absence is intentional ("SDK (to be added)"). Repo is contracts+circuits, not a client lib.
- Clawback is design-level, deferred.
- Verifier maturity (dev-commit, unaudited) gates mainnet (SDF ~Aug).
- Event bytes are recovery-critical; an indexer dropping/mutating bytes breaks deterministic recovery.

## Unknowns And Questions (resolved by the B1 spike, not assumed)
- Does `@noir-lang/noir_js` load a nargo-compiled circuit + produce a witness in-browser? Does `@aztec/bb.js` `UltraHonkBackend` generate+verify UltraHonk in-browser/Node against our regenerated VK? Must bb.js match the reference's bb version for VK compat? (Demo proves browser proving works in practice; our path unverified.)
- Does `@noble/curves` generic short-Weierstrass cover Grumpkin (y²=x³−17)?
- Indexer scope for a testnet demo (7-day RPC window vs durable archive); `INDEXER.md` not written.
- Clawback timeline; compliance example policy contracts; auditor key-version activation semantics.

## Not Included
- Circuit internals / security proofs (cited, not re-derived). Browser-proving ecosystem web-verification (deferred to the B1 spike). INDEXER.md spec (does not exist upstream).

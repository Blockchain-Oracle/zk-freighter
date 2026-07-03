# Confidential Token contract (Soroban)

The on-chain half of ZK Freighter's **Confidential Token** mode. It is a SEP-41-shaped
wrapper whose **amounts and balances are confidential**: per-account state is stored as
Pedersen commitments on Grumpkin, and every state-changing operation is gated by an
UltraHonk proof verified through a separate verifier-registry contract.

The proofs it checks come from the Noir circuits in [`../circuits`](../circuits) — read
that README first for the cryptographic model (Grumpkin, Pedersen commitments, the
Poseidon2 domain funnel, the dual auditor channel).

> **Attribution & status.** This contract is **authored by ZK Freighter** from the
> OpenZeppelin / SDF Confidential Tokens design (there is no upstream contract example —
> only the circuits and the verifier exist upstream). The `CircuitType` ordinals and the
> public-input layouts are the cross-language contract with the circuits and the on-chain
> verifier, and must not drift. On-chain Grumpkin point math comes from OpenZeppelin's
> `stellar-contract-utils` (pinned by git rev `539968f`). **Testnet-only** — the UltraHonk
> verifier backend is an unaudited developer preview and this mode is never enabled on
> mainnet. ([`lib.rs:1-11`](./confidential-token/src/lib.rs#L1-L11))

---

## Model

- **Balances are commitments, not numbers.** Each account stores a `spendable_balance`
  and a `receiving_balance`, both Pedersen points `C = v·G + r·H`
  ([`AccountState`, `lib.rs:67-81`](./confidential-token/src/lib.rs#L67-L81)).
- **Two balances, on purpose.** Incoming deposits/transfers accumulate in
  `receiving_balance`; the owner folds them into `spendable_balance` with `merge`. Keeping
  them separate isolates the owner from griefing by unsolicited incoming credits.
- **Homomorphic updates.** The contract never opens a balance. It point-adds `amount·G`
  on deposit and adds commitments on transfer/merge, so state advances while amounts stay
  hidden.
- **Proof-gated spends.** `withdraw`, `transfer` (and the not-yet-wired spender ops)
  reconstruct the circuit's public-input blob from stored state + the registered auditor
  key + prover outputs, then call the verifier. The contract treats prover outputs as
  opaque; the *circuit* is what proves they are well-formed.
- **Account model, not UTXO.** There are **no nullifiers**. Double-spend safety comes
  from `require_auth` + the `addr_f` replay binding + overwriting `spendable_balance`
  in-place under a valid proof.

## Wiring

Set once at construction ([`Config`, `lib.rs:57-65`](./confidential-token/src/lib.rs#L57-L65)):

| Field | Role |
|:--|:--|
| `admin` | may set the one-shot `addr_f` |
| `verifier` | the UltraHonk verifier-registry contract (`verify_proof`) |
| `auditor_registry` | resolves `auditor_id → K_aud` (Grumpkin key) for auditor-channel ECDH |
| `underlying` | the SAC moved across the public deposit/withdraw boundaries |

### `addr_f` — the replay binding

Before any account can register, the admin calls `set_contract_field(addr_f)` once, where
`addr_f = Poseidon2(ADDRESS, lo, hi)` of this deployed contract (computed off-chain). It is
**single-shot** — overwriting it would silently invalidate every registered account's `vk`
derivation, so a second set is refused. `register` checks that the proof's `addr_f` public
input equals the bound value, which is exactly what stops a proof minted for another token
instance being replayed here.
([`set_contract_field`, `lib.rs:156-166`](./confidential-token/src/lib.rs#L156-L166);
[`register` check, `lib.rs:191-199`](./confidential-token/src/lib.rs#L191-L199))

## Operations

| Op | Proof? | Boundary | What it does |
|:--|:--|:--|:--|
| [`register`](./confidential-token/src/lib.rs#L170-L225) | ✅ `Register` | — | Verify `Y=sk·H`, `vk=Poseidon2(VK,sk,addr_f)`, `PVK=vk·H`; store keys; balances start at Grumpkin identity. |
| [`deposit`](./confidential-token/src/lib.rs#L230-L247) | ❌ | **public in** | Pull `amount` of the underlying SAC in, add `amount·G` to the recipient's receiving balance. Amount is public — confidentiality starts at `merge`. |
| [`merge`](./confidential-token/src/lib.rs#L251-L259) | ❌ | — | Owner-authed, non-frontrunnable: point-add receiving into spendable, reset receiving to identity. |
| [`withdraw`](./confidential-token/src/lib.rs#L269-L338) | ✅ `Withdraw` | **public out** | Rebuild the 15-field PI blob, verify, overwrite spendable with `C_spend'`, then transfer `amount` real tokens out. |
| [`transfer`](./confidential-token/src/lib.rs#L348-L432) | ✅ `Transfer` | — | Rebuild the 24-field PI blob from both accounts + both auditor keys, verify, overwrite sender spendable, credit `C_tx` to recipient receiving, emit the recipient-channel ciphertext. |

`deposit` and `withdraw` are the **public boundaries** — the amount is visible on Stellar
there by design; everything between them is confidential. A failed underlying-token
transfer reverts the whole op.

### Public-input reconstruction

The contract, not the prover, assembles the public-input blob so the prover can't lie about
stored state. For `withdraw` the order is
`C_spend | Y | addr_f | K_aud_s | a | C_spend' | sigma | b_tilde | R_e | b_aud_s`
([`lib.rs:307-320`](./confidential-token/src/lib.rs#L307-L320)); for `transfer` it is the
24-field layout at [`lib.rs:389-409`](./confidential-token/src/lib.rs#L389-L409). Prover-supplied
values are checked to be **canonical BN254 representatives** before they reach the verifier
([`withdraw`, `lib.rs:296-303`](./confidential-token/src/lib.rs#L296-L303)); stored state and
the registered auditor key are canonical by construction.

### Notable safety details

- **Self-transfer.** `transfer` re-reads the recipient *after* the sender write so a
  `from == to` transfer composes on top of the debit instead of clobbering it with a stale
  copy ([`lib.rs:418-423`](./confidential-token/src/lib.rs#L418-L423)).
- **Recipient scanning.** `transfer` emits `(R_e, v_tilde, sigma)` so the recipient can
  recompute `s = ecdh(vk_B, R_e)` and recover `(v_tx, r_tx)` to open `C_tx`
  ([`lib.rs:425-430`](./confidential-token/src/lib.rs#L425-L430)).
- **Storage TTL.** Every account read/write bumps its persistent entry ~30 days forward so
  an in-use confidential balance can't be archived out from under its owner
  ([`lib.rs:131-136`, `450-467`](./confidential-token/src/lib.rs#L131-L136)).

## Build & test

```bash
cd contracts
cargo test                     # unit tests (test.rs) against a real SAC
stellar contract build         # or: cargo build --release --target wasm32-unknown-unknown
```

The tests wire a **`MockVerifier`** (accepts any proof) and **`MockAuditor`** (fixed key)
so what's under test is the contract's *own* logic — auth, `addr_f` binding, storage,
public-input assembly, canonical-encoding rejection, token movement, self-transfer safety.
Real UltraHonk **proof acceptance is not asserted here** — that is proven on testnet
(see the evidence doc). ([`test.rs:12-39`](./confidential-token/src/test.rs#L12-L39))

## See also

- [`../circuits/README.md`](../circuits/README.md) — the Noir circuits and crypto model.
- [`packages/core/src/confidential/`](../packages/core/src/confidential) — the wallet-side
  runtime that builds witnesses, generates UltraHonk proofs, and encodes public inputs.
- [`docs/architecture`](../apps/docs/content/docs/architecture) — the end-to-end walkthrough.

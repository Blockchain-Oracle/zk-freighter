# Public <-> private boundary flows (Stellar-grounded)

> Scope: how value crosses the public/private line in this privacy-by-default Stellar
> wallet, backed by the on-chain pool contract, the Circom circuit, and the client code.
> Everything below is grounded in the verified research; where a fact is not established,
> it is flagged **[UNKNOWN]** rather than guessed.
>
> Core fact to anchor on: the pool has **one** value-moving entry point —
> `transact(env, proof, ext_data, sender)` (`contracts/pool/src/pool.rs:535-559`).
> Deposit, internal transfer, and withdraw are the *same* call, distinguished only by the
> sign of `ext_data.ext_amount` (an `I256`): **>0 = deposit, <0 = withdraw, =0 = internal
> private transfer** (`ext_data.rs:17-21`). Money only enters/leaves via a Soroban
> `TokenClient::transfer` on one configured token contract — there is **no mint**; deposits
> are real transfers of existing balance.

---

## The interop matrix

Four logical directions. "Our app" = the wallet's privacy tooling (witness builder +
Groth16 prover + the `transact` submitter). On this Stellar pool there is **no relayer /
broadcaster** — `ExtData` has only `{recipient, ext_amount, encrypted_output0/1}` and no fee
or relayer field (`pool.rs:106-114`), so the account that authorizes `transact` is the
on-chain actor at every edge.

| Direction | Who needs our app | Exact steps | Public on-chain | Hidden |
|---|---|---|---|---|
| **public -> public** | N/A | Just use a normal Stellar wallet + SAC/classic payment. Our pool is not involved. | sender, recipient, asset, amount | nothing |
| **public -> private** | The **payer** (to credit a shielded note directly) **or** the recipient self-shields after a normal payment | Payer runs the proving pipeline and calls `transact` with `ext_amount > 0`; output note(s) committed to recipient keys. *Or:* recipient receives a normal public payment, then runs `transact` to shield to self. | depositor (`sender`) address, exact amount, the `transact` invocation, the SAC transfer event, two `NewCommitmentEvent`s (commitment hash + tree index + opaque encrypted blob) | per-note amount, recipient note pubkey, blinding (sealed inside the commitment + X25519 blob); whether the note belongs to the depositor or a third party |
| **private -> private** | Sender (in-pool) | `transact` with `ext_amount = 0`; spend input notes, create output notes addressed to recipient note pubkey, encrypted to their X25519 key | nullifier event(s), commitment event(s), proof, root | sender, recipient, amount — all hidden |
| **private -> public** | The private holder | `transact` with `ext_amount < 0`; pool transfers tokens out to `ext_data.recipient` | recipient Stellar address, exact amount, nullifier(s) (`NewNullifierEvent`), the SAC transfer pool->recipient | which deposit/note it came from (Merkle membership proven in ZK; nullifier is one-way) |

---

## Case 1 — a PUBLIC user pays a PRIVATE user

The honest answer has three parts: what the code supports, what a vanilla wallet can do, and
what leaks in each path.

### Option A — payer shields directly to the recipient's keys (the code supports this)
- The output commitment is `Poseidon2(outAmount, outPubkey, outBlinding)`, and **`outPubkey`
  is a *private, unconstrained* circuit input** — nothing forces it to equal the spender's
  own pubkey (`policyTransaction.circom:60,182-187`). So the prover can build a note owned by
  *someone else*.
- The prover builds the commitment from `recipient_note_pubkey` (BN254) and seals the
  encrypted note to `recipient_enc_pubkey` (X25519); if recipient keys are absent it falls
  back to the sender's own keys (`flows.rs:619-643`).
- The client has an explicit path for this: `execute_transact_inner` takes
  `out_recipient_note_keys_hex` + `out_recipient_enc_keys_hex` arrays for arbitrary
  recipients (`transact.rs:378-432`). (The shield-to-self path is the separate
  `execute_deposit_inner`, `transact.rs:436-484`.)
- For the payer to know the recipient's keys, the recipient can publish them on-chain via
  `register()`, which emits a `PublicKeyEvent` linking their Stellar Address to their note_key
  + encryption_key (`pool.rs:146-154,664-682`). `register` is **not** required to *use* the
  pool — it's a discovery convenience. **[UNKNOWN]** the exact UX precondition for crediting a
  recipient's note — whether the recipient must have published an `Account`/keys first, or the
  payer can supply keys out-of-band, is not fully traced.

  **Hard requirement:** this is **not** something a vanilla Stellar wallet can do. A plain
  SAC/classic transfer into the pool contract would only credit the pool's token balance with
  **no commitment inserted** — commitments are only written inside `internal_transact`, which
  *always* runs `verify_proof` and rejects empty/invalid proofs
  (`pool.rs:616-619,639-644`). Even a zero-input deposit must satisfy the balance constraint
  `sumIns + publicAmount === sumOuts` (`circom:210`) and produce valid output commitments, and
  the contract recomputes `public_amount` from `ext_amount` and rejects any mismatch
  (`pool.rs:600-605`). **The payer must run our privacy tooling** (witness + Groth16 prover)
  to originate a shielded payment.

  - **What leaks (Option A):** the payer's Stellar address, the exact amount, the `transact`
    invocation, and the two commitment events. **What stays hidden:** the recipient's
    identity and the per-note amount/keys (sealed in the commitment + X25519 blob); on-chain,
    a third-party note is indistinguishable from a self-shield.

### Option B — recipient receives publicly, then self-shields (no payer tooling)
- A non-private payer who can't/won't run the tooling just sends a normal public payment to a
  Stellar address the recipient controls. The recipient then runs `transact`
  (`execute_deposit_inner`) to shield it to themselves.
- **What leaks (Option B):** *two* public events — the inbound transfer (payer, recipient
  address, amount) **and** the self-shield (that same address + amount entering the pool).
  This is strictly more revealing than Option A; it exposes the recipient's receiving address
  and ties it to the shielded deposit.

### Which to prefer
Option A keeps the recipient's identity off-chain and is the privacy-preserving path, but it
shifts the burden onto the payer (they must run the prover and know the recipient's keys).
Option B works with any wallet but leaks the recipient's public address. **The code supports
both**; the difference is who runs the tooling and how much the recipient's address is exposed.

---

## Case 2 — shielding OUT (private -> public)

### Mechanics
- The private holder originates a `transact` with `ext_amount < 0`. Inside
  `internal_transact` the contract computes the absolute amount and does
  `token_client.transfer(&this, &ext_data.recipient, &amount)` — pool -> public recipient
  (`pool.rs:627-636`).
- `ext_data.recipient` is **bound into the proof** via `ext_data_hash` (`pool.rs:595-598`), so
  the destination cannot be swapped after the proof is made.
- Spent input notes' nullifiers are checked unspent, marked spent, and emitted as
  `NewNullifierEvent` (`pool.rs:588-625`). Two output commitment events are still emitted (for
  change / zero outputs).

### Trustline / authorization (the Stellar reality)
The pool itself contains **no** trustline logic — it only calls `TokenClient::transfer`. The
trustline/auth rules are platform-level SAC behavior:
- For a non-native asset (e.g. USDC), a classic `G...` recipient must hold a **trustline**
  (created via `changeTrust` *before* receiving), which costs **0.5 XLM** of reserve, and the
  account must already be funded. Native XLM needs no trustline.
- If the issuer set `AUTH_REQUIRED`, the recipient's trustline must also be **authorized**.
- As of **Protocol 26**, the SAC `trust` function can create a missing trustline for a `G...`
  address during a contract invocation. **[UNKNOWN]** whether *this* pool/withdraw path
  actually invokes that `trust` function for the recipient, or relies on a pre-existing
  trustline — not traced in code; stated only from general Stellar docs.
- Contract (`C...`) addresses don't use trustlines (balances live in contract storage).
- **[UNKNOWN]** exact on-the-wire SAC trustline behavior for the *specific* deployed asset.

### What an observer sees vs. what stays hidden
- **Public:** the recipient Stellar address, the **exact amount** (via `ext_amount` /
  `public_amount` and the SAC transfer event), the nullifier(s), the `transact` invocation,
  the root, `ext_data_hash`, ASP membership roots, and the Groth16 proof.
- **Hidden:** **which deposit the money came from.** The nullifier =
  `Poseidon2(commitment, merklePath, signature)` is a one-way hash (`circom:97-105`), and the
  spent note's Merkle membership is proven in zero knowledge against a historical root
  (`pool.rs:584-587; circom:107-119`). Chain data does **not** reveal which deposit
  commitment/leaf was consumed — the public link back to the original deposit is broken.

### Note on the submitter
Unlike Railgun (where a Broadcaster pays gas and appears as the on-chain `from`, hiding the
user), this pool has **no relayer**. The account that authorizes the withdrawal is visible.
**[UNKNOWN]** whether the wider app/SDK adds a third-party submitter outside the contract —
not found; the contract has none.

---

## Implications for our UX (only what the facts support)

1. **Two distinct "receive money" stories.** We can let a payer shield *directly* to a
   recipient (Option A, identity-preserving) only if the payer runs the prover and has the
   recipient's keys. Otherwise the realistic path is public-receive-then-self-shield
   (Option B), which leaks the recipient's address. UX should make the privacy trade-off
   explicit and steer toward Option A where possible.
2. **Key discovery is a real feature, not optional plumbing.** `register()` exists precisely
   so a recipient can publish their note + encryption keys for payers to find
   (`pool.rs:664-682`). To support Option A smoothly, we likely need a "publish my receive
   keys" step. (But note `register` is *not* required just to use the pool.)
3. **Deposits and withdrawals are never anonymous at the edge.** Always show the user that
   the **deposit address + amount** and the **withdrawal recipient + amount** are public on
   Stellar. Only the *link between* a deposit and a later withdrawal is hidden. Do not imply
   end-to-end invisibility.
4. **Withdrawal pre-flight for non-native assets.** Before a USDC withdrawal to a `G...`
   address, the recipient needs a funded, trustlined (and possibly authorized) account
   (0.5 XLM reserve per trustline). UX should check/handle this. **[UNKNOWN]** whether our
   withdraw path auto-creates the trustline via the Protocol-26 `trust` fn or requires it to
   pre-exist — confirm before promising one-click withdrawals.
5. **There is no built-in fee/relayer hiding.** The withdrawing account is on-chain. If we
   want to hide the submitter (as Railgun does), that is *not* in the contract today and would
   be net-new work.

---

## Open unknowns (carried forward, not filled)
- The deployed pool's configured token: USDC SAC vs native XLM vs test token — it's a
  constructor arg (`pool.rs:282`); deployment config not inspected.
- Whether the withdraw path uses the Protocol-26 SAC `trust` function or requires a
  pre-existing trustline for the recipient.
- For a zero-input pure deposit to a third party: how ASP membership binds when inputs are
  dummy, and whether the depositor must be ASP-registered to deposit (vs only to spend).
- The exact plaintext format / AEAD scheme of `encrypt_output_note` beyond "X25519 +
  amount/blinding."
- The exact UX precondition for crediting a recipient's note (must they publish an `Account`
  first?).
- Whether off-chain components (indexer/bootnode) or any app-level relayer correlate or hide
  deposit/withdraw beyond on-chain data.

## Sources
- `contracts/pool/src/pool.rs:535-559` — single `transact` entry; `require_auth`; deposit
  transfer; per-tx max-deposit cap.
- `contracts/pool/src/pool.rs:583-662` — `internal_transact`: checks, proof verify, withdraw
  transfer, commitment insert, events.
- `contracts/pool/src/pool.rs:104-138` — `ExtData` + `hash_ext_data` binding recipient/amount
  into the proof.
- `contracts/pool/src/pool.rs:146-154,664-682` — `register()` publishing note/encryption keys.
- `circuits/src/policyTransaction.circom:60,182-187,210,97-105` — unconstrained `outPubkey`,
  commitment, balance constraint, one-way nullifier.
- `app/crates/core/prover/src/flows.rs:610-649` — output commitment from recipient keys;
  fallback to sender keys.
- `app/crates/platforms/web/src/client/transact.rs:378-484` — arbitrary-recipient vs
  shield-to-self client paths.
- `app/crates/core/witness/src/lib.rs:74-97` — witness computation (proof is mandatory).
- `app/crates/core/types/src/ext_data.rs:17-21` — `ext_amount` sign semantics.
- Stellar docs — SAC trustline/auth rules, Protocol-26 `trust` fn, 0.5 XLM reserve,
  InvokeHostFunction visibility.

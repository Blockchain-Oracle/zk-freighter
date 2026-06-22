# Nethermind pool: exact public<->private boundary mechanics (from code)

## Scope

Facts-only reality brief on how value crosses the public<->private boundary in
the Nethermind / Stellar private-payments pool. Documents (1) the deposit
(public->private) leg, including whether you can shield directly to someone
else's keys; (2) whether deposit-to-recipient requires ZK proving; (3) the
withdraw (private->public) leg and what is publicly visible; (4) trustline/auth
requirements for the public token legs. NO solution design. Anything not
verifiable from code is in Unknowns.

Primary source: cloned repo at
`/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments`.

## Verified Facts

### Single entry point: `transact`

- The pool has ONE write entry point for value movement, `transact(env, proof,
  ext_data, sender)` (`contracts/pool/src/pool.rs:535-559`). Deposit, transfer,
  and withdraw are all the same call; the only differentiator is the SIGN of
  `ext_data.ext_amount` (`I256`): `> 0` deposit, `< 0` withdraw, `= 0` pure
  internal transfer (`app/crates/core/types/src/ext_data.rs:17-21`).
- `transact` first calls `sender.require_auth()` (`pool.rs:541`). The `sender`
  Address is the only party that authorizes the call.

### ExtData shape (the public payload)

- On-chain `ExtData` = `{ recipient: Address, ext_amount: I256,
  encrypted_output0: Bytes, encrypted_output1: Bytes }`
  (`pool.rs:104-115`). It is hashed with Keccak256 (XDR-serialized), reduced mod
  the BN254 field, and that hash is bound into the proof as `ext_data_hash`
  (`pool.rs:130-138`, checked at `pool.rs:595-598`).

### The proof's public inputs

- `Proof` carries: `root`, `input_nullifiers: Vec<U256>`,
  `output_commitment0`, `output_commitment1`, `public_amount`, `ext_data_hash`,
  `asp_membership_root`, `asp_non_membership_root` (`pool.rs:77-97`).
- Output commitment = `Poseidon2(outAmount, outPubkey, outBlinding)` with domain
  separation `0x01` (`circuits/src/policyTransaction.circom:182-187`).
- `outPubkey[nOuts]` is a **PRIVATE** circuit input
  (`policyTransaction.circom:60`). The circuit places NO constraint forcing
  output pubkeys to equal the spender's input pubkey. Inputs are tied to
  `inKeypair[tx].publicKey` derived from `inPrivateKey` (lines 81-87, 131, 154),
  but outputs are free.
- The deployed circuit is `PolicyTransaction(2, 2, 1, 1, 10, 10)` — 2 inputs, 2
  outputs, tree depth 10 (`circuits/src/policy_tx_2_2.circom:10`). Public-input
  vector order is `[root, publicAmount, extDataHash, inputNullifier[2],
  outputCommitment[2], membershipRoots, nonMembershipRoots]`
  (`policy_tx_2_2.circom:10`; mirrored in `pool.rs:446-478`).

## Public->private

### Who provides the public tokens on deposit

When `ext_data.ext_amount > 0` (`pool.rs:547-556`):
- `let token_client = TokenClient::new(env, &token)` where `token` is the pool's
  configured token contract (`pool.rs:542-543`, set at construction
  `pool.rs:282`).
- `token_client.transfer(&sender, &this, &amount)` (`pool.rs:555`) — tokens move
  FROM `sender` (the same Address that called `require_auth` at `pool.rs:541`) TO
  the pool contract (`this = env.current_contract_address()`, `pool.rs:553`).
- A per-tx cap is enforced: deposit must be `<= MaximumDepositAmount`
  (`pool.rs:549-552`).

So the public token source is unambiguously the authorizing `sender`. There is
no separate funder/payer parameter.

### How output notes are created (and FOR WHOM)

After the (optional) deposit transfer, `internal_transact` inserts the two
output commitments from the proof into the Merkle tree and emits one
`NewCommitmentEvent` per output, carrying `encrypted_output0/1` from ExtData
(`pool.rs:639-659`). The contract NEVER sees the note pubkey or amount in the
clear — it only sees the commitment hash and the opaque ciphertext.

CRITICAL ANSWER — can a depositor shield directly to a recipient's keys? YES.
- The commitment is built off the recipient's note pubkey, and the encrypted
  note blob is sealed to the recipient's X25519 key. In the prover:
  `recipient_note_pubkey` (BN254) feeds `crypto::compute_commitment(amount,
  recipient_note_pubkey, blinding)` and `recipient_enc_pubkey` (X25519) feeds
  `encryption::encrypt_output_note(...)`
  (`app/crates/core/prover/src/flows.rs:619-643`). If a recipient key is absent,
  it falls back to the SENDER's own keys (`flows.rs:624, 628`), i.e. shield to
  self.
- The web client exposes both paths explicitly:
  - `execute_transact_inner` takes `out_recipient_note_keys_hex` and
    `out_recipient_enc_keys_hex` arrays (length must = N_OUTPUTS) and builds a
    `Transact` step with per-output recipient keys
    (`app/crates/platforms/web/src/client/transact.rs:378-432`).
  - `execute_deposit_inner` is the shield-to-SELF variant: it loads the user's
    own `note_pk`/`enc_pk` and assigns BOTH outputs to them
    (`transact.rs:436-484`, esp. 465-475).
- The storage worker requires note-pubkey and encryption-pubkey to be set or
  null TOGETHER per output (`workers/storage.rs:430-445`), then passes them into
  `TransactParams.outputs` (`storage.rs:447-461`).
- The on-chain `register` function lets users publish their `{owner,
  encryption_key (X25519), note_key (BN254)}` via a `PublicKeyEvent`
  (`pool.rs:146-154`, `200-239` event defs, `674-682` register impl) precisely
  so others can discover keys to send them encrypted outputs. Doc comment:
  "Allows users to publish their public key so others can send them encrypted
  outputs for private transfers" (`pool.rs:664-667`). `register` is NOT required
  to use the pool (`pool.rs:144-145`).

Net: a single `transact` with `ext_amount > 0` can simultaneously (a) pull
public tokens from the sender and (b) create output note(s) owned by a DIFFERENT
recipient's keys — i.e. deposit straight into someone else's shielded balance.

### Does deposit-to-recipient REQUIRE a ZK proof?

YES — definitively, for ANY value-moving `transact`, including a deposit:
- `transact` -> `internal_transact` always calls `verify_proof`, and a failed or
  empty proof is rejected (`pool.rs:616-619`, `437-441`). `proof.proof` empty =>
  `Error::InvalidProof`.
- Even a pure deposit (zero inputs) goes through the circuit with dummy/zero
  inputs and must still satisfy `sumIns + publicAmount === sumOuts`
  (`policyTransaction.circom:210`) and produce valid output commitments
  (`outCommitmentHasher[tx].out === outputCommitment[tx]`,
  `policyTransaction.circom:187`). The contract independently recomputes
  `public_amount` from `ext_amount` and rejects a mismatch (`pool.rs:600-605`,
  `calculate_public_amount` at `pool.rs:346-366`).
- The client deposit path builds a witness and runs the prover worker before
  submission: `prove_transact_inner` -> StorageWorker `Transact` (witness
  inputs) -> ProverWorker `Transact` (proof) -> submit
  (`transact.rs:81-263`, prover request at `transact.rs:246-257`). Witness
  computation is a Groth16/Circom step (`app/crates/core/witness/src/lib.rs`,
  `compute_witness` at lines 74-97).

Therefore a vanilla Stellar account CANNOT do a plain SAC token transfer into
the pool and have it become a shielded note. A raw `transfer` to the pool
address would just credit the pool contract's token balance with NO matching
commitment inserted (the contract only inserts commitments inside
`internal_transact`, which requires a valid proof). To shield, the depositor (or
whoever proves on their behalf) must generate a witness + Groth16 proof — i.e.
the privacy tooling is mandatory. The depositor is the account that signs/auths
`transact` and funds it; the output note can be addressed to a third party's
keys, but the proof itself is still required.

NOTE on ASP gating: the circuit ties membership/non-membership proofs to the
SPENDER's keypair (`policyMembershipHasher` uses `inKeypair[tx].publicKey`,
`policyTransaction.circom:131`; non-membership `key === inKeypair[tx].publicKey`,
line 154). The web flow checks the user's ASP membership before proving and can
return `RegisterAtASP` / `SyncRequired` (`transact.rs:200-220`,
`workers/storage.rs:402-412`). See Unknowns for how this binds on a
zero-input pure deposit.

## Private->public

When `ext_data.ext_amount < 0` (withdraw), inside `internal_transact`
(`pool.rs:627-637`):
- `abs = 0 - ext_amount`; `amount: i128` (`pool.rs:633-635`).
- `token_client.transfer(&this, &ext_data.recipient, &amount)` — tokens move
  FROM the pool contract TO `ext_data.recipient` (the public Address carried in
  ExtData) (`pool.rs:636`).
- `ext_data.recipient` is bound into the proof via `ext_data_hash`
  (`pool.rs:595-598`), so the recipient cannot be swapped after proving without
  invalidating the proof. The on-chain `recipient` field is the withdrawal
  destination (`pool.rs:107-108`).
- Input notes being spent are nullified: each `input_nullifier` is checked
  unspent (`pool.rs:588-593`), marked spent, and a `NewNullifierEvent` is
  emitted (`pool.rs:621-625`). `public_amount` (= field-encoded negative
  ext_amount, `pool.rs:357-365`) is a public input checked against the contract
  recomputation (`pool.rs:600-605`).

Link back to original deposit: BROKEN at the public layer. The withdraw tx
publicly reveals only the recipient Address, the absolute amount (via ext_amount
/ public_amount and the SAC transfer), and the spent nullifier(s). The nullifier
is `Poseidon2(commitment, merklePath, signature)` (domain `0x02`,
`policyTransaction.circom:97-105`); it is a one-way function of the spent note
and does not reveal WHICH commitment/leaf was consumed on-chain — the Merkle
membership of the spent note is proven in zero knowledge against a historical
`root` (`pool.rs:584-587`, circuit `inTree` + `inCheckRoot`,
`policyTransaction.circom:107-119`). So an observer cannot, from chain data
alone, tie the nullifier to a specific prior deposit commitment.

## What an observer can see

At the DEPOSIT edge (ext_amount > 0):
- The SAC `transfer(sender -> pool, amount)` — sender Address and exact amount
  are public (`pool.rs:555`).
- `transact` was authorized by `sender` (`pool.rs:541`).
- Two `NewCommitmentEvent`s: each commitment hash, its tree index, and the
  opaque `encrypted_output` ciphertext (`pool.rs:646-659`). Amount-per-note,
  recipient note pubkey, and blinding are NOT visible (they are inside the
  commitment hash and the X25519-sealed blob).
- Whether the note(s) belong to the depositor or a third party is NOT
  distinguishable on-chain — both look identical (commitment + ciphertext).

At the WITHDRAW edge (ext_amount < 0):
- The SAC `transfer(pool -> ext_data.recipient, amount)` — recipient Address and
  exact amount are public (`pool.rs:636`).
- One `NewNullifierEvent` per spent input (`pool.rs:624`).
- Still two `NewCommitmentEvent`s for the change/zero outputs (`pool.rs:646-659`).
- The spent note's original deposit commitment / leaf index is NOT revealed; the
  Merkle proof is in zero knowledge (`pool.rs:584-587`; circuit lines 107-119).

At all edges: `public_amount`, `root`, `ext_data_hash`, ASP roots, and the proof
itself are public inputs/data in the submitted Soroban tx
(`PreparedTxPublic` / `PreparedProverTx`,
`app/crates/platforms/web/src/protocol.rs:168-193`).

Registration (optional): `PublicKeyEvent { owner, encryption_key, note_key }` is
public if a user calls `register` (`pool.rs:229-239, 674-682`) — this links a
Stellar Address to its note/encryption pubkeys for discovery.

## Trustline / auth requirements (public legs)

- The pool moves tokens ONLY via the Soroban token interface
  `TokenClient::transfer` against a single configured token contract
  (`pool.rs:542-543, 555, 628-636`; token set at construction `pool.rs:282`).
  There is no mint; deposits are real `transfer`s of an existing balance — the
  CLAUDE-style "split a real coin" pattern, not minting.
- For a Stellar Asset Contract (SAC) wrapping a non-native asset such as USDC,
  successful `transfer` requires the receiving account to hold a trustline to
  that asset, and (if the issuer set `AUTH_REQUIRED`) an authorized trustline.
  Confirmed from Stellar docs: non-native SAC transfers require an existing
  trustline; transfers succeed only if trustlines have `AUTHORIZED_FLAG`; as of
  Protocol 26 the SAC `trust` function can create a missing trustline for a
  `G...` address during a contract invocation
  (https://developers.stellar.org/docs/tokens/stellar-asset-contract).
  Implications for this pool:
  - DEPOSIT: the SAC pulls from `sender`; `sender` must already hold/authorized
    a trustline + balance (standard for spending the asset).
  - The POOL CONTRACT (a `C...` contract address) must be able to receive the
    asset; SAC transfers to contract addresses do not use classic trustlines the
    same way `G...` accounts do (contract balances), so the relevant constraint
    is issuer authorization rather than a classic trustline on the pool.
  - WITHDRAW: `ext_data.recipient` (the withdrawal destination) must be able to
    receive — for a `G...` recipient holding USDC, that means an existing
    (authorized) trustline, unless created via the SAC `trust` flow.
  None of these trustline/auth specifics are enforced in the pool contract code;
  they are platform-level SAC behavior. See Unknowns.

## Unknowns

- Whether the pool's configured token on the target deployment is actually a
  USDC SAC vs. native XLM vs. a test token — not determinable from
  `contracts/pool/src/pool.rs` alone (token is a constructor arg). Deployment
  config not inspected in this brief.
- Exact on-the-wire trustline behavior for SAC transfers to the pool's CONTRACT
  address (contract balances vs. classic trustlines) for the specific asset used
  — stated from general Stellar docs, not from a deployment test in this repo.
- For a zero-input PURE DEPOSIT to a third-party recipient: how the spender's ASP
  membership/non-membership binds when there are no real inputs (dummy inputs
  have amount 0 and `inCheckRoot` is gated by `enabled <== inAmount`,
  `policyTransaction.circom:116-119`). Whether the depositor must themselves be
  ASP-registered to deposit (vs. only to spend) was not fully traced; the web
  flow performs ASP checks for the acting user regardless
  (`transact.rs:200-220`). Needs a dedicated trace of the deposit witness build.
- The precise plaintext format / AEAD scheme of `encrypt_output_note` beyond
  "X25519 + amount/blinding" (function exists at
  `app/crates/core/prover/src/encryption.rs:236-244, 298`); not fully read here.
- Whether anything off-chain (indexer/bootnode) correlates deposit and withdraw
  beyond what is on-chain — out of scope for the on-chain boundary question.

## Sources

- `contracts/pool/src/pool.rs:104-115` — on-chain `ExtData` struct (recipient,
  ext_amount sign semantics, encrypted_output0/1).
- `contracts/pool/src/pool.rs:130-138` — `hash_ext_data` (Keccak256, XDR, mod
  field) binding recipient/amount into the proof.
- `contracts/pool/src/pool.rs:146-154, 200-239, 664-682` — Account/PublicKeyEvent
  and `register` (publish note_key BN254 + encryption_key X25519 for discovery).
- `contracts/pool/src/pool.rs:535-559` — `transact`: `sender.require_auth()`,
  deposit branch `token_client.transfer(&sender, &this, &amount)`.
- `contracts/pool/src/pool.rs:583-662` — `internal_transact`: root/nullifier/
  ext-hash/public-amount checks, proof verify, withdraw transfer
  (`&this -> &ext_data.recipient`), commitment insert + events.
- `contracts/pool/src/pool.rs:346-366` — `calculate_public_amount` (negative =>
  FIELD_SIZE - |amount|).
- `contracts/pool/src/pool.rs:437-483` — `verify_proof` + public-input ordering.
- `circuits/src/policyTransaction.circom:60, 81-105, 116-119, 131, 154,
  182-187, 210` — outPubkey is private; output commitment hash; spender-key
  binding of ASP proofs; nullifier; balance constraint.
- `circuits/src/policy_tx_2_2.circom:10` — deployed `PolicyTransaction(2,2,1,1,
  10,10)` and public signal list.
- `app/crates/core/types/src/ext_data.rs:13-26` — off-chain ExtData mirror,
  ext_amount sign semantics.
- `app/crates/core/prover/src/flows.rs:43-68, 116-152, 610-649` — TransactOutput
  recipient keys; commitment built from recipient_note_pubkey; encrypt to
  recipient_enc_pubkey; fallback to sender keys.
- `app/crates/platforms/web/src/client/transact.rs:81-263, 378-484` — proving
  pipeline; `execute_transact_inner` (recipient keys) vs `execute_deposit_inner`
  (self keys).
- `app/crates/platforms/web/src/workers/storage.rs:399-465` — per-output
  recipient pubkey wiring; both-or-neither rule; TransactParams build.
- `app/crates/platforms/web/src/protocol.rs:147-193` — TransactRequest /
  PreparedTxPublic / PreparedProverTx public fields.
- `app/crates/core/witness/src/lib.rs:74-97` — Circom witness computation
  (required before proving).
- https://developers.stellar.org/docs/tokens/stellar-asset-contract — SAC
  transfer trustline + authorization requirements; Protocol 26 `trust` function.

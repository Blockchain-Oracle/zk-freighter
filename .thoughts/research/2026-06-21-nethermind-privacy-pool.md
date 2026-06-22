# Reality Research: Nethermind stellar-private-payments — engine internals

## Scope

Facts-only documentation of how the Nethermind `stellar-private-payments` privacy
pool works as code: Soroban contract entry points (deposit/transact/withdraw), the
Groth16 circuit public/private inputs, the note/UTXO data model, spend/view key
derivation, the client transaction-build/submit path, proof generation (prover API +
artifacts), the ASP membership / non-membership contracts, event-based state
reconstruction and its retention limitation, and whether the pool is hardcoded to
native XLM or parameterizable for a Stellar Asset Contract (SAC) token such as USDC.

Repo snapshot examined: branch tip commit `98a2d77 Bootnode (#273)`, remote
`https://github.com/NethermindEth/stellar-private-payments`. Repo is explicitly
labeled **WIP / unaudited reference implementation** (README.md:14-17).

NOT in scope: judging design quality, proposing changes, or auditing for bugs.

## Sources Checked

Primary (files Read in full or in part):
- `README.md` (whole)
- `contracts/pool/src/pool.rs` (whole, 863 lines) — main pool contract
- `contracts/pool/src/lib.rs`
- `contracts/asp-membership/src/lib.rs` (whole) — append-only Merkle tree
- `contracts/asp-non-membership/src/lib.rs` (whole) — Sparse Merkle Tree
- `circuits/src/transaction.circom`, `circuits/src/policyTransaction.circom`,
  `circuits/src/policy_tx_2_2.circom`, `circuits/src/keypair.circom`
- `app/crates/core/prover/src/prover.rs` — Groth16 prover
- `app/crates/core/prover/src/crypto.rs` — Poseidon2 / commitment / nullifier
- `app/crates/core/prover/src/notes.rs` — note discovery/decryption
- `app/crates/core/prover/src/encryption.rs` (lines 1-175) — key derivation
- `app/crates/core/witness/src/lib.rs` — witness calculator (ark-circom + wasmer)
- `app/crates/core/stellar/src/tx_prepare.rs`, `tx_assemble.rs` — invoke + simulate
- `app/crates/core/stellar/src/indexer.rs` — event indexing
- `app/crates/core/types/src/lib.rs` (lines 1-75) — config + `AssetDescriptor`
- `app/js/wallet.js` (grep) — Freighter signing glue
- `deployments/scripts/deploy.sh` (whole) — deploy + pool-spec parsing
- `deployments/testnet/deployments.json` — live testnet addresses
- `deployments/testnet/circuit_keys/README.md`, file listing
- `Makefile`, `Trunk.toml` — local run + build hooks
- Commands: `git log`, `find`, `grep`, file listings

Secondary:
- Docs site `https://nethermindeth.github.io/stellar-private-payments/` via WebFetch.

## Verified Facts

### Component topology (4 Soroban contracts + 3 circuits)
README.md:105-110 and deploy.sh:158-279 confirm four deployed contracts:
- **Pool** (`contracts/pool`) — deposits/transfers/withdrawals, commitment Merkle
  tree, nullifier set, token integration.
- **Circom Groth16 Verifier** (`contracts/circom-groth16-verifier`) — on-chain proof
  verification; its WASM is built with the verification key embedded
  (deploy.sh:163-173, `scripts/build-verifier-with-vk.sh`).
- **ASP Membership** (`contracts/asp-membership`) — append-only Merkle tree of
  approved note public keys.
- **ASP Non-Membership** (`contracts/asp-non-membership`) — Sparse Merkle Tree for
  exclusion proofs.

On-chain transaction circuit is `policy_tx_2_2` = `PolicyTransaction(2,2,1,1,10,10)`
(policy_tx_2_2.circom:10): 2 inputs, 2 outputs, 1 membership proof + 1
non-membership proof per input, pool tree depth 10, SMT depth 10. There is also a
non-policy `Transaction(levels,nIns,nOuts)` circuit (transaction.circom) and an
off-chain `selectiveDisclosure_1` circuit for disclosure receipts.

### Pool contract entry points (contracts/pool/src/pool.rs)
- **`__constructor(env, admin: Address, token: Address, verifier: Address,
  asp_membership: Address, asp_non_membership: Address, maximum_deposit_amount: U256,
  levels: u32)`** (pool.rs:271-303). Stores all addresses in persistent storage,
  initializes the commitment Merkle tree. One-time.
- **`transact(env, proof: Proof, ext_data: ExtData, sender: Address) ->
  Result<(), Error>`** (pool.rs:535-559). THE single user entry point for
  deposit/transfer/withdraw. Calls `sender.require_auth()`. If `ext_data.ext_amount
  > 0` it pulls `ext_amount` tokens from `sender` to the contract via
  `TokenClient::transfer` (deposit leg), checking against `MaximumDepositAmount`,
  then delegates to `internal_transact`.
- **`register(env, account: Account)`** (pool.rs:674-682). Publishes a
  `PublicKeyEvent` (owner, X25519 encryption_key, BN254 note_key). Not required to
  use the pool; enables transfer discovery. `account.owner.require_auth()`.
- **`get_root()`** (pool.rs:739), **`is_known_root(root)`** (pool.rs:749),
  **`update_admin(new_admin)`** (pool.rs:762), **`update_asp_membership`** /
  **`update_asp_non_membership`** (admin-gated, pool.rs:797/815),
  **`get_asp_membership_root`** / **`get_asp_non_membership_root`** (cross-contract
  reads, pool.rs:839/857).

There are NO separate `deposit` / `withdraw` / `transfer` contract functions —
deposit/withdraw/transfer/transact are all the single `transact` entry point
differentiated by `ext_amount` sign and input/output structure. The README's
"Transaction Flow" labels (Deposit/Withdraw/Transfer/Transact, README.md:74-77) are
client-side flows, not distinct contract methods. The client always invokes the
contract function literally named `"transact"` (tx_prepare.rs:57; assert
`function_name == "transact"`, tx_prepare.rs:340).

`transact` invocation args (3 positional, tx_prepare.rs:51-59): `[proof_scval,
ext_data_scval, sender_scval]`.

### `transact` validation sequence (internal_transact, pool.rs:583-662)
1. `MerkleTreeWithHistory::is_known_root(proof.root)` else `UnknownRoot`.
2. For each `input_nullifiers`: reject if already spent (`AlreadySpentNullifier`).
3. `hash_ext_data(ext_data)` (Keccak256 of XDR, reduced mod BN254) must equal
   `proof.ext_data_hash` else `WrongExtHash` (pool.rs:130-138, 595-598).
4. `calculate_public_amount(ext_amount)` must equal `proof.public_amount`. Negative
   ext_amount → `FIELD_SIZE - |amount|` (pool.rs:346-366).
5. Pool reads `get_asp_membership_root` / `get_asp_non_membership_root` via
   cross-contract calls; `proof.asp_membership_root` and
   `proof.asp_non_membership_root` must match the current on-chain ASP roots else
   `InvalidProof` (pool.rs:607-614).
6. `verify_proof` → cross-contract `CircomGroth16VerifierClient::verify(proof,
   public_inputs)` (pool.rs:437-483).
7. Mark each nullifier spent + emit `NewNullifierEvent`.
8. If `ext_amount < 0`: `TokenClient::transfer(contract → ext_data.recipient,
   |amount|)` (withdrawal leg, pool.rs:633-637).
9. `insert_two_leaves(output_commitment0, output_commitment1)` into the commitment
   tree, then emit two `NewCommitmentEvent { commitment, index, encrypted_output }`
   (pool.rs:640-659).

Public-input ordering the verifier expects (pool.rs:446-478): `[root,
public_amount, ext_data_hash, input_nullifiers…, output_commitment0,
output_commitment1, asp_membership_root (× n_inputs), asp_non_membership_root
(× n_inputs)]`. This matches `component main {public [...]}` in
policy_tx_2_2.circom:10. Inputs are validated canonical (< BN254 modulus) before
conversion (pool.rs:401-425).

### On-chain data structures
- **`Proof`** (pool.rs:77-97): `proof: Groth16Proof`, `root: U256`,
  `input_nullifiers: Vec<U256>`, `output_commitment0/1: U256`, `public_amount:
  U256`, `ext_data_hash: BytesN<32>`, `asp_membership_root: U256`,
  `asp_non_membership_root: U256`.
- **`ExtData`** (pool.rs:104-115): `recipient: Address`, `ext_amount: I256`
  (positive=deposit, negative=withdrawal), `encrypted_output0: Bytes`,
  `encrypted_output1: Bytes`.
- **`Account`** (pool.rs:146-154): `owner: Address`, `encryption_key: Bytes`
  (X25519, 32B), `note_key: Bytes` (BN254, 32B).
- **Events** (pool.rs:200-239): `NewCommitmentEvent{commitment(topic), index,
  encrypted_output}`, `NewNullifierEvent{nullifier(topic)}`,
  `PublicKeyEvent{owner(topic), encryption_key, note_key}`.
- **DataKey** persistent storage (pool.rs:179-194): Admin, Token, Verifier,
  MaximumDepositAmount, Nullifiers (`Map<U256,bool>`), ASPMembership,
  ASPNonMembership. Max ext amount is hardcoded 2^248 (pool.rs:308-310).

### Note / UTXO data model (circuits + crypto.rs)
UTXO = `{amount, pubkey, blinding}` (transaction.circom:10-18). Hash function is
**Poseidon2 over BN254** with domain separation:
- `commitment = Poseidon2(amount, pubKey, blinding, domain=0x01)`
  (transaction.circom:60-64; crypto.rs:100-108).
- `publicKey = Poseidon2(privateKey, 0, domain=0x03)` (keypair.circom:9-20;
  crypto.rs:167-169). "Since we don't use signatures, the keypair can be based on a
  simple hash" (keypair.circom:7).
- `signature = Poseidon2(privateKey, commitment, merklePath, domain=0x04)`
  (keypair.circom:23-34; crypto.rs:111-122).
- `nullifier = Poseidon2(commitment, pathIndices, signature, domain=0x02)`
  (transaction.circom:74-79; crypto.rs:127-139). `pathIndices` = leaf_index packed
  LE into a field element (notes.rs:66-69).
- ASP membership leaf = `Poseidon2(notePubKey, membershipBlinding, domain=0x01)`
  (policyTransaction.circom:130-134; crypto.rs:154-163).
Poseidon2 params: t=2/3/4 BN256 instances from the `zkhash` crate
(crypto.rs:10-18), compression uses feed-forward (crypto.rs:68-74).

### Spend/view-key derivation (encryption.rs, signature-derived; NOT BIP-32/39)
There is no HD-wallet/mnemonic path. Both keypairs are derived deterministically
from a single Freighter `signMessage` over a fixed string:
- Constant `KEY_DERIVATION_MESSAGE = "Privacy Pool Key Derivation [v1]"`
  (encryption.rs:50). (The doc-comment diagram says "[v2]" but the actual constants
  and domain tags are `…/v1`, encryption.rs:19-25 vs 50-54 — INCONSISTENCY noted.)
- **Note (spend) private key**: `SHA-256("privacy-pool/note-key/v1" || sig)` reduced
  mod BN254 → note private key; note public key = `Poseidon2` of it
  (encryption.rs:159-175, 57-66). Used inside the circuit as `inPrivateKey`.
- **Encryption (view) key**: `SHA-256("privacy-pool/encryption-key/v1" || sig)` →
  X25519 `StaticSecret` (XSalsa20-Poly1305 / `crypto_secretbox`)
  (encryption.rs:119-140). Used to encrypt/decrypt the per-note `encrypted_output`.
- **ASP membership blinding**: `SHA-256("privacy-pool/asp-secret/v1" || sig ||
  network_context)` (encryption.rs:77-98).
Signature must be exactly 64 bytes (Ed25519). The single-signature design is an
intentional UX trade-off documented in the module header (encryption.rs:27-31).
Wallet signing is via Freighter API (`signMessage`, `signTransaction`,
`signAuthEntry`) in app/js/wallet.js:165-225. The agent/app holds no chain key; the
note/encryption keys live only in the browser (README.md:119 OPFS SQLite).

### Note discovery (notes.rs:31-84)
For each `NewCommitmentEvent`, the client tries `decrypt_output_note(enc_priv_key,
encrypted_output)`; on success recomputes the commitment from (amount, notePubKey,
blinding) and discards if it doesn't match the on-chain commitment, or if amount==0
(dummy output). It then derives the expected nullifier so it can detect spends.

### Client transaction path (Rust→WASM, NOT a TS SDK)
The "client/SDK" is a Rust workspace compiled to WASM (`app/crates`), built with
**Trunk** + Tailwind 4, with thin hand-written JS glue (`app/js/*.js`, bundled by
esbuild) — there is no TypeScript SDK package. Flow
(transact.rs, tx_prepare.rs):
1. `WebClient::execute_deposit_inner` / `execute_transact_inner` /
   `execute_spend_inner` (transact.rs:378-529) accept JS args; deposits use empty
   inputs + self note key; spends run a `tx_planner` `SpendSession` that may produce
   multiple steps.
2. `prove_transact_inner` (transact.rs:81-263) fetches on-chain state
   (`contracts_data_for_pool`: pool root + next index + ASP roots), loads local
   keys from a storage worker, fetches the ASP non-membership proof, builds witness
   inputs, and may loop while waiting for the indexer to catch up
   (`AspMembershipSync::SyncRequired`) or bail asking the user to register
   (`RegisterAtASP`).
3. Witness + proof are produced in dedicated web workers (`prover_worker.rs`,
   `storage_worker.rs`; ProverWorkerRequest/StorageWorkerRequest in protocol.rs).
4. `prepare_pool_transact` (tx_prepare.rs:25-63) encodes proof+extData+sender to
   ScVal, builds an `InvokeHostFunction` envelope for `"transact"`, then
   `simulate_transaction` via Soroban RPC.
5. `PreparedSorobanTx::from_simulation` (tx_assemble.rs:128-144) merges simulated
   resource fee + Soroban data + auth entries into the unsigned envelope (mirrors JS
   SDK `assembleTransaction`).
6. The unsigned XDR is handed back to a JS `submit_fn` callback that must return a
   Promise resolving to a tx-hash string (transact.rs:355-376). Freighter signs;
   the deposit token-`transfer` sub-invocation is authorized via the simulated auth
   entries.

### Proof generation (prover.rs, witness/lib.rs) + artifacts
- Witness: `WitnessCalculator` uses **ark-circom + wasmer** to run the compiled
  circuit `.wasm` against JSON inputs, parsing the `.r1cs` for shape, output as
  LE 32-byte-per-element witness bytes (witness/lib.rs:36-108). Negative numbers are
  mapped to `p - |n|` (witness/lib.rs:114-139).
- Prover: does NOT use ark-circom's prover (wasmer-based prover incompatible with
  browser). Instead loads a compressed **arkworks Groth16 proving key** + parses the
  `.r1cs` to replay constraints with the precomputed witness, then `ark-groth16`
  with `CircomReduction` over BN254 (prover.rs:1-11, 234-372). Proof serialized
  uncompressed to **256 bytes = A(64)||B(128)||C(64)** with Soroban G2 ordering
  c1||c0 (prover.rs:59-83, 387-424).
- Artifacts (NOT a snarkjs `.zkey`/`.wasm` pair): proving key is a `.bin`
  (`policy_tx_2_2_proving_key.bin`, 8.1 MB), VK as `policy_tx_2_2_vk.json` +
  `policy_tx_2_2_vk_soroban.bin` + `policy_tx_2_2_vk_const.rs`
  (deployments/testnet/circuit_keys/). Circuit `.r1cs` and `.wasm` are build outputs
  (`circuits/build.rs` → `target/circuits-artifacts/<profile>/`, copied into the
  bundle by the Trunk pre_build hook, Trunk.toml). The `policy_tx_2_2` keys came
  from a trusted ceremony (issue #177); `selectiveDisclosure_1` keys were locally
  generated and are off-chain only (circuit_keys/README.md).

### ASP membership contract (contracts/asp-membership/src/lib.rs)
Fixed-depth append-only Merkle tree (1..32 levels, default testnet 10). Stores
FilledSubtrees/Zeroes per level, NextIndex, Root, AdminInsertOnly (default true).
- `insert_leaf(leaf: U256)` (lines 195-252): if `AdminInsertOnly` (default) requires
  admin auth; recomputes root along the path; emits `LeafAddedEvent{leaf, index,
  root}`. `set_admin_insert_only(bool)` (admin) toggles open insertion
  (README.md:89-92 warns this disables the safeguard).
- `get_root()` returns current root (read by the pool cross-contract).
- Internal hashing uses `poseidon2_compress` (soroban-utils).

### ASP non-membership contract (contracts/asp-non-membership/src/lib.rs)
Full on-chain **Sparse Merkle Tree** (circomlibjs-compatible), nodes stored as
`DataKey::Node(hash) -> Vec<U256>` (leaf = `[1,key,value]`, internal = `[left,
right]`). Leaf hash = `Poseidon2(key, value, domain=1)`; internal =
`poseidon2_compress` (lines 142-164). Key bits split LSB→MSB (lines 180-192).
- `insert_leaf(key, value)` / `delete_leaf(key)` — admin-gated (lines 361/516).
- `find_key(key) -> FindResult{found, siblings, found_value, not_found_key,
  not_found_value, is_old0}` — used by the client to build the circuit's
  non-membership witness (lines 329-336).
- `verify_non_membership(key, siblings, not_found_key, not_found_value) -> bool`
  (lines 641-710) and `get_root()`.
The circuit consumes this via `SMTVerifier(smtLevels)` with `fnc=1` (verify
NON-inclusion) and constrains `nonMembershipProof.key === notePublicKey`
(policyTransaction.circom:148-170). It checks the note's pubkey is NOT in the
blocked SMT, and IS in the approved membership tree (membership leaf check, lines
127-145).

### State reconstruction + event-retention limitation
- Indexer (indexer.rs) pages Soroban RPC `getEvents` (PAGE_SIZE 300, max 10
  pages/round) for the pool + ASP-membership contract IDs starting from
  `min_deployment_ledger` (deployment_ledger in deployments.json, used as cold-start
  anchor, types/lib.rs:36-40). The full pool commitment tree + nullifier set + ASP
  state are reconstructed locally from `NewCommitmentEvent` / `NewNullifierEvent` /
  `LeafAddedEvent`. Storage is browser SQLite over OPFS (README.md:119).
- LIMITATION (README.md:116): "RPC nodes only store events for a small retention
  window (7 days). This means that the demo will not work for users onboarded after
  7 days of contract deployment because they couldn't re-play events history." A
  user onboarded within 7 days who keeps the tab open keeps syncing in the
  background. If the local DB is cleared, app-derived keys + notes are permanently
  lost (README.md:119).
- An RPC-gap is surfaced as `RpcError::RpcSyncGap(oldest)` (indexer.rs:42-44). The
  repo adds a **bootnode** (commit `98a2d77`, `tools/bootnode/`) and the docs site
  offers enabling a bootnode as an alternative event source, noting it "introduces
  trust assumptions about data accuracy and IP privacy" (docs site, WebFetch).

### XLM vs SAC / USDC parameterization — VERIFIED PARAMETERIZABLE
The pool is NOT hardcoded to XLM. The contract stores an arbitrary `token: Address`
at construction and does all value movement through the generic
`soroban_sdk::token::TokenClient` (pool.rs:271-303, 542-555, 628-637). Any SAC —
including USDC — works as long as its SAC contract id is passed as `--token`.
- `deploy.sh` supports three pool specs (deploy.sh:24-28, 201-235):
  `native:<TOKEN_CONTRACT_ID>`, `contract:<TOKEN_CONTRACT_ID>` (any Soroban token),
  `classic:<CODE>:<ISSUER>:<TOKEN_CONTRACT_ID>` (classic asset, e.g.
  `classic:USDC:G...:CD...`). Multiple `--pool` flags deploy multiple pools sharing
  one verifier + ASP pair. Default (no flag) = one native XLM pool
  (deploy.sh:119-123, 54).
- The frontend config models this: `AssetDescriptor` enum =
  `Native | Classic{code,issuer} | Contract{contract_id}` (tag `kind`)
  (types/lib.rs:45-58); each `PoolConfigEntry` has `poolContractId`,
  `tokenContractId`, `deploymentLedger`, `enabled`, `asset`.
- The CURRENT testnet deployment is native XLM only: deployments.json has one pool
  with `"asset":{"kind":"native"}`, `tokenContractId`
  `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`. So USDC is supported
  by the architecture but not currently deployed.

### Testnet contract addresses (deployments/testnet/deployments.json)
- network: testnet
- deployer/admin: `GDF4BXPQY5N4BEO24UIHM4NVB62MW7HDWH7SVHKLVZAMLP5IIHCFQORC`
- asp_membership: `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`
- asp_non_membership: `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`
- verifier: `CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`
- pool: `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`
- token (native XLM SAC): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- deploymentLedger: 3119336
(NOTE: the public docs site shows different truncated addresses e.g. pool
"CBYH…REPU" — that hosted demo is a DIFFERENT deployment than this repo's
deployments.json. See Unknowns.)

### Running it locally (README.md:36-68, Makefile, deploy.sh)
1. Deploy: `./deployments/scripts/deploy.sh testnet --deployer <identity>
   --asp-levels 10 --pool-levels 10 --max-deposit 1000000000 --vk-file
   deployments/testnet/circuit_keys/policy_tx_2_2_vk.json` (requires `stellar` CLI +
   a keyed identity). Or reuse the addresses already in deployments.json.
2. `make serve` → Trunk dev server at `http://localhost:8000` (Trunk.toml port 8000,
   addr 0.0.0.0). `make install` adds the `wasm32v1-none` target, installs `trunk`
   and npm deps; `make circuits-build` compiles circuits (needs the circom
   toolchain via `circuits/build.rs`).
3. Populate ASP membership keys: `stellar contract invoke --id <ASP_MEMBERSHIP> -- 
   insert_leaf --leaf <LEAF>` or via `http://localhost:8000/admin.html`. Insertion
   must be signed by the ASP admin unless AdminInsertOnly is disabled.
4. Build deps pinned: tailwindcss 4.1.18 (Trunk.toml), circuit artifacts must exist
   in `target/circuits-artifacts/<profile>/` before a Trunk build (Trunk pre_build
   hook errors otherwise).

## Inferences

(Clearly labeled; not directly asserted by a single source.)

- INFER: The "spend key" ≈ note private key (proves ownership in-circuit) and the
  "view key" ≈ X25519 encryption private key (decrypts `encrypted_output` to scan
  for incoming notes). The repo doesn't use those exact terms, but the
  decrypt-then-recompute-commitment flow (notes.rs) is functionally a view key and
  the in-circuit `inPrivateKey` is functionally a spend key.
- INFER: Because deposit + the pool's token `transfer` are both authorized through
  simulated Soroban auth entries on one `transact` invocation, a USDC pool would
  require the user to authorize a USDC SAC `transfer` — i.e. holding USDC trustline /
  SAC balance — but no pool code change. (Based on TokenClient genericity +
  auth-entry assembly; not separately tested with USDC.)
- INFER: `Map<U256,bool>` nullifier storage (pool.rs:687-697) loads/saves the whole
  map per spend; this is a likely scalability constraint at large nullifier counts.
  (Observation of the data structure, not a measured fact — and out of facts-only
  scope to evaluate further.)
- INFER: The on-chain SMT non-membership tree (asp-non-membership) stores all nodes
  on-chain; the contract's own doc-comment flags cost concerns and a possible future
  IPFS migration (lib.rs:12-23), implying current testnet blocked-lists are small.

## Unknowns And Questions

- UNKNOWN: The hosted docs-site demo uses DIFFERENT contract addresses (pool
  "CBYH…REPU", ASP membership "CCIR…QH2H", non-membership "CDI6…7Q2N") than this
  repo's `deployments/testnet/deployments.json`. Which is the canonical/live
  deployment to interact with was not determined.
- UNKNOWN: Whether any USDC (classic or SAC) pool is deployed anywhere (testnet or
  otherwise). Repo deployments.json shows only the native XLM pool; no USDC pool
  config found.
- UNKNOWN: Exact USDC SAC contract id on Stellar testnet to pass to `--pool
  classic:USDC:<ISSUER>:<SAC_ID>` — not present in the repo (would come from the
  Stellar asset/Circle, resolved via `stellar contract id asset`).
- UNKNOWN: Real on-chain proving/verification gas/resource cost and end-to-end
  proving time in-browser (no benchmarks read; would require running it).
- UNKNOWN: `encrypted_output` ciphertext wire format / exact `decrypt_output_note`
  framing (function referenced in notes.rs but its body in
  `prover/src/encryption.rs` beyond line 175 not read).
- UNKNOWN: Whether the deposit token `transfer` and `transact` share a single
  signed envelope vs two ops in practice — tx_prepare builds one `transact` invoke;
  the SAC `transfer` appears as a sub-invocation authorized by simulated auth, but
  the exact auth-entry tree was not dumped.
- INCONSISTENCY (open): module doc says key-derivation message "[v2]" and domains
  "/v2" (encryption.rs:19-25) while the live constants are "[v1]" / "/v1"
  (encryption.rs:50-54). The code uses v1.
- UNKNOWN: Bootnode trust/operation details (storage backend, who runs it) — only
  the directory `tools/bootnode/` and the docs caveat were observed, not read in
  depth.

## Not Included

- contracts/circom-groth16-verifier internals (only its client interface +
  build-with-VK flow were read).
- soroban-utils Poseidon2 implementation details and merkle_with_history.rs body
  (commitment-tree insert/history mechanics beyond the public method names used).
- tx-planner SpendSession multi-step planning algorithm internals.
- The full encryption.rs (lines >175), disclosure circuit/flow, e2e-tests, ceremony
  CLI, and the `app/js/ui/*` frontend screens.
- Any solution/design recommendations (out of scope by request).

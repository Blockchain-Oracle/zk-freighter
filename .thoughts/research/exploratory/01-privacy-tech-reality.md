# Privacy / ZK on Stellar — Reality Check (2026)

**Purpose:** Decide what a "ZK privacy wallet" browser extension can realistically ship for a Stellar hackathon. Every claim below is grounded in cloned code or official docs, with citations. No speculation.

**Repos cloned** (`/Users/abu/dev/hackathon/stellar-research/repos/`):
- `stellar-private-payments` — Nethermind's Privacy Pools PoC (THE reference). Clone OK.
- `soroban-examples` — official, contains `groth16_verifier`. Clone OK.
- `stellar-risc0-verifier` — Nethermind RISC Zero verifier stack. Clone OK.

**TL;DR verdict:** The cryptographic primitives are REAL and native (Protocol 22/25/26: BLS12-381, BN254, Poseidon2). A full working Privacy Pool (deposit/transfer/withdraw of **native XLM**) is DEPLOYED ON TESTNET today with real contract addresses. But it is an unaudited **reference PoC**, it is a **dApp driving Freighter — not a wallet**, and "private by default for everything" is **impossible** — privacy only exists for assets that have been moved *into a pool*. Arbitrary contract calls cannot be made private. The honest hackathon MVP is a **wallet UX wrapper around the existing Privacy Pools pool contract** (shielded XLM send/receive + selective-disclosure receipts). A "private cross-chain bridge" is a milestone/aspiration, not a weekend build.

---

## 1. The cryptographic foundation is native and real

Stellar added ZK primitives as **native host functions** (not contract-level libs), across three protocol upgrades:

- **BLS12-381** — CAP-0059, Protocol 22. (Stellar blog: "Announcing Protocol 22".)
- **BN254** — CAP-0074, Protocol 25 ("X-Ray"). Adds `bn254` host functions for `g1_add`, `g1_mul`, and a multi-pairing check. Per Stellar's X-Ray announcement, these give **feature parity with Ethereum's EIP-196 / EIP-197 precompiles** and make Stellar "interoperable with existing ZK tooling and libraries." (https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25)
- **Poseidon / Poseidon2** — CAP-0075 (X-Ray), exposed as core permutation primitives for ZK-friendly hashing.

Docs (https://developers.stellar.org/docs/build/apps/zk) confirm the BN254 host functions (`g1_add`, `g1_mul`, `pairing_check`) and Poseidon/Poseidon2, and state bluntly: *"these primitives are foundational building blocks and do not, on their own, provide end-to-end private payments without additional higher-level protocol or application logic."* That higher-level logic is exactly what `stellar-private-payments` implements.

**Code proof the host functions are used (not emulated):**
- `contracts/circom-groth16-verifier/src/lib.rs:99,118,119` — `let bn = env.crypto().bn254(); bn.g1_mul(...); bn.g1_add(...)`. The doc comment (line 3) says it verifies "Circom proofs on Soroban using the native BN254 precompile."
- `contracts/soroban-utils/src/poseidon2.rs:37,92` — `crypto_hazmat.poseidon2_permutation(...)` (native Poseidon2 host function for Merkle hashing).
- `contracts/types/src/lib.rs:5` — proof types built on `crypto::bn254::{Bn254G1Affine, Bn254G2Affine}`. Groth16 proof is fixed **256 bytes** (A:G1 64B || B:G2 128B || C:G1 64B — `types/src/lib.rs:59-68`).

Official `soroban-examples/groth16_verifier` is a minimal `a*b=c` Groth16 demo (Circom 2.2.1 + snarkjs artifacts, translated from the snarkjs Solidity verifier) — proves the toolchain works but is "demonstration use only, not audited" (`groth16_verifier/README`).

---

## 2. What the Privacy Pool contract actually does

The pool is a **Tornado-Nova-style shielded UTXO pool** (`circuits/src/keypair.circom:2` credits "tornadocash/tornado-nova, adapted by Nethermind"). Source: `contracts/pool/src/pool.rs`.

**One entry point does everything:** `transact(proof, ext_data, sender)` (`pool.rs:535`). There is no separate deposit/withdraw/transfer function — the *direction* is encoded by the signed `ext_amount`:
- `ext_amount > 0` → **deposit**: pulls `ext_amount` tokens from `sender` into the pool (`pool.rs:547-556`), creates output notes, spends none.
- `ext_amount < 0` → **withdraw**: transfers `|ext_amount|` to `ext_data.recipient` (`pool.rs:633-637`), spends input notes, creates none.
- `ext_amount == 0` → **transfer**: pure internal note re-shuffle, fully private.

**Mechanics (`internal_transact`, `pool.rs:583`):**
1. Pool Merkle root must be in recent history (`is_known_root`).
2. Each input nullifier must be unspent (double-spend prevention via a `Map<U256,bool>` nullifier set, `pool.rs:589-593`).
3. `keccak256(ext_data)` must equal `proof.ext_data_hash` — binds the proof to the recipient/amount (`pool.rs:130-138`, `595-598`).
4. `public_amount` must equal `ext_amount` reduced into the BN254 field (`pool.rs:600-605`).
5. The on-chain **Groth16 proof is verified** via cross-contract call to the verifier (`pool.rs:437-483`).
6. Nullifiers marked spent → `NewNullifierEvent`. Two new commitments inserted into the Merkle-tree-with-history → two `NewCommitmentEvent`s carrying `encrypted_output` blobs (`pool.rs:640-659`).

**The on-chain circuit is `policy_tx_2_2`** = **2 inputs, 2 outputs** (`deployments/testnet/circuit_keys/README.md:5`). Source `circuits/src/policyTransaction.circom`. It proves (README "Zero-Knowledge Circuits" + circuit code):
- Ownership of input UTXOs (knowledge of private keys), commitment = `Poseidon2(amount, pubKey, blinding)` (`policyTransaction.circom:85-89`).
- Correct nullifier = `Poseidon2(commitment, merklePath, signature)` (`:99-105`).
- Valid Merkle membership of inputs (`:108-119`).
- Correct output commitments + amounts fit in 248 bits (`:182-194`).
- **Balance conservation:** `sumIns + publicAmount === sumOuts` (`:210`).
- **ASP membership + non-membership** per input (`:127-170`).

---

## 3. What is hidden vs. visible on-chain

| Data | Visibility | Why |
|---|---|---|
| **Amounts of in-pool transfers** | **Hidden** | Amounts live only inside Poseidon2 commitments + ZK proof. |
| **Sender→receiver link (in-pool)** | **Hidden** | Notes are commitments; nullifiers are unlinkable to commitments. |
| **In-pool balances** | **Hidden** | Balance = set of unspent notes only the owner can decrypt. |
| **Deposit amount + depositor address** | **VISIBLE** | `transact` pulls a real `token.transfer(sender → pool)`; `ext_amount` is public in `ExtData`. |
| **Withdrawal amount + recipient address** | **VISIBLE** | `token.transfer(pool → recipient)`; `recipient` + amount in `ExtData`. |
| **The fact that an address uses the pool** | **VISIBLE** | Deposits/withdrawals are ordinary on-chain transfers to/from the pool contract. |

This matches the docs exactly (https://developers.stellar.org/docs/build/apps/privacy): *"Deposits and withdrawals into the pool are visible onchain, but transactions between parties within the pool do not need to be."* **Privacy is a property of the pool, not of the chain.** The anonymity set = everyone who has deposited and not withdrawn.

**Encrypted note delivery:** outputs carry `encrypted_output` bytes in the commitment event (`pool.rs:208`). Recipients scan events and decrypt with their X25519 key. Users optionally `register()` their public keys via `PublicKeyEvent` so others can address transfers to them (`pool.rs:664-682`) — like a privacy-pool address book.

---

## 4. How proofs are generated and verified

**Generated client-side, in-browser, in Rust/WASM — not snarkjs-in-JS.** (`app/ARCHITECTURE.md`)
- App core is Rust compiled to WASM; UI is plain JS that calls WASM exports.
- A dedicated **Prover Worker** (Web Worker) runs witness calc + arkworks Groth16 proving off the main thread (`ARCHITECTURE.md:51-54`). The on-disk testnet proving key `policy_tx_2_2_proving_key.bin` is **~8 MB** — this is downloaded/cached and run in-browser.
- A **Storage Worker** owns an OPFS-backed SQLite DB that indexes Stellar RPC events and decrypts notes (`ARCHITECTURE.md:44-49`).
- App npm deps are only `@stellar/freighter-api` + `@stellar/stellar-sdk` (`app/package.json`) — confirming proving lives in WASM, not a JS SNARK lib.

**Verified on-chain** by `CircomGroth16Verifier.verify(proof, public_inputs)` using the native BN254 host functions (§1). VK is embedded at compile time from a snarkjs `verification_key.json` via `build.rs`. The `policy_tx_2_2` keys came from a real **trusted setup ceremony** (`circuit_keys/README.md:32` → issue #177).

---

## 5. ASP membership / non-membership = compliance allow/deny

ASP = **Association Set Provider** (illicit-activity safeguard, README:19). Two separate Soroban contracts, both Poseidon2 Merkle trees:
- **ASP Membership** (`contracts/asp-membership/src/lib.rs`) — an **allowlist** Merkle tree of approved keys. `insert_leaf` is `admin_only` by default (`:195-201`); the circuit proves an input's pubkey IS in this tree (`policyTransaction.circom:127-145`).
- **ASP Non-Membership** (`contracts/asp-non-membership/`) — a **Sparse Merkle Tree denylist**; the circuit proves an input's pubkey is NOT present (`policyTransaction.circom:148-170`, SMTVerifier).

The pool enforces that the proof's ASP roots match the live ASP contract roots before accepting (`pool.rs:607-614`). Admin can toggle "admin-only insert" off to let anyone self-add in demo mode (README warns never to do this in prod). **This is the compliance dial** — a pool operator can gate who may transact without seeing amounts/links. For a hackathon you can deploy your own ASP contracts and control the lists.

---

## 6. Viewing-key concept = Selective Disclosure receipts

There is **no passive "viewing key" that auto-decrypts your whole history for an auditor.** Instead there's an **active, scoped disclosure** primitive (`docs/src/disclosure.md`, `app/disclosure.html`, `app/js/disclosure.js`):
- A separate circuit `selectiveDisclosure_1` (`circuits/src/selectiveDisclosure.circom`) proves ownership of a specific note (knowledge of its spending key + Merkle membership) **without revealing the spending key** and bound to an external context (purpose / authority / pool / nonce).
- Output is a portable JSON **DisclosureReceipt** (schema in `disclosure.md`) verified **entirely off-chain** against a pinned `vk_hash` — no contract call, no pool redeploy to rotate (`circuit_keys/README.md:16-28`). Provenance caveat: its key was locally generated (testnet/off-chain only).
- The dual-key identity model (`ARCHITECTURE.md:114-122`): from ONE Freighter signature the app derives a **BN254 note key** (ownership/commitments) + an **X25519 encryption key** (decrypt incoming notes). Keys are deterministic from the wallet signature, so they're recoverable.

So: selective disclosure = "prove to a named KYC provider that I own this note" on demand. That's the compliance/audit story, not a global viewing key.

---

## 7. Asset & deployment status

- **Asset: native XLM.** `deployments/testnet/deployments.json` → `"asset":{"kind":"native"}`. (Poseidon2 docs even note `poseidon2("XLM")` as a domain tag, `soroban-utils/poseidon2.rs:115-116`.) The pool is generic over any Soroban token (`TokenClient`), but the live deployment is XLM.
- **Live on TESTNET** with real addresses (`deployments.json`): pool `CDQRXOD6...S2PZF`, verifier `CBJFCMPU...HI7X5MSZ`, asp_membership `CBULZZIA...BTKN`, asp_non_membership `CDREZXZI...K3O3`, token native (deployed ledger 3119336).
- **Mainnet: NO.** README WARNING: *"Work in progress... reference implementation... not yet been audited and should not be used in production environments with real assets."*
- **Hard limitation — 7-day RPC event retention** (README "Limitations" + `ARCHITECTURE.md:128-137`): the app rebuilds Merkle trees + scans notes from RPC events, but RPC keeps events ~7 days. A user onboarded >7 days after deployment **cannot replay history** and the app breaks. This is a structural problem for any real wallet built directly on this PoC — you'd need your own persistent indexer.
- Storage is browser OPFS SQLite; clearing site data destroys keys + notes (README).

---

## 8. The two privacy models (and when each applies)

| | **Privacy Pools** (this repo) | **Confidential Tokens** |
|---|---|---|
| Hides | amounts + sender/receiver link + balances | amounts ONLY |
| Public | deposit/withdraw amounts+addresses; pool membership | sender + receiver addresses always public; flow of funds visible |
| Crypto | Groth16/Circom over BN254 + Poseidon2 Merkle trees | encryption-based (ElGamal/FHE-style homomorphic) |
| Compliance | ASP allow/deny + selective-disclosure receipts | issuer-level controls |
| Status on Stellar | **working testnet PoC** (Nethermind) | **early / spec-stage**; Stellar is a member of the Confidential Token Association ("hide the amount transferred between addresses while keeping the flow of funds visible") but no shipped Soroban implementation found |
| Use when | you need unlinkability (e.g. payroll, donations) | counterparties are known, only the amount must be secret (e.g. enterprise settlement) |

Confidential Tokens (https://confidentialtoken.org): Stellar is listed as a member org; the framework "hides the amount transferred between addresses while keeping the flow of funds visible." Per the privacy docs, the "Confidential Token Association implementation remains in progress" — i.e. **not a buildable primitive for a hackathon yet.** Web search found no shipped Stellar ElGamal/confidential-token testnet code as of 2026. **For this hackathon, Privacy Pools is the only real, working model.**

---

## 9. THE key question: can a Stellar wallet be "private by default"?

**Honest answer: NO — not for arbitrary activity. Yes — but only for value moved into a privacy pool.**

- **Possible:** Shielded transfers of XLM (or any token with a deployed pool) *between users who have both deposited.* In-pool sends hide amount + link + balance. This is genuinely private.
- **Possible-but-leaky at the edges:** Deposits and withdrawals are public XLM transfers to/from the pool. A "private by default" wallet still leaks "address X put N XLM into the privacy pool at time T." Privacy comes from the anonymity set + time gap between deposit and withdraw, not from hiding the deposit itself.
- **Impossible:** Making *arbitrary* Soroban contract calls private (swaps on a public DEX, NFT mints, governance votes, paying a non-pool address). The classic-Stellar payment operation, trustlines, and ordinary contract invocations are all transparent by protocol. ZK host functions verify proofs; they do **not** encrypt the ledger. There is no "send any transaction shielded" switch.
- **Also impossible today:** private-by-default for a *brand-new user* — they must first do a *public* deposit to get funds into the pool. First touch is always visible.

So a wallet can offer **"private send" as a mode** for pooled assets, and can default the *send* action to shielded *once funds are in the pool* — but it cannot make the whole wallet private.

---

## 10. Cross-chain private bridge — feasible for a hackathon?

**Verdict: realistic as a narrow demo / milestone, NOT as a robust product in weeks.**

The enabling fact is real and strong: Stellar's BN254 host functions are at **EIP-196/197 parity** (X-Ray/CAP-0074). A 256-byte Groth16-over-BN254 proof verifies *identically* on Ethereum and Stellar — same curve, same pairing equation. So **an Ethereum-origin proof can be verified on Stellar with no re-proving**, and vice versa. The `stellar-risc0-verifier` repo reinforces this: it ports risc0-ethereum's verifier architecture (TimelockController → VerifierRouter → EmergencyStop → **Groth16Verifier over BN254**) to Soroban — i.e. RISC Zero proofs generated for the Ethereum ecosystem can be checked on Stellar.

**What's genuinely buildable:** a contract on Stellar that verifies a proof produced elsewhere (Ethereum/RISC0) — "prove on chain A, verify on chain B." That's a compelling demo of interoperability.

**Why a *private bridge* is a milestone, not a weekend build:**
1. Proof portability ≠ a bridge. A bridge needs cross-chain message passing / light-client / relayer / lock-mint custody — none of which the ZK primitives provide. You'd be building the hard 90% (custody, liveness, relayers, replay protection) on top of the easy 10% (proof verification).
2. A *private* bridge means reconciling two different shielded-pool state models (e.g. Stellar Privacy Pool ↔ an Ethereum privacy pool) so a note burned on one side mints on the other without linking — a research-grade problem; this repo doesn't do it.
3. Even single-chain Privacy Pools here is an unaudited PoC with a 7-day-retention wall. Adding cross-chain on top in weeks is unrealistic for anything beyond a scripted happy-path demo.

**If the hackathon demands a "bridge" angle:** scope it to *cross-chain proof verification* — generate a Groth16/BN254 (or RISC0) proof off Ethereum tooling, verify it inside a Soroban contract, and show "an Ethereum proof accepted on Stellar." That's honest, demoable, and rides the real parity primitive. Call full asset bridging a roadmap item.

---

## 11. Recommended hackathon MVP (single most buildable)

**Build a wallet/dApp UX layer over the existing, deployed Privacy Pools pool contract — "shielded XLM by default" + compliance disclosure.**

Concretely, in priority order:
1. **Connect Freighter** and derive privacy keys from one signature (reuse the model in `app/js/wallet.js` `deriveKeysFromWallet`). NOTE: this is a **dApp driving Freighter**, not a new key-holding extension — that's the realistic shape; building a full keystore extension AND ZK in weeks is not.
2. **Deposit (shield)** XLM → pool, **shielded send** to a registered recipient (amount + link hidden), **withdraw (unshield)** to any address. The pool, verifier, and ASP contracts already exist on testnet (§7) — you can point at them or redeploy your own with your own ASP lists.
3. **Selective-disclosure receipts** as the headline differentiator: one-click "prove I own this note to KYC provider X" → portable JSON, verified offline (§6). This is the compliance story judges like and it's already a working circuit.
4. Run the **WASM prover in a Web Worker** (don't reinvent — the arkworks/Circom path is proven here).

**Differentiators you could add on top** (pick ONE, scoped tight): a cleaner browser-extension UX; a persistent indexer to beat the 7-day retention wall (real product gap); deploy a pool for a non-native Soroban token; or a *cross-chain proof-verification* demo (§10) as a "look, an Ethereum proof verifies here" flourish.

**Brutal-honesty gaps to plan around:**
- 7-day RPC event retention WILL break a naive build — budget for your own indexer or accept a demo-only window.
- Unaudited, testnet-only, native-XLM-only in practice.
- "Private by default" is a marketing overclaim: only pooled value is private; deposits/withdrawals and all non-pool activity are public. Frame the product as "shielded transfers," not "a private chain."
- It's a dApp+Freighter pattern, not a from-scratch private wallet extension. Don't promise a novel keystore.

---

## Source index

**Cloned code (absolute paths):**
- `/Users/abu/dev/hackathon/stellar-research/repos/stellar-private-payments/README.md`
- `.../contracts/pool/src/pool.rs` (transact flow, hidden/visible split)
- `.../contracts/types/src/lib.rs` (Groth16 proof types, 256-byte proof)
- `.../contracts/circom-groth16-verifier/src/lib.rs` (native `env.crypto().bn254()`)
- `.../contracts/soroban-utils/src/poseidon2.rs` (native `poseidon2_permutation`)
- `.../contracts/asp-membership/src/lib.rs` + `.../asp-non-membership/` (compliance trees)
- `.../circuits/src/policyTransaction.circom` (on-chain 2-in/2-out circuit)
- `.../circuits/src/selectiveDisclosure.circom` + `.../docs/src/disclosure.md` (viewing-key analog)
- `.../circuits/src/keypair.circom` (tornado-nova lineage)
- `.../deployments/testnet/deployments.json` (live testnet addresses, asset=native XLM)
- `.../deployments/testnet/circuit_keys/README.md` (policy_tx_2_2 = 2in2out, trusted setup)
- `.../app/ARCHITECTURE.md` + `.../app/js/wallet.js` + `.../app/package.json` (WASM prover, Freighter dApp)
- `/Users/abu/.../repos/soroban-examples/groth16_verifier/README` (official Groth16 demo)
- `/Users/abu/.../repos/stellar-risc0-verifier/README.md` (RISC0 verifier port, BN254 Groth16)

**Docs / web:**
- https://developers.stellar.org/docs/build/apps/privacy (two privacy models; deposits/withdrawals visible)
- https://developers.stellar.org/docs/build/apps/zk (BN254 `g1_add`/`g1_mul`/`pairing_check`, Poseidon2; "not end-to-end private on their own")
- https://nethermindeth.github.io/stellar-private-payments/ (testnet, XLM, dual-key model, transact UI)
- https://confidentialtoken.org (Stellar is a member; amounts hidden, flow visible; in progress)
- https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25 (CAP-0074 BN254 = EIP-196/197 parity)
- https://stellar.org/blog/developers/announcing-protocol-22 (BLS12-381 / CAP-0059)
- https://eips.ethereum.org/EIPS/eip-196 , https://eips.ethereum.org/EIPS/eip-197 (the precompiles Stellar mirrors)

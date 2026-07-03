# Confidential Token circuits (Noir / UltraHonk)

This folder holds the zero-knowledge circuits behind ZK Freighter's **Confidential
Token** mode — the second of the wallet's two privacy stacks. They are written in
[Noir](https://noir-lang.org), proved with Barretenberg's **UltraHonk** backend
(`bb.js`), and verified on-chain by a Soroban UltraHonk verifier. Balances live as
homomorphic **Pedersen commitments on the Grumpkin curve**; amounts are never
revealed, and every spend is authorised by a proof rather than a plaintext balance.

> **Two stacks, don't confuse them.** The wallet's flagship **Shielded Pools** mode
> (shielded XLM/USDC, note commitments + nullifiers, testnet **and** mainnet) uses a
> completely separate **Circom / Groth16** engine that is *not* in this folder — it is
> vendored from Nethermind and lives in the apps' `public/circuits/` as
> `policy_tx_2_2.*`. This folder is *only* the Noir Confidential Token mode
> (**testnet-only preview**). See [`docs/architecture`](../apps/docs/content/docs/architecture)
> for how the two compare.

> **Attribution.** These circuits are **vendored** from the OpenZeppelin / Stellar
> Development Foundation Confidential Tokens preview (`OpenZeppelin/stellar-contracts`,
> branch `feat/confidential-verifier-ultrahonk`, studied at commit `539968f`). We do not
> claim authorship of the circuits. ZK Freighter's own work is the wallet-side runtime,
> key model, and the build/provenance integration — see [`ATTRIBUTION.md`](./ATTRIBUTION.md).

---

## Toolchain (pinned)

The verification keys are a byte-for-byte reproducibility contract with the on-chain
verifier, so the toolchain is pinned exactly:

| Tool | Version |
|:--|:--|
| `nargo` (Noir) | `1.0.0-beta.11` |
| `bb` (Barretenberg) | `0.87.0` |

Both are pinned in [`.github/workflows/noir.yml`](../.github/workflows). CI recompiles
every circuit and diffs the regenerated VKs against the committed ones; any drift fails
the build.

## Layout

| Path | What it is |
|:--|:--|
| [`lib/`](./lib/src/lib.nr) | `stellar_confidential_lib` — every shared primitive (generators, Poseidon2 funnel, commitments, ECDH, key derivation, encrypted scalars). Circuits never hash raw. |
| [`register/`](./register/src/main.nr) | Bind a spending key + viewing key to an account. |
| [`withdraw/`](./withdraw/src/main.nr) | Confidential balance → public tokens (a public boundary). |
| [`transfer/`](./transfer/src/main.nr) | Confidential → confidential payment between two registered accounts. |
| [`set_spender/`](./set_spender/src/main.nr) | Escrow part of your balance into a per-spender allowance. |
| [`spender_transfer/`](./spender_transfer/src/main.nr) | A delegated spender moves an owner's allowance. |
| [`revoke_spender/`](./revoke_spender/src/main.nr) | Fold an outstanding allowance back into spendable balance. |
| [`gadgets/`](./gadgets) | Thin single-primitive circuits used only for `nargo info` constraint-costing. |
| [`vks/`](./vks/README.md) | Committed verification keys, two formats per circuit (`.vk.json` diffed by CI, `.vk.bin` consumed on-chain). |
| [`scripts/`](./scripts) | `extract_vks.sh` / `build_vk_bins.sh` — regenerate the VKs. |
| `target/` | Compiled ACIR JSON (`nargo compile` output, gitignored). Three of these ship to the apps as `public/circuits/circuit_{register,transfer,withdraw}.json`. |

---

## The cryptographic model

### Grumpkin over BN254 — why this is cheap in-circuit

Noir on the Barretenberg backend computes natively over the **BN254 scalar field**
`F_r` (Noir's `Field` type *is* `F_r`). **Grumpkin** is the curve whose *base field*
equals BN254's *scalar field*, so a Grumpkin point's coordinates are already `F_r`
elements. Point arithmetic is therefore native field arithmetic — no expensive
non-native emulation — which is what makes Pedersen commitments and ECDH affordable
inside a proof. Grumpkin's equation is `y² = x³ − 17` ([`lib.nr:12-28`](./lib/src/lib.nr#L12-L28)).

### Balances are Pedersen commitments

A balance is never stored in the clear. It is a commitment

```
C = v·G + r·H
```

where `v` is the amount, `r` is a blinding scalar, and `G`, `H` are Barretenberg's
standard Pedersen generators (indices 0/1 of `DEFAULT_DOMAIN_SEPARATOR`, hardcoded and
reproducible via the `print_generators` test — no off-chain trust)
([`commit`, `lib.nr:144-149`](./lib/src/lib.nr#L144-L149)). Commitments are
**homomorphic**: the Soroban contract adds `amount·G` on deposit and point-adds
commitments on transfer/merge, so balances update on-chain without ever opening them.

### One Poseidon2 funnel, domain-separated

Every hash in the system goes through a single entry point,
[`poseidon_with_domain(d, inputs)`](./lib/src/lib.nr#L210-L217), which always absorbs a
**domain tag** `d` as the first element. Hashing raw is a library-contract violation.
The tag values are the cross-language contract — the circuit, the TypeScript SDK, and
the Soroban contract must all use the identical numbers:

| Tag | Value | Used for |
|:--|:--|:--|
| `ADDRESS` | 1 | `addr_f = Poseidon2(ADDRESS, lo, hi)` — compresses a Soroban address to one field, binding proofs to one contract |
| `VIEWING_KEY` | 2 | `vk = Poseidon2(VK, sk, addr_f)` |
| `DELEGATION_VIEWING_KEY` | 3 | `dvk_i = Poseidon2(DVK, vk, op_i)` |
| `SPEND_RANDOMNESS` | 4 | `r' = Poseidon2(·, vk, sigma)` — new-balance blinding |
| `TX_BLINDING` | 5 | `r_tx` — anti-poisoning transfer blinding |
| `TX_AMOUNT` | 6 | encrypted transfer amount mask |
| `ENCRYPTED_BALANCE` | 7 | encrypted balance scalar mask |
| `ENCRYPTED_ALLOWANCE` | 8 | encrypted allowance scalar mask |
| `ALLOWANCE_RANDOMNESS` | 9 | allowance-commitment blinding |
| `ESCROWED_DELEGATION_VIEWING_KEY` | 10 | spender dvk escrow mask |
| `AUDITOR_SENDER` | 11 | sender/owner auditor channel |
| `AUDITOR_RECIPIENT` | 12 | recipient auditor channel |

Full definitions with per-tag notes: [`lib.nr:72-139`](./lib/src/lib.nr#L72-L139).

### Key hierarchy

| Key | Derivation | Role |
|:--|:--|:--|
| `sk` | seed-derived scalar (mod Grumpkin order) | spending secret — never leaves the device |
| `Y = sk·H` | [`scalar_mul`](./lib/src/lib.nr#L153-L155) | public spending key, stored on-chain |
| `vk = Poseidon2(VK, sk, addr_f)` | [`vk_from_sk`](./lib/src/lib.nr#L227-L229) | viewing key, **bound to a specific contract** via `addr_f` |
| `PVK = vk·H` | [`pvk_from_vk`](./lib/src/lib.nr#L233-L235) | public viewing key — the recipient's long-term ECDH key |
| `dvk_i = Poseidon2(DVK, vk, op_i)` | [`dvk_from_vk_op`](./lib/src/lib.nr#L238-L240) | per-spender delegation viewing key |

`addr_f` binding is the anti-replay backbone: because `vk` (and everything derived from
it) folds in the contract address, a proof made for one deployed contract cannot verify
against another's verifier.

### Encrypted scalars & the dual auditor channel

Amounts/balances travel as **additive Poseidon2 masks** — an ElGamal-style symmetric
masking over `F_r`, decryptable by the keyholder via subtraction (e.g.
`v_tilde = v_tx + Poseidon2(TX_AMOUNT, s, sigma)`,
[`encrypt_amount`](./lib/src/lib.nr#L264-L266)). Every confidential operation also
emits an **auditor** ciphertext: the prover does an ECDH against the registered auditor
key `K_aud` and squeezes masks so a designated auditor — and only the auditor — can
recover amounts and balances. `transfer` and `spender_transfer` carry **two** channels
(recipient + sender) via the two-squeeze
[`sponge_squeeze_2`](./lib/src/lib.nr#L299-L303); the auditor key is resolved from an
on-chain auditor registry.

### Range checks are load-bearing

Values are constrained to `[0, 2^127)` — the SEP-41 `i128` non-negative range. This is
what keeps confidential arithmetic from wrapping the field. In `revoke_spender` the
**sum** check `v_s + v_a < 2^127` is the single line preventing an owner from "minting"
via field overflow when folding an allowance back in.

---

## Shared library primitives

Every circuit is a thin composition of these ([`lib/src/lib.nr`](./lib/src/lib.nr)):

| Primitive | Signature | Line |
|:--|:--|:--|
| `commit` | `(v, r) → v·G + r·H` | [144](./lib/src/lib.nr#L144-L149) |
| `scalar_mul` | `(s, P) → s·P` | [153](./lib/src/lib.nr#L153-L155) |
| `ecdh` | `(s, P) → (s·P).x` | [163](./lib/src/lib.nr#L163-L165) |
| `assert_on_curve_non_identity` | asserts `P` on Grumpkin ∧ `P ≠ O` | [172](./lib/src/lib.nr#L172-L175) |
| `poseidon_with_domain` | domain-tagged Poseidon2 sponge (the only hash entry point) | [210](./lib/src/lib.nr#L210-L217) |
| `vk_from_sk` / `pvk_from_vk` / `dvk_from_vk_op` | key derivations | [227](./lib/src/lib.nr#L227-L240) |
| `derive_spend_r` / `derive_allow_r` / `derive_tx_blind` | deterministic blindings | [244](./lib/src/lib.nr#L244-L258) |
| `encrypt_amount` / `encrypt_balance` / `encrypt_allowance` / `encrypt_esc_dvk` | additive masks | [264](./lib/src/lib.nr#L264-L284) |
| `sponge_squeeze_2` / `encrypt_auditor_sender_balance` | auditor-channel sponges | [299](./lib/src/lib.nr#L299-L315) |

Why `assert_on_curve_non_identity` matters: points that are **outputs of in-circuit
`multi_scalar_mul`** are on-curve by construction and need no check, but **public-input
keys** (`K_aud_*`) are attacker-suppliable — an off-curve or identity key would collapse
the ECDH shared secret and break auditor-channel soundness, so each circuit validates
those explicitly before use.

---

## The six circuits

Each circuit's own `main.nr` carries a full constraint table (labelled `R1…`, `T1…`,
etc.), the exact public-input layout, and the private witness list. The summaries below
point you at them.

### `register` — bind keys to an account
Proves you know the `sk` behind a published spending key `Y` and matching viewing key
`PVK`, all bound to this contract. **5 public inputs** (`Y`, `PVK`, `addr_f`), **1
private** (`sk`). Constraints R1–R5: `Y = sk·H`, `vk = Poseidon2(VK, sk, addr_f)`,
`PVK = vk·H`, plus `sk ≠ 0` and `vk ≠ 0` (rule out the identity, which would collapse
every incoming transfer's ECDH). [`register/src/main.nr`](./register/src/main.nr)

### `withdraw` — confidential → public (unshield)
Opens your current spendable commitment, checks the range, produces a new commitment for
`(v − a)`, and emits the sender-auditor checkpoint — then the contract pays out `a` real
tokens (a public boundary). **15 public inputs**, **4 private** (`sk, v, r, r_e`). Key
constraints: W3 opens `C_spend = v·G + r·H`; W4 ranges `v, a, v−a ∈ [0, 2^127)`; W6 the
new balance commitment; W_a1–W_a4 the single-squeeze auditor block. Validates the
public-input auditor key on-curve. [`withdraw/src/main.nr`](./withdraw/src/main.nr)

### `transfer` — confidential → confidential
The core private payment. Proves sender ownership and balance conservation, derives the
recipient ECDH secret `S = r_e·PVK_B`, builds the transfer commitment `C_tx`, and emits
a **dual auditor block** (recipient channel `r_e·K_aud_r` + sender channel `r_e·K_aud_s`,
each two masks). **24 public inputs**, **5 private** (`sk, v, r, v_tx, r_e`). `r_e ≠ 0`
is checked first so no scalar-mul can silently produce the identity. Both auditor keys
are validated on-curve + non-identity. [`transfer/src/main.nr`](./transfer/src/main.nr)

### `set_spender` — create a delegated allowance
Owner splits their balance: `(v − v_a)` stays spendable, `v_a` becomes a per-spender
allowance commitment `C_a`, and the delegation key `dvk_i` is **escrowed to the spender**
via an ECDH against the spender's `Y_op` (S12; the escrow reuses the auditor ephemeral
`R_e`). **24 public inputs**, **5 private** (`sk, v, r, v_a, r_e`). Two-squeeze
owner-auditor block. [`set_spender/src/main.nr`](./set_spender/src/main.nr)

### `spender_transfer` — spend someone else's allowance
A delegated spender moves an owner's escrowed allowance to a recipient. Notably it does
**not** constrain the owner's `vk` (the spender has no `sk`); contract-binding is
inherited through the allowance chain — O3 checks the claimed `dvk_i` against the
on-chain `C_a` via `sigma_a`. Includes salt rotation (`sigma_a' ≠ sigma_a`) and a new
allowance commitment `C_a'`. **24 public inputs**, **6 private**
(`sk_op, dvk_i, v_a, r_a, v_tx, r_e`). The sender auditor channel points at the funds'
**owner**, not the spender. [`spender_transfer/src/main.nr`](./spender_transfer/src/main.nr)

### `revoke_spender` — reclaim an allowance
Folds an outstanding allowance back into spendable balance. Opens the on-chain `C_a` via
the derived `r_a`, opens the current spendable commitment, and proves the new
`C_spend' = (v_s + v_a)·G + r'·H`. **19 public inputs**, **6 private**
(`sk, v_a, r_a, v_s, r_s, r_e`). The soundness-critical line is V9's sum range check
`v_s + v_a < 2^127`. Two-squeeze owner-auditor block.
[`revoke_spender/src/main.nr`](./revoke_spender/src/main.nr)

### Gadgets

`gadgets/*` are one-primitive `bin` wrappers (`commit`, `ecdh`, `encrypt_amount`,
`poseidon_with_domain`, `sponge_squeeze_2`, `vk_from_sk`, `assert_on_curve`). They exist
purely so `nargo info` can report each primitive's standalone constraint cost against
[`constraints.baseline`](./constraints.baseline); they are not proved at runtime.

---

## Verification keys

Two committed files per circuit in [`vks/`](./vks/README.md):

- **`<name>.vk.json`** — a JSON array of hex `Fr` elements from
  `bb write_vk --output_format fields`. Review-friendly and the form **CI diffs**
  (chosen over raw bytes because bb's byte header is platform-dependent and would break
  macOS-vs-Linux reproducibility).
- **`<name>.vk.bin`** — the 1760-byte packed key the on-chain verifier actually parses
  (`ultrahonk-soroban-verifier::load_vk_from_bytes`): a 32-byte header + 27 G1
  commitments. Its point section is byte-identical to the `.vk.json`, so the CI diff of
  the JSON transitively guards the binary.

Full spec: [`vks/README.md`](./vks/README.md).

---

## Build & verify

```bash
# Compile all circuits + gadgets to target/*.json (ACIR)
nargo compile

# Run the in-circuit unit tests (satisfiable + negative cases)
nargo test

# Report constraint counts per gadget (compare against constraints.baseline)
nargo info

# Regenerate verification keys — run BOTH and commit together when a circuit changes
./scripts/extract_vks.sh     # → vks/*.vk.json  (CI-diffed)
./scripts/build_vk_bins.sh   # → vks/*.vk.bin   (on-chain form)
```

CI (`.github/workflows/noir.yml`) recompiles with the pinned toolchain and diffs the
regenerated `.vk.json` against `vks/`. If the diff is **intentional** (you changed a
circuit), regenerate and commit both formats in the same PR. If it is **unintentional**
(e.g. a toolchain bump), do not regenerate — find the cause first.

## How the wallet uses these

The TypeScript runtime that builds witnesses, generates UltraHonk proofs (with the
**keccak** Fiat–Shamir transcript required by the on-chain verifier), and encodes
public-input blobs lives in
[`packages/core/src/confidential/`](../packages/core/src/confidential). The Soroban
contract that verifies the proofs and stores the commitments is
[`contracts/confidential-token/`](../contracts). For the full end-to-end walkthrough —
register → deposit → transfer → withdraw — see the confidential-token page in
[`docs/architecture`](../apps/docs/content/docs/architecture).

## Status & caveats

- **Testnet-only preview.** The UltraHonk Soroban verifier is an unaudited developer
  preview; Confidential Token mode is deliberately never enabled on mainnet.
- Only **three** circuits (`register`, `transfer`, `withdraw`) are wired into the apps
  today; `set_spender`, `spender_transfer`, and `revoke_spender` are circuit-complete
  with committed VKs but not yet exposed in the wallet UI.
- Known accepted limitations are annotated in-source (e.g. the `2^-127`-per-merge
  randomness-collision note on `r_s` in `revoke_spender`).
- This is early, unaudited software. Do not use it to protect real value.

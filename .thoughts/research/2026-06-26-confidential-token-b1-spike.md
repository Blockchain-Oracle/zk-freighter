# B1 Reality Spike — Confidential Token browser proving (RESULTS)

Date: 2026-06-26. Hard gate from the Track B plan ("resolves the one true unknown; if it fails, reassess the whole track"). Facts only.

## Toolchain installed (pinned, SHA256-verified installers)
- `nargo 1.0.0-beta.11` (noirc `fd3925a…`) via noirup pinned commit `c3bc9922…` → `~/.nargo/bin/nargo`.
- `bb 0.87.0` (Barretenberg) via bbup pinned commit `073ea66a…` → `~/.bb/bb`.
- Versions pinned in the reference repo's `.github/workflows/noir.yml` (`NARGO_VERSION=1.0.0-beta.11`, `BB_VERSION=0.87.0`). Reference: `reference/openzeppelin-stellar-contracts-confidential` @ `539968f`.
- Platform: macOS arm64. `sha256sum` → `shasum -a 256 -c -` substitution; both installers verified OK.

## Results

### 1. VK provenance — PASS (byte-identical)
- `nargo compile --package circuit_transfer` → `target/circuit_transfer.json`.
- `bb write_vk -s ultra_honk -b … --output_format fields` → `vk_fields.json`.
- `diff` vs committed `circuits/vks/transfer.vk.json` → **byte-identical** (112 field elements, 7729 bytes).
- Per `vks/README.md`, the committed `.vk.json` point section is byte-identical to the on-chain `.vk.bin` (1760 B, consumed by `ultrahonk-soroban-verifier::load_vk_from_bytes`). ⇒ **our regenerated VK == the on-chain VK.**

### 2. Real transfer circuit valid — PASS
- `nargo test --package circuit_transfer` → **28/28 tests pass**, incl. all tampered-input rejection tests (tampered v_tilde / c_spend_new / auditor ciphertexts, under-funded, out-of-range, wrong sk / addr_f / r_e / recipient PVK / auditor keys). The real confidential-transfer circuit compiles and is satisfiable under the pinned toolchain.

### 3. Browser proving path — PASS (the resolved unknown)
- `@aztec/bb.js@0.87.0` + `@noir-lang/noir_js@1.0.0-beta.11` (matched to CLI), Node ESM spike (`/tmp/zkf-b1-spike`).
- `noir_js` `execute()` → witness; `bb.js` `UltraHonkBackend.generateProof()` → 14592-byte proof (same size as the CLI `bb prove` proof); `verifyProof()` → **true**.
- `bb.js getVerificationKey()` (1764 B) **byte-identical** to `bb`-CLI `write_vk` output (1764 B). ⇒ **bb.js VK == CLI VK == on-chain VK.**
- CLI baseline independently: `bb prove` + `bb verify` → "Proof verified successfully".

## Verdict
The architecture-blocking unknown (does *our* browser path prove/verify against the on-chain VK, and must bb.js match bb's version) is **RESOLVED**: `@noir-lang/noir_js` + `@aztec/bb.js@0.87.0` produce UltraHonk proofs whose VK is byte-identical to the on-chain verifier's key. **Track B is viable; no reassessment.**

## Still open (implementation-phase, NOT track-blocking)
- **Literal on-chain `verify_proof`** acceptance: needs the `ConfidentialVerifierContract` (`ultrahonk-soroban-verifier` rev `661db07`) deployed to testnet, the `.vk.bin` registered, and a real proof submitted. De-risked by the byte-identical VK + standard UltraHonk proof, but not yet executed (needs the soroban/Rust build + a funded testnet account → Abu).
- **Real transfer proof** end-to-end needs a real Grumpkin witness (key model + openings) — the transfer circuit has no `Prover.toml`; inputs come from `tests.nr`. This is the implementation key-model work (B-P), not a spike blocker.
- `@noble/curves` Grumpkin coverage, indexer scope, clawback — per the deep research, resolved during B-P/implementation.

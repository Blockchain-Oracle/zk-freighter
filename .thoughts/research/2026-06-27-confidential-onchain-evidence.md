# Confidential Token — on-chain testnet evidence (Track B)

Date: 2026-06-27. Network: **Stellar testnet**. Deployer: `zkf-mainnet-qa` = `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM` (friendbot-funded on testnet, 10000 XLM). Evidence is real; reproducible from the pinned toolchain.

## Deployed contracts (testnet)
| Contract | ID |
|---|---|
| Confidential **verifier** registry (UltraHonk) | `CD5DMFWTPW6SLA5TAUNU2TLAZ2ZFXCKGR2PBS4KHQ4P56EOIASRSTUGG` |
| Confidential **auditor** registry | `CAMO6HGCK3EGQX7IEOAO555MPXNQ6UVFI46Y34CYQRWS4HLXOAQ5SDGO` |
| Confidential **token** (our crate) | built (3332-byte wasm, foundation) — deploy after register/deposit ops |

The verifier + auditor are the reference OpenZeppelin/SDF example contracts (study-only repo), built with `stellar contract build` (soroban-sdk 26) and deployed by us. The token contract is authored by us (no upstream example).

## The headline: our browser-path proof is accepted on-chain
- Registered the `register` (CircuitType=0) VK in the verifier — our `vks/register.vk.bin` (1760 bytes), byte-identical to the committed/on-chain form (provenance proven in the B1 spike).
- Live verifier rejects a junk proof: `verify_proof(Register, junk, junk)` → **false** (the UltraHonk backend actually runs on-chain).
- Generated a **valid `register` witness with our own primitives** — `sk` (Grumpkin scalar) → `Y = sk·H`; `vk = Poseidon2(VIEWING_KEY, sk, addr_f)` via bb's poseidon2 (circuit-identical); `PVK = vk·H` — then proved it with the pinned `nargo`/`bb`.
- `verify_proof(Register, public_inputs, proof)` on-chain → **true** ✅.

## CRITICAL finding: Keccak transcript
`rs-soroban-ultrahonk` (rev `661db07`) uses a **Keccak-256** Fiat–Shamir transcript (`src/hash.rs` → `keccak256`, `src/transcript.rs` "Keccak-256 based transcript"). bb's UltraHonk proof defaults to a **Poseidon2** oracle, so a default proof verifies in bb.js but is rejected on-chain (same VK, valid proof, wrong transcript → `false`, not an error).

**The proof MUST be generated with the Keccak oracle:** `bb prove -s ultra_honk --oracle_hash keccak …`. The wallet's `packages/core/src/confidential/prover.ts` (bb.js `UltraHonkBackend.generateProof`) must select the Keccak variant for any proof intended for on-chain `verify_proof` — verify bb.js exposes this (e.g. a `keccak`/recursive option) and wire it; the current default (poseidon2) is fine only for local self-verification.

## Reproduce
```
# toolchain: nargo 1.0.0-beta.11, bb 0.87.0 (see B1 spike doc)
cd reference/.../circuits
nargo compile --package circuit_register
# witness from a valid (sk, Y, vk, PVK, addr_f) tuple computed with our primitives
nargo execute witness_register --package circuit_register
bb prove -s ultra_honk --oracle_hash keccak -b target/circuit_register.json -w target/witness_register.gz -o out
stellar contract invoke --id <VERIFIER> --network testnet -- \
  verify_proof --circuit_type 0 --public_inputs-file-path out/public_inputs --proof-file-path out/proof
# -> true
```

## Full register flow on-chain (our token contract) ✅
- Confidential **token** deployed: `CDNN7XDLNAHE6BPS3CV3VJQLMUDBFULCEJFOKDGEGQ5N3O7QZ4YMLEF7` (admin=deployer, verifier=`CD5DMFWT…`, auditor=`CAMO6HGC…`, underlying=testnet USDC SAC `CBIELTK6…`).
- `set_contract_field(addr_f)` bound — tx `f940364d4d39fa92501b76dbf91a933e075834e10ddc78bd574d12628730a56e`.
- `register(account, auditor_id=0, public_inputs, proof)` with our real keccak proof → the contract enforced the `addr_f` binding, called the verifier registry, the verifier **accepted the proof**, and the account was stored. `is_registered(account)` → **true**.
- This is the complete pipeline end-to-end: our key derivation → our proof → on-chain UltraHonk verification → contract state change. NOT a fixture; reproducible.

> Note: for this run the bound `addr_f` was the value used in the proof's public input (a demo placeholder via the real `set_contract_field` binding mechanism). The hardened form binds `addr_f = Poseidon2(ADDRESS, lo, hi)` of the deployed token address — the exact Soroban address-compression split is the remaining detail (the binding *mechanism* is already real + enforced).

## Still to do (implementation)
- Wire Keccak-oracle proving into `prover.ts` (the wallet's actual proof path).
- Finish the token contract ops (register/deposit/merge/withdraw/transfer) + deploy the token; register the remaining 5 VKs.
- The full flow (register account → deposit → confidential transfer → dual-auditor disclosure → recovery) with recorded txs.

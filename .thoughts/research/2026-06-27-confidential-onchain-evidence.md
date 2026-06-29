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

---

## 2026-06-29 — Hardened redeploy + in-app register (ready start)

Network: **Stellar testnet**. Deployer: `zkf-mainnet-qa` = `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.

The earlier `CDNN7XDL…` token bound a *demo-placeholder* `addr_f`. Redeployed the
**hardened** contract (adds withdraw/transfer/TTL-extension/single-shot addr_f)
and bound a properly-derived `addr_f`:

- Hardened **token**: `CDKQ7UR75QR7PEKBBPX7DYZAERK5N2OHRTASH7KETNKO43BKQDJ6QONL`
  (admin=deployer, verifier=`CD5DMFWT…`, auditor=`CAMO6HGC…`, underlying=USDC SAC `CBIELTK6…`).
  - upload tx `85d1e77148ff01a4c56b7b918dadfa688af887f5546ab8a242b29c5135ed4ab6`
  - deploy tx `148c7ff416f4e6411d7aa1e9e93775de7d8c300719fb77ce3ae966006f23bc98`
- `addr_f = addressToField(tokenId)` = `1d5fbd32cfcbc206121fda68f64527a8b8626d83ddbbcd623903a8c0b0743234`
  computed by `@zk-fighter/core` (`Poseidon2(ADDRESS, lo, hi)` over the strkey's
  two 28-byte LE limbs), bound via `set_contract_field` — tx
  `bd3b8f5dc3f7d5965118b1bfa317ebe3b0f6a30238a586d278cdb8783d4cacf6`.
  Self-consistent: the same JS fn computes both the bound value and the proof's
  addr_f, so AddrFMismatch is structurally impossible.

**Register proven two ways against the hardened contract:**
1. CLI path — in-JS `buildRegisterProof` → `register(GB3VMAPR…, auditor_id=0, …)`
   accepted by the on-chain UltraHonk verifier — tx
   `fe5aee0487f4eed4a9756cd9b036897fa4cf570209a70e9cfceea1fe6fd4429a`;
   `is_registered(GB3VMAPR…)` → **true**.
2. **In-browser** path (the real user flow) — a fresh friendbot-funded wallet
   `GAY265DT5RHUY7ZDRDI6H556ESFGZNUMWBUMHZXAH664MT7BBU7YTDWE` generated the
   register proof on-device with bb.js, submitted via the web UI, accepted
   on-chain — tx `8ea07300369184bb86c162da45770a62bfdf6c1112658ac40ea6f720f36ddf44`;
   `is_registered(GAY265…)` → **true**.

Deposit + merge UI also wired (proofless, gated behind registration). Withdraw +
transfer UI still to come (need their in-browser witness construction).

# Reality Research: Confidential Token preview — direct repo study (2026-06-25)

Primary-source study of the resource Abu provided, read first-hand (not from the
earlier summary). Companion to `.thoughts/research/2026-06-23-confidential-tokens-preview.md`
(which stays valid) and `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`.

## Resource provenance (verified current)

- Repo: `https://github.com/OpenZeppelin/stellar-contracts` branch `feat/confidential-verifier-ultrahonk`.
- Demo: `https://stellar-confidential-token-demo.billowing-moon-0c6f.workers.dev/`.
- Local clone: `reference/openzeppelin-stellar-contracts-confidential` (gitignored, research-only).
- `git fetch` on 2026-06-25: local HEAD `539968f feat(confidential): wire UltraHonk backend into verifier` is the **latest** of the branch — **0 new commits** since the 2026-06-23 note. The preview has not advanced.

## What the repo actually is

A **Rust/Soroban contract suite + Noir circuits** that add **private balances and
transfer amounts to any SEP-41 token**. Confidentiality, **not anonymity**: sender/recipient
addresses stay public on-chain; amounts and balances are hidden. It is a **wrapper** contract
(holds the underlying SEP-41 tokens, manages encrypted state independently), not a token-standard extension.

Source map (`packages/tokens/src/confidential/`):
- `mod.rs` — `ConfidentialToken` trait + Hooks + events.
- `storage.rs` — operation orchestration, public-input assembly.
- `auditor/` — Grumpkin auditor-key registry (separate contract).
- `verifier/` — UltraHonk VK registry (separate contract).
- `compliance/` — turnkey ComplianceHooks: freeze, SAC `authorized()` passthrough, external policy.
- `circuits/` — Noir sources + gadgets + **committed verification keys** (`circuits/vks/*.vk.bin` + `.vk.json`).
- `docs/DESIGN.md` (1316 lines), `docs/COMPLIANCE.md`.

A single deployment = **three contracts**: ConfidentialToken + ConfidentialAuditor registry + ConfidentialVerifier (UltraHonk VK) registry.

## Cryptographic design (from DESIGN.md, read directly)

- **Pedersen commitments on Grumpkin** (single EC point per balance, unchunked): `C = v·G + r·H`. Contract updates balances homomorphically without decrypting.
- **Grumpkin–BN254 cycle**: Grumpkin arithmetic is native inside Noir (no field emulation); Soroban natively does BN254 ops (CAP-80 host functions) for UltraHonk verification.
- **6 Noir/UltraHonk circuits**: `register`, `withdraw`, `transfer`, `spender_transfer`, `set_spender`, `revoke_spender`. Gadgets: `assert_on_curve`, `commit`, `ecdh`, `encrypt_amount`, `poseidon_with_domain`, `sponge_squeeze_2`, `vk_from_sk`.
- **Key hierarchy** from one secret `sk`: spending key `Y=sk·H`; viewing key `vk=Poseidon(δ,sk,addr_f)` (bound to the contract address); public viewing key `PVK=vk·H`; per-spender delegation viewing keys `dvk_i`.
- **Dual-balance model** (spendable `C_spend` / receiving `C_receive`) + **proof-less merge** → griefing resistance; incoming transfers can't invalidate in-flight spend proofs.
- **ECDH-derived blinding** over Grumpkin: recipient (and auditors) recover amount + blinding from per-transfer event data `(R_e, ṽ, σ)`.
- **Dual-auditor model**: each transfer emits ciphertexts under the recipient's AND sender's auditor keys → real-time selective auditing without exposing uninvolved accounts. This is the built-in compliance/disclosure surface.
- **Range proofs**: values constrained to `[0, 2^127)` (matches SEP-41 `i128`), preventing fake-mint via modular wrap.
- ~288 bytes on-chain storage per account.

## Integration-critical blockers (the real gate for ZK Freighter)

1. **No JS/TS SDK.** Repo find for `.ts`/client SDK returned nothing. DESIGN.md lists "SDK (to be added)", "User Flows Overview (to be added)", and "Indexing and Off-Chain State Recovery (to be added)" as **not-yet-written** documents. A ZK Freighter wallet would have to build its own browser proving + witness assembly around **Noir + Barretenberg (`bb.js` WASM, UltraHonk)** for all 6 circuits, using the committed VKs.
2. **Mandatory indexer / event archive.** Wallet correctness REQUIRES maintaining commitment openings `(v,r)` off-chain from events. Stellar RPC retains events only ~7 days; the protocol **assumes a durable event archive** (INDEXER.md, also "to be added"). Recovery after local-state loss needs checkpoint event `(b̃, σ)` + replay of post-checkpoint events. **Losing openings without an indexer = unable to spend.** This is a real fund-availability risk a wallet must own.
3. **Not production-ready / unaudited.** Verifier backend (`rs-soroban-ultrahonk`, Nethermind/Oghma) is under development and unaudited. **Testnet only**, no mainnet until audits (~August per SDF). README carries an explicit "Not Production Ready" warning.
4. **Underlying-token assumptions**: non-rebasing, no fee-on-transfer, deterministic revert; SAC clawback/freeze/deauthorize can break the accounting invariant. Wrapping CCTP-arrived USDC needs care (issuer/SAC auth).
5. **Toolchain pins** (from earlier note + circuits): `nargo 1.0.0-beta.11`, `bb 0.87.0`; Rust confidential tests already pass locally (92 tests).

## What ZK Freighter integration actually entails

This is a **second privacy mode**, complementary to the existing Nethermind Privacy Pools path:
- Privacy Pools (current): hide address/history linkage inside a pool; public deposit/withdraw boundaries.
- Confidential Tokens (new): public counterparties, **hidden amounts/balances**, built-in auditor disclosure.
Together → a **two-mode privacy wallet**, which is the most on-thesis thing SDF asked for (compliant privacy + private amounts on real money).

Net-new wallet responsibilities (not reused from the pool path): Grumpkin key hierarchy + deterministic derivation (kept distinct from Nethermind note keys); local opening/commitment state + event-replay recovery; an indexer dependency; browser Noir/UltraHonk proving for 6 circuits; disclosure/auditor UX. Reuses: seed→identity, encrypted vault, Stellar submit, public-boundary framing, "shielded/confidential" copy discipline.

## OZ repo build conventions (from its own CLAUDE.md, for any contract work)

`wasm32v1-none`, `no_std` libraries; `cargo +nightly fmt`, `cargo clippy -D warnings`, `cargo test`; new features need a discussed issue first; AI output treated as first draft. Do NOT import this into ZK Freighter production code (reference-only).

## Open questions to resolve before/within planning

- Build our own `bb.js`-based browser prover wrapper for the 6 circuits, or wait for the official SDK? (No SDK exists today.)
- Indexer: run our own event archive, or scope the demo to the 7-day RPC window with explicit recovery warnings?
- First credible asset: a demo SEP-41 token, testnet USDC SAC wrapper, or XLM wrapper?
- Minimum disclosure/auditor UX for a compelling demo without overloading the main wallet story.
- Does the live demo expose any reusable client code (checked separately).

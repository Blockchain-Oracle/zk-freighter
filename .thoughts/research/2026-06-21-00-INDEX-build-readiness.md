# Build-Readiness Reality Index (2026-06-21)

## How to read this

This index consolidates 8 deep-dive reality briefs (379 verified facts total) and 6 feasibility verdicts gathered on 2026-06-21 for a Nethermind-style private-payments build on Stellar/Soroban. It is **facts only** — no architecture, no recommendation, no solution. Each entry traces to a primary source (a cloned-repo file path or a live-checked doc/RPC result).

Status vocabulary used below:
- **CONFIRMED_POSSIBLE** — verified by code and/or live execution; works today.
- **POSSIBLE_WITH_CAVEATS** — core pieces verified, but real conditions/blockers gate it.
- **ANSWERED / PARTIAL / OPEN** — per-question evidence completeness inside a brief.

"Verified" means read from source or checked live. "Inference" means derived from code/protocol facts but not executed. Open questions (bottom section) are the gaps that still need a live check before or during build.

## Briefs

| Topic | File | Facts | Key feasibility status |
|---|---|---|---|
| Nethermind privacy-pool engine internals (contracts, circuits, keys, client/prover, ASP, events, XLM-vs-SAC) | `.thoughts/research/2026-06-21-nethermind-privacy-pool.md` | 62 | Engine fully mapped; USDC architecturally supported but only XLM pool deployed (1 PARTIAL: live run-instructions) |
| Soroban toolchain + ZK host functions (BN254, BLS12-381, Poseidon/Poseidon2) | `.thoughts/research/2026-06-21-soroban-toolchain.md` | 52 | Host fns live on testnet (Protocol 27); 1 PARTIAL (examples use older paths), 1 OPEN (per-call budget cost) |
| USDC on Stellar (SAC) + multi-asset (USDC+XLM) feasibility | `.thoughts/research/2026-06-21-usdc-and-assets.md` | 31 | One-asset-per-pool confirmed; 1 PARTIAL (faucet rate), 1 OPEN (trustline requirement) |
| WebAuthn passkey + PRF (APIs, determinism, support matrix, extension context) | `.thoughts/research/2026-06-21-passkey-prf.md` | 25 | PRF deterministic 32-byte; extension-popup + service-worker contexts uncertain (several PARTIAL) |
| Stellar passkey smart accounts (secp256r1, passkey-kit / smart-account-kit) | `.thoughts/research/2026-06-21-stellar-passkey-accounts.md` | 34 | Native secp256r1 + working SDK auth path verified; addresses not live-checked |
| WXT extension framework + wallet architecture (Freighter reference) | `.thoughts/research/2026-06-21-wxt-wallet-arch.md` | 38 | WXT mechanics + Freighter key model mapped; WASM-in-MV3-service-worker unresolved (PARTIAL) |
| Circle CCTP V2 Sepolia <-> Stellar testnet integration | `.thoughts/research/2026-06-21-cctp-bridge.md` | 47 | All addresses/encodings verified; Sepolia round-trip not executed (1 PARTIAL) |
| Client-side ZK proving pipeline (Circom/Groth16 in browser via WASM) | `.thoughts/research/2026-06-21-client-zk-proving.md` | 38 | Prover stack + artifacts fully mapped; proving TIME and MEMORY unmeasured (PARTIAL) |

## Feasibility verdicts

The six critical build questions:

1. **pool-usdc — Can the privacy pool use USDC (not just XLM)?**
   **CONFIRMED_POSSIBLE.** The pool stores one token Address at construction and moves funds via the generic Soroban `TokenClient`; the deploy script has explicit `classic:USDC:ISSUER:ID` / `contract:ID` flags, and circuits carry no asset identity.
   *Biggest caveat:* No USDC pool is deployed today (only the native XLM pool); the frontend hardcodes `TOKEN_SYMBOL="XLM"` / 7-decimals and never reads the AssetDescriptor, so a USDC pool would work on-chain but mislabel in the UI.

2. **pool-multiasset — Can one pool hold BOTH USDC and XLM?**
   **CONFIRMED_POSSIBLE (only as two pools).** Both/either asset is supported, but each pool is single-asset by construction; supporting both requires TWO pool deployments sharing one verifier+ASP.
   *Biggest blocker:* A single multi-asset pool is NOT possible with existing code — there is one `DataKey::Token`, and `ExtData`/`Proof` carry no asset id; making one pool multi-asset is new contract + circuit work, not config.

3. **prover-in-extension — Can the Groth16 prover run client-side / in an extension?**
   **POSSIBLE_WITH_CAVEATS.** In a browser **Web Worker** it is proven (the Nethermind app does exactly this; single-threaded wasm, no SharedArrayBuffer/COOP/COEP needed). In an **MV3 extension** it is not demonstrated anywhere.
   *Biggest blocker:* MV3 service workers are idle-killed (~30s, 5-min cap) and a long Groth16 proof would die mid-run; the corpus extension CSP lacks `wasm-unsafe-eval` (blocks WASM); would need an extension PAGE/offscreen doc, not the SW. No repo proves in-extension proving.

4. **prf-in-extension — Can WebAuthn PRF give a deterministic key from an extension popup?**
   **POSSIBLE_WITH_CAVEATS.** PRF is deterministic (same credential + same salt -> same 32 bytes); since Chrome 122 an extension can set `rp.id` to a domain in `host_permissions`.
   *Biggest blocker:* An MV3 action popup closes on focus loss and the WebAuthn prompt takes focus — MDN explicitly says the popup flow "does not work"; the ceremony must run in a tab/offscreen doc. Plus device/OS gaps (Windows Hello PRF only Win11 25H2 + Feb-2026 update; Android Firefox none).

5. **cctp-executable-today — Is Sepolia -> Iris sandbox -> Stellar mint_and_forward executable today?**
   **CONFIRMED_POSSIBLE (live-verified).** Sepolia CCTP V2 bytecode confirmed on-chain; Iris sandbox returned a live fee schedule for domain 0->27; deployed Stellar contracts resolve Sepolia USDC and the forwarder is unpaused. Official Circle repo has a complete runner.
   *Biggest caveat:* Repo defaults to Arc Testnet (config-only re-point to Sepolia); `mint_and_forward` is a plain token transfer (not an arbitrary call into your contract); recipient needs a USDC trustline first.

6. **passkey-authorizes-deposit — Can a passkey smart account authorize a pool deposit?**
   **CONFIRMED_POSSIBLE.** Native secp256r1 verify shipped Protocol 21 (CAP-0051); two working SDKs (passkey-kit, smart-account-kit) implement the browser->Soroban auth leg; `kit.execute(target, fn, args)` works for any contract, so a deposit is just one call.
   *Biggest caveat:* A separate fee-payer/relayer must submit (relayer optional, deployer keypair fallback); the live passkey prompt is exercised only in the browser demo (tests mock it); kit is v0.3.0 beta, testnet defaults.

## Consolidated open questions

Every Unknown still needing a live check before/during build:

1. **USDC SAC round-trip on testnet** (privacy-pool brief riskiest unknown; usdc-and-assets OPEN): whether a USDC SAC deposit/withdraw actually round-trips — including the auth-entry tree for the SAC `transfer` sub-invocation. Update 2026-06-22: the testnet USDC SAC id itself is no longer unknown; Stellar CLI derived `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` and `contract info interface` resolved it as a token contract. The untested part is the actual pool round-trip.
2. **USDC pool contract trustline** (usdc-and-assets OPEN): whether a USDC pool contract address needs an explicit trustline / SAC `trust` call to receive USDC, or whether the SAC auto-creates the contract balance entry on first inbound transfer. Not verifiable from repo/docs read.
3. **ZK host-function per-call budget** (soroban-toolchain OPEN, its riskiest unknown): measured CPU-instruction / fee cost of `pairing_check`, `g1_msm`, and `poseidon_permutation` — bounds how many pairings/hashes fit in one transaction's resource limit. The privacy-pools example README flags this as a real constraint.
4. **In-browser proving TIME and peak MEMORY** (client-zk-proving riskiest unknown, PARTIAL): no benchmark exists for the single-threaded `policy_tx_2_2` (2-in/2-out) circuit; the ~10-15s snarkjs comparable may not apply. Total constraint/wire counts unknown (`.wasm`/`.r1cs` are uncommitted build artifacts).
5. **WASM in an MV3 background service worker** (wxt-wallet-arch riskiest unknown, PARTIAL): WXT issue #1448 (open) — top-level-await WASM rejected by IIFE-bundled SW; offscreen-document workaround uninvestigated; `worker-src` CSP requirement unconfirmed.
6. **WebAuthn create/get with PRF from an MV3 background service worker** (passkey-prf riskiest unknown, PARTIAL): only documented for popups/extension pages; no primary source confirms or denies SW support; user-gesture/context requirement could block it.
7. **PRF salt byte-construction / domain-separation** (passkey-prf U1, PARTIAL): exact 'WebAuthn PRF' + null-byte hash construction not in the fetched W3C excerpt.
8. **PRF support-matrix conflicts** (passkey-prf U2): Windows Hello hmac-secret support — sources conflict on whether it exists.
9. **Passkey smart-account on-chain interface live validity** (stellar-passkey-accounts riskiest unknown): cited testnet WebAuthn-verifier / account-wasm / deployer-derived wallet ids were NOT checked against live Stellar RPC; OZ verifier/account Rust source read via docs+bindings, not the stellar-contracts repo.
10. **CCTP Sepolia end-to-end execution** (cctp-bridge riskiest unknown, PARTIAL): no live Sepolia<->Stellar burn+attest+mint_and_forward round trip executed; real attestation latency and the Stellar recipient USDC trustline unverified by execution.
11. **Soroban example vs native-host-fn path** (soroban-toolchain PARTIAL): official examples use in-WASM ark-bn254 / vendored Poseidon, not the native `bn254()`/`poseidon` host fns — the native path is newer than these examples and not exercised by them.
12. **Multi-asset circuit feasibility** (usdc-and-assets secondary unknown): whether the Circom circuits encode an asset id at all (grep found none) — bounds whether a single multi-asset pool is even circuit-feasible.
13. **PRF key-derivation production details** (passkey-prf U4/U5/U8): exact Bitwarden/wwWallet recovery + dual-wrap details and @simplewebauthn v13 PRF result-path not fully fetched.
14. **CCTP repo on Sepolia** (cctp-bridge PARTIAL): repo examples ship for Arc Testnet; Sepolia RPC/chain-id 11155111 re-point is config-only but not run end-to-end in session.

## Overall reality readout (facts only)

**Proven-possible today (verified by code and/or live check):**
- The Nethermind privacy pool is asset-generic: USDC works as a deployment-time parameter (CONFIRMED_POSSIBLE), and both USDC+XLM are supported as two separate single-asset pools (CONFIRMED_POSSIBLE).
- The Groth16 prover runs client-side in a browser **Web Worker** (single-threaded wasm, no cross-origin isolation needed) — verified working in the cloned app.
- The full CCTP V2 path Sepolia -> Iris sandbox -> Stellar `mint_and_forward` is live-verified leg-by-leg (Sepolia bytecode on-chain, Iris fee schedule for domain 0->27, Stellar token resolution + unpaused forwarder via devInspect).
- A passkey (secp256r1/WebAuthn) Stellar smart account can authorize an arbitrary Soroban contract call including a pool deposit; native verify shipped in Protocol 21; two SDKs implement the browser->Soroban auth path.
- Native ZK host functions (BN254 CAP-0074, Poseidon/Poseidon2 CAP-0075) are present on testnet (Protocol 27, 2026-06-18); soroban-sdk signatures documented.
- WebAuthn PRF is a deterministic 32-byte function; extensions can claim `rp.id` from `host_permissions` since Chrome 122.

**Carries caveats (core verified, real conditions gate it):**
- USDC support: the SAC IDs resolve on-chain and the pool code is asset-generic, but no USDC pool is deployed today and the frontend hardcodes XLM symbol/decimals.
- Multi-asset: requires two pool deployments; one shared multi-asset pool is not possible with existing code.
- Prover in MV3 extension: only plausible in an extension PAGE/offscreen doc (not the idle-killed service worker) and requires adding `wasm-unsafe-eval` to CSP; not demonstrated in any repo.
- PRF from an extension popup: the popup closes on the WebAuthn prompt's focus-grab (MDN says it "does not work"); must run in a tab/offscreen doc; device/OS support gaps exist.
- CCTP: repo defaults to Arc Testnet (config-only re-point); `mint_and_forward` is a plain transfer, recipient needs a USDC trustline.
- Passkey deposit: needs a fee-payer/relayer to submit; SDK is v0.3.0 beta; live prompt exercised only in demo.

**Still open (needs a live check):**
- USDC SAC deposit/withdraw round-trip on testnet, including SAC sub-invocation auth tree and the pool contract's trustline requirement (the testnet USDC SAC id is not in the repo).
- Per-call resource/budget cost of the ZK host functions (gates how much verification fits in one tx).
- Actual in-browser proving TIME and peak MEMORY for the 2-in/2-out circuit (no benchmark exists; circuit constraint/wire counts unknown).
- Whether WASM and WebAuthn-PRF can run in an MV3 background service worker (both unresolved/undocumented).
- Live validity of the cited passkey smart-account on-chain addresses (never checked against RPC).
- An actual Sepolia<->Stellar CCTP round trip with real attestation latency.

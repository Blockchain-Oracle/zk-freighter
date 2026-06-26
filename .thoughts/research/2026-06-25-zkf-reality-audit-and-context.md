# ZK Fighter — Reality Audit & Plan-Mode Context (Source of Truth)

Date: 2026-06-25 · Hackathon: Stellar Hacks: Real-World ZK (DoraHacks, SDF).
Framing rule (per Abu): **the deadline is not a factor.** Nothing here is a "do less because of time" recommendation. Everything is "what is true" and "what is the correct way to build it." See `CLAUDE.md` → *Quality Bar — Deadline Is Not A Factor*.

Built from a 26-agent audit workflow (9 domain auditors → 16 adversarially-verified claims → synthesis), plus first-hand reads of the spec, plans, README, and the OZ Confidential Token repo + live demo. On-chain facts were re-verified live on Horizon during the audit.

Legend: REAL = wired + evidenced (tests and/or on-chain). PARTIAL = wired but incomplete/UI-gapped/untested at a layer. MOCKED = exists only via mocks/recorded data. MISSING = no production code.

---

## 1) Project Reality

ZK Fighter is a privacy-by-default Stellar wallet for shielded XLM and USDC, plus a Circle CCTP cross-chain USDC inflow path. Monorepo: `apps/web` (React/Vite SPA), `apps/extension` (WXT MV3 companion), `packages/core` (shared wallet/proof/tx logic). **The ZK is genuinely load-bearing, not slideware.**

- **Proving stack**: Circom + Groth16 over BN254 with Poseidon2 hashing (a Privacy Pools design), generated client-side in a browser/WASM module (`web.js` + `prover-worker_bg.wasm`, ~11.7MB) and verified on-chain by a Soroban Groth16/BN254 verifier embedded in the deployed pool contract. The prover/verifier are **vendored/reused from Nethermind's stellar-private-payments** — credit honestly; the team did not author the SNARK system.
- **Team's genuine engineering** (the novelty): the wallet/UX/derivation/disclosure/compliance/CCTP layer, plus a from-scratch, KAT-verified **Poseidon2-BN254 t=3** implementation (`poseidon2-bn254.ts`) and deterministic seed→note-key→ASP-leaf derivation that interoperates with the Nethermind circuits **without importing `reference/` source** (guardrail honored).
- **On-chain reality (independently verified on Horizon):**
  - Testnet USDC shield `8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405` → successful=True, ledger 3241138 (real `invoke_host_function` against USDC pool `CCY6…`).
  - Tampered-proof rejection `af8f45d20e0048c4f9d88a572b87eecd3e4095385d555d1f4968a71b3e6fa4ce` → **successful=False**, ledger 3239228, fee charged. The on-chain verifier rejects a flipped proof byte. (Note: this tx is the real tampered-rejection evidence; README's demo script should cite it.)
  - Mainnet XLM shielded transfer `5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd` → successful=True, ledger 63192150.
- **Honesty posture**: code does not fake balances/hashes/proofs/bridge state; recorded evidence is labeled "recorded"; public boundaries stated. Strong fit with SDF's compliant-privacy thesis. This discipline is a core asset — protect it.

---

## 2) Per-Surface Inventory

### packages/core (engine) — mostly REAL
- REAL: Poseidon2-BN254 (KAT-verified); BIP39/SLIP-0010 Stellar key + deterministic note/encryption/ASP-blinding derivation (`identity.ts`); bech32m `zkf1…` receive code (`receive-code.ts`); AES-256-GCM/PBKDF2 vault (`vault.ts`); Soroban auth-entry sign/submit/poll (`soroban-submit.ts`); shield/transfer/unshield orchestration (`xlm-shield.ts`, `xlm-private.ts`); ASP membership leaf derivation+insert; selective disclosure shaping (`disclosure.ts`); tampered-proof harness (`xlm-proof-rejection.ts`).
- PARTIAL (honest-by-design): `prover.ts` is an **artifact presence/SHA gate only** — hardcodes `proofAttempted:false`/`proofGenerated:false`; never computes a SNARK.
- MOCKED: all flow unit tests mock the Nethermind WebClient. Real proving/verification is proven only by recorded live tx hashes, **not** by `pnpm test`.
- MISSING: any RISC Zero / Noir / UltraHonk path.

### apps/web (primary judged surface) — REAL flows, scaffolding UX
- REAL: create/import/unlock (password + passkey PRF), receive QR, USDC receive setup (trustline), shield XLM+USDC, shielded send, unshield, disclosure generate/verify, public discovery, CCTP bridge, tampered-proof demo (testnet-gated), DemoEvidencePanel (labeled "recorded").
- PARTIAL: balances are panel-local + manual "Refresh notes"; top-level Balances says "Loaded from the shielded pool panels".
- MISSING: navigation/routing (flat ~12-panel grid), activity/history view, settings screen, component/render tests.
- QUALITY/SAFETY: mainnet pools enabled; same shield/send/unshield/bridge buttons render on mainnet behind only a dropdown; `ShieldSubmitPanel` amount hardcoded.

### apps/extension (WXT MV3 companion) — REAL but supplementary
- REAL: WXT MV3 packaging; shared-core reuse; vault import/unlock/lock; address + receive code; QuickShield XLM+USDC (offscreen Nethermind proving, real testnet submits in Chrome harness); fail-closed Freighter relay (empty pubkey, signing rejected).
- PARTIAL: bridge handoff opens web route but URL is **hardcoded `http://localhost:5173/`** — broken off-localhost; private transfer/unshield exist as runtime-message-only paths with no UI/confirmation guard.
- MISSING: unit tests for the security-critical `dappRuntime`/fail-closed boundary; content script runs on `<all_urls>`.

### Bridge / CCTP — REAL on testnet, two-step (never atomic)
- REAL: four EVM sources (Ethereum/Base/Arbitrum/OP) wired testnet+mainnet with correct CCTP domains; approve→depositForBurnWithHook→Iris poll→Stellar mint_and_forward; resume-from-burn-hash; recorded testnet bridge-to-shield evidence for all four Sepolia chains.
- MISSING/Deferred (honestly): atomic bridge-and-shield; mainnet bridge execution (never run; source unfunded).
- SAFETY (verified): browser bridge UI has **NO mainnet gate** — the `ZKF_CCTP_MAINNET_APPROVED` gate exists ONLY in `scripts/check-cctp-bridge-source.ts`, not in `BridgePanel`/`ExtensionBridgePanel`.

---

## 3) Claims vs Reality (verified)

| Claim | Verdict | Evidence |
|---|---|---|
| Load-bearing ZK: valid accepted + tampered rejected on-chain | MATCHES | shield successful=True (ledger 3241138); tampered successful=False (ledger 3239228, fee charged). |
| Genuinely touches Stellar (deployed verifier/pool, real Soroban invokes) | MATCHES | shield/transfer/unshield are `invoke_host_function` calling `transact`, not payments. |
| Real mainnet shielded transfer/unshield executed | MATCHES | mainnet 5a1523… successful=True, ledger 63192150. |
| spikes-log evidence consistent / not fabricated | MATCHES | monotonic ledgers, ~5s close times, reconciling balances, live Horizon + Circle Iris matches. |
| No fake balances/proofs/bridge state in judged web path | MATCHES | proofGenerated set only on real tx; hashes only from SUCCESS; DemoEvidencePanel "recorded". |
| Extension fails closed for external pubkey/signing | MATCHES | empty publicKey, isAllowed:false, signing errors. |
| "Proving verifiable from repo/tests" | OVERCLAIM | prover.ts hardcodes false; flow tests mock client. ZK proven only via live txs. |
| "Mainnet CCTP execution hard-gated/fails closed" (unqualified) | REFUTED | gate only in headless runner; browser/extension UI has no mainnet gate. |
| Extension bridge handoff "ready" | DRIFT | target hardcoded localhost:5173, no env override → demo-only. |
| OZ Confidential-Token testnet artifacts reusable | REFUTED | only truncated demo addresses; no full strkeys; self-deploy of all 3 contracts + SEP-41 required. |
| Confidential-token mode currently exists in any form | OVERCLAIM | zero code; Noir toolchain not installed; no upstream SDK; indexer spec missing. |

---

## 4) Confidential-Token Integration Map (the "token feature" — build it right)

This is a **real, substantial second privacy mode**, not a small add-on, and it is the most on-thesis thing SDF is asking for (compliant privacy + private amounts on real money). Build it correctly; do not fake any part of it. Full primary-source study: `.thoughts/research/2026-06-25-confidential-token-repo-study.md`.

- **Current state (verified)**: ZERO production code in `apps/`+`packages/`; Noir toolchain NOT installed (nargo/bb/noirup/bbup absent); no reality spike; no browser-proving benchmark. We have a research note, the [6-phase plan](.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md), and a study-only reference clone (forbidden to import).
- **Upstream (verified current, HEAD 539968f, 0 new commits)**: OZ/SDF preview on branch `feat/confidential-verifier-ultrahonk`. REAL there: 3 Rust contracts (SEP-41 wrapper + auditor-key registry + UltraHonk VK registry), 6 Noir/UltraHonk circuits with committed VKs (bb 0.87.0 / nargo 1.0.0-beta.11), DESIGN.md (1316 lines), COMPLIANCE.md, a live testnet demo that **does client-side proving today** (proving-in-browser is therefore proven feasible). MISSING upstream: JS/TS SDK, INDEXER.md, deploy script, full demo addresses — all "to be added".
- **Architecture if built**: confidentiality (addresses public, amounts/balances hidden) over a SEP-41 wrapper using **Grumpkin Pedersen commitments + UltraHonk proofs + per-transfer ECDH recovery**; dual-balance (spendable/receiving) + proof-less merge; dual-auditor disclosure built in. Key hierarchy from one `sk`: spending `Y=sk·H`, viewing `vk=Poseidon(δ,sk,addr_f)`, public-viewing `PVK=vk·H`, delegation `dvk_i`. deposit/merge need no proof; transfer/withdraw require proofs verified on-chain.
- **Reuse from existing repo**: minimal and must be verified — different proving system (Groth16 vs UltraHonk), curve (BN254 note-keys vs Grumpkin spend/view keys), artifact pipeline. Partial candidates: Poseidon2-BN254 (verify domain tags/arity vs `circuits/gadgets/poseidon_with_domain` first), vault encryption, @noble/curves (Grumpkin support unconfirmed). The existing TS client is Privacy-Pools-specific.
- **Net-new components to build correctly (greenfield client)**:
  1. **Browser UltraHonk prover wrapper** around `bb.js`/Barretenberg for the 6 circuits, using the committed VKs (circuits are tiny — `transfer` ~129 ACIR opcodes — so proving is plausibly sub-second once wired).
  2. **Grumpkin key hierarchy** + deterministic derivation, kept cryptographically distinct from Nethermind note-keys.
  3. **Commitment-opening maintenance + recovery** (local `(v,r)` state, checkpoint `(b̃,σ)` + event replay).
  4. **A durable indexer / event archive** — REQUIRED, because Stellar RPC retains events only ~7 days and lost openings = unspendable funds. INDEXER.md doesn't exist upstream; we own this. First-class component, not an afterthought.
  5. **Three-contract deployment** to testnet (token wrapper + auditor registry + verifier registry) over a chosen SEP-41 underlying, with our own recorded evidence (no copying demo state).
  6. **Disclosure/auditor UX** leveraging the dual-auditor ciphertexts.
- **Constraints**: unaudited; testnet-only; effectively Protocol-26; wrapping CCTP-arrived USDC needs SEP-41 exact-transfer/SAC-auth care. Record every contract ID + tx hash in `spikes-log.md`; show "confidential amounts" not "anonymous".
- **Sequencing (correctness, not time-boxing)**: (Phase 1) install nargo/bb, build + benchmark a browser UltraHonk proof for one circuit, prove the prover-in-browser path end to end; (Phase 2) Grumpkin key model + opening state; (Phase 3) deploy contracts + register; (Phase 4) deposit/merge/withdraw round-trip with real evidence; (Phase 5) confidential transfer + disclosure; (Phase 6) indexer + recovery. Each phase gated on real evidence, mirroring the existing plan.

---

## 5) Mobile Path (Claude is building it — build it right)

- **State (verified)**: no mobile app — `apps/` has only `web` and `extension`; no `capacitor.config`/`app.json`/`tauri.conf`. Research doc: `.thoughts/research/2026-06-25-mobile-app-framework-options.md`.
- **Framework**: **Capacitor-first** — reuse the web app + browser/WASM Nethermind prover inside a native WebView (highest reuse of the hard part: the prover). Expo/RN is a later option if native polish justifies the adapter work; Tauri mobile only if we later want a Rust-native prover.
- **The hard constraint is the prover, not the UI**: the real risk is whether the ~32MB artifact load + WASM workers + Web Crypto behave in iOS WKWebView / Android WebView under memory pressure, and whether WebAuthn PRF passkey works on mobile. Both unproven — prove them on real devices before claiming anything. Never simulate a proof or balance on device.
- **Abstract these core boundaries first (they currently leak into the app layer)**: `StorageAdapter` (vault persistence vs Keychain/Keystore for small secrets), the EVM bridge client (mobile has no injected `window.ethereum` → WalletConnect/MetaMask Connect/handoff), and passkey. CCTP bridge is NOT a core blocker (core already injects the EVM client).
- **Correct first milestone**: a Capacitor shell running the prover readiness/benchmark on a real Android device with proof flags left false and nothing claimed — validate artifact load + WASM runtime in a WebView. Then storage adapter → receive/QuickShield → bridge strategy → optional passkey, each with real device evidence.
- **Reconcile with the designers' prototype** when it lands; mobile UI follows the redesign, not the current scaffolding.

---

## 6) Submittability Facts (Abu's external calls — not deadline-driven)

These determine whether the project can be judged *at all*, independent of timeline. They are Abu's to decide/own:

1. **GitHub repo `Blockchain-Oracle/zk-fighter` is PRIVATE** (`isPrivate:true`). The hackathon mandates a public open-source repo. **Before any public flip**: run a full git-history secret scan (gitleaks/trufflehog) — the repo handles seeds, EVM keys, Stellar S-keys, and a CCTP funder. Audit found no tracked `.env`/S-keys in non-test source and `.gitignore` excludes `.env*` + `/reference/`, but history must be confirmed clean. **Publishing is irreversible → Abu's call; I will not flip it.**
2. **No demo video exists** — only a written script in `docs/SUBMISSION-PACKAGE.md`. A 2–3 min video is mandatory and is where load-bearing ZK should be shown (the accept-then-tamper-reject moment, pointing at `af8f45d2…` returning successful=False). Abu's to record/own.
3. **Filed submission ≠ ready code** — the DoraHacks entry (repo URL + video URL) must actually be filed.

---

## 7) Quality & Safety Findings To Fix (deadline-neutral; quality-first)

1. **Add a mainnet gate to the shared bridge blockers** (`getCctpBridgeBlockers`) so BOTH web and extension fail closed on mainnet bridge from the UI; default/lock the live demo to testnet. (Today only the headless script is gated — real-money-from-dev-UI risk.)
2. **Make ZK reproducible beyond live txs**: a skeptical judge running `pnpm test` sees `proofGenerated:false` and mocked clients. Consider an opt-in integration test / scripted real-proof run so the claim is reproducible, not only attested by recorded hashes.
3. **Extension bridge URL** is hardcoded `http://localhost:5173/` with no env override → packaged extension opens a dead tab. Parameterize the target.
4. **Consumer UX**: the flat ~12-panel engineer's console (jargon: `policy_tx_2_2`, `ASP leaf`, prover-readiness) undercuts the "wallet an ordinary person could use" thesis. Quarantine developer diagnostics behind a "Developer / Demo evidence" view; add a real shielded-balance + activity view (backing logic exists). This is the designers' redesign territory — reconcile.
5. **Wording**: tighten `VERIFIED-FACTS.md:157` "atomic mint-and-forward" (it's an atomic mint+transfer, NOT an atomic shield); refresh the stale Phase 10 audit (implies pools pending though deployed).
6. **Disclosure** currently trusts WASM-client booleans + pinned vkHash without re-reading the on-chain root — honest receipt, not independent on-chain proof. Consider strengthening.

---

## 8) Open Decisions for Abu

1. Final demo network posture: testnet-only live (recommended; mainnet as recorded evidence only, since the software is unaudited) vs showing mainnet live.
2. Confidential-Token mode: confirmed as a real build target — proceed to plan the full second privacy mode (§4)? (Abu has said yes; this confirms scope.)
3. Mobile: Capacitor-first, prover-in-WebView proof before anything else — confirm.
4. Add the mainnet UI gate (recommended).
5. Repo public + video: Abu's external calls (§6); want me to run the read-only secret scan to de-risk a future public flip?
6. Two-wallet Alice→Bob private send for a more convincing demo (current private-send evidence was a self-send)?

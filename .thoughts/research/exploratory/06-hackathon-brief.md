# Hackathon Brief — Stellar Hacks: Real-World ZK

> Research date: 2026-06-21. Primary source: DoraHacks public API (`/api/hackathon/stellar-hacks-zk/`) + Stellar blog/docs. Confidence: **HIGH** that this is the exact event — the resource pack the user pasted (Privacy Pools, Confidential Tokens, BN254/Poseidon X-Ray/Yardstick host functions, Stellar Skills, RISC Zero / Circom / Noir verifiers, jamesbachini.com tutorials) is a near-verbatim match for this hackathon's official RESOURCES tab.

---

## 1. Identity

| Field | Value |
|---|---|
| **Name** | **Stellar Hacks: Real-World ZK** |
| **Organizer / Sponsor** | **Stellar Development Foundation (SDF)** — sole sponsor |
| **Platform** | DoraHacks — https://dorahacks.io/hackathon/stellar-hacks-zk |
| **Format** | Virtual / online |
| **Ecosystem tags** | Stellar, ZK, Zero Knowledge, Rust, Noir, RISC Zero, Soroban, Circom |
| **Start (submissions open)** | **2026-06-15 07:00 UTC** |
| **Submission deadline** | **2026-06-29 19:00 UTC** |
| **Total prize pool** | **$10,000 USD** |
| **Registrations at research time** | 322 hackers, ~20 applications, 0 published BUIDLs (early — low competition signal) |
| **Winners announced** | Not yet (`winner_announced: false`) |

This is SDF's third recent ZK-themed DoraHacks event, alongside **Stellar Hacks: ZK Gaming** ($10k, launched 2026-02-09) and the broader **Stellar Hack+ / Stellar Week (Buenos Aires 2025)** ZK Morning track. "Real-World ZK" is the **privacy/payments-leaning** one — the right target for a privacy wallet.

---

## 2. Tracks & Prizes

- **No formal sub-tracks.** DoraHacks shows a single `[DEFAULT_TRACK]`. The brief is explicit: *"No mandatory framework, no required boilerplate contract to call, no specific track to fit into. Build what you find interesting."*
- **Prize pool:** $10,000 USD. **Per-place split is NOT published** on the DoraHacks page or API. (Comparable SDF DoraHacks events award the pool across a top-N of winning projects at judges' discretion.)
- **Themes SDF actively wants** (from the description + Ideas tab) — all valid, "real-world money movement" especially welcome:
  - Privacy pools / shielded transfers
  - **Private payments / shielded stablecoin wallets** ← privacy-wallet sweet spot
  - Confidential tokens (hidden balances/amounts)
  - Identity & compliance proofs, selective disclosure / view keys
  - Provable / verifiable off-chain computation, proof-of-reserves

---

## 3. Judging & Submission Requirements

**Submission requirements (mandatory, enforced by the platform):**
1. **Open-source repo** — public GitHub/GitLab/Bitbucket with full source + a clear `README.md`. (`mandatory_git_repo_link: true`) Honest WIP/mock-data disclosure encouraged over a "polished mystery."
2. **Demo video** — 2–3 min walkthrough showing the project working and explaining what ZK does in it. You don't have to appear on camera. (`mandatory_video_link: true`)
3. **ZK + Stellar, load-bearing** — must use ZK cryptography in a meaningful way AND touch Stellar (e.g. verify proofs in a Soroban contract, or integrate Stellar testnet/mainnet). *"The ZK should be load-bearing: it powers a real part of how the project works, rather than appearing only on a slide."*

**Judging criteria:** No published rubric. The DoraHacks track `judging_criteria` field is **empty**; judging is **reviewer/judge-scored, max score 100** (`track_judging_max_score: 100`), judges review the public repo + demo video. From the prose, the de-facto bar is:
- **Is the ZK genuinely essential** (not just namechecked in the README)?
- **Does it touch Stellar for real** (verifier contract / testnet / mainnet)?
- **Execution & clarity** — *"'Mild' projects win hackathons all the time when they're sharp and well-executed. Pick something you can actually ship... make the ZK genuinely essential, and document it clearly."*
- **Real-world-money fit is a thumb on the scale**, explicitly "especially welcome," though not required.

**Registration questions of note:** (1) confirm repo + video are public; (2) *"We have an upcoming Stellar Builder House in São Paulo, Brazil. Would you be able to, and interested in, coming?"* — a recruiting funnel signal (see §5).

---

## 4. Must-Use / Expected Tech

There is **no single mandated framework**, but the integration shape is fixed: **generate proofs off-chain, verify them on Stellar.** Three proven proving stacks, each with a reference verifier:

| Proving system | Language | Verifier (reference impl) | E2E tutorial |
|---|---|---|---|
| **RISC Zero** zkVM (Groth16) | Rust | NethermindEth/stellar-risc0-verifier | jamesbachini.com/stellar-risc-zero-games |
| **Circom** (Groth16) | Circom DSL | stellar/soroban-examples `groth16_verifier` | jamesbachini.com/circom-on-stellar |
| **Noir** (UltraHonk) | Rust-like DSL | yugocabrio/rs-soroban-ultrahonk · indextree/ultrahonk_soroban_contract | jamesbachini.com/noir-on-stellar |

**Underlying on-chain primitives (the reason the hackathon exists now):**
- **Protocol 25 "X-Ray"** (mainnet ~2026-01-22): native **BN254** host functions (`bn254_g1_add`, `bn254_g1_mul`, `bn254_multi_pairing_check`) + **Poseidon/Poseidon2** hashing → verify zk-SNARK proofs inside Soroban contracts. CAP-0074 (BN254), CAP-0075 (Poseidon).
- **Protocol 26 "Yardstick"**: nine additional BN254 host functions (multi-scalar mult, scalar-field arithmetic, curve-membership) → moved heavy ZK math to the host layer, making proof verification (incl. Noir/UltraHonk) **meaningfully cheaper**. Use the **latest SDK** for P26 support.
- **BLS12-381** from earlier protocols (CAP-0059) is also available.

**Highest-value starter code for a privacy wallet:**
- **Nethermind Stellar Private Payments** (Privacy Pools PoC): Circom + Groth16 + Soroban, pool contract + on-chain Groth16 verifier + ASP membership/non-membership contracts. Proofs generated **client-side in the browser via WASM** (secrets never leave the device). Repo: `NethermindEth/stellar-private-payments`. *Unaudited research prototype.*
- **Stellar Skills** (agent docs): https://skills.stellar.org/ — has a dedicated **ZK Proofs skill** (`/skills/zk-proofs/SKILL.md`, Groth16 over BLS12-381/BN254/Poseidon). Install `stellar/stellar-dev-skill` in Claude Code.
- **Stellar Wallets Kit** (https://stellarwalletskit.dev/) + **OpenZeppelin on Stellar** (audited contracts, Wizard, security detectors).
- Official docs the resource pack mirrors: `developers.stellar.org/docs/build/apps/zk` and `.../apps/privacy`.

Testnet is fine — mainnet not required. Stellar Lab generates/funds testnet accounts.

---

## 5. Sponsor's TRUE Purpose (read between the lines)

SDF is **not** running this to find a finished product. It's a **demand-generation play for the cryptographic foundation they just shipped.** They spent Protocol 25 (X-Ray) and 26 (Yardstick) putting BN254/Poseidon ZK primitives into the protocol — and primitives with no apps on top of them are a stranded investment. CPO Tomer Weller's own framing: SDF set out to *"build the foundational cryptographic capabilities developers need before higher-level privacy solutions can exist."* This hackathon is them paying to **manufacture the higher-level solutions** — and to prove the thesis that *"privacy on a public chain can work at scale."*

Concretely, SDF wants to:
1. **Seed real privacy apps** on the new host functions — proof that X-Ray/Yardstick are usable, not just spec.
2. **Pull ZK devs onto Soroban** — the brief brags that Stellar "mirrors Ethereum's precompiles," explicitly inviting devs to **migrate ZK apps from other ecosystems** (low-friction porting). They want to be the compliant-privacy chain in the BN254 ecosystem (Privacy Pools, ZK Email, Starknet).
3. **Validate compliant privacy specifically** — note how much copy is about **view keys, selective disclosure, ASP allow/deny lists, auditor reconstruction.** SDF's strategic line is *"privacy and transparency aren't opposites"* — privacy with **built-in compliance** for institutions/payments. This ties to their membership in the **Confidential Token Association** (with Nethermind, OpenZeppelin, Zama) and the Nethermind privacy-pools partnership.
4. **Recruit builders into the funnel** — the São Paulo Builder House question, the heavy push to use Stellar Skills/AI agents, and SCF grant pathways all reveal the real KPI: **converted, retained Soroban developers**, not just hackathon entries.

**What genuinely advances their goal (= what impresses judges):** a project that makes the **new ZK primitives indispensable**, lands in **real-world money movement**, and demonstrates **compliant privacy** (private to the public, disclosable to an authorized party). The single most on-thesis idea in their own list is the "Wild" prompt: **a fully shielded stablecoin wallet** — *"consumer-grade wallet where everyday USDC payments are private by default, with client-side proof generation, compliant disclosure built in, and a UX an ordinary person could actually use."* That hits all four motives at once: uses the primitives, real-world payments, compliant privacy, and the consumer UX that proves "privacy at scale."

**Winning posture for a privacy wallet:** build on/extend the Nethermind Private Payments PoC (Circom+Groth16+Soroban verifier, browser-side WASM proving), add a **selective-disclosure / view-key path** for compliance, wrap it in a **shippable consumer UX**, deploy the verifier to **testnet**, and in the demo video make crystal clear that **ZK is load-bearing** (private balances/amounts that are still provably correct/solvent). Mild-but-sharp beats wild-but-broken — but a polished shielded-stablecoin wallet is squarely the moonshot SDF is fishing for.

---

## 6. Key Links

- Hackathon: https://dorahacks.io/hackathon/stellar-hacks-zk
- ZK docs: https://developers.stellar.org/docs/build/apps/zk · Privacy docs: https://developers.stellar.org/docs/build/apps/privacy
- X-Ray (P25): https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
- Yardstick (P26) upgrade guide: https://stellar.org/blog/foundation-news/stellar-yardstick-protocol-26-upgrade-guide
- Stellar Skills: https://skills.stellar.org/ · ZK skill: https://skills.stellar.org/skills/zk-proofs/SKILL.md
- Private Payments PoC: https://github.com/NethermindEth/stellar-private-payments · docs https://nethermindeth.github.io/stellar-private-payments/
- Verifiers: RISC Zero https://github.com/NethermindEth/stellar-risc0-verifier · Noir/UltraHonk https://github.com/yugocabrio/rs-soroban-ultrahonk · Groth16/Circom https://github.com/stellar/soroban-examples/tree/main/groth16_verifier
- Confidential Token Association: https://www.confidentialtoken.org/ · Privacy Pools whitepaper: https://privacypools.com/whitepaper.pdf
- Tutorials (jamesbachini.com): /noir-on-stellar · /circom-on-stellar · /stellar-risc-zero-games
- Privacy strategy blog: https://stellar.org/blog/ecosystem/strategy-for-privacy-on-blockchain · Financial privacy: https://stellar.org/blog/developers/financial-privacy

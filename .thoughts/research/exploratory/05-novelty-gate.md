# 05 — Novelty Gate: Stellar ZK Privacy Wallet (browser extension)

**Question:** Has anyone already shipped a ZK/privacy *browser-extension* wallet for Stellar
(shielded/private transfers ± private cross-chain bridge)? If so, do we differentiate or fork?

**Date:** 2026-06-21 · **Context:** building for the *Stellar Hacks: Real-World ZK* (DoraHacks) hackathon.

**TL;DR verdict:** The space is **NOT empty, and the single most dangerous overlap is real**: the
**Moonlight Protocol** already has a working **Stellar privacy browser-extension wallet** (Manifest V3,
"Privacy Channel" ZK contracts, SCF-funded, active commits June 2026). Our literal pitch —
"a Stellar browser-extension wallet that does shielded transfers" — **is already taken** by a funded,
production-track team. BUT: every other privacy effort is a *protocol / SDK / contract / web demo*, not a
consumer extension, and **no one has shipped the cross-chain-private-bridge angle inside a wallet**. The
defensible whitespace is narrow and specific (see Verdict).

---

## Tier 1 — DIRECT shape match (this is the threat)

### Moonlight Protocol — `moonlight-protocol/browser-wallet`  ⚠️ SAME SHAPE
- **What:** "The missing privacy layer, built on Stellar." UTXO/notes privacy model (each spend/receipt
  breaks the on-chain traceability graph), Soroban "Privacy Channel" + "Quorum Auth" contracts, off-chain
  "Privacy Providers" (banks/wallets) relay encrypted txs. Hides **both amounts and counterparties**, with
  selective disclosure to auditors.
- **Is it a wallet? An extension?** **YES to both.** Repo `browser-wallet` has a real `manifest.json`
  (`manifest_version: 3`, name "Stellar Custom Wallet", popup + background service worker, Chrome+Firefox),
  Deno/React/Shadcn, depends on `@moonlight/moonlight-sdk`. Last commit **2026-06-17** ("bump moonlight-sdk
  to ^0.10.0… Privacy Channel contract artifacts"). It auto-configures wallet + channel + providers on load
  ("Moonlight Beta defaults"). This is an actively built consumer extension, not a slideware.
- **Org breadth:** `soroban-core` (contracts), `moonlight-sdk` (UTXO derivation, PoolEngine, deposit/withdraw),
  `provider-platform`, `provider-console`, `council-console`, `moonlight-pay`/`pay-platform`, `network-dashboard`,
  `landing-page`. This is a full protocol + tooling org, not a one-repo hack.
- **Funding/legitimacy:** Aha Labs / The Aha Company, **France**. SCF **round 37**, awarded **$134,990**.
  Featured by name in Stellar's official "proving ground for real-world privacy" blog. Whitepaper at
  moonlight-10.gitbook.io. Status: "WIP / beta," SDK APIs still churning.
- **Similarity to us: ~90%.** If our pitch is "browser-extension Stellar wallet with shielded transfers,"
  Moonlight is that, already funded and shipping. Repos: github.com/moonlight-protocol · moonlightprotocol.io

> Note: the Chrome Web Store listing "MoonLight Wallet" (id ooimkpbk…, 144 users, EVM/ETH/BNB/Polygon) is an
> **unrelated namesake** — not Stellar, not ZK. Don't confuse the two.

---

## Tier 2 — Close in privacy, but NOT a consumer extension (primitives & web demos)

These prove the *crypto* exists but leave the *wallet-extension UX* layer open (except Moonlight).

| Project | What | Wallet? | Extension? | Notes |
|---|---|---|---|---|
| **Nethermind — `NethermindEth/stellar-private-payments`** | Privacy-pools PoC: deposit/transfer/withdraw, Groth16/Circom, ASP membership/non-membership Merkle trees, **browser proving via WASM** | No (a "demo app") | **No** — served `make serve` → `localhost:8000` web frontend + ASP admin page | The reference impl Stellar points to. Active (commit 2026-06-19). WIP, unaudited. |
| **`stellar/stellar-confidential-token`** + `jayz22/stellar-confidential-transfer` | Official prototype: confidential tokens on Stellar | No | No | SDF-side standard work (Confidential Token Association). |
| **`brozorec/stellar-confidential-token-demo`** | Confidential token, Pedersen commitments (Grumpkin), **UltraHonk** on-chain proofs, dual-auditor + selective disclosure, **in-browser proving demo** | No (persona-chooser web demo) | No | Closest to "confidential ERC-20 on Stellar," built on OpenZeppelin stellar-contracts. Testnet, unaudited. |
| **`ymcrcat/soroban-privacy-pools`** (+ `jayz22/...-local`) | Privacy pools on Soroban, Groth16/BLS12-381, Poseidon, LeanIMT, ASP | No | No | Research PoC, CLI tools, contract. |
| **LumenShade / Amon Privacy** (github.com/amonprivacy) | "Privacy pools protocol on Stellar," compliant confidential txs | No (protocol) | No | SCF **round 37**, **$135,000**, France. Sibling to Moonlight in funding cohort. |
| **Sanctum / ZK Bricks** (`Lib Sanctum`) | ZK+MPC so contracts compute on secret state | No (infra) | No | SCF-funded ($50k). Privacy *for dapps*, not a wallet. |
| **Root14** | "OpenSSL of ZK" — cryptographic infra underneath privacy apps; *explicitly NOT a wallet/mixer/shielded pool* | No | No | From SDF meeting notes. Pure primitives. |

---

## Tier 3 — "ZK wallet" but DIFFERENT meaning (ZK ≠ privacy here)

These use the words "ZK" + "wallet" but the ZK is for **auth/identity**, not shielded transfers.

- **Sollpay — "Keyless ZK Wallet + Stellar"** (SCF, $118k): mobile-first non-custodial wallet, ZK + account
  abstraction for **phone/email login, no seed phrase**. Also Stellar↔Solana swaps (no privacy claim). ZK is
  for *keyless onboarding*, not hiding amounts. **Not our shape.**
- **human.tech:** keys/wallets/identity infra for personhood + self-custody on Stellar. Identity, not shielded value.
- **Mimoto:** ZK proofs for *identity verification in payments*. Identity, not confidential balances.
- **Zarf** (`projects/zarf.yaml`): non-custodial token distribution — pay to an *email* with ZK claims
  (payroll/vesting). ZK for private *claims*, not a shielded wallet.
- **Unstoppable Wallet:** "privacy-first" mobile wallet w/ Stellar support — but it's *no-tracking/self-custody*
  privacy, **no on-chain shielding/ZK**. Different meaning of "privacy."
- **houdiniswap:** privacy-focused cross-chain swap aggregator (no-KYC) supporting Stellar — a swap service,
  not a wallet, not native ZK.

---

## Tier 4 — Stellar Real-World ZK hackathon submissions seen so far (our actual competition set)

From `gh search repos "Stellar Hacks Real-World ZK"` (live submissions, June 2026). **None is a consumer
privacy wallet extension** — they're payment-rails and agent infra:

- **`PugarHuda/tukar`** — confidential cross-border payment *corridors* on Stellar (ZK, Soroban). App, not a wallet.
- **`Triarchy-Labs/x402-zk-mesh`** — privacy-preserving AI-agent task marketplace; ZK privacy pool + guild
  membership; 3 Circom circuits, 6 Soroban contracts. Infra/marketplace, not a wallet.
- **`leocagli/open-stellar-passport`** — ZK "passport" proving an AI agent is human-backed/solvent without
  revealing identity/balance. Identity proof, not a wallet.
- **`Soroban-shield/*`** — contract security/audit modules + CLI. Not privacy, not a wallet.
- (ZK Gaming sprint repos — battleship, pizzaiolo, dynasties — unrelated.)

**Read:** the hackathon field is leaning toward *agents / payment corridors / identity proofs*. The
**consumer-wallet-extension lane inside this hackathon is open** — the only entity occupying it broadly is
Moonlight, which is an SCF protocol team, not necessarily a hackathon submitter.

---

## Whitespace verdict

**Is the exact idea taken?** "Stellar browser-extension wallet that does shielded/private transfers" →
**effectively yes, by Moonlight** (funded, shipping, MV3 extension + Privacy Channel ZK). Building that
straight is a duplicate of a $135k-funded team and will read as "Moonlight clone" to any judge who knows the
ecosystem. **Do not pitch the generic version.**

**But the field around it is thin:** everything else is contracts/SDK/PoC/web-demo. There is genuine,
defensible whitespace in **three specific framings**, in priority order:

1. **The private cross-chain bridge *inside a wallet* (STRONGEST, least built).** No project found wraps a
   *shielded cross-chain* flow in a wallet UX. Sollpay does Stellar↔Solana swaps but **non-private**;
   houdiniswap is private-ish but a standalone swap service, not a wallet; Moonlight is intra-Stellar UTXO
   privacy with **no cross-chain story**. Pitch: "shield on chain A → prove → unshield on Stellar," exposed as
   a one-click extension action. This is the cleanest non-duplicate. **Caveat:** it's also the hardest to ship
   in a hackathon; scope to one direction (e.g. EVM-shielded → Stellar private claim) and a testnet demo.

2. **A wallet that wraps the *Nethermind/SDF reference* privacy pool — the "Freighter-for-private-payments."**
   Moonlight uses its *own* UTXO/Privacy-Channel design with bank-style Privacy Providers. The official SDF
   direction is Nethermind's ASP privacy-pools + the Confidential-Token standard. **No browser extension wraps
   the SDF/Nethermind stack.** Pitch: a Freighter-style MV3 wallet that's a first-class client of the
   *canonical* private-payments contracts + confidential-token standard (deposit/shield, private transfer,
   selective-disclosure to an auditor). Differentiator vs Moonlight = *standards-aligned & self-sovereign*
   (no Privacy-Provider middlemen), and it directly serves the hackathon's "private payments / confidential
   tokens" prompt. Risk: medium overlap with Moonlight's category, but different trust model and different
   underlying primitives.

3. **Confidential-token (amount-hiding ERC-20-style) wallet UX, not UTXO mixing.** `brozorec`'s
   UltraHonk confidential-token demo and `stellar/stellar-confidential-token` are **demos with no wallet
   product**. A polished extension for "hold/send confidential SEP-41 tokens, with auditor selective-disclosure
   built into the send flow" is unbuilt as a consumer wallet. Narrower than #1/#2 but very shippable and visibly
   novel.

**Recommended claim:** lead with **#1 (private cross-chain bridge in a wallet)** as the headline novelty, and
fall back to **#2 (standards-aligned private-payments wallet, the self-sovereign anti-Moonlight)** if bridge
scope blows up. Avoid the bare "Stellar shielded wallet" framing — that's Moonlight's turf.

**Honesty check:** this is **moderately crowded at the protocol layer, lightly crowded at the wallet layer,
and genuinely open at the (wallet × cross-chain-privacy) intersection.** Differentiate, don't fork — Moonlight's
extension is close enough that a fork would just be a worse Moonlight.

---

## Key links
- Moonlight extension: https://github.com/moonlight-protocol/browser-wallet · org: https://github.com/moonlight-protocol · https://moonlightprotocol.io
- Moonlight SCF: https://communityfund.stellar.org/submissions/recNF9qwGZwrMlDfu (round 37, $134,990)
- Nethermind PoC: https://github.com/NethermindEth/stellar-private-payments
- Confidential token (official): https://github.com/stellar/stellar-confidential-token · demo: https://github.com/brozorec/stellar-confidential-token-demo · transfer PoC: https://github.com/jayz22/stellar-confidential-transfer
- Soroban privacy pools (research): https://github.com/ymcrcat/soroban-privacy-pools
- LumenShade/Amon: https://github.com/amonprivacy (SCF round 37, $135,000)
- Sollpay (keyless ZK, not shielded): https://communityfund.stellar.org/project/sollpay-keyless-zk-wallet-stellar-ts3
- Stellar privacy strategy: https://stellar.org/blog/ecosystem/strategy-for-privacy-on-blockchain · financial-privacy: https://stellar.org/blog/developers/financial-privacy
- Hackathon: https://dorahacks.io/hackathon/stellar-hacks-zk/detail
- Hackathon submissions (GitHub): Triarchy-Labs/x402-zk-mesh · PugarHuda/tukar · leocagli/open-stellar-passport
- Ecosystem DB privacy entries: lumenloop/stellar-ecosystem-db (moonlight, lumenshade, sanctum, zarf, mimoto, human-tech, stellot, houdiniswap, unstoppable-wallet)

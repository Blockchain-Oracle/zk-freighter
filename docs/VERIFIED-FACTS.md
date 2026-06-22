# Verified Facts Dossier

**Trust summary:** 9 of 9 claims CONFIRMED (all high confidence). 0 refuted, 0 partial, 0 unverifiable. Cross-chain showcase: feasible on real testnet today (moderate demoability). Every claim carries minor real-world nuances — none change a verdict, but several matter for build decisions and are flagged below.

---

## Table of Contents

1. [The hackathon](#1-the-hackathon) — CONFIRMED
2. [Moonlight Protocol exists](#2-moonlight-protocol-exists) — CONFIRMED
3. [Moonlight is not ZK](#3-moonlight-is-not-zk) — CONFIRMED
4. [Nethermind privacy pool](#4-nethermind-privacy-pool) — CONFIRMED
5. [Stellar ZK host functions](#5-stellar-zk-host-functions) — CONFIRMED
6. [Passkey PRF for encryption](#6-passkey-prf-for-encryption) — CONFIRMED
7. [Stellar passkey accounts (passkey-kit)](#7-stellar-passkey-accounts-passkey-kit) — CONFIRMED
8. [Circle CCTP on Stellar](#8-circle-cctp-on-stellar) — CONFIRMED
9. [Private-by-default is a myth](#9-private-by-default-is-a-myth) — CONFIRMED
10. [WXT extension framework](#10-wxt-extension-framework) — CONFIRMED
- [Cross-chain showcase verdict](#cross-chain-showcase-verdict)
- [Corrections & open questions](#corrections--open-questions)

---

## 1. The hackathon

**Claim, plainly:** The target event is "Stellar Hacks: Real-World ZK," run by the Stellar Development Foundation on DoraHacks. Submissions close 29 June 2026 at 19:00 UTC, prize pool is ~$10,000 (paid in XLM, split five ways), and entries need a public open-source repo with a README, a 2-3 minute demo video, and load-bearing zero-knowledge crypto tied to Stellar.

**Verdict: CONFIRMED — high confidence.**

The live DoraHacks page was rendered in a real browser (the site sits behind an AWS WAF CAPTCHA that blocks plain HTTP fetches) and every checked element matched: title, SDF as organizer, the $10,000 pool, the three submission requirements, and the prize split (1st $5,000 / 2nd $2,000 / 3rd $1,250 / 4th $1,000 / 5th $750). The canonical deadline was read straight from the page's machine-readable application state, not the human-facing label.

**Corrections to earlier assumptions:** None — but watch a display quirk. The page's "Key Dates" text says "June 29, 12:00PM PST" and the countdown widget showed "2026/06/29 20:00" (timezone artifact). The authoritative value is `endTime=1782759600000ms = 2026-06-29T19:00:00Z`, which matches the claim's 19:00 UTC exactly. Submissions open `startTime=1781506800000ms = 2026-06-15T07:00:00Z`. Trust the machine timestamp, not the surface labels.

**Key citations:**
- Live page (browser-rendered, passed CAPTCHA): https://dorahacks.io/hackathon/stellar-hacks-zk/detail
- Nuxt app state (canonical timestamps): same URL, `window.__NUXT__` hackathon `_data`
- Independent search corroboration: https://dorahacks.io/hackathon/stellar-hacks-zk

---

## 2. Moonlight Protocol exists

**Claim, plainly:** Moonlight Protocol is a real Stellar privacy-payments project by The Aha Company, with a live GitHub org (17 public repos: browser-extension wallet, SDK, smart contracts), active commits through mid-June 2026, ~$135k in Stellar Community Fund round-37 funding, and a name-check in Stellar's official privacy blog.

**Verdict: CONFIRMED — high confidence.**

The GitHub org `Moonlight-Protocol` (id 203846951, 17 public repos, created 2025-03-18) is real, with commits as recent as 2026-06-17 by `gorka@theaha.co`. The cloned repos confirm a real MV3 browser extension, a testnet-configured SDK (`https://soroban-testnet.stellar.org`), and real Soroban contracts. Stellar's own blog name-checks it as "a UTXO-based privacy layer on Stellar funded by the Stellar Community Fund," and SCF round-37 funding was exactly $134,990 in XLM.

**Corrections to earlier assumptions:** Two refinements. (1) "Open-source" is only partly right — the repos are **public and readable but carry no LICENSE file** (GitHub API reports `license=null`), so this is publicly-available source, not formally OSI-licensed open source. If you reference Moonlight as "open source" anywhere, soften it to "public/source-available." (2) The org tags itself `[wip]` and the funding rounds to ~$135k exactly. Naming: the org is capitalized `Moonlight-Protocol`; the company contact appears as both `theaha.co` and `theahaco.co`.

**Key citations:**
- Org metadata: https://api.github.com/orgs/Moonlight-Protocol
- Recent commits: https://api.github.com/repos/Moonlight-Protocol/moonlight-sdk/commits
- License=null evidence: https://api.github.com/repos/Moonlight-Protocol/soroban-core
- Stellar blog name-check: https://stellar.org/blog/ecosystem/strategy-for-privacy-on-blockchain
- SCF #37 recap ($134,990): https://www.bitcoininsider.org/article/282803/scf-37-round-recap

---

## 3. Moonlight is not ZK

**Claim, plainly:** Moonlight's privacy is statistical, not cryptographic. It uses **no zero-knowledge proofs** — its whitepaper explicitly rejects them. Privacy comes from splitting funds into random-sized chunks (UTXOs) plus a mandatory trusted Privacy Provider that relays the transaction so the user's address never appears on-chain. Amounts are plaintext on-chain, the provider keeps off-chain identity logs (custodial compliance), and the beta is seed-phrase only, XLM-only, no USDC.

**Verdict: CONFIRMED — high confidence.**

Every sub-claim verified against source. The whitepaper explicitly rejects ZK as too heavyweight (the only ZK mention in any Moonlight repo). The auth contract sets `PROVIDER_THRESHOLD=1` and errors `ProviderThresholdNotMet` without a registered provider signature, making the relayer mandatory. Storage holds UTXO amounts as plain `i128` — no encryption or commitments. The wallet's seed env is `SEED_ASSET_CODE=XLM` with zero USDC and zero passkey/WebAuthn references.

**Corrections to earlier assumptions:** None. One nuance worth holding: the relayer hides the user's address from *outside observers*, but the provider itself logs identity-to-activity (linked to SEP-10 sessions) — so Moonlight is privacy-from-the-public, not privacy-from-the-operator. The contract generically supports any single Stellar asset, but only XLM is wired in the beta, so "XLM-only" is correct in practice.

**Why this matters for the founder:** This is the competitive gap. Moonlight is the funded incumbent, but it has **no ZK** and a **mandatory trusted relayer** — both directly addressable by a ZK-native, non-custodial design that fits the hackathon's "load-bearing ZK" requirement.

**Key citations:**
- Whitepaper (rejects ZK): `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/docs/readme/whitepaper/the-privacy-challenge-on-public-dlts.md`
- Mandatory relayer: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/soroban-core/modules/auth/src/core.rs`
- Plaintext amounts: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/soroban-core/modules/storage/src/lib.rs`
- Custodial compliance: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/docs/privacy-providers/compliance-and-audit.md`
- XLM-only seed: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/browser-wallet/.env.seed.example`

---

## 4. Nethermind privacy pool

**Claim, plainly:** `NethermindEth/stellar-private-payments` is a working reference implementation of "Privacy Pools" (private transfers that still let an operator screen bad actors) on Stellar. It uses zero-knowledge proofs generated in the browser and verified by a smart contract on Stellar testnet. The team labels it work-in-progress and explicitly **not security-audited**.

**Verdict: CONFIRMED — high confidence.**

The repo README confirms a privacy-pools reference implementation using Groth16 proofs via Circom circuits, browser-based proving over WebAssembly, ASP membership + non-membership trees, and an on-chain Circom Groth16 verifier — plus an explicit "not audited" warning. Real Circom circuits, a Soroban BN254 Groth16 verifier contract, ASP contract directories, a testnet deployments manifest, and a browser WASM proving facade all exist in the cloned repo. The live GitHub Pages demo runs on testnet.

**Corrections to earlier assumptions:** None. Naming note: the deployed demo brands itself "PoolStellar" but it is the same `NethermindEth/stellar-private-payments` project. The deployed testnet pool moves **native XLM** (`"asset":{"kind":"native"}` in `deployments.json`), not a wrapped token.

**Key citations:**
- README (Groth16/Circom, ASP, not-audited): `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments/README.md`
- Soroban Groth16 verifier: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments/contracts/circom-groth16-verifier/src/lib.rs`
- Testnet deployments (native XLM): `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments/deployments/testnet/deployments.json`
- Live docs/demo: https://nethermindeth.github.io/stellar-private-payments

---

## 5. Stellar ZK host functions

**Claim, plainly:** Stellar added native zero-knowledge crypto primitives to the chain. Protocol 25 (X-Ray, live January 2026) gave Soroban contracts built-in BN254 curve ops (`g1_add`, `g1_mul`, `pairing_check`) and Poseidon/Poseidon2 hashes — the same primitives Ethereum exposes via EIP-196/EIP-197 precompiles. Protocol 26 (Yardstick, live May 2026) added more BN254 helpers to make proof verification cheaper. Together they let a contract verify a Groth16 proof on-chain far more cheaply.

**Verdict: CONFIRMED — high confidence.**

CAP-0074 ("Host functions for BN254," min protocol 25) adds the BN254 ops and explicitly targets EIP-196/EIP-197 parity. CAP-0075 adds Poseidon/Poseidon2 (protocol 25, Final). The official Stellar ZK docs and X-Ray blog confirm protocol 25 and the code-name. The Yardstick blog confirms protocol 26 (mainnet 6 May 2026) and CAP-0080's additional BN254 functions. A real Soroban contract in the research repos (`stellar-risc0-verifier`) calls `env.crypto().bn254()` with `g1_mul`/`g1_add`/`pairing_check` to do a Groth16 pairing check on-chain.

**Corrections to earlier assumptions:** Essentially none. Two clarifications: (1) CAP-0074's spec names are `bn254_g1_add` / `bn254_g1_mul` / `bn254_multi_pairing_check`; the Soroban SDK surfaces these to contract authors as `g1_add` / `g1_mul` / `pairing_check`, so the claim's developer-level naming is accurate. (2) The host functions are **primitives, not a Groth16 verifier by themselves** — a verifier contract built on top does the actual proof check (exactly what the risc0-verifier repo provides). Protocol 26's cheaper verification comes via CAP-0080 (multi-scalar multiplication, scalar-field arithmetic, curve-membership checks).

**Key citations:**
- CAP-0074: https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md
- CAP-0075: https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md
- Official ZK docs: https://developers.stellar.org/docs/build/apps/zk
- X-Ray (P25) blog: https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
- Yardstick (P26) blog: https://stellar.org/blog/foundation-news/yardstick-stellar-protocol-26
- Working verifier contract: `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-risc0-verifier/contracts/groth16-verifier/src/lib.rs`

---

## 6. Passkey PRF for encryption

**Claim, plainly:** The WebAuthn PRF extension is a real, shipped browser feature. It lets a website ask a passkey to return a secret number tied to that passkey plus a chosen salt. The output is deterministic — same passkey + same salt always yields the same 32-byte secret — so it can be turned into an encryption key to lock/unlock a user's private data. Real products (Bitwarden, Dashlane in production; wwWallet as open reference) already use it, and it works in current Chrome. Browser extensions can use WebAuthn with the right host permissions, but extension popups are a bad target because the credential prompt can close them; use an extension page, tab, or side panel.

**Verdict: CONFIRMED — high confidence.**

MDN documents the `prf` extension as a deterministic random-oracle PRF and cites symmetric-key generation as a use case. Yubico's guide confirms a deterministic 32-byte high-entropy output (to be run through HKDF). Bitwarden's contributing docs confirm production PRF-based vault decryption in web and extension contexts. Corbado confirms Dashlane + Bitwarden as adopters and wwWallet as a reference. MDN confirms extensions can call `navigator.credentials.get()` for domains in `host_permissions`, and separately warns that popup flows may fail because the popup closes during the WebAuthn prompt.

**Corrections to earlier assumptions:** Core claim is correct, with one version precision: the PRF extension first shipped enabled-by-default around **Chrome 116 (2023)**, not 132. "Chrome ~132+" is accurate as the point PRF became reliably usable via platform authenticators on macOS (iCloud Keychain); full PRF-on-create for Windows Hello only landed in Chrome 147 — so availability is **authenticator-and-OS dependent**, not one clean version cutoff. Two technical caveats that do *not* break determinism: the raw PRF output should be passed through HKDF rather than used directly as a key, and the spec hashes your salt with a fixed "WebAuthn PRF" context string before evaluation. Bitwarden's marketing blog uses hypothetical "can use" phrasing, but its engineering docs confirm it is shipped — treat the engineering docs as the source of truth.

**Key citations:**
- MDN PRF (deterministic + key-gen use case): https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
- Yubico PRF guide (32-byte, HKDF): https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html
- Bitwarden production PRF: https://contributing.bitwarden.com/architecture/deep-dives/passkeys/implementations/relying-party/prf/
- Chrome version progression: https://www.corbado.com/blog/passkeys-prf-webauthn
- Extensions can call WebAuthn: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api

---

## 7. Stellar passkey accounts (passkey-kit)

**Claim, plainly:** Stellar lets people control blockchain accounts with passkeys (WebAuthn fingerprint/face unlock). Protocol 21 (June 2024) added a built-in function letting Soroban contracts check passkey signatures (the secp256r1 curve). Developer kalepail published an open-source `passkey-kit` toolkit that makes passkey-controlled wallets buildable; he has since marked it "legacy" and points new builders to a successor, `smart-account-kit`, which wraps audited OpenZeppelin contracts. Real and usable, with the caveat that passkey-kit is unaudited and superseded.

**Verdict: CONFIRMED — high confidence.**

CAP-0051 ("Smart Contract Host Functionality: Secp256r1 Verification," status Final, protocol 21) adds the host function `verify_sig_ecdsa_secp256r1`, described as the standard behind passkeys/WebAuthn. The `passkey-kit` README confirms an open-source TS SDK for Stellar smart wallets using passkeys (secp256r1), Ed25519, and policy signers — and now flags itself as a legacy, unaudited precursor pointing to `smart-account-kit`. `smart-account-kit` (Apache-2.0) is the active successor built on OpenZeppelin's `stellar-contracts`.

**Corrections to earlier assumptions:** Nothing wrong. Two clarifications: (1) the exact mechanism is CAP-0051, included in Protocol 21, so "Protocol 21+" is accurate. (2) passkey-kit is "buildable" but **prefer the successor** `smart-account-kit` for any real work — it's actively maintained and built on audited contracts, whereas passkey-kit is explicitly unaudited.

**Key citations:**
- CAP-0051 (secp256r1, Final, P21): https://raw.githubusercontent.com/stellar/stellar-protocol/master/core/cap-0051.md
- passkey-kit (legacy notice): https://github.com/kalepail/passkey-kit
- smart-account-kit (successor, Apache-2.0): https://github.com/kalepail/smart-account-kit

---

## 8. Circle CCTP on Stellar

**Claim, plainly:** Circle's CCTP supports Stellar with native USDC (burn-and-mint), including CCTP V2 with Hooks / CctpForwarder for atomic mint-and-forward in one Soroban invocation, domain id 27, on both mainnet and testnet.

**Verdict: CONFIRMED — high confidence.**

Circle's supported-chains docs list Stellar as domain 27 on mainnet and testnet with native USDC. (See the cross-chain section below for the important nuance on what "mint-and-forward" actually does — it is a plain token transfer, not an arbitrary contract call.)

**Corrections to earlier assumptions:** None to the bridging claim itself. The one thing to internalize before building: "forward" ≠ "deposit into your contract." Details in the cross-chain verdict.

**Key citations:**
- Supported chains (domain 27): https://developers.circle.com/cctp/concepts/supported-chains-and-domains

---

## 9. Private-by-default is a myth

**Claim, plainly:** You cannot make a Stellar wallet "fully private by default." Stellar's own docs state plainly that it is a public blockchain where every transaction is visible. Privacy exists only inside two specific tools: Privacy Pools (deposits/withdrawals stay public, but in-pool transfers can be hidden) and Confidential Tokens (amounts/balances hidden, sender/receiver addresses stay public). The honest framing is "shielded transfers" — Stellar's own word — not "a fully private wallet."

**Verdict: CONFIRMED — high confidence.**

Stellar's developer docs say verbatim: "Stellar is a public blockchain: every transaction is recorded onchain and visible to anyone." Privacy Pools keep deposits/withdrawals visible while hiding in-pool transactions; Confidential Tokens hide amounts/balances while keeping addresses public. Privacy is scoped to specific use cases (payments, settlement, payroll), and Stellar's own materials use "shielded."

**Corrections to earlier assumptions:** Essentially none. Three precision notes: (a) the docs also list adjacent ZK building blocks (on-chain verifiers, BLS12-381/BN254/Poseidon) — these are plumbing, not a third "make-everything-private" mode. (b) The sub-claim "arbitrary contract calls can't be private" is correct in substance but is an **inference from absence** — the docs scope privacy to specific use cases and never offer general private execution, rather than explicitly forbidding it. (c) The `developers.stellar.org/docs/build/apps/privacy` page doesn't use the exact phrase "shielded transfers," but Stellar's Private Payments / financial-privacy materials do ("shielded deposits, transfers, and withdrawals"), so the framing is genuinely Stellar's.

**Why this matters for the founder:** Be precise in pitch copy. Say "shielded transfers" / "confidential amounts," never "fully private wallet" — the latter is contradicted by Stellar's own docs and will read as a red flag to informed judges.

**Key citations:**
- Privacy on Stellar (public-by-default, verbatim): https://developers.stellar.org/docs/build/apps/privacy
- Financial privacy ("shielded"): https://stellar.org/blog/developers/financial-privacy
- Prototyping Privacy Pools: https://stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar

---

## 10. WXT extension framework

**Claim, plainly:** WXT (wxt.dev) is a genuine, actively-maintained browser-extension framework built on Vite, supporting React + TypeScript, file-based entrypoints, hot-reload, and multi-browser MV3 output from one setup. It supports bundling WebAssembly (with a `wasm-unsafe-eval` manifest CSP). The named alternative, Plasmo, is comparatively in maintenance mode.

**Verdict: CONFIRMED — high confidence.**

GitHub API confirms WXT is active (10,037 stars, `archived=false`, pushed same day as verification), with a steady 2026 release cadence (latest 0.20.26, 2026-05-11). The homepage confirms file-based entrypoints, fast HMR, multi-browser MV3, and any-Vite-framework support. WXT's source ships `wasm-unsafe-eval` in its default MV3 CSP. Plasmo's latest npm release is 2025-05-17 (~13 months stale).

**Corrections to earlier assumptions:** Nothing wrong. Two refinements: (1) WXT goes further than the claim — it ships `wasm-unsafe-eval` in its **default** MV3 extension-pages CSP, so WASM works out of the box with no manual CSP config. (2) On Plasmo: "maintenance mode" is fair by release cadence, but its GitHub repo is **not archived** and shows recent commits — so it's "comparatively stale," not formally abandoned.

**Key citations:**
- WXT repo metadata (active): https://api.github.com/repos/wxt-dev/wxt
- npm latest (0.20.26): https://registry.npmjs.org/wxt
- Plasmo npm (stale): https://registry.npmjs.org/plasmo
- Default WASM CSP in source: https://raw.githubusercontent.com/wxt-dev/wxt/main/packages/wxt/src/core/utils/manifest.ts
- React + Vite docs: https://raw.githubusercontent.com/wxt-dev/wxt/main/docs/guide/essentials/frontend-frameworks.md

---

## Cross-chain showcase verdict

**Can you showcase "USDC moves from Ethereum and arrives natively on Stellar, then gets shielded"? YES — on real testnet today. Demoability: MODERATE.**

The bridging leg is **real, not a mock.** Circle CCTP V2 is live on Stellar testnet with documented contracts, domain 27, and the standard sandbox attestation API. Sepolia → Stellar-testnet native USDC bridging is confirmed.

**The catch — read before scoping:** mint-and-shield is **NOT automatically atomic.** Circle's Stellar `CctpForwarder.mint_and_forward` does a plain SAC token *transfer* to a recipient after minting (confirmed in source: `token_client.transfer(...)`) — it does **not** call an arbitrary `deposit()` on your contract. Atomic shielding would require your privacy-pool contract to implement a token-receiver hook and be set as the forward recipient — non-standard on Soroban and the riskiest unknown.

**Recommended demo (two-leg, ~1 week, all real testnet digests):**
1. Get Sepolia testnet USDC + ETH from faucet.circle.com.
2. Source burn: approve USDC → `TokenMessengerV2.depositForBurn` on Sepolia, `destinationDomain=27`, `mintRecipient` = Stellar CctpForwarder, `hookData` = final recipient strkey.
3. Poll the sandbox attestation API (`https://iris-api-sandbox.circle.com`, v2) until complete.
4. On Stellar testnet, invoke `CctpForwarder.mint_and_forward(message, attestation)` — native USDC mints and transfers to your recipient. This is the "arrives on Stellar" moment.
5. **Shield as a separate Soroban tx**: call the privacy-pool `transact()` path with a positive `ext_amount` using the just-minted USDC.

UI shows a four/five-step timeline, each linking to a real explorer (Etherscan Sepolia / Stellar Expert testnet).

**Confirmed testnet contracts:** TokenMessengerMinter `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP` · MessageTransmitter `CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY` · CctpForwarder `CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ`. Circle's `circlefin/stellar-cctp` repo is V2 and was last pushed 2026-06-18.

**Cross-chain citations:**
- Supported chains (domain 27): https://developers.circle.com/cctp/cctp-supported-blockchains
- CCTP on Stellar (mint_and_forward is recipient-only): https://developers.circle.com/cctp/references/stellar
- Testnet contract IDs: https://developers.circle.com/cctp/references/stellar-contracts
- Forwarder source (plain transfer, not arbitrary call): https://github.com/circlefin/stellar-cctp/blob/master/contracts/cctp-forwarder/src/contract.rs
- Testnet faucet: https://faucet.circle.com/

---

## Corrections & open questions

**Refuted:** None.
**Partial:** None.
**Unverifiable:** None.

All 9 claims confirmed at high confidence. Below are the nuances and corrections that don't change a verdict but affect how you pitch or build:

**Pitch-language corrections (avoid overstatement):**
- **Moonlight is "source-available," not "open source"** — public repos but no LICENSE file (`license=null`). [Claim 2]
- **Never say "fully private wallet" for Stellar** — Stellar's own docs say it is public-by-default; use "shielded transfers" / "confidential amounts." [Claim 9]
- **Hackathon deadline is 19:00 UTC** per the machine-readable timestamp — ignore the page's confusing "12:00PM PST" / "20:00" surface labels. [Claim 1]

**Build-decision corrections:**
- **Atomic mint-and-shield is the single biggest risk.** Circle's forwarder only does a plain token transfer, not a `deposit()` call. Default to a two-step demo (mint, then shield). The privacy-pool contract — not the bridge — is where the week of work actually goes. [Cross-chain]
- **Prefer `smart-account-kit` over `passkey-kit`** — the latter is explicitly legacy and unaudited; the successor wraps audited OpenZeppelin contracts. [Claim 7]
- **Passkey PRF availability is OS/authenticator-dependent**, not a single Chrome version. macOS iCloud Keychain works ~Chrome 132; full Windows Hello PRF-on-create only at Chrome 147. Run raw PRF output through HKDF. [Claim 6]
- **Stellar ZK host functions are primitives, not a verifier** — you still need a verifier contract on top (the `stellar-risc0-verifier` and Nethermind repos are working examples to crib from). [Claims 5, 4]
- **dUSDC (your existing Predict token) is not USDC** — the CCTP flow brings real Circle USDC to Stellar, a different asset/issuer. Don't conflate them in the demo. [Cross-chain]

**Open questions to resolve at build time (not blockers, but unverified here):**
- Exact Ethereum Sepolia CCTP V2 `TokenMessengerV2` / `MessageTransmitterV2` addresses — pull live from developers.circle.com rather than hardcoding from memory.
- The precise v2 Iris attestation polling endpoint path.
- Whether Circle's faucet currently dispenses on **both** Sepolia and Stellar testnet simultaneously (it lists both).
- Whether any existing testnet shielded-deposit contract can be reused for the shield leg (would cut the week's scope significantly) versus writing your own.

**Cross-chain bottom line:** Showcasing native USDC arriving on Stellar is real and demoable on testnet this week. The "then shielded" leg is real but a separate transaction — keep it two-step and honest, and every leg carries a verifiable explorer digest.

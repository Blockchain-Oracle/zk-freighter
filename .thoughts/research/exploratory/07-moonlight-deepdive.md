# Moonlight Protocol — Competitive Teardown

**Date:** 2026-06-21
**Author:** competitive-intel agent
**Subject:** Moonlight Protocol — Stellar privacy browser-extension wallet by The Aha Company (formerly Aha Labs), SCF round-37 funded (~$135k), name-checked in Stellar's official privacy blog.

> **Headline verdict:** Moonlight is a real, actively-developed, multi-repo, contract-audited system with a polished beta wallet. But its privacy is **statistical, not cryptographic** — there are **NO zero-knowledge proofs, NO encrypted amounts, NO commitments anywhere**. Privacy = UTXO-fragmentation entropy + a trusted relayer ("Privacy Provider") that submits on your behalf. Amounts and the full UTXO set are **plaintext on-chain**. This is the central, exploitable gap.

---

## 1. Who / What / Where

- **Team:** The Aha Company (formerly Aha Labs), Stellar-native. Contact `moonlight@theaha.co`. Site: https://moonlightprotocol.io
- **GitHub org:** https://github.com/Moonlight-Protocol — **all repos public**, very active (latest commits **June 19-20, 2026**, days before this teardown).
- **Docs:** https://moonlight-10.gitbook.io/moonlight-docs (source in `docs` repo, VitePress)
- **Network dashboard (live):** https://network-dashboard.fly.storage.tigris.dev/index.html
- **Tagline:** "Privacy layer for Stellar — Send, receive, and store assets without revealing on-chain who owns what."
- **Whitepaper:** explicitly "a work in progress."

### Repos (cloned shallow to `/Users/abu/dev/hackathon/stellar-research/repos/`)
| Repo | Role | Last commit |
|---|---|---|
| `soroban-core` | **The two on-chain contracts** (Privacy Channel + Channel/Quorum Auth) + Rust modules | 2026-06-17 |
| `moonlight-sdk` | TS/Deno SDK: key derivation, UTXO accounts, bundle building. Published on **JSR**. | 2026-06-17 |
| `browser-wallet` | **The wallet** — MV3 Chrome/Firefox extension, Deno + React 18 | 2026-06-17 |
| `provider-platform` | The relayer ("Privacy Provider") backend service (Deno) — mempool/executor/verifier | 2026-06-19 |
| `council-platform` | Council/governance backend (provider registry admin) | 2026-06-19 |
| `pay-platform` | "Moonlight Pay" wallet-based account service | 2026-06-17 |
| `provider-console`, `council-console`, `network-dashboard`, `ui`, `landing-page`, `docs`, `local-dev` | consoles, shared UI, infra | various |

> Note: `stellar-private-payments` and `stellar-risc0-verifier` also present in the repos dir are **NethermindEth** repos (a *separate* Stellar privacy effort, RISC0-based), NOT Moonlight. Don't confuse them.

---

## 2. The Privacy Model — "Privacy Channel"

Source of truth: `soroban-core/contracts/arch.md`, `soroban-core/contracts/privacy-channel/src/*`, `docs/privacy-providers/entropy-and-privacy.md`, `docs/readme/whitepaper/the-privacy-challenge-on-public-dlts.md`.

### Architecture (2 contracts)
1. **Privacy Channel** (`contracts/privacy-channel/`) — holds **one** Stellar asset (a SAC address, e.g. XLM) and tracks a UTXO set. Single entry point `transact(op: ChannelOperation)` does any mix of:
   - `spend` (consume existing UTXOs), `create` (mint new UTXOs), `deposit` (ExtDeposit: pull asset in), `withdraw` (ExtWithdraw: push asset out).
   - UTXOs keyed by **65-byte SEC1-uncompressed P256 (secp256r1) public keys**. Stored as `UtxoMeta { amount: i128, drawer_id, slot_idx }` + a spent/unspent bit in a 524,288-slot bitmap ("drawer" storage).
2. **Channel Auth / "Quorum Auth"** (`contracts/channel-auth/`) — a `CustomAccountInterface` contract. On every `transact`, the host calls its `__check_auth`, which verifies (a) **≥1 registered Privacy Provider Ed25519 signature** (`PROVIDER_THRESHOLD` hardcoded = **1**) and (b) a **P256 signature per spent UTXO owner** over the conditions they authorize. One Auth contract can govern many Channels (a "quorum").

### What's hidden vs. visible — **THE KEY FINDING**
- **Visible / plaintext on-chain:** every UTXO **amount** (`i128`), the full UTXO set, total channel `supply`, and the **deposit/withdraw amounts + the external G-address** on the SAC `transfer` events. There is **no encryption and no commitment** of amounts.
- **Hidden (only):** the **link** between a depositor and a withdrawer, because (1) value is **fragmented** into many UTXOs of random sizes, and (2) the **relayer's treasury account**, not the user, is the on-chain submitter. Pure internal `spend`/`create` bundles emit **zero Soroban events** (events suppressed via `no-utxo-events`/`no-bundle-events` cargo features) — so internal transfers leave no event trail, only footprint/storage deltas.
- **Privacy is statistical, not cryptographic.** From `docs/privacy-providers/entropy-and-privacy.md` (verbatim): *"With a single UTXO, the transaction amount stays whole. Anyone scanning the UTXO set can match deposit and withdrawal amounts directly."* and *"A busy channel with MEDIUM entropy is more private than a dead channel with V_HIGH."* → **Privacy depends on channel volume + subset-sum hardness, not on a hiding primitive.** On the BTC/Zcash spectrum this is closer to a **CoinJoin/mixer with extra steps** than a shielded pool.

### Entropy levels (user-exposed)
LOW (1 UTXO — *no amount privacy*, address-only) / MEDIUM (5, default) / HIGH (10) / V_HIGH (15-20). Higher entropy = more UTXO splits = higher fee (0.05 → 1.0 XLM). Wallet exposes this as a dropdown per operation: *"Higher entropy = Increased privacy."*

---

## 3. ZK Stack — **THERE ISN'T ONE**

- **No Circom/Groth16, no Noir, no RISC0, no Halo2/Plonk, no Bulletproofs, no Pedersen commitments.** A full grep across `soroban-core`, `moonlight-sdk`, `browser-wallet`, `provider-platform` for `groth16|circom|bulletproof|snark|risc0|halo2|plonk|zero-knowledge|noir` returns **one** hit: a *prose* mention in `docs/readme/whitepaper/the-privacy-challenge-on-public-dlts.md` that explicitly **rejects** ZK: *"Layering zero-knowledge proofs directly on account-based balances is theoretically possible, but it may demand heavyweight circuits and complex trusted-setup workflows. Moonlight pursues the same privacy end-state with lighter, purpose-built techniques."*
- **Crypto actually used:** secp256r1 (P256) ECDSA for UTXO ownership + Ed25519 for provider auth, SHA-256 for hashing/key storage. Signature verify runs in the Soroban host (`secp256r1_verify`, `ed25519_verify`). No proving runs anywhere (no client WASM prover).
- **Implication:** Moonlight is **cheap and Soroban-native** (no proof gas), but provides **no confidentiality of amounts** and no mathematically guaranteed unlinkability. It is betting that Stellar's *upcoming* protocol ZK host functions (BN254, bulletproofs, ZK-hashes — see Stellar privacy blog) are not needed for its model.

---

## 4. Asset / Network / Deployed Addresses

- **Asset:** **XLM only** in the beta. Channel holds exactly one SAC. `SEED_ASSET_CODE=XLM`, native (empty issuer). Architecture supports any SAC; only XLM is wired up. **No USDC channel exists.**
- **Network:** **Testnet** ("Moonlight Beta"). SDK integration tests run against **public Stellar testnet** (`NetworkConfig.TestNet()`); no mainnet deployment evidenced.
- **Deployed beta Privacy Channel (testnet):** `CDMZSHMT2AIL2UG7XBOHZKXM6FY3MUP75HAXUUSAHLGRQ2VWPGYKPM5T` (from `browser-wallet/.env.seed.example`, channel name "Moonlight Beta").
- Other C-addresses observed in code (mix of real + placeholder): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, `CAF7DFHTPSYIW5543WBXJODZCDI5WF5SSHBXGMPKFOYPFRDVWFDNBGX7`, `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`. (Verify roles before citing.)
- **Beta providers (relayers), live on fly.dev:**
  - Provider A: `https://moonlight-beta-privacy-provider-a.fly.dev`
  - Provider B: `https://moonlight-beta-privacy-provider-b.fly.dev`
- **Toolchain:** Rust 2021, `soroban-sdk =25.3.0`, OpenZeppelin Stellar `stellar-access`/`stellar-contract-utils =0.7.1` (Ownable two-step admin + upgradeable), WASM target `wasm32v1-none`. Contracts are **upgradeable** by admin and **audit-scoped** (`arch.md` is written for auditors).

---

## 5. Wallet Architecture & Key Management

Source: `browser-wallet/`, `moonlight-sdk/src/`, Explore subagent UX map.

- **Manifest V3.** `manifest.json` name = **"Stellar Custom Wallet" v0.1.4**, perms `["storage"]`, background service worker, popup. Firefox-compatible (`browser_specific_settings.gecko`). **NOT on the Chrome Web Store** (the "MoonLight Wallet" listing in the store is an unrelated EVM wallet).
- **Stack:** **Deno + React 18**, Tailwind 4 + Radix/shadcn (oklch glassmorphic design), Elf (`@ngneat/elf`) state, esbuild. No router lib — a state-machine `PopupProvider`. SEP-10 auth via `@colibri/core`.
- **Key management = seed phrase, NOT passkey.** **BIP39 12-word mnemonic** (or raw Ed25519 secret import) → encrypted with a **vault password** in extension storage. **No passkey/WebAuthn, no social/MPC recovery.**
- **UTXO key derivation (`moonlight-sdk/src/utils/secp256r1/deriveP256KeyPairFromSeed.ts`):** root secret → SHA-256 seed → `hkdf(sha256, ..., info="application", 48)` → `mapHashToField` → **deterministic P256 keypair** (uses `@noble/curves/p256`). Derivation path captures **context** (network + channel contract ID) + **root** + an incrementing **index** → each UTXO gets a fresh address from one recovery secret. Library: `@noble/curves`, `@noble/hashes`.
- **Spend keys:** the per-UTXO P256 secret keys (one per derived index) ARE the spend keys; signing a UTXO's `conditions` authorizes its spend.
- **No view keys.** There is no separate viewing-key concept on the user side — see §6.

---

## 6. Compliance / Selective-Disclosure / Auditor Story — **Relayer-custodial, not cryptographic**

Source: `docs/privacy-providers/compliance-and-audit.md`, `what-is-a-privacy-provider.md`, `docs/councils/*`.

- **There is NO user-held view key and NO cryptographic selective disclosure.** Compliance is entirely **off-chain and relayer-held**.
- **The "auditor story":** every **Privacy Provider** must **record off-chain** for each bundle: SEP-10 session identity (user pubkey), full bundle (inputs/outputs/signatures), tx hash/ledger/timestamp, outcome, and (for fiat/cross-chain ramps) payment reference + amount/source. *"Every provider holds the off-chain data needed to link on-chain activity to authenticated user sessions."*
- **Audit flow:** auditor spots a bundle on-chain → identifies submitting provider via treasury address → contacts provider through council channels → provider discloses its records. A provider can only disclose what **it** processed.
- **Governance = "Councils"** (smart-contract provider registries). Councils set KYC/KYB, retention, reporting. **But:** doc carries a warning — *"Council governance and compliance policy enforcement mechanisms are under development. The current protocol version uses centralized admin control."* The Channel Auth admin is described as the **"Moonlight Security Council" multisig**.
- **Posture:** "Privacy is not anonymity." Providers positioned as **accountable intermediaries** for Travel Rule / data-protection. This is a deliberate *permissioned-privacy* stance — closer to a bank's confidentiality than to censorship-resistant anonymity.

---

## 7. Relayer / Middleman Model — **Mandatory, trusted, non-self-sovereign**

- **A "Privacy Provider" relayer is REQUIRED.** `PROVIDER_THRESHOLD = 1`: **no bundle can be submitted without a registered provider's Ed25519 signature.** You cannot transact peer-to-peer or self-submit.
- Provider = off-chain Deno service (`provider-platform`) with: an **Ed25519 identity** (registered in a council contract) + a funded **treasury Stellar account** that pays fees and is the on-chain submitter + an API URL. It runs a **mempool/executor/verifier**, can **add mixing ops** to bump entropy, and **batches** bundles.
- Users add providers per channel (UI: name + URL ending in the provider's G-pubkey), authenticate via **SEP-10**, and the selection is **channel-level sticky** (not per-tx). Beta ships two providers on fly.dev.
- **Trust implications:** the provider sees the user's identity↔activity link (that's the whole compliance model), is a **liveness/censorship chokepoint** (it can refuse to submit), and is the de-facto KYC gatekeeper. "Complete control / switch providers anytime" is the marketing counter — but you always need *a* provider.

---

## 8. UX / Product Flow (browser-wallet) — Polished MVP, ~13/16 flows real

Full map by Explore subagent. Files under `browser-wallet/src/popup/pages/` + `/templates/`.

- **Onboarding:** password vault → generate (12-word BIP39, copy + 3-word verify) **or** import (mnemonic / secret key). Full, polished.
- **Home:** Public ↔ Private "View Mode" toggle. Public = on-chain XLM balance. Private = channel picker + provider list + "Private Balance" (currently a **hardcoded 0.00 stub**).
- **Privacy ops (all real screens):**
  - **Deposit (shield):** `deposit-page.tsx` — channel + provider + amount + **entropy dropdown** + fee. Method radios "Direct" / **"3rd-party Ramp" (button hardcoded `disabled`)**.
  - **Receive:** generates an **MLXDR** receiver blob + UTXO list to share out-of-band.
  - **Send (private):** paste receiver **MLXDR** (no human-readable address) + amount + entropy. Technical UX.
  - **Withdraw (unshield):** destination G-address + amount + entropy.
- **Provider mgmt:** add/connect/disconnect (SEP-10 sign), green/red status dots.
- **No compliance/view-key/audit UI** in the wallet at all.
- **Polish:** ~8/10. Cohesive glassmorphic design, real validation/loading/toasts. Placeholders: 3rd-party ramp (disabled), private-balance display (stub). No demo video found; the live artifacts are the beta extension build + the network dashboard + provider fly.dev endpoints.

---

## 9. Maturity Snapshot

- **Active:** YES — daily commits through June 19-20, 2026.
- **Complete:** functional **testnet beta** end-to-end (wallet + SDK + 2 live relayers + deployed channel). SDK on JSR. Contracts written for **security audit** (`arch.md`).
- **Gaps in their own roadmap:** mainnet not shipped; USDC not wired; fiat ramp disabled; council governance "under development / centralized admin control today"; private-balance display stubbed; not on Chrome Web Store; whitepaper WIP.

---

## 10. SHARPEST DIFFERENTIATION GAPS (ranked)

### #1 — **No cryptographic amount privacy (no ZK / no encrypted balances).** ⭐ biggest
Moonlight amounts and the entire UTXO set are **plaintext**; privacy is **subset-sum + volume-dependent heuristics**. Their own docs admit LOW = no amount privacy and that a quiet channel defeats even V_HIGH. **A new entrant that hides amounts cryptographically** — Pedersen/ElGamal **confidential balances** (Stellar's roadmap is *literally adding* BN254, bulletproofs, ZK-hashes + a Confidential Token prototype; SDF joined the Confidential Token Association) **or** a true **ZK shielded pool** (Noir/Groth16/RISC0 client-side WASM proofs) — would offer a categorically stronger guarantee Moonlight has chosen not to build. This is the headline wedge.

### #2 — **Mandatory trusted relayer = not self-sovereign; liveness/censorship chokepoint.**
`PROVIDER_THRESHOLD=1` means **you cannot transact without a Privacy Provider**, and that provider holds your identity↔activity link and can refuse service. **Differentiate with self-sovereign / direct-submit** (user submits own shielded tx, no middleman) — or at minimum a permissionless relayer set / relayer-optional path. "No middleman, you hold everything" is a clean story against their bank-style intermediary.

### #3 — **Compliance is custodial-by-provider, not user-controlled selective disclosure.**
Their auditor story = the *relayer* keeps off-chain logs and hands them over. There is **no user-held view key**, no cryptographic, user-consented disclosure. **Own the "view-key" lane:** user-issued **viewing keys / auditor keys** that mathematically reveal *only* what the user chooses to a *specific* auditor — selective disclosure without trusting a relayer to hold (or leak, or lose) your whole history. This is also exactly the direction SDF's blog signals ("viewing keys for selective disclosures").

### #4 — **Seed-phrase-only keys + XLM-only + technical UX.**
No passkey/WebAuthn, no MPC/social recovery; assets limited to XLM; sending requires pasting an opaque **MLXDR** blob (no human-readable/SEP-29 memo/federated address). Clear UX/onboarding wedges: **passkey / no-seed login**, **USDC stablecoin focus** (the actual payments use-case), **human-readable recipient addresses**, and mainstream "shield → pay → unshield" simplicity. Bonus adjacent gap: **cross-chain** (they're single-chain Stellar; their derivation even allows non-Stellar root secrets, hinting they *want* this but haven't built it).

---

## Source index
- Stellar privacy blog: https://stellar.org/blog/ecosystem/strategy-for-privacy-on-blockchain · https://stellar.org/blog/developers/financial-privacy · https://stellar.org/blog/ecosystem/blockchain-compliance
- Medium (Aha Company): https://medium.com/@theahaco/moonlight-privacy-for-public-blockchains-312995648fc1
- Site: https://moonlightprotocol.io · Docs: https://moonlight-10.gitbook.io/moonlight-docs · Org: https://github.com/Moonlight-Protocol
- Local clones + key files: `soroban-core/contracts/arch.md`, `soroban-core/contracts/privacy-channel/src/{contract,transact,storage,treasury}.rs`, `moonlight-sdk/src/utils/secp256r1/deriveP256KeyPairFromSeed.ts`, `moonlight-sdk/src/privacy-channel/constants.ts`, `browser-wallet/manifest.json`, `browser-wallet/.env.seed.example`, `browser-wallet/src/popup/pages/*`, `docs/privacy-providers/{entropy-and-privacy,compliance-and-audit,what-is-a-privacy-provider}.md`, `docs/readme/whitepaper/the-privacy-challenge-on-public-dlts.md`.

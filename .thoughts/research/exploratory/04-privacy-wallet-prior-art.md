# Privacy Wallet Prior Art — UX + Architecture Patterns to Port to Stellar

> Research brief for a **Stellar browser-extension wallet** whose headline is **private/shielded transfers** (and possibly a private cross-chain bridge).
> Goal: steal proven UX + architecture from mature privacy wallets in other ecosystems, then identify our material differentiator.
> Date: 2026-06-21.

---

## TL;DR

- The **canonical privacy-wallet flow is `shield → private send → unshield`** with a **commitment/nullifier Merkle-tree note model** underneath. Every system here is a variant of this.
- **RAILGUN / Railway Wallet is the strongest template to port** — it's the only one that already ships (a) browser proof generation, (b) a relayer/broadcaster network, (c) a four-state spendable-balance model, and (d) a baked-in **compliance layer (Private Proofs of Innocence)** that maps almost 1:1 onto **Stellar's Privacy Pools + ASP allow-lists**. **Zcash/Zashi is the secondary template** for address + memo + viewing-key UX.
- The **hard UX problem is proving time** (10s–2min of client-side ZK). Mature wallets hide it by **optimistic UI + background proving + a "pending/spendable" balance split**, never a blocking spinner.
- **Sharpest Stellar differentiator: compliant-by-construction privacy** (ASP allow-list withdrawal proofs + viewing-key selective disclosure) wrapped in **passkey UX** (no seed phrase) — i.e. RAILGUN's privacy with Zcash's auditability and a Web2 login, on a chain whose own thesis is "compliant privacy."

---

## 1. Per-protocol breakdown

### 1.1 RAILGUN / Railway Wallet — the headline template

**What it is:** A privacy system on Ethereum/EVM + a multi-platform wallet (web, iOS, Android, desktop) that "looks like MetaMask but acts like a stealth bomber."

**Mental model:** `shield (0x → 0zk) → private balance / private send / private DeFi → unshield (0zk → 0x)`.

**Addresses:** Public EVM `0x...` address ↔ private **`0zk...` address**. The 0zk address never appears on-chain; it's the user's handle inside the shielded pool.

**Architecture (note model):**
- Shielding computes a **commitment (note)** via **Poseidon hash**, added to a shared **batch-incremental Merkle tree** (`Commitments.sol`).
- Spending reveals a **nullifier** (checked against the tree path) to prevent double-spend — classic commitment/nullifier design.
- Balances live encrypted in the contract; the wallet scans/decrypts its own notes.

**Proof generation — CLIENT-SIDE:**
- Browser/Node use **snarkjs + WebAssembly**; mobile uses a native **C++ Groth16 prover**. Proving scheme is **Groth16**.
- A **Private Proof of Innocence** generates in **up to ~30s on desktop/web, 1–2 min on mobile** after a 0zk→0zk transfer. (Same order of magnitude as the spend proof.)

**Relayer/Broadcaster network:** Users hand a **meta-transaction** to a **Broadcaster** who pays gas and submits on-chain. Externally it looks like the *Broadcaster's* 0x sent the funds; the Broadcaster can't see whose funds (encrypted Merkle tree). This breaks the gas-payer ↔ recipient link on withdrawal.

**Fees:** 0.25% shield/unshield + gas + broadcaster fee.

**Compliance — Private Proofs of Innocence (POI) — THE KEY PATTERN:**
- ZK proof that your shielded funds are **not** in a publicly known bad set (currently the **free OFAC list via Chainalysis**).
- Does **not** reduce privacy. Flagged funds can **only be unshielded back to origin**, never spent privately.
- This produces a **four-state balance model in the wallet UI** (steal this verbatim):
  - **Pending** — recently shielded, in a 1-hour "Unshield-Only Standby Period."
  - **Incomplete** — awaiting POI generation from sender/recipient.
  - **Spendable** — valid POI exists; fully usable.
  - **Restricted** — flagged; unshieldable-only.
- User mental model: *shield → wait → prove legitimacy → spend freely*, with the wallet generating/validating proofs invisibly and flipping balance states as conditions are met.

**UX takeaways:** background auto-proving (keep app open ~30s post-confirm), explicit balance-state taxonomy, relayer-by-default for unshields.

Sources: [Shielding/Unshielding user guide](https://help.railway.xyz/transactions/shield-unshield) · [Shielding Tokens wiki](https://docs.railgun.org/wiki/learn/shielding-tokens) · [Unshielding wiki](https://docs.railgun.org/wiki/learn/unshielding-tokens) · [Private Proofs of Innocence](https://help.railway.xyz/private-proofs-of-innocence) · [Groth16 prover per platform](https://docs.railgun.org/developer-guide/wallet/getting-started/6.-load-a-groth16-prover-for-each-platform) · [Messari report](https://messari.io/report/railgun-privacy-infrastructure-for-defi)

---

### 1.2 Zcash — Zashi (now "Zodl") / YWallet — the address + memo + viewing-key template

**What it is:** The original shielded-payments chain. Best-in-class wallet UX conventions live in the **Zcash UX wallet checklist** (official docs) and the ECC **Zashi** wallet.

**Mental model:** transparent (`t-addr`) vs **shielded (`z-addr`)** value pools. **Shielded-by-default** in modern wallets: Zashi won't let you *spend* transparent ZEC directly — you must **shield first**, surfaced via a status widget.

**Addresses — Unified Addresses (UA):** one address string that can receive across transparent/Sapling/Orchard pools, so users don't juggle address types. Treat addresses like **bank accounts** (persistent), not fresh-per-tx.

**Balance display (steal this):**
- Show **total** vs **spendable** balance, e.g. `Balance: 621.14 ZEC (605.35 ZEC spendable)`.
- Mark new sends **pending** (color/icon); show **expiry** countdown (~20 blocks / ~1h); mark expired in the log, don't delete.
- Fixed fee shown, custom-fee disabled.

**Memos — encrypted notes (steal this):**
- 512-byte **encrypted memo** on shielded txs. **Always render the memo field even when empty** — privacy-conscious nudge. Can send a **memo-only / zero-amount** message ("private message").

**Viewing keys (steal this):**
- Share a **viewing key** → watch-only / auditor access. Holder sees **all incoming** shielded txs (amount, address, memo) but **cannot spend**. Marketed for tax preparers, auditors, regulators. Share over secure channel, not copy-paste.

**Deshield warnings:** explicitly warn when going shielded → transparent (reveals info).

**Hardware:** Keystone is the first HW wallet for shielded ZEC (air-gapped cold shielded storage) — signals the maturity bar.

Sources: [Zcash UX wallet checklist](https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html) · [Addresses & value pools](https://zcash.readthedocs.io/en/latest/rtd_pages/addresses.html) · [Viewing keys explained](https://zkonomics.com/content/viewing-keys-explained/) · [Zashi/Zodl](https://z.cash/ecosystem/zashi-wallet/) · [YWallet](https://github.com/hhanh00/zwallet)

---

### 1.3 Aztec — zk.money / Aztec Connect era — the "zk-asset" naming + private-DeFi-bridge template

**What it is:** Aztec's private-payments rollup; **zk.money** let users privately send DAI/ETH/renBTC. **Aztec Connect** bridged shielded zk-assets into public Ethereum DeFi (80–90% gas savings + privacy). *Aztec Connect has been sunset*; the network is now a full privacy L2.

**Mental model:** deposit into the L1 rollup → system mints **privacy-shielded notes** named with **`zk-` prefixes** (`zkETH`, `zkDAI`). Clear, legible "this token is the shielded version" naming.

**UX lesson (cautionary):** earlier zk.money had a complicated, high-friction journey; they explicitly **simplified** it. Private-DeFi-via-bridge is compelling but the bridge was the part that didn't survive — informs our "private cross-chain bridge" ambition (powerful, but operationally heavy).

Sources: [Private DeFi with Aztec Connect](https://aztec.network/blog/private-defi-with-the-aztec-connect-bridge) · [zk.money review (ZKV)](https://medium.com/zero-knowledge-validator/privacy-tech-in-review-zk-money-efb59f879043) · [zk.money migration guide](https://aztec.network/blog/zk-money-migration-guide)

---

### 1.4 Penumbra — Prax Wallet — the fully-shielded, client-side-scanning browser-extension template

**What it is:** A fully-shielded Cosmos-ecosystem chain; **Prax Wallet is a Chrome extension** (directly analogous to what we're building).

**Mental model:** **shielded by default** — once funds land in Penumbra, everything (balances, swaps, LP, staking) is end-to-end encrypted; no explicit per-tx "shield" step inside the system.

**Architecture — client-side scanning (key pattern for a browser extension):**
- Each Prax instance is an **ultralight node** that **scans, syncs, decrypts, and locally indexes** only the data visible to that wallet. Light enough to run in a browser/phone.
- Balance updates happen **locally first**, then submit to chain **encrypted**, with **client-side ZK proving** that the encrypted update is correct.

**Key custody / permissions (steal this for an extension):**
- **All long-term key material stays inside the extension.** Web content only gets per-transaction data.
- **Every tx is approved in the extension** (secure display path to review the proposed tx).
- Users **grant viewing or spending permissions** to (untrusted) web frontends and can **revoke** them later — a clean dApp-connection privacy model.

**Balance UX:**
- Hierarchical **Main Account** + sub-accounts; assets shown as line items per account.
- **Fresh IBC deposit address generated every toggle** (anti address-reuse for inbound public-chain transfers).
- **Validate Address** tool confirms an address is yours / which account.
- Per-tx **private-details vs public-view toggle** — show users exactly "how this looks to others" (only the fee is public). Great trust-building pattern.

Sources: [Penumbra guide — web](https://guide.penumbra.zone/usage/web) · [Installing Prax](https://guide.penumbra.zone/usage/web/prax) · [Viewing balances](https://guide.penumbra.zone/usage/web/balances) · [Bringing shielded tx to the web](https://www.penumbra.zone/blog/bringing-shielded-transactions-to-the-web)

---

### 1.5 Namada — MASP — the multi-asset shielded pool template

**What it is:** A chain built around the **Multi-Asset Shielded Pool (MASP)** — a zk-SNARK circuit that **extends Zcash's Sapling circuit to support arbitrary assets** in one shared anonymity set.

**Mental model:** `transparent addr → shielded addr` = **shielding transfer**. All assets of the same kind share one anonymity set, so **every new shielded tx strengthens privacy for everyone** (network-effect framing worth surfacing in UX copy).

**UX claim:** "from the user's perspective, all of this happens in a **single click** of a button" — they explicitly market one of the best privacy UXs on offer. The client creates/spends notes and generates proofs locally.

**Relevance to Stellar:** Stellar's **Confidential Tokens** initiative is the spiritual equivalent of MASP's "any asset, shielded" — a multi-asset shielded model is the right architecture if we want USDC + XLM + RWAs in one pool.

Sources: [Namada MASP docs](https://docs.namada.net/users/shielded-accounts) · [Shielding assets](https://docs.namada.net/users/shielded-accounts/shielding) · [MASP repo](https://github.com/namada-net/masp) · [Namada as shielded asset hub](https://simplystaking.com/namada-the-shielded-asset-hub)

---

### 1.6 Tornado Cash — the deposit/withdraw "secret note" + compliance-pool mental model

**What it is:** The canonical fixed-denomination mixer. Useful as the *mental model primitive* underneath Privacy Pools (which is exactly what Stellar's PoC implements).

**Mental model:** **fixed-denomination pools** (0.1 / 1 / 10 / 100 ETH) so amounts can't fingerprint you. `deposit (commitment) → [time passes, anonymity set grows] → withdraw (ZK proof + nullifier) to a fresh address`.

**The "secret note" (UX primitive):**
- Browser generates two random numbers: **secret** + **nullifier**; hashes them → **commitment** sent on-chain with funds.
- The **secret note** (secret + nullifier) IS the user's key to the funds — the dApp shows it and **forces a backup**. *Lose the note = lose the funds.* (UX risk to avoid in a real wallet: derive notes from the wallet seed/passkey, don't make users hand-copy strings.)

**Withdraw:** submit ZK proof + recipient + nullifier-hash; contract checks proof valid, Merkle root known, nullifier unused. **Relayer pays gas** to keep the destination address unlinked.

**Compliance gap → Privacy Pools answer:** Tornado's all-or-nothing anonymity set is what got it sanctioned. **Privacy Pools** (and RAILGUN POI) fix this with **association sets / proofs of exclusion-from-bad-set** — which is precisely Stellar's chosen direction.

Sources: [How Tornado Cash works (community docs)](https://github.com/tornadocash-community/docs/blob/en/general/how-does-tornado.cash-work.md) · [Line-by-line (RareSkills)](https://rareskills.io/post/how-does-tornado-cash-work) · [Whitepaper](https://berkeley-defi.github.io/assets/material/Tornado%20Cash%20Whitepaper.pdf)

---

## 2. The canonical privacy-wallet UX vocabulary (what we MUST nail)

Synthesized across all six. These are the non-negotiable building blocks:

1. **Shielded balance display — split, never single.**
   - Total vs **Spendable**, plus state buckets. Borrow RAILGUN's **Pending / Incomplete / Spendable / Restricted** and Zcash's **total (incl. unconfirmed) / spendable**.
   - Show shielded vs transparent (public) balance side by side; make "shielded" the visually-default/primary number.

2. **Shield / Unshield flows.**
   - One-click **Shield** (public → private); explicit **Unshield** with a **deshield warning** (Zcash) that this reveals info.
   - "Shielded by default" posture (Penumbra/Zashi): don't let users spend the transparent balance directly — nudge to shield first via a **status widget**.

3. **Private send.**
   - Send to a **private address** (0zk-style / shielded / UA). Validate the address; offer a **"validate this is mine"** tool (Penumbra).
   - **Relayer/broadcaster by default** so the recipient/gas-payer link is broken (RAILGUN, Tornado).
   - Per-tx **private-vs-public-view toggle** so users see what leaks (only fee) — Penumbra's trust pattern.

4. **Pending-proof / proving states (the make-or-break).**
   - Optimistic UI: accept the action, show **"generating proof… (~30s)"** non-blocking, keep proving in the background; flip the balance state when done.
   - Never a modal spinner that holds the user hostage for 30s–2min.

5. **Viewing / audit keys (selective disclosure).**
   - Export a **viewing key** → watch-only / auditor access (sees incoming amounts + memos, **cannot spend**). Zcash's model. This is also the **compliance story**.

6. **Memos / encrypted notes.**
   - Encrypted memo field on every shielded send; **always show it even when empty**; support **memo-only (zero-amount) messages**.

7. **Compliance state (the modern requirement).**
   - Surface **proof-of-innocence / association-set membership** as a balance state, not a separate scary screen. Flagged funds = **unshield-to-origin-only**.

8. **Secret/note custody.**
   - Notes must be **derived from the wallet key/passkey**, never hand-copied (avoid Tornado's "lose the note, lose the money" footgun).

---

## 3. The proving-time UX problem & how mature wallets hide it

**The problem:** Client-side ZK proving takes **~10s–2min** (RAILGUN: ~30s desktop / 1–2min mobile; Stellar Groth16 verify is cheap on-chain but **proof generation is the client cost**). A naive wallet blocks the UI on a spinner → feels broken.

**How the mature wallets hide it:**
- **Optimistic + background proving (RAILGUN):** the send "succeeds" in the UI immediately; the POI/spend proof generates in the background; the balance silently moves **Pending/Incomplete → Spendable**. The user is told to just "keep the app open ~30s."
- **Local-first state (Penumbra):** balance updates locally **before** the encrypted+proven submission, so the displayed balance feels instant; proving happens under the hood.
- **Single-click framing (Namada):** collapse the whole note-creation+proving pipeline behind one button + progress, marketed as "one click."
- **Balance-state taxonomy as the buffer:** the **Pending/Spendable split is itself the proving-time UI** — it gives the wallet a truthful place to "park" funds while proofs compute, instead of lying or freezing.

**Implication for us:** budget for a **Web Worker / WASM prover** (snarkjs-style) in the extension that proves off the main thread, and design the balance model around **Pending → Spendable** so proving time is *absorbed*, not *displayed as latency*.

---

## 4. Ecosystem-refactor angle — which to port, and the Stellar differentiator

### Stellar's privacy primitives (what we have to build on, as of 2026)
- **X-Ray Upgrade (Protocol 25)**, mainnet **Jan 22, 2026**: adds **BN254** (pairing-friendly curve, CAP-0074) + **Poseidon/Poseidon2** host functions (CAP-0075) → ZK circuits are now feasible in **Soroban**.
- **Privacy Pools PoC (with Nethermind):** mixer pattern + **association sets / ASP allow-lists**; built so far = **Groth16 verifier in Soroban (no_std)**, a Circom deposit circuit, `circom2soroban`, and a `coinutils` CLI. *(Note: the PoC actually uses **BLS12-381 + Poseidon + Groth16 via Circom**, not BN254 — verify which curve our circuit targets before building.)*
- **Confidential Token Association** member (with OpenZeppelin, Zama, Inco) → multi-asset confidential token standard incoming (the MASP analog).
- **Passkey smart wallets:** `passkey-kit` / `smart-account-kit` (kalepail/OpenZeppelin), **secp256r1 since Protocol 21** → WebAuthn passkey login, no seed phrase, native to Soroban smart accounts.
- **Stellar's own thesis:** *"the proving ground for real-world privacy"* — **opt-in, configurable, compliance-first** privacy with **viewing keys for selective disclosure** + association sets. Target use cases: cross-border payments, payroll, institutional/RWA flows.

### Strongest template to rebuild on Stellar
**Primary: RAILGUN / Railway Wallet.** It is the closest match because:
- Its **commitment/nullifier + Merkle-tree note model** is exactly what the Stellar Privacy Pools PoC already implements (Poseidon + Groth16 + Circom).
- Its **Private Proofs of Innocence** ≈ Stellar's **ASP association-set allow-list** — the compliance mechanism is the *same idea*, and Stellar is explicitly betting on it.
- Its **four-state balance model** and **browser proof generation (snarkjs/WASM)** are directly transplantable to a Soroban-backed extension.

**Secondary: Zcash/Zashi** for the *surface* — Unified-Address handling, total/spendable split, encrypted memos, viewing-key export, deshield warnings, shielded-by-default status widget. **Penumbra/Prax** for the *extension architecture* — client-side scanning, in-extension key custody + tx approval, grant/revoke viewing+spending permissions to web frontends.

### Material differentiator (the wedge)
A Stellar privacy wallet that is **compliant-by-construction + passwordless**, where competitors are either non-compliant (Tornado) or seed-phrase-bound (RAILGUN, Zcash):

1. **Compliant privacy as the default, not a bolt-on.** Withdrawals require an **ASP allow-list membership proof** (Privacy Pools), and the wallet exports a **viewing key** for selective disclosure. This is the *only* angle a regulator-facing chain like Stellar can win — and Stellar's own strategy is literally "compliant privacy." We're not fighting the ecosystem; we're its reference implementation.
2. **Passkey UX (no seed phrase).** Use `passkey-kit` smart accounts (secp256r1) so onboarding is a **Face ID / WebAuthn tap**, not a 12-word backup. No mature privacy wallet has this — it's the single biggest UX leap available and it's Stellar-native.
3. **Multi-asset shielded pool** via Confidential Tokens (USDC, XLM, RWAs in one anonymity set) — MASP-style, fits Stellar's payments/RWA focus.
4. **(Stretch) Private cross-chain bridge** — Aztec-Connect-style ambition, but learn from its sunset: bridges are the heaviest, most fragile piece. Ship shielded same-chain transfers first; treat the bridge as v2.

**One-line pitch:** *RAILGUN's shielded transfers + Zcash's viewing-key auditability + Privacy-Pools compliance, behind a passkey login, on the chain whose own roadmap is "compliant privacy."*

### Build-cost reality check
- **Reuse, don't reinvent the crypto:** the Privacy Pools PoC (`coinutils`, `circom2soroban`, Soroban Groth16 verifier) is the backend skeleton — fork it.
- **The novelty is 100% in the wallet/UX layer**, not the circuit: balance-state model, background WASM proving, passkey onboarding, viewing-key export, ASP-membership UX, memo/private-message UX.
- **Confirm the curve** (PoC = BLS12-381; X-Ray host functions = BN254) before committing the prover stack.

---

## Source index

**RAILGUN/Railway:** [shield/unshield guide](https://help.railway.xyz/transactions/shield-unshield) · [shielding wiki](https://docs.railgun.org/wiki/learn/shielding-tokens) · [unshielding wiki](https://docs.railgun.org/wiki/learn/unshielding-tokens) · [Proofs of Innocence](https://help.railway.xyz/private-proofs-of-innocence) · [Groth16 prover per platform](https://docs.railgun.org/developer-guide/wallet/getting-started/6.-load-a-groth16-prover-for-each-platform) · [Messari](https://messari.io/report/railgun-privacy-infrastructure-for-defi)
**Zcash:** [UX checklist](https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html) · [addresses & pools](https://zcash.readthedocs.io/en/latest/rtd_pages/addresses.html) · [viewing keys](https://zkonomics.com/content/viewing-keys-explained/) · [Zashi/Zodl](https://z.cash/ecosystem/zashi-wallet/) · [YWallet/zwallet](https://github.com/hhanh00/zwallet)
**Aztec:** [Aztec Connect](https://aztec.network/blog/private-defi-with-the-aztec-connect-bridge) · [zk.money review](https://medium.com/zero-knowledge-validator/privacy-tech-in-review-zk-money-efb59f879043)
**Penumbra/Prax:** [web guide](https://guide.penumbra.zone/usage/web) · [install Prax](https://guide.penumbra.zone/usage/web/prax) · [balances](https://guide.penumbra.zone/usage/web/balances) · [shielded tx on the web](https://www.penumbra.zone/blog/bringing-shielded-transactions-to-the-web)
**Namada:** [MASP docs](https://docs.namada.net/users/shielded-accounts) · [shielding](https://docs.namada.net/users/shielded-accounts/shielding) · [MASP repo](https://github.com/namada-net/masp)
**Tornado Cash:** [community docs](https://github.com/tornadocash-community/docs/blob/en/general/how-does-tornado.cash-work.md) · [RareSkills](https://rareskills.io/post/how-does-tornado-cash-work) · [whitepaper](https://berkeley-defi.github.io/assets/material/Tornado%20Cash%20Whitepaper.pdf)
**Stellar:** [Privacy Pools PoC](https://stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar) · [privacy strategy](https://stellar.org/blog/ecosystem/strategy-for-privacy-on-blockchain) · [X-Ray / Protocol 25](https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25) · [Poseidon host functions discussion](https://github.com/orgs/stellar/discussions/1780) · [passkey-kit](https://github.com/kalepail/passkey-kit) · [smart wallets docs](https://developers.stellar.org/docs/build/apps/smart-wallets) · [Stellar Hacks: Real-World ZK hackathon](https://dorahacks.io/hackathon/stellar-hacks-zk/detail)

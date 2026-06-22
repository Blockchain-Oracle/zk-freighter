# Private Cross-Chain Bridge into Stellar — Feasibility Brief (2026)

> **Superseded correction (2026-06-22):** keep this note for prior-art links, but do **not** treat its original atomic "bridge-in then auto-shield" claim as current reality. The later source-code check in `../2026-06-22-domain-readiness-audit.md` found that the stock Stellar `CctpForwarder.mint_and_forward` mints USDC and then does a plain SAC `transfer` to `forwardRecipient`; it does not call the Nethermind pool's `transact()`. The safe current path is public CCTP mint/forward, then a separate shield transaction. Atomic bridge-and-shield would require custom forwarder/pool work and a live proof.

**Purpose:** Honest verdict on whether a Stellar shielded-payments wallet can offer "move value from another chain (e.g. Ethereum/USDC) → arrive PRIVATELY on Stellar." Pressure-tested against what actually exists today. Every claim cited.

**Research date:** 2026-06-21. Companion to `06-hackathon-brief.md` (Stellar Hacks: Real-World ZK, deadline 2026-06-29) and `01-privacy-tech-reality.md` (Privacy Pools PoC is real, deployed testnet, but a dApp not a wallet).

---

## TL;DR verdict

- **A TRUE end-to-end private bridge (shielded on chain A, trust-minimized, custody/relayer rolled by us) is a v2 MILESTONE, not a hackathon build.** Rolling your own bridge means rolling your own custody, validator/attestation set, and replay protection — the exact surface that has lost >$2.5B to hacks. Do not.
- **The MINIMAL CREDIBLE version is REAL and shippable: "bridge-in, then shield."** Use **Circle CCTP V2** (live on Stellar since May 2026) to bring **native USDC** onto Stellar, then submit a separate privacy-pool `transact()` deposit after mint/forward completes. Privacy begins after the Stellar shield transaction; the bridge leg itself is public. This is honest, buildable, and we build **zero** bridge security ourselves.
- **The "foreign-proof verifies identically on Stellar" angle is real but narrower than the pitch.** Stellar's BN254 host functions give EIP-196/197 parity, so a Groth16/BN254 proof verifies on Soroban. That powers **proof portability for the shielded pool itself** (we can verify Circom/RISC0 proofs on-chain). It does **not**, by itself, give you a trust-minimized bridge — you'd still need a light client of chain A on Stellar to prove the lock/burn happened, which nobody has shipped for Stellar yet.

---

## 1. What bridges actually connect Stellar to other chains TODAY

| Bridge | Live on Stellar? | USDC? | Trust model | Programmable Stellar-side hook? |
|---|---|---|---|---|
| **Circle CCTP V2** | ✅ **LIVE (May 2026)** | ✅ **native** (burn-and-mint, not wrapped) | Circle's off-chain "Iris" attestation service (federated, trusted) | Limited in the stock Stellar forwarder: mint + plain transfer to `forwardRecipient`, not arbitrary pool `transact()` |
| **Allbridge Core** | ✅ LIVE (since May 2024, Stellar = 10th chain) | ✅ (stable-swap; USDC, USDT) | Non-custodial liquidity pools + off-chain messaging signers; audited (Quarkslab, Hacken) | Partial — `withdraw` either pays the recipient directly or parks funds in a `ClaimableBalance`; no documented arbitrary post-receive contract call |
| **Wormhole** | ❌ **NOT live for Stellar** | — | Guardian multisig (19 guardians) | — (in development: SDF + Nethermind + Boundless announced ZK/bridge collaboration Sept 2025; not shipped) |
| **Axelar / Squid / LayerZero / Hyperlane** | ❌ no Stellar/Soroban endpoint found in 2026 sources | — | external validator sets / GMP | — |

**Key reads:**
- CCTP is the headline. Circle's docs: *"`CctpForwarder` is a publicly callable onchain contract that receives minted USDC on Stellar and atomically forwards it to `forwardRecipient`… minting and payout occur within a single Soroban invocation without Circle taking intermediate custody."* (https://developers.circle.com/cctp/references/stellar) Stellar destination domain = **27**. Source-code correction: this "forward" is a token transfer, not a privacy-pool call.
- SDF/Circle hook language is useful context, but the stock Stellar path checked locally does not prove arbitrary deposit-into-pool execution. Treat atomic shield as custom work until tested.
- Allbridge is genuinely non-custodial (pool contracts hold liquidity, Allbridge never touches funds) and audited, but its receive path is recipient-or-ClaimableBalance, not an arbitrary contract callback. (https://docs-core.allbridge.io/, https://blog.quarkslab.com/allbridge-core-stellar.html)
- Wormhole's public chain list does not include Stellar as of 2026; SDF/Nethermind are *building* a Stellar↔Wormhole path with Boundless ZK tooling, announced Sept 2025, not yet a shippable endpoint. (https://wormhole.com/platform/blockchains, Messari State of Stellar Q1 2026)

**Conclusion for the wallet:** **CCTP V2 is the bridge to use because it is live and moves native USDC.** The stock Stellar forwarder can route minted USDC to a Stellar recipient, but routing straight into a shielded note is not proven. The MVP should bridge publicly, then shield with a separate pool transaction.

---

## 2. ZK cross-chain prior art — the "proof portability" angle

**The claim (from hackathon resources):** Stellar's BN254 host functions (CAP-0074, Protocol 25 "X-Ray") mirror Ethereum's EIP-196/197 precompiles, so an Ethereum/RISC0 Groth16 proof verifies identically on Stellar (ref `NethermindEth/stellar-risc0-verifier`).

**What's actually true:**
- SDF says BN254 functions *"provide feature parity with Ethereum's EIP-196 and EIP-197 precompiles, and make Stellar interoperable with existing ZK tooling and libraries… builders currently in EVM environments can easily migrate or extend projects to Stellar."* (https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25)
- The `stellar-risc0-verifier` (cloned locally) **does** verify RISC Zero Groth16 (BN254) proofs on Soroban, with a production-shaped governance stack (TimelockController → VerifierRouter → EmergencyStop → Groth16Verifier). A 256-byte Groth16 proof generated off-chain (Circom or RISC0) verifies on Stellar via the native precompile. **Proof portability at the verification layer is real.**

**What it does NOT give you (the honest gap):** Verifying a Groth16 proof on Stellar tells you *the proof is valid*. It does **not** tell you *an event happened on Ethereum*. A trust-minimized bridge needs a **light client of chain A running on Stellar** — i.e., a proof that "USDC was locked/burned in Ethereum block N, which is part of Ethereum's canonical chain." That requires:
1. A circuit proving Ethereum consensus (sync-committee signatures, à la Succinct Telepathy) or a storage-inclusion proof against a verified Ethereum state root, AND
2. An on-Stellar Ethereum header/state oracle to anchor the proof against.

Nobody has shipped (1)+(2) for Stellar. Building it is a multi-month protocol effort, not a hackathon weekend. **So BN254 parity enables a private *pool* on Stellar (and demoing foreign-proof verification), but not a trust-minimized *bridge* on its own.**

**Architecture a TRUE private bridge would need** (for completeness — this is the milestone, not the MVP):
```
Chain A (Ethereum):  lock/burn USDC into a bridge contract, emit commitment
        │
        ▼  (off-chain prover)
   Generate proof: "commitment C is included in Ethereum state root S"
   + (for trust-min) "S is the head of canonical Ethereum" (sync-committee circuit)
        │
        ▼  (relayer submits proof + public inputs)
Stellar (Soroban):  Ethereum-light-client contract verifies S is canonical
   → Groth16Verifier (BN254 host fn) checks inclusion proof
   → release/mint into Privacy-Pools transact() as a shielded deposit note
        │
        ▼
   Recipient holds a private note; nullifier prevents double-release/replay
```
Every box except the last two is greenfield infra we'd own and have to secure.

---

## 3. Existing private/ZK bridges to learn from (and why none drop in)

| Project | What it is | Reusable for Stellar? |
|---|---|---|
| **Polyhedra zkBridge** | Trustless cross-chain via succinct proofs of block headers; relay network + updater contract; 20+ chains (EVM-centric) | Pattern is the gold standard (security from proofs, not a committee). But it's EVM/Cosmos-targeted; no Soroban verifier. We'd port the *updater-contract pattern*, not the code. (https://rdi.berkeley.edu/zkp/zkBridge/zkBridge.html, arxiv 2210.00264) |
| **Succinct SP1 / Telepathy** | zk light client: SNARK proves Ethereum sync-committee signed a header; verified on the destination chain | The right primitive for the **TRUE-bridge milestone** — port a Telepathy-style Ethereum light-client circuit, verify its Groth16/BN254 proof on Soroban. Real but heavy. (https://lifi.substack.com/p/succinct-marries-zksnarks-and-light) |
| **RAILGUN (+ cross-contract calls)** | On-chain ZK privacy *system* (shielded UTXO pool, relayers, cross-contract calls) on EVM chains | Conceptual twin of what we shield INTO — but it is **not** a bridge and is EVM-only. Lesson: privacy = a shielded pool with a relayer for gas anonymity; mirror that UX, don't bridge with it. (https://docs.railgun.org/developer-guide/wallet/transactions/cross-contract-calls) |
| **zkLink** | Aggregated ZK-rollup liquidity across chains | Rollup-layer, not a Soroban-portable bridge. Not applicable. |
| **Wormhole + privacy** | Guardian-multisig messaging; no native privacy | Not on Stellar yet; trusted multisig, not trust-minimized. Skip for MVP. |
| **Nethermind `stellar-private-payments`** | The Privacy-Pools PoC (Tornado-Nova-style shielded UTXO pool, on-chain Groth16/BN254 verifier, browser WASM proving) — **deployed on Stellar testnet** | ✅ **This is the destination pool.** `transact(proof, ext_data, sender)` with `ext_amount > 0` is a deposit. The stock CCTP forwarder does not call it; the wallet must submit this as a separate shield transaction unless custom adapter work is built and tested. |

**Takeaway:** Telepathy/zkBridge teach the *trust-minimized* pattern (verify a foreign-consensus proof on the destination). The Stellar BN254 verifier makes that *verifiable* on Soroban. But assembling it is the milestone. For the MVP, **CCTP carries the value and the Privacy-Pools pool provides the privacy** — we glue them, we don't rebuild either.

---

## 4. The honest scoping question — the three options

**(a) Bridge-in then shield (privacy starts after the Stellar shield tx). ← THE MVP. Buildable now.**
- User sends USDC from Ethereum (or any supported CCTP chain). CCTP V2 burns on source, Iris attests, USDC mints on Stellar.
- The stock Stellar `CctpForwarder` transfers minted USDC to a Stellar recipient.
- The wallet then submits a separate Privacy-Pools `transact()` deposit with `ext_amount = minted_amount` or a user-chosen amount.
- Result: the user sees one guided flow: "bridge USDC -> shield on Stellar", but technically it is two Stellar-side steps.
- **What's public:** the burn on Ethereum, the mint/forward on Stellar, and the shield deposit boundary. **What's private:** subsequent in-pool balance movements/transfers.
- **We build zero bridge security.** Custody/attestation/replay all belong to Circle. We own wallet UX and the separate privacy-pool shield step.

**(b) True end-to-end private bridge (shielded on chain A too). ← MILESTONE / v2.**
- Requires our own lock contract on chain A + Ethereum light client on Stellar + inclusion-proof circuit + nullifier-based replay protection. Multi-month, audit-gated, and we'd own catastrophic-loss risk. Out of scope for the hackathon.

**(c) Verify-a-foreign-proof demo only. ← Optional garnish, not a product.**
- Generate a Groth16/RISC0 proof off-chain referencing an Ethereum fact, verify it on Soroban via the BN254 host function (using `stellar-risc0-verifier`). Proves "Stellar can verify Ethereum-style proofs." Nice for the demo video's "ZK is load-bearing" beat, but it's a verification demo, not a bridge, and shouldn't be sold as one.

**Recommended scope:** ship **(a)**, and if there's time, add a small **(c)** flourish that verifies a foreign proof on Soroban to gesture at the trust-minimized roadmap — clearly labeled as a future direction.

---

## 5. Brutal honesty on rolling our own bridge

Why option (a) is the only sane hackathon path:
- **Custody is the whole risk.** A bridge is a honeypot: it holds locked collateral on chain A and the authority to release on chain B. Bridge hacks (Ronin $625M, Wormhole $325M, Nomad $190M, Harmony $100M) are overwhelmingly failures of *that authority* — compromised multisigs, forged messages, missing replay guards. Building this in a weekend = shipping a vulnerability.
- **Attestation/validator set.** A DIY bridge needs a trusted signer set or a light client. A trusted signer set is just a smaller, unaudited multisig (worse than Circle's). A light client is the multi-month effort in §2/§3. Either way we'd be re-implementing the hardest, most-attacked component in crypto.
- **Replay / double-spend.** Cross-chain messages must be consumed exactly once. CCTP handles this with nonces + Iris attestations we never touch. Our own version needs a nullifier/consumed-message set that is correct under reorgs on *both* chains — easy to get subtly wrong, catastrophic when wrong.
- **Liquidity & failure modes.** Lock-mint bridges strand funds if the destination mint fails; CCTP's burn-and-mint avoids us owning bridge custody. The separate shield step still needs normal wallet retry/status handling.
- **The judges' lens.** The hackathon explicitly invites *migrating ZK apps* and *real-world money movement*, and rewards "mild-but-sharp" over "wild-but-broken." A polished CCTP -> shield flow that demonstrably works on testnet beats a half-built custom bridge that can't be safely demoed. Rolling our own bridge is the fastest way to a broken demo.

**Bottom line:** Let Circle be the bridge. We own the privacy layer (the genuinely novel, ZK-load-bearing part SDF is paying for) and the consumer UX. That's the win condition.

---

## 6. Concrete build recipe for the MVP (option a)

1. **Bring USDC over:** integrate **CCTP V2** (source = any of 23 chains; Stellar domain 27). Native USDC, burn-and-mint. (Circle docs.)
2. **Shield on Stellar:** after `mint_and_forward` completes, submit a separate Nethermind Privacy-Pools `transact(proof, ext_data, sender)` with positive `ext_amount` (= deposit).
   - Proof note: a deposit (`ext_amount > 0`) still needs a valid Groth16 proof for the output note(s). Generate that proof client-side before the shield transaction.
3. **Wallet UX:** present it as one guided "Bridge then shield" flow; show the public bridge leg honestly, then the shield transaction, then the shielded balance.
4. **Optional ZK flourish (c):** verify an Ethereum-origin Groth16/RISC0 proof on Soroban via `stellar-risc0-verifier` to demo proof portability and tee up the trust-minimized v2.
5. **Demo-video framing:** "USDC bridges in publicly via Circle CCTP, then the wallet shields it on Stellar with a client-side proof." ZK is load-bearing in the pool, not in the bridge — say that plainly.

**Risks to flag in the README (honest WIP disclosure, which the hackathon rewards):**
- Privacy starts at Stellar; the bridge leg is public by design (Circle is the trusted attester).
- Atomic bridge-and-shield is not part of the safe MVP; it needs custom adapter/pool work and a separate spike.
- Foreign-proof verification (c) is a demo of the roadmap, not a live trust-minimized bridge.

---

## 7. Sources

- Circle CCTP on Stellar reference: https://developers.circle.com/cctp/references/stellar
- Circle CCTP supported chains/domains: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
- CCTP V2 (Hooks, atomic mint+action): https://www.circle.com/blog/cctp-v2-the-future-of-cross-chain
- SDF: "Circle CCTP is Live on Stellar": https://stellar.org/blog/foundation-news/circle-cctp-is-live-on-stellar
- SDF: "Circle CCTP V2 is Coming to Stellar": https://stellar.org/blog/foundation-news/circle-cctp-v2-is-coming-to-stellar
- Stellar docs: Cross-chain transfers (CCTP): https://developers.stellar.org/docs/tokens/cross-chain-transfers
- BanklessTimes / Crowdfund Insider on CCTP-Stellar (May 2026): https://www.banklesstimes.com/articles/2026/05/20/circle-deploys-cctp-on-stellar-to-power-seamless-native-usdc-transfers/ · https://www.crowdfundinsider.com/2026/05/282791-circles-cctp-goes-live-on-stellar-enabling-stablecoin-usdc-connectivity-across-blockchains/
- Allbridge Core launches bridge to Stellar: https://allbridge.medium.com/allbridge-core-launches-a-bridge-to-stellar-14156f59e925
- Allbridge Core docs (non-custodial model): https://docs-core.allbridge.io/
- Allbridge Core audit (Quarkslab): https://blog.quarkslab.com/allbridge-core-stellar.html
- Wormhole supported blockchains: https://wormhole.com/platform/blockchains · supported networks: https://wormhole.com/docs/products/reference/supported-networks/
- Stellar X-Ray (P25) BN254 / EIP-196/197 parity: https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
- Messari State of Stellar Q1 2026 (SDF/Nethermind/Wormhole bridge dev): https://messari.io/report/state-of-stellar-q1-2026
- zkBridge (Berkeley RDI / arXiv): https://rdi.berkeley.edu/zkp/zkBridge/zkBridge.html · https://arxiv.org/pdf/2210.00264
- Succinct / Telepathy zk light client: https://lifi.substack.com/p/succinct-marries-zksnarks-and-light
- RAILGUN cross-contract calls: https://docs.railgun.org/developer-guide/wallet/transactions/cross-contract-calls · system: https://docs.railgun.org/wiki/learn/privacy-system
- Nethermind Stellar Private Payments PoC: https://github.com/NethermindEth/stellar-private-payments
- Stellar RISC Zero verifier: https://github.com/NethermindEth/stellar-risc0-verifier

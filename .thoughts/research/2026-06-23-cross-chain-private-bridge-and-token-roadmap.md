# Feature Memory: Cross-Chain Private Bridge And Confidential Token Wallet Mode

## Scope

Capture Abu's 2026-06-23 product idea so future planning does not lose it:

- A real **cross-chain private bridge** using Stellar's BN254 compatibility to verify proofs that originate in another ecosystem.
- Future **Confidential Token wallet mode**, where users can add/wrap private token contracts, transfer them, and possibly move between public, confidential, and shielded states.

This was not Phase 8 scope. Phase 8 has since proven the public CCTP bridge, then separate ZK Freighter shield on Stellar. Phase 9 deferred atomic bridge-and-shield until a custom adapter passes real tests.

Follow-up plan:

- `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`

## Why The Current Bridge Is Not A Fully ZK Private Bridge

The current ZK Freighter bridge path is useful and honest, but it is not fully private end-to-end:

1. USDC burns publicly on Ethereum Sepolia through Circle CCTP.
2. Circle Iris attests publicly to the burn.
3. USDC mints/forwards publicly on Stellar testnet.
4. ZK Freighter then submits a separate shield transaction into the Stellar privacy pool.

Privacy starts after the Stellar shield transaction. The bridge leg is public.

Correct demo language:

- "Bridge USDC publicly with Circle CCTP, then shield it on Stellar."
- "The bridge is public; the ZK proof is load-bearing in the shielded Stellar transfer layer."

Incorrect demo language:

- "Fully private cross-chain bridge."
- "ZK hides the Ethereum burn or Stellar mint."
- "The bridge itself is trust-minimized by our ZK proof."

## What Stellar BN254 Compatibility Actually Enables

Stellar's BN254 host functions make Ethereum-style BN254 proof verification feasible on Soroban. This is the proof-portability primitive:

- A Groth16/BN254 proof produced with Ethereum-compatible tooling can be verified on Stellar.
- Noir/UltraHonk and RISC Zero/Groth16 verifier paths are relevant examples.
- This is real ZK interoperability, but it is not automatically a bridge.

Important distinction:

- Verifying a proof says "this mathematical statement is valid."
- A bridge also needs to know "this source-chain event really happened on the canonical source chain and has not been consumed before."

That second part requires cross-chain state/message security.

## Three Levels Of Cross-Chain ZK Ambition

### Level 1: Public Bridge Then Shield

This is the current MVP path.

- Value movement: Circle CCTP.
- Privacy: Stellar privacy pool after arrival.
- Risk: low, because ZK Freighter does not build bridge security.
- Status: accepted on testnet/Sepolia with real approval, burn, Iris, Stellar mint, ASP insertion, and separate USDC shield evidence recorded in `.thoughts/research/spikes-log.md`.

This is not "fully private bridge," but it is a strong real-world flow.

### Level 2: Foreign-Proof Verification Demo

This is a possible hackathon flourish or roadmap proof point.

Example:

- Generate an Ethereum/RISC0/Groth16/BN254 proof off-chain.
- Submit it to a Soroban verifier.
- Show Stellar accepting a proof from Ethereum-compatible tooling.

This demonstrates the hackathon theme:

- Stellar can verify proofs from another ecosystem.
- Stellar's BN254 compatibility is real.
- ZK is load-bearing.

But this is still not an asset bridge by itself.

### Level 3: True Cross-Chain Private Bridge

This is a serious post-MVP/v2 feature.

A true version would need:

- a source-chain lock/burn/deposit event.
- a proof that the source-chain event is included in a canonical source-chain state.
- an on-Stellar verifier/light-client or trusted message source for that state.
- nullifier/replay protection so the same source event cannot release value twice.
- destination-side mint/release/shield semantics.
- stuck-fund recovery semantics.
- audits.

This is the feature Abu is interested in, but it is not safe to claim until proven with real contracts and transactions.

## How This Connects To Confidential Tokens

Confidential Tokens add a second wallet privacy mode:

- public addresses stay visible.
- transfer amounts and balances are hidden.
- auditor/disclosure/compliance flows are first-class.
- token state is account-based, not note/pool-based.

Possible future ZK Freighter modes:

1. **Public wallet plumbing**
   - normal Stellar address.
   - public USDC/XLM.
   - bridge arrivals and unshield withdrawals live here.

2. **Confidential Token mode**
   - known counterparties.
   - private amounts and balances.
   - strong compliance/auditor story.
   - user can add a confidential token contract, register, deposit/wrap, transfer, withdraw/unwrap.
   - requires local commitment-opening state and event replay/indexing.
   - currently preview/testnet/unaudited only.

3. **Shielded Pool mode**
   - stronger payment privacy.
   - `zkf1...` private receive codes.
   - shielded transfers inside the pool.

4. **Cross-chain private bridge mode**
   - future research.
   - source-chain proof or message comes in.
   - destination asset becomes confidential or shielded on Stellar.
   - must be testnet-proven before any product claim.

## Product Conversation To Have Later

After submission hardening, revisit:

- Should ZK Freighter expose both "Confidential Token" and "Shielded Pool" as separate privacy modes?
- Does "Add token" mean add:
  - a normal SEP-41/SAC token,
  - an OpenZeppelin Confidential Token wrapper,
  - a ZK Freighter pool asset,
  - or all three with clear labels?
- Can USDC bridge arrival go to:
  - public Stellar USDC only,
  - confidential-token wrapper,
  - privacy pool,
  - or a guided choice?
- What does user recovery mean for confidential-token local openings and event history?
- Do we need an indexer before this is credible beyond demo retention windows?
- Which mode is best for the final demo story without overloading the user?

## Current Scope Guard

Do not interrupt Phase 10 submission hardening to build this.

The hard bridge proof is already recorded:

- Sepolia approval hash.
- Sepolia CCTP burn hash.
- Iris attestation reference.
- Stellar mint/forward hash.
- public Stellar USDC balance proof.
- separate USDC shield hash.

This file should feed a research-backed plan for post-MVP privacy modes after the hackathon submission is hardened.

Current placement as of 2026-06-24:

- Do not merge Confidential Tokens into the current shielded-pool MVP or extension dApp-signing plan.
- Treat it as a parallel post-MVP track after the wallet can reliably sign normal Stellar transactions from the extension/web core.
- The smallest credible first step is a reality spike: run pinned Noir/Barretenberg tooling, benchmark browser proof generation, and prove one testnet register/deposit/withdraw route.

## Sources And Prior Repo Notes

- `.thoughts/research/2026-06-21-cctp-bridge.md`
- `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
- `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`
- `.thoughts/research/exploratory/09-crosschain-bridge-feasibility.md`
- `.thoughts/research/2026-06-23-confidential-tokens-preview.md`
- `.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`
- Stellar ZK docs via Context7: `/websites/developers_stellar`, query `Stellar BN254 host functions Ethereum EIP-196 EIP-197 proof verification cross-chain proof private bridge`.
- Stellar docs say BN254 host functions provide cryptographic operations for verification, but complete ZK workflows still require higher-level proof systems and verifier contracts.
- Stellar privacy docs say ZK primitives are foundational building blocks and do not provide end-to-end private payments by themselves.

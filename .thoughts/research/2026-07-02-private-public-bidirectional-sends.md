# Private↔Public Sends: Research + Code-Verified Findings

Date: 2026-07-02 · Author: Claude (Fable) · Status: verified against code and live testnet

## Question

Can ZK Fighter support (a) private→public sends (spend shielded balance directly to a public
G-address without unshield-then-pay) and (b) public→private sends (pay someone's `zkf1…` code
from a public balance)?

## Industry survey (sources at end)

- **Zcash z→t**: one-step deshield. Amount + t-address public; spent notes/sender hidden. Wallets
  must warn on any t-address interaction.
- **Railgun unshield-to-recipient**: one step; recipient + amount public; tx submitted by a
  Broadcaster (relayer) so the fee payer does not identify the sender; anonymity = full shielded set.
- **Aztec exit-to-L1**: recipient + amount public, sender hidden among rollup users; fee abstraction
  exists specifically to keep gas from leaking identity.
- **Privacy Pools (0xbow)**: withdrawal-to-recipient with recipient bound inside the proof;
  relayer recommended so gas isn't paid from the user's own wallet.
- **Universal caveats**: amount correlation, timing correlation, anonymity-set size, recipient linkage.

## Code-verified findings (reference/stellar-private-payments + packages/core)

### Private→public is one op away — but sender linkage is real today

- `pool.rs` `transact` with `ext_amount < 0` transfers **from the contract to `ext_data.recipient`**;
  nothing moves from `sender`. Any funded account can be the submitter without fund risk.
- `ext_data_hash` is a bound public input (circuit `transaction.circom:29,139-140`; contract
  `pool.rs:595-598`) → a relayer **cannot redirect funds**.
- **Footgun**: `sender.require_auth()` (`pool.rs:541`) + `tx_prepare.rs:44-57` couples tx source =
  `sender` = fee payer. ZK Fighter passes the user's own account for every pool op
  (`xlm-private.ts`, `soroban-submit.ts` signs with wallet identity). An observer links
  "G deposited" → "G transacted". Applies to private transfers too (those still hide amount +
  counterparty).
- **Relayer host decision: funding-api** — it already has a funded hot wallet + Stellar signing
  (`apps/funding-api/src/stellar.ts:39,84-112`) and a rate-limited POST route. bootnode has no keys
  and stays read-only. Relayer must re-run prepare/simulate with itself as source (footprint/auth
  are source-dependent) and needs a Soroban RPC submit path (funding-api signs via Horizon today);
  its testnet-only guard must be consciously relaxed for mainnet relay.
- Honest copy WITHOUT relayer: "Amount and recipient are public. Which shielded funds you spent
  stays hidden, but this transaction is signed by your wallet's Stellar account and can be linked
  to you." Only WITH a relayer: "Your identity stays hidden among everyone who has shielded into
  the pool."

### Public→private (deposit-to-recipient) is possible, client-only

- Circuit: output `outPubkey` is a **private input** with no constraint tying it to the depositor
  (`transaction.circom:41,108-114`). Value invariant `sumIns + publicAmount === sumOuts` only.
- Contract: deposits always verify the proof and never check output-commitment ownership
  (`pool.rs:535-559,583-662`); `NewCommitmentEvent` carries the encrypted output.
- Client: the reference WASM exports a general `executeTransact`
  (`client/mod.rs:629-660`) taking per-output recipient note/enc keys — exactly what a private
  transfer already consumes from a receive code. Our `executeDeposit` wrapper merely hardcodes
  self-ownership (`transact.rs:456-504`).
- Work: verify our vendored `/js/web.js` bundle exports `executeTransact`; add the binding to
  `nethermind-runtime-types.ts`; add `submitXlmShieldToRecipient` mirroring `xlm-shield.ts`.
- Honest scope: depositor account + amount are public (deposit boundary); the **recipient is
  hidden**. Only pool-protocol-aware apps (ZK Fighter surfaces) can construct this — external
  wallets/DEXes cannot send into the pool with a plain payment.

## Sources

Zcash addresses/UX: zcash.readthedocs.io (addresses, ux_wallet_checklist) · Railgun:
docs.railgun.org (unshielding, privacy-system) · 0xbow privacy-pools-core (GitHub) · Stellar blog
"Prototyping Privacy Pools on Stellar" · Aztec docs (L1↔L2 messaging, fees).

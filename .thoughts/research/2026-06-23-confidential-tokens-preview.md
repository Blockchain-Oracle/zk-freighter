# Reality Research: Stellar Confidential Tokens Developer Preview

## Scope

Check the new OpenZeppelin/SDF Confidential Tokens preview for what it actually provides, how it differs from ZK Fighter's current Nethermind Privacy Pools path, and what is safe to claim or consider for the wallet.

This is a research note only. It does not change current build scope.

## Sources Checked

- Hackathon update supplied by Abu on 2026-06-23.
- OpenZeppelin branch: `https://github.com/OpenZeppelin/stellar-contracts/tree/feat/confidential-verifier-ultrahonk`.
- Local shallow clone of that branch at `/tmp/oz-stellar-confidential`.
- Local reference clone of that branch at `reference/openzeppelin-stellar-contracts-confidential`.
- Branch commit inspected: `539968f feat(confidential): wire UltraHonk backend into verifier`.
- Demo: `https://stellar-confidential-token-demo.billowing-moon-0c6f.workers.dev/`.
- Stellar docs:
  - `https://developers.stellar.org/docs/build/apps/privacy`
  - `https://developers.stellar.org/docs/build/apps/zk`
- Context7 lookup:
  - `OpenZeppelin Stellar Contracts` did not return a dedicated confidential-token preview library.
  - Stellar docs were fetched through `/websites/developers_stellar`.

## Verified Facts

- The preview is a Soroban confidential-token wrapper for SEP-41 tokens, not an in-place extension to the underlying token contract.
- The design document says the wrapper contract holds underlying SEP-41 tokens and manages encrypted account state independently.
- The system provides confidentiality, not anonymity: sender and recipient addresses remain public; balances and transfer amounts are hidden.
- Deposits and withdrawals remain public boundaries. The demo and design both preserve visible account/contract interactions.
- The current demo page was reachable on 2026-06-24 and serves a Next.js app titled `Stellar Confidential Token`. The page describes account-holder, disclosure verifier, and auditor roles, and labels itself `Stellar testnet · unaudited reference demo`.
- The local reference repo contains the confidential-token implementation under `packages/tokens/src/confidential`.
- A single confidential-token deployment is three contracts: token wrapper, auditor key registry, and UltraHonk verification-key registry.
- The design says future documents for user flows, indexing/off-chain recovery, and SDK are still "to be added". That matters for wallet integration because ZK Fighter would need those SDK/recovery responsibilities itself if they are not published.
- Core cryptography:
  - balances are Grumpkin Pedersen commitments.
  - state-consuming operations use Noir/UltraHonk proofs.
  - recipients and auditors recover plaintext from event ciphertexts using per-transfer ECDH.
  - the design uses BN254/Poseidon/Poseidon2 host-function support.
- The confidential package includes six operation circuits:
  - `register`
  - `withdraw`
  - `transfer`
  - `spender_transfer`
  - `set_spender`
  - `revoke_spender`
- The on-chain surface is split into three contracts:
  - confidential token contract.
  - auditor-key registry.
  - UltraHonk verifier-key registry.
- The main token trait exposes:
  - `register`
  - `deposit`
  - `merge`
  - `withdraw`
  - `confidential_transfer`
  - `confidential_transfer_from`
  - `set_spender`
  - `revoke_spender`
  - read helpers for account/delegation state.
- `deposit` requires no proof. It transfers SEP-41 tokens into the wrapper and adds a public amount to the recipient's receiving commitment.
- `deposit` requires the depositor's public Stellar authorization and does not require the depositor to already have a confidential account; the recipient must be registered.
- `merge` requires owner auth but no ZK proof. It folds receiving balance into spendable balance.
- Transfers and withdrawals consume private state and require UltraHonk proofs.
- The owner must maintain commitment openings as local wallet state. Event replay and recovery are therefore wallet/indexer concerns, not just contract calls.
- The design has a spending key, viewing key, public viewing key, and per-spender delegation viewing keys. A ZK Fighter integration would need deterministic derivation and encrypted local storage for these without confusing them with the existing Nethermind pool note keys.
- The wrapper assumes exact-transfer SEP-41 behavior: no rebasing, no fee-on-transfer, deterministic revert, and careful handling of SAC freeze/clawback/deauthorization risk.
- The compliance extension includes:
  - account freeze/unfreeze.
  - optional SAC `authorized()` passthrough.
  - optional external authorization policy contract.
- Clawback is documented as an outline, not a finished full implementation.
- The verifier module warns that the UltraHonk backend and circuits are not audited and must not be used for mainnet or real value.
- The branch pins `ultrahonk-soroban-verifier` to Nethermind `rs-soroban-ultrahonk` commit `661db07200f890b1bd9a7349ed787c70a706dd12`.
- The branch pins `soroban-sdk` around version `26.0.x`.
- Noir CI is configured with `NARGO_VERSION=1.0.0-beta.11` and `BB_VERSION=0.87.0`.
- Local Rust validation passed:
  - previous command: `cargo test -p stellar-tokens confidential --manifest-path /tmp/oz-stellar-confidential/Cargo.toml`
  - current command: `cargo test -p stellar-tokens confidential --manifest-path reference/openzeppelin-stellar-contracts-confidential/Cargo.toml`
  - result: 92 confidential tests passed, 0 failed.
- Noir/Barretenberg validation was not run locally because `nargo` and `bb` were not installed in this environment.
- The demo labels itself testnet and unaudited.
- Demo roles:
  - Account holder: connect Freighter, deposit, transfer, withdraw, generate disclosures.
  - Disclosure receiver: create a one-time request and verify a holder bundle against chain.
  - Auditor: use the auditor key to decrypt event-stream amounts.
- Demo contract previews:
  - token `CBF6...5N3F`.
  - verifier `CDCE...WFXL`.
  - auditor `CA4I...VY4L`.
- The demo auditor page explicitly notes RPC retention limits: only events inside the RPC retention window are available for reconstruction.

## Inferences

- This is a strong wallet-relevant primitive because the wallet is where the user must hold local openings, viewing keys, event history, disclosure flows, and proof generation UX.
- It is not a direct replacement for ZK Fighter's current Privacy Pools path:
  - Confidential Tokens hide amounts and balances between public addresses.
  - Privacy Pools aim to hide more of the address/history linkage inside a pool, with public deposit/withdraw boundaries.
- Confidential Tokens are likely easier to explain to compliance-minded users: known parties, private amounts, auditor/disclosure paths.
- Confidential Tokens are likely worse for anonymity-style claims: addresses remain visible by design.
- A future ZK Fighter wallet could support both modes:
  - Privacy Pool mode: shielded transfers with stronger address/history privacy.
  - Confidential Token mode: public counterparties with private amounts and regulated disclosure/auditor support.
- The right product framing is not "replace shielded pools"; it is "add a second privacy mode for private token balances and transfer amounts".
- The most likely integration path is after the extension/public wallet-mode work, because confidential-token interactions need ordinary Stellar signing plus proof-generation UX.

## Unknowns And Questions

- Whether the preview contracts have deployed artifacts and full reproducible deployment instructions outside the demo.
- Whether a JS/TS SDK exists for producing the required Noir witnesses/proofs in-browser. The current design docs still list `SDK` as a future document.
- Browser proving time and memory for each of the six circuits.
- How complete the demo's disclosure circuit/package is relative to the OpenZeppelin branch.
- Whether CCTP-arrived USDC can be safely wrapped into a confidential token deployment without issuer/SAC authorization surprises.
- How wallet recovery works for local commitment openings if browser storage is lost. The contract design requires owner-side opening maintenance.
- How robust event indexing is beyond RPC retention windows.
- Whether a hackathon demo should integrate this directly or only cite it as future/adjacent support.

## Not Included

- No ZK Fighter code changes.
- No Confidential Token deployment.
- No local Noir circuit run.
- No proof generation benchmark.
- No attempt to use the demo with Freighter.
- No recommendation to replace the current Phase 8 bridge/Privacy Pools path.

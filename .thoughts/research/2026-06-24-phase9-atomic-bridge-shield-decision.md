# Reality Research: Phase 9 atomic bridge-and-shield decision

## Scope

Decide whether ZK Fighter can expose atomic bridge-and-shield as an MVP or experimental user mode after the real Phase 8 CCTP bridge-then-shield acceptance run.

This checks current Circle CCTP docs, Stellar/Soroban ZK/auth docs, local Circle CCTP source, local Nethermind privacy-pool source, and prior ZK Fighter research. It does not implement a contract adapter.

## Sources Checked

- Project scope:
  - `README.md`
  - `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
  - `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`
  - `.thoughts/handoffs/2026-06-22-codex-build-prompts.md`
- Prior research:
  - `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
  - `.thoughts/research/2026-06-21-cctp-bridge.md`
  - `.thoughts/research/2026-06-22-domain-readiness-audit.md`
  - `.thoughts/research/2026-06-23-cross-chain-private-bridge-and-token-roadmap.md`
  - `.thoughts/research/2026-06-23-confidential-tokens-preview.md`
- Context7:
  - `npx ctx7@latest library "Circle CCTP" "Phase 9 atomic bridge-and-shield research: Stellar CCTP V2 hooks CctpForwarder mint_and_forward hookData arbitrary contract call custom receiver MessageTransmitter receive_message privacy pool atomic shield feasibility"`
  - `npx ctx7@latest docs /websites/developers_circle "Phase 9 atomic bridge-and-shield research: Stellar CCTP V2 hooks CctpForwarder mint_and_forward hookData arbitrary contract call custom receiver MessageTransmitter receive_message privacy pool atomic shield feasibility"`
  - `npx ctx7@latest library "Stellar Developers" "Stellar BN254 Poseidon Soroban proof verification CCTP atomic bridge shield privacy pool custom adapter Protocol 25 26 current docs"`
  - `npx ctx7@latest docs /websites/developers_stellar "Stellar BN254 Poseidon Soroban proof verification CCTP atomic bridge shield privacy pool custom adapter Protocol 25 26 current docs"`
- Web docs:
  - `https://developers.circle.com/cctp/references/stellar`
  - `https://developers.circle.com/cctp/references/stellar-contracts`
  - `https://developers.stellar.org/docs/build/apps/privacy`
  - `https://developers.stellar.org/docs/build/apps/zk`
  - `https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization`
  - `https://developers.stellar.org/docs/build/guides/auth/contract-authorization`
- Local Circle CCTP source:
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/contract.rs`
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/message.rs`
  - `reference/stellar-cctp/contracts/message-transmitter-v2/src/contract.rs`
  - `reference/stellar-cctp/contracts/message-transmitter-v2/src/storage.rs`
  - `reference/stellar-cctp/contracts/token-messenger-minter-v2/src/contract.rs`
  - `reference/stellar-cctp/contracts/token-messenger-minter-v2/src/receive.rs`
  - `reference/stellar-cctp/packages/cctp-interfaces/src/message_handler.rs`
  - `reference/stellar-cctp/packages/cctp-utils/src/message/mod.rs`
- Local Nethermind privacy-pool source:
  - `reference/stellar-private-payments/contracts/pool/src/pool.rs`
  - `reference/stellar-private-payments/app/crates/core/types/src/ext_data.rs`
  - `reference/stellar-private-payments/app/crates/core/stellar/src/soroban_encode.rs`

## Verified Facts

### Phase 8 safe bridge is already proven

- Phase 8 recorded a real Sepolia USDC approval, CCTP burn, Iris attestation, Stellar testnet `mint_and_forward`, public USDC balance, ASP insertion, and separate USDC shield/deposit in `.thoughts/research/spikes-log.md`.
- The current safe MVP bridge is therefore not speculative: it is public CCTP bridge arrival followed by a separate ZK Fighter USDC shield/deposit.

### Stock Circle `CctpForwarder` still only forwards tokens

- Current Circle docs describe Stellar `CctpForwarder` as a contract that receives minted USDC and forwards it to `forwardRecipient`.
- Current Circle docs define hook data as version `0`, recipient length, and a `G...`, `C...`, or `M...` Stellar strkey encoded as UTF-8.
- Local source confirms the stock forwarder validates the message, mints through CCTP to the forwarder, and then executes `token_client.transfer(&contract_address, &forward_recipient, &amount_minted)`.
- The stock forwarder does not accept or invoke a Nethermind pool `Proof`.
- The stock forwarder does not accept or invoke Nethermind pool `ExtData`.
- The stock forwarder does not call the privacy pool's `transact`.

### The Nethermind pool deposit requires a full proof-bound transaction

- The privacy pool entry point is `transact(env, proof, ext_data, sender)`.
- `transact` calls `sender.require_auth()`.
- For deposits, `ext_data.ext_amount > 0` causes a token transfer from `sender` to the pool.
- The pool validates:
  - Merkle root.
  - input nullifiers.
  - `hash_ext_data(ext_data) == proof.ext_data_hash`.
  - `calculate_public_amount(ext_data.ext_amount) == proof.public_amount`.
  - ASP membership and non-membership roots.
  - the Groth16 proof.
- `ExtData` includes `recipient`, signed `ext_amount`, and two encrypted output payloads.
- Therefore a true atomic shield cannot be a plain CCTP token transfer to the pool. It needs a real pool proof generated for the exact deposit amount and output commitments.

### A custom adapter is conceptually plausible but unproven

- Circle CCTP messages include `recipient`, `destination_caller`, `message_body`, `nonce`, source domain, sender, and finality fields.
- `MessageTransmitter.receive_message(caller, message, attestation)` checks the attestation, destination domain, optional destination caller, message version, and nonce reuse before dispatching the message body to the message recipient.
- In the current EVM -> Stellar token flow, the message recipient is `TokenMessengerMinter`; the burn body contains `mint_recipient`.
- A forwarder-style custom adapter could plausibly replace Circle's stock forwarder as the `mint_recipient` and `destination_caller`, call `MessageTransmitter.receive_message`, receive minted USDC, then call the privacy pool `transact` with itself as `sender`.
- Stellar's authorization docs describe contract-invoker authorization and authorized sub-contract calls, so a contract that directly invokes the pool may be able to satisfy `sender.require_auth()` for itself and allow the downstream token transfer.
- That authorization path still needs a local adapter test because ZK Fighter has no contract proving adapter -> pool auth today.

### Atomic means one destination-chain transaction, not one cross-chain transaction

- Even the stock Circle flow is not one cross-chain transaction.
- The EVM/Sepolia burn happens first, then Iris attests, then a Stellar transaction consumes the message and attestation.
- "Atomic" can only honestly mean the Stellar destination-side mint and shield happen in one Soroban transaction after attestation is available.
- It cannot mean the Ethereum burn and Stellar shield are one indivisible cross-chain transaction.

### Confidential Tokens do not change Phase 9's bridge decision

- The OpenZeppelin/SDF Confidential Tokens preview is relevant future wallet surface area, but it is testnet-only, unaudited, and distinct from the Nethermind privacy pool.
- Confidential Tokens hide balances and amounts while keeping account addresses visible.
- ZK Fighter's Phase 9 question is specifically CCTP arrival into the existing privacy-pool shield path. Confidential Tokens are not a drop-in atomic bridge-and-shield solution for the current MVP.

## Inferences

- Atomic bridge-and-shield should be **deferred**, not exposed in the MVP and not shown as a normal bridge option.
- The honest product stance remains:
  - Standard flow: public CCTP bridge, then separate USDC shield/deposit.
  - Experimental future flow: destination-side CCTP mint and shield in one Stellar transaction, only after a custom adapter is built and tested.
- The adapter path is promising enough to preserve as a post-MVP/v2 spike, but not safe enough to build into the hackathon submission unless there is time for contract implementation, local tests, testnet deployment, and one real Sepolia -> Stellar adapter transaction.

## Adapter Proof Gates Before Any Product Claim

Atomic mode needs all of these before it can move beyond hidden/deferred:

1. A Soroban adapter contract that calls CCTP `receive_message`, receives minted USDC, and calls the Nethermind USDC pool `transact`.
2. A local contract test proving adapter-as-`sender` satisfies pool auth and the pool can transfer USDC from the adapter into the pool.
3. A payload binding design that ties:
   - CCTP source domain.
   - CCTP sender.
   - CCTP nonce or message hash.
   - burn amount after CCTP fee.
   - destination adapter.
   - pool ID.
   - `proof.ext_data_hash`.
   - `ext_data.ext_amount`.
   - output commitments or encrypted outputs.
4. A front-run/replay analysis showing that a third party cannot use the attestation to shield into a different note or steal/re-route the bridge arrival.
5. Recovery semantics for failed shield after mint:
   - full revert is best if `receive_message` and `transact` are in one Soroban invocation.
   - any partial-mint possibility needs an escape function with strict ownership and replay controls.
6. Transaction resource/fee measurements for CCTP receive + mint + Groth16 verifier + pool insert in one invocation.
7. A real testnet evidence run with:
   - Sepolia burn hash.
   - Iris attestation reference.
   - adapter Stellar transaction hash.
   - resulting pool commitment event.
   - no public USDC balance stopover claim unless the adapter actually exposes one.

## Unknowns And Questions

- Can the full proof/ext-data payload fit directly in source-chain hook data without hitting EVM calldata, Circle message, Iris, Stellar transaction, or Soroban argument-size limits?
- If not, what precommit scheme should the adapter use, and who is allowed to publish or update precommitted proof data?
- Can the exact minted local amount always be known before proof generation, especially if CCTP fast-transfer fees or decimal conversion change the amount?
- Does the adapter need to reject unfinalized CCTP messages and require `finality_threshold_executed >= 2000`?
- What is the concrete resource budget of CCTP receive/mint plus pool proof verification in one transaction?
- Can the adapter be designed without becoming a custody/stuck-funds surface?
- Would a purpose-built USDC pool variant be safer than an external adapter around the existing pool?

## Phase 9 Decision

Atomic bridge-and-shield is **deferred**.

Do not expose atomic bridge-and-shield as a normal MVP mode. Do not claim the bridge itself is private. Do not claim the stock Circle forwarder shields into ZK Fighter.

The accepted Phase 9 outcome is: keep the proven safe MVP flow, document the custom adapter proof gates, and move to Phase 10 submission hardening unless Abu explicitly chooses to fund and time-box a separate adapter spike.

## Not Included

- No adapter contract.
- No Rust contract workspace.
- No local adapter -> pool auth test.
- No source-chain proof or hook payload implementation.
- No live atomic bridge transaction.
- No Confidential Token integration.

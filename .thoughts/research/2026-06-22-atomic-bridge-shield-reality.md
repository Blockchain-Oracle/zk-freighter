# Reality Research: atomic bridge-and-shield on Stellar

## Scope

Reality check for whether ZK Fighter can offer a one-click CCTP bridge where USDC arrives on Stellar and is shielded into the Nethermind privacy pool atomically.

Locked product decision from founder: safe MVP bridge scope is **two-step bridge then shield**. This brief only evaluates whether an atomic option is real enough to research/spike later.

## Sources Checked

- Circle official docs:
  - https://developers.circle.com/cctp/references/stellar
  - https://developers.circle.com/cctp/references/stellar-contracts
  - https://developers.circle.com/cctp/concepts/supported-chains-and-domains
- Circle source:
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/contract.rs`
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/message.rs`
  - `reference/stellar-cctp/contracts/message-transmitter-v2/src/contract.rs`
  - `reference/stellar-cctp/contracts/message-transmitter-v2/src/storage.rs`
  - `reference/stellar-cctp/contracts/token-messenger-minter-v2/src/receive.rs`
  - `reference/stellar-cctp/packages/cctp-interfaces/src/message_handler.rs`
  - `reference/stellar-cctp/examples/README.md`
- Nethermind pool source:
  - `reference/stellar-private-payments/contracts/pool/src/pool.rs`
- Context7:
  - `npx ctx7@latest library "Circle CCTP" "Stellar CCTP V2 hooks CctpForwarder mint_and_forward hookData arbitrary contract call atomic bridge and shield"`
  - `npx ctx7@latest docs /websites/developers_circle "Stellar CCTP V2 hooks CctpForwarder mint_and_forward hookData arbitrary contract call atomic bridge and shield"`

## Verified Facts

### Circle's stock Stellar forwarder is not an arbitrary contract-call hook

- Circle docs say EVM -> Stellar transfers should use `CctpForwarder`, with both `mintRecipient` and `destinationCaller` set to the CctpForwarder contract.
- Circle docs describe `mint_and_forward(message, attestation)` as:
  1. validate the message.
  2. extract `forwardRecipient` from hook data.
  3. call `receive_message` on `MessageTransmitter`, minting USDC to `CctpForwarder`.
  4. transfer minted USDC to `forwardRecipient`.
  5. run atomically, reverting on failure.
- Circle docs say hook data carries the `forwardRecipient` strkey, and may include optional trailing integrator bytes.
- The local Circle forwarder source confirms the actual action: after minting, it executes `token_client.transfer(&contract_address, &forward_recipient, &amount_minted)`.
- The stock forwarder source contains no call to arbitrary destination contract functions and no call shape that can pass a Nethermind `Proof` + `ExtData` into the pool.

### The stock forwarder cannot be the whole atomic shield implementation

- The Nethermind pool deposit path is `transact(env, proof, ext_data, sender)`.
- For deposits, the pool requires:
  - `sender.require_auth()`.
  - a positive `ext_data.ext_amount`.
  - a valid `proof.ext_data_hash`.
  - a valid `proof.public_amount`.
  - valid ASP roots.
  - a valid Groth16 proof.
  - a token transfer from `sender` to the pool.
- Circle's stock forwarder only forwards minted USDC to a recipient. It does not build, carry, validate, or pass the privacy-pool proof data.
- Therefore stock `CctpForwarder` cannot make bridge-and-shield atomic by itself.

### CCTP lower layers have a more general message-handler shape

- `MessageTransmitter.receive_message(caller, message, attestation)` validates the message and attestation, checks destination domain, checks destination caller if non-zero, marks the nonce used, then delivers the message body to the message `recipient`.
- The message recipient is treated as a contract implementing the CCTP `MessageHandler` interface.
- The `MessageHandler` interface exposes:
  - `handle_recv_finalized_message(source_domain, sender, finality_threshold_executed, message_body) -> bool`
  - `handle_recv_unfinalized_message(source_domain, sender, finality_threshold_executed, message_body) -> bool`
- `TokenMessengerMinterV2` implements that message-handler interface. It parses the burn message, maps the remote burn token to the local token, converts decimals, and mints USDC to `mint_recipient`.
- In the CCTP burn message, `mint_recipient` is treated as a Stellar contract address.
- `destination_caller` can restrict who may call `receive_message`; if it is non-zero, it must match the caller address.

### What a custom atomic path would require

Based on current source, an atomic bridge-and-shield path would need custom Stellar contract work. A plausible shape is:

1. Source-chain burn uses a custom destination caller/mint recipient contract, not Circle's stock forwarder.
2. The custom Stellar contract calls `MessageTransmitter.receive_message` so USDC mints to the custom contract.
3. The custom contract parses hook data carrying shield intent and proof data, or otherwise retrieves precommitted proof data.
4. The custom contract invokes Nethermind pool `transact(proof, ext_data, sender)` with itself as `sender` and positive `ext_amount`.
5. The pool transfers USDC from the custom contract into the pool and inserts the output commitments if the proof validates.

This is not implemented in the repo today.

## Inferences

- Atomic bridge-and-shield is **not disproven as a protocol concept**. CCTP's lower-level message recipient/destination caller model is flexible enough that a custom receiver/adapter may be possible.
- Atomic bridge-and-shield is **not safe to claim for the MVP today** because no custom adapter exists, no proof payload format exists, no USDC pool run exists, and no live transaction has demonstrated CCTP mint -> pool `transact` in one Stellar invocation.
- The founder's locked MVP scope should remain: **safe two-step bridge then shield**.
- The product can later offer two bridge modes only if the atomic mode earns proof:
  - Standard: bridge, then shield. Stable MVP.
  - Experimental: bridge and shield atomically. Only shown if the custom adapter passes local tests and real testnet execution.

## Unknowns And Questions

- Can a custom receiver/adapter successfully authorize itself as `sender` when invoking the pool's `transact()` and the pool performs `sender.require_auth()`?
- Can the full privacy-pool proof + ext data fit safely in CCTP hook data or an alternative precommit/retrieval scheme?
- What is the maximum practical message/hook payload size for this flow after Circle/Iris/EVM calldata/Stellar transaction limits?
- Can the proof be generated before source-chain burn with all public inputs known, including exact CCTP fee-executed amount and local seven-decimal Stellar amount?
- If CCTP fast transfer fees change the final minted amount, how does the proof commit to the exact positive `ext_amount`?
- Can a USDC pool be deployed and round-tripped first?
- What are the resource/fee costs for one transaction that performs CCTP receive/mint plus pool proof verification plus pool token transfer?
- Does the atomic path create stuck-funds risk if proof validation fails after minting to the custom adapter?
- What recovery/escape function would the custom adapter need if a message mints to it but shield fails?
- No live custom adapter test exists.

## Not Included

- No custom adapter implementation.
- No contract deployment.
- No local Rust test for adapter -> pool auth.
- No live Sepolia -> Stellar CCTP run.
- No live USDC pool transaction.
- No proof that atomic bridge-and-shield works today.

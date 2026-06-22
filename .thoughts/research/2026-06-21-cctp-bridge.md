# Reality Research: Circle CCTP V2 Ethereum<->Stellar testnet — exact integration facts

## Scope

Exact executable facts for bridging USDC between **Ethereum Sepolia** (EVM domain 0) and
**Stellar testnet** (domain 27) using Circle CCTP V2. Covers: contract addresses on both sides,
the EVM `depositForBurn`/`depositForBurnWithHook` call shape (viem), the Stellar
`deposit_for_burn`/`mint_and_forward`/`receive_message` call shape (`@stellar/stellar-sdk`),
the Iris sandbox attestation API and polling, hookData/mintRecipient encoding rules (EVM 32-byte
vs Stellar strkey), the atomic-vs-two-step reality from the actual `CctpForwarder` source, and faucets.

Facts only. No solution/architecture/recommendation perspective.

Primary artifact: the official `circlefin/stellar-cctp` repo, cloned to
`/Users/abu/dev/hackathon/stellar-research/repos/stellar-cctp` (HEAD `45746f2c…`, committed 2026-06-18).
The repo ships a complete end-to-end reference integration under `examples/`.

## Sources Checked

- **Repo (PRIMARY):** `circlefin/stellar-cctp` @ `45746f2c803198bc6cd586475eb3c925f12bb488` (2026-06-18), cloned to `/Users/abu/dev/hackathon/stellar-research/repos/stellar-cctp`.
  - `examples/README.md`, `examples/main.ts`, `examples/config.ts`, `examples/evm.ts`, `examples/stellar.ts`, `examples/stellar-utils.ts`, `examples/.env.example`
  - `contracts/cctp-forwarder/src/contract.rs`, `contracts/cctp-forwarder/src/message.rs`
  - `contracts/token-messenger-minter-v2/src/contract.rs`, `.../deposit.rs`, `.../receive.rs`
  - `contracts/message-transmitter-v2/src/contract.rs`, `.../storage.rs`
  - `packages/cctp-interfaces/src/{token_messenger,receiver,relayer}.rs`
- **Circle docs (WebFetch):** `developers.circle.com/cctp/evm-smart-contracts` (EVM V2 addresses + domains); `developers.circle.com/cctp/technical-guide` (Iris API + finality thresholds); `faucet.circle.com` (faucet coverage).
- **WebSearch:** confirmed Ethereum Sepolia USDC token address.
- **404 / not reachable:** `developers.circle.com/cctp/stellar-smart-contracts` (404 at fetch time); `developers.circle.com/stablecoins/usdc-on-test-networks` (404). Stellar addresses below are instead sourced from the repo's `examples/.env.example`, which is a primary source.

## Verified Facts

### 1. Contract addresses

**Stellar testnet** (from `examples/.env.example`, lines under "Stellar CCTP Contract Addresses"):
- TokenMessengerMinterV2: `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP`
- MessageTransmitterV2: `CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY`
- CctpForwarder: `CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ`
- USDC SAC (token contract): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- Soroban RPC: `https://soroban-testnet.stellar.org`
- Network passphrase: `Test SDF Network ; September 2015`

These three task-given Stellar addresses match the repo exactly: TokenMessengerMinter=`CDNG7HXAP…RTHP`, MessageTransmitter=`CBJ6MTCKK…AVVJY`, CctpForwarder=`CA66Q2WFB…4VSZ`.

**Ethereum Sepolia / EVM CCTP V2** (from `developers.circle.com/cctp/evm-smart-contracts`; the doc explicitly states these three addresses are **identical across all EVM testnets** incl. Ethereum Sepolia, Base Sepolia, Arc Testnet):
- TokenMessengerV2: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- MessageTransmitterV2: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
- TokenMinterV2: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
- MessageV2 (helper lib): `0xbaC0179bB358A8936169a63408C8481D582390C4`
- USDC on Ethereum Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (Circle docs via WebSearch; 6 decimals)

Note: the repo's `examples/.env.example` is preconfigured for **Arc Testnet** (EVM domain 26, chain id 5042002, USDC `0x3600…0000`, RPC `https://rpc.testnet.arc.network`), but uses the *same* TokenMessengerV2 / MessageTransmitterV2 addresses above because they are shared across EVM testnets. Switching to Ethereum Sepolia is pure env reconfiguration (`EVM_DOMAIN=0`, Sepolia RPC, `EVM_TOKEN_HEX=0x1c7D4B19…C7238`, chain id 11155111).

### 2. Domain IDs

- Ethereum Sepolia = **0** (Circle docs; `examples/main.ts` passes `EVM_DOMAIN` as `destinationDomain`).
- Stellar = **27** (`examples/config.ts:71` `export const STELLAR_DOMAIN_ID = 27;`).
- Other EVM testnet domains (from docs): Avalanche Fuji 1, OP Sepolia 2, Arbitrum Sepolia 3, Base Sepolia 6, Polygon Amoy 7, Arc Testnet 26.

### 3. EVM-side calls (viem) — `examples/evm.ts`

**`depositForBurnWithHook`** ABI (`evm.ts:60-77`), used for EVM→Stellar:
```
amount uint256, destinationDomain uint32, mintRecipient bytes32, burnToken address,
destinationCaller bytes32, maxFee uint256, minFinalityThreshold uint32, hookData bytes
```
Called on `EVM_TOKEN_MESSENGER_ADDRESS` (TokenMessengerV2). Preceded by ERC-20 `approve(TokenMessengerV2, amount)` on the USDC token (`evm.ts:130-148`). In `main.ts:234-243` the call passes:
`destinationDomain = STELLAR_DOMAIN_ID (27)`, `mintRecipient = destinationCaller = contractStrkeyToBytes32(FORWARDER)`, `hookData = buildCctpForwarderHookData(recipient)`.

**`receiveMessage(bytes message, bytes attestation) -> bool`** ABI (`evm.ts:79-90`), called on `EVM_MESSAGE_TRANSMITTER_ADDRESS` (MessageTransmitterV2) for the Stellar→EVM direction (`evm.ts:201-220`).

EVM client is plain viem: `createWalletClient`/`createPublicClient` + `encodeFunctionData` + `sendTransaction` + `waitForTransactionReceipt` (`evm.ts:19-128`).

### 4. Stellar-side calls (`@stellar/stellar-sdk`) — `examples/stellar.ts` + contract source

**On-chain `deposit_for_burn`** signature (`contracts/token-messenger-minter-v2/src/contract.rs:237-247`):
```
deposit_for_burn(caller: Address, amount: i128, destination_domain: u32,
  mint_recipient: BytesN<32>, burn_token: Address, destination_caller: BytesN<32>,
  max_fee: i128, min_finality_threshold: u32)
```
`deposit_for_burn_with_hook` is identical plus a trailing `hook_data: Bytes` (`contract.rs:304-315`); it panics `HookDataEmpty` if `hook_data.is_empty()` (`contract.rs:321-323`). Both call `caller.require_auth()`. The TS client builds args in this exact order (`stellar.ts:177-198`) and requires a prior SEP-41 `approve(from, spender=TMM, amount i128, expiration_ledger u32)` on the USDC SAC (`stellar.ts:155-164`). Burn internally uses `transfer_from` then `burn` (`deposit.rs:300-306`), so approval is mandatory.

**On-chain `receive_message`** signature (`contracts/message-transmitter-v2/src/contract.rs:315`):
```
receive_message(caller: Address, message: Bytes, attestation: Bytes) -> bool
```
TS wrapper passes `[caller Address, message Bytes, attestation Bytes]` (`stellar.ts:228-237`). Used for direct EVM→Stellar mint when the mintRecipient is a wallet (not the forwarder).

**On-chain `mint_and_forward`** signature (`contracts/cctp-forwarder/src/contract.rs:140`):
```
mint_and_forward(message: Bytes, attestation: Bytes)   // no caller arg; not auth-gated
```
TS wrapper passes only `[message Bytes, attestation Bytes]` (`stellar.ts:267-272`), called on the CctpForwarder contract.

Stellar tx flow in `submitSorobanTx` (`stellar.ts:54-101`): build with `TransactionBuilder` (fee `10000000`, 120s timeout) → `simulateTransaction` → `assembleTransaction` → `sign(keypair)` → `sendTransaction` → poll `getTransaction` until `SUCCESS` (2s interval, 2-min cap).

### 5. Atomic-vs-two-step reality (from `CctpForwarder` source)

EVM→Stellar is **one Stellar transaction** (atomic on the Stellar side). `mint_and_forward`
(`contract.rs:140-163`) does all of the following inside a single contract call:
1. `validate_cctp_message` — checks message format/version, burn-message format/version, that the message **recipient == TokenMessengerMinter**, that the **burn `mint_recipient` == this forwarder contract**, and parses hookData for the final `forward_recipient` (`message.rs:123-177`).
2. `storage::mint_through_cctp(...)` — invokes `receive_message` on MessageTransmitter to mint USDC **to the forwarder** (`contract.rs:156-157`).
3. `token_client.transfer(forwarder -> forward_recipient, amount_minted)` — forwards minted USDC to the final recipient (`contract.rs:159-160`).
4. Emits `mint_and_forward` event `[forward_recipient, token, amount]`.

`mint_and_forward` reverts if `forward_recipient` equals the local token or the forwarder itself (`contract.rs:153-155`, `InvalidForwardRecipient`). The forwarder is `#[when_not_paused]`.

The **overall bridge is still two on-chain steps across two chains** — (1) burn on EVM, then (2) `mint_and_forward` on Stellar — separated by the off-chain attestation wait. There is no single cross-chain atomic op; "atomic" applies only to the mint+forward bundling within the destination Stellar tx. Both steps are signed/submitted by the relayer/user (the example submits step 2 itself; CCTP minting is permissionless so anyone holding the attestation can submit it).

For Stellar→EVM the two steps are `deposit_for_burn` on Stellar, then `receiveMessage` on EVM (`main.ts:179-195`); standard CCTP, no forwarder.

### 6. mintRecipient / hookData / address encoding

- **EVM mintRecipient + destinationCaller for EVM→Stellar MUST both be the Stellar CctpForwarder**, encoded as bytes32 = `0x` + `StrKey.decodeContract(C…strkey)` (32 raw contract-id bytes) (`stellar-utils.ts:29-34`; `main.ts:231`). The README and code warn in multiple places: any other value "can lead to stuck funds" (`examples/README.md:16`, `evm.ts:151-156`, `config.ts:59-61`).
- **hookData encoding** (`stellar-utils.ts:48-65`, confirmed against `contracts/cctp-forwarder/src/message.rs:18-92`):
  - bytes 0–23: reserved/magic (zeroed by the helper; the contract treats these as optional — comment names them magic "cctp-forward", but `validate_hook_data` does **not** check them).
  - bytes 24–27: hook version `u32` big-endian, **must be 0** (`message.rs:37,72-76` → `InvalidHookVersion` otherwise).
  - bytes 28–31: `forward_recipient` byte length `u32` big-endian.
  - bytes 32+: `forward_recipient` = the Stellar strkey **as UTF-8 bytes** (i.e. the literal ASCII of the `G…`/`C…`/`M…` string, not decoded key bytes).
  - On Stellar the recipient is parsed via `MuxedAddress::from_string_bytes` (`message.rs:88-89`), supporting `G…` (ed25519), `C…` (contract), `M…` (muxed). `buildCctpForwarderHookData` validates the strkey is one of those three (`stellar-utils.ts:49-57`).
- **Stellar→EVM mintRecipient**: EVM 20-byte address left-zero-padded to bytes32 via viem `pad()` → `scvBytes` (`stellar.ts:111-118`, `main.ts`/`stellar.ts:168`). `destination_caller` defaults to 32 zero bytes (any caller) unless `EVM_DESTINATION_CALLER` is set (`stellar.ts:171-173`).

### 7. Decimals

- Stellar USDC = **7 decimals**; EVM/canonical USDC = **6 decimals** (`examples/README.md:84,104`; `deposit.rs:101-108`). The TMM normalizes (strips dust) on burn and converts to 6-dp canonical for the burn message; `max_fee` is likewise converted to canonical 6-dp (`deposit.rs:265-287`). CLI amounts: Stellar side `10000000` = 1 USDC; EVM side `1000000` = 1 USDC.

### 8. Iris attestation API (sandbox)

- Base URL: `https://iris-api-sandbox.circle.com` (`config.ts:24` default; confirmed by docs).
- Poll for attestation: `GET /v2/messages/{sourceDomainId}?transactionHash={burnTxHash}` (`main.ts:92`). Source domain is the **burn chain's** domain (EVM domain for EVM→Stellar; 27 for Stellar→EVM) (`main.ts:192,245`). Treats HTTP 404 as "not ready yet"; loops on 5s sleep until `data.messages[0].status === "complete"`, then returns `{ message, attestation }` (`main.ts:90-125`).
- Fees: `GET /v2/burn/usdc/fees/{sourceDomain}/{destDomain}` returns an array of `{finalityThreshold, minimumFee}` (bps) (`main.ts:127-144`). `maxFee = ceil(amount * minimumFeeBps / 10_000)` (`main.ts:78-84`).
- Rate limit (docs): 35 req/s; HTTP 429 → 5-minute block.

### 9. Finality thresholds

- `minFinalityThreshold` = **1000** for fast (confirmed-level attestation), **2000** for standard (finalized) — confirmed in both Circle docs and contract source: `FINALITY_THRESHOLD_FINALIZED: u32 = 2000` (`message-transmitter-v2/src/storage.rs:29`). `receive_message` routes to `handle_recv_finalized_message` when `finality_threshold_executed >= 2000`, else `handle_recv_unfinalized_message` (`contract.rs:328-342`). CLI selects fast vs slow via `--fastBurn true` (`main.ts:165,184-186,224-226`).

### 10. Faucets

- `https://faucet.circle.com/` dispenses testnet **USDC** (and EURC, cirBTC) on both **Ethereum Sepolia** and **Stellar Testnet** (30+ chains in the dropdown). It does **NOT** dispense native gas (ETH Sepolia / XLM); the page directs developers to the Circle Developer Console faucet for testnet ETH/POL (requires a Circle account). Repo README also points to `faucet.circle.com` (`examples/README.md:64`).
- Prereqs called out by README: a funded Stellar testnet account with **XLM and USDC** plus a **USDC trustline** for `G…`/`M…` recipients (transfers to accounts without a USDC trustline fail), and a funded EVM wallet with ETH gas + USDC (`examples/README.md:36-39, 90`).

### 11. Library versions / toolchain (repo)

- EVM: `viem` (functions used: `createWalletClient`, `createPublicClient`, `defineChain`, `encodeFunctionData`, `http`, `pad`, `isAddress`).
- Stellar: `@stellar/stellar-sdk` (`Address`, `Contract`, `Keypair`, `nativeToScVal`, `rpc.Server`, `TransactionBuilder`, `xdr`, `StrKey`).
- Examples runner: Node 22+, `zx` (minimist), `env-var`, `dotenv`, biome. Scripts: `npm run bridge stellar2evm|evm2stellar -- --amount … [--recipient …] [--fastBurn true]`.
- Contracts: Rust/Soroban, built `cargo build --target wasm32v1-none --release`.

## Inferences

- **(Inference)** Switching the repo's `examples/` from Arc Testnet to Ethereum Sepolia requires only env changes (`EVM_DOMAIN=0`, `EVM_CHAIN_ID=11155111`, `EVM_TOKEN_HEX=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, a Sepolia RPC) because the TokenMessengerV2/MessageTransmitterV2 addresses are shared across EVM testnets. Not executed/verified end-to-end here; based on env-driven `config.ts` + the docs' "identical across testnets" statement.
- **(Inference)** The reserved bytes 0–23 of hookData ("cctp-forward" magic) being optional is inferred from `validate_hook_data` not reading offsets <24 and the README comment "optional - set to 0 to opt out of forwarding by Circle." The helper zeroes them and the example works, so zeros are accepted.
- **(Inference)** Because CCTP minting is permissionless and `mint_and_forward` has no `caller`/auth, any party holding the message+attestation can complete an EVM→Stellar transfer; the burner need not be the Stellar submitter. Drawn from the absent `require_auth` in `mint_and_forward` vs present in `deposit_for_burn`/`receive_message`.
- **(Inference)** `maxFee` must be strictly less than the (canonical) burn amount and ≥ configured min fee or the Stellar burn panics (`MaxFeeMustBeLessThanAmount`/`InsufficientMaxFee`, `deposit.rs:111-123`); the EVM side enforces analogous checks. Implies tiny amounts with default `minimumFee` may fail.

## Unknowns And Questions

- **Exact Iris message JSON shape beyond what `main.ts` consumes** — code only reads `messages[0].{message, attestation, status}` and `status === "complete"`. Other fields (eventNonce, decodedMessage, fee details) not enumerated from a live sandbox response here. (Unknown)
- **Live, real attestation latencies** for fast (1000) vs standard (2000) on Sepolia↔Stellar — not measured. Docs say "30-second fast finality" generally; not verified for this pair. (Unknown)
- **Whether the public `faucet.circle.com` rate-limits or caps USDC per request** — not captured. (Unknown)
- **Stellar USDC SAC decimals via on-chain query** — README states 7; not independently queried from the SAC. (Inference-grade, listed as fact from README.)
- **`developers.circle.com/cctp/stellar-smart-contracts` canonical page** returned 404 at fetch time; the Stellar addresses here come from the repo `.env.example` (still primary, Circle-authored). Whether a separate canonical doc page lists additional Stellar contracts (e.g. v1, TokenMinter equivalent) is unconfirmed. (Unknown)
- **Exact Sepolia RPC + chain-id values** were not in the repo (Arc-defaulted); `11155111` is standard Ethereum Sepolia but not pulled from a Circle primary source in this session. (Inference)
- **Mainnet addresses / production Iris URL** — out of scope for this original pass; resolved in `.thoughts/research/2026-06-21-resolved-ids-addresses.md`.

## Not Included

- Mainnet contract addresses, mainnet Iris (`iris-api.circle.com`), production fee schedules.
- CCTP V1 contracts (the repo also ships v1 message-transmitter/token-messenger-minter, not researched here).
- Soroban contract deployment/admin scripts (`scripts/deploy`, `scripts/setup`) internals beyond noting their existence.
- Gas/fee economics, security audit findings, rate-limit tuning.
- Any proposed architecture, SDK design, or "how we should integrate" — excluded by mandate (facts only).

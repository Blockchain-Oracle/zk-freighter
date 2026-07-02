# Reality Research: pre-spec validation gates

## Scope

This brief answers: what are we not pretending to solve before writing ZK Freighter specs?

It is a research checkpoint, not a build plan. Funding and test credentials are treated as available from the founder when needed, so they are not product blockers. The remaining blockers are proof, tooling, target-device verification, and live transaction evidence.

## Sources Checked

- Local docs and current decision notes:
  - `.thoughts/research/2026-06-22-domain-readiness-audit.md`
  - `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
  - `.thoughts/research/2026-06-22-wxt-extension-reality-check.md`
  - `.thoughts/research/2026-06-22-founder-decisions.md`
  - `docs/VERIFIED-FACTS.md`
  - `docs/GLOSSARY.md`
- Local reference code:
  - `reference/stellar-private-payments/contracts/pool/src/pool.rs`
  - `reference/stellar-private-payments/deployments/scripts/deploy.sh`
  - `reference/stellar-private-payments/deployments/testnet/deployments.json`
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/contract.rs`
  - `reference/stellar-cctp/contracts/cctp-forwarder/src/message.rs`
  - `reference/stellar-cctp/contracts/message-transmitter-v2/src/storage.rs`
  - `reference/stellar-cctp/contracts/token-messenger-minter-v2/src/receive.rs`
  - `reference/stellar-cctp/packages/cctp-interfaces/src/message_handler.rs`
  - `reference/freighter`
- Official/current docs:
  - https://developers.stellar.org/docs/tokens/stellar-asset-contract
  - https://developers.circle.com/cctp/references/stellar
  - https://developers.circle.com/cctp/references/stellar-contracts
  - https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
  - https://developer.chrome.com/docs/extensions/reference/api/offscreen
  - https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy
  - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
  - https://wxt.dev/guide/essentials/entrypoints.html
- Context7 was used for Stellar, Circle, and WXT docs during this research pass.
- Read-only subagents checked four independent uncertainty areas:
  - USDC pool and mainnet facts.
  - Atomic bridge-and-shield feasibility.
  - WebAuthn PRF/passkey reality.
  - WXT/MV3 prover reality.
- Local environment checks:
  - `stellar --version` returns Stellar CLI `27.0.0`.
  - `rustup target list --installed` includes `wasm32v1-none`.
  - `find . -maxdepth 2 -type d \( -name apps -o -name contracts -o -name .git \) -print` returned no paths, so there is no active source scaffold or git repo under the project root.
  - See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md` for the command transcript and SAC verification.

## Verified Facts

### Current project state

- The project is currently research/reference-code only. There is no `apps/`, `contracts/`, or `.git` directory under the project root.
- No implementation exists for the wallet, extension, passkey path, USDC pool, bridge adapter, or app UI.
- Stellar CLI `27.0.0` is installed at `/Users/abu/.local/bin/stellar` and is on this shell's `PATH`.
- The Soroban Rust target `wasm32v1-none` is installed.
- Testnet RPC health succeeds through the built-in CLI `testnet` network. Mainnet RPC health succeeds when using explicit RPC URL `https://mainnet.sorobanrpc.com` and passphrase `Public Global Stellar Network ; September 2015`; the built-in CLI `mainnet` entry itself is not a usable RPC endpoint in this environment.

### Core private-payment engine

- The Nethermind pool moves value through `transact(env, proof, ext_data, sender)`.
- `ext_data.ext_amount` defines the boundary:
  - positive amount: public -> private shield/deposit.
  - zero amount: private -> private transfer.
  - negative amount: private -> public unshield/withdraw.
- The pool requires `sender.require_auth()` and validates proof/ext-data/public-amount/root/nullifier conditions before accepting a transaction.
- `register()` is not required to interact with the pool. It publishes public receive keys for discovery and creates a public link between an owner and private receive identity.

### XLM and USDC pools

- The checked-in Nethermind testnet deployment has one pool, and it is native XLM:
  - pool: `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`
  - token: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- The pool is single-token per instance. XLM and USDC require separate pool deployments.
- The deploy script supports non-native pool specs including `classic:<code>:<issuer>:<tokenContractId>` and `contract:<tokenContractId>`.
- Stellar CLI derived and RPC resolved these SACs:
  - Testnet native XLM: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
  - Testnet USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - Mainnet native XLM: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`
  - Mainnet USDC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
- The project does not currently contain a deployed USDC pool manifest.
- Stellar SAC docs say account-address balances for issued assets rely on trustlines, while contract-address balances are stored in contract storage. The SAC `trust` function can create a trustline for a `G...` account during a contract invocation, but it requires account authorization and reserve.

### CCTP bridge

- Circle CCTP on Stellar is documented for Stellar domain `27`.
- Circle's current Stellar docs say CCTP messages store only raw 32-byte address payloads and treat `mintRecipient` as a contract address. For normal Stellar recipients, Circle instructs integrators to use `CctpForwarder`.
- Circle's stock `CctpForwarder` flow is: receive attested message, mint USDC to the forwarder, parse `forwardRecipient` from hook data, and transfer USDC to that recipient in one Soroban invocation.
- Circle's stock `CctpForwarder` does not call the Nethermind privacy pool and cannot pass `Proof` + `ExtData` to `pool.transact`.
- The locked MVP bridge decision is still safe two-step bridge then shield:
  1. CCTP moves USDC publicly onto Stellar.
  2. ZK Freighter shields that USDC into the privacy pool with a separate transaction.

### Atomic bridge-and-shield

- A custom atomic adapter is technically plausible from source inspection, but not proven.
- The plausible shape is: source burn sets a custom adapter as `mintRecipient` and `destinationCaller`, the adapter calls `MessageTransmitter.receive_message`, USDC mints to the adapter, then the adapter calls the USDC pool's `transact(proof, ext_data, adapter)`.
- This depends on contract authorization, resource limits, payload binding, exact amount handling, and revert/stuck-funds behavior. None of those have been executed in a local test or on testnet.
- Therefore atomic bridge-and-shield must remain a spike candidate, not an MVP promise.

### Passkeys and WebAuthn PRF

- WebAuthn PRF is real and deterministic for the same credential plus same input when supported.
- Browsers/authenticators may return no PRF result if unsupported.
- Browser extensions can use WebAuthn with an RP ID covered by host permissions in current Chrome/Firefox versions, but extension popups are a poor ceremony surface because they can close during the credential prompt. A tab, full extension page, or side panel is safer.
- Apple/Google passkey docs confirm passkey sync, but do not prove byte-identical PRF output across the founder's actual phone, browser, passkey manager, restored device, or hybrid/QR login path.
- Passkey must remain optional and fail-closed until the actual target-device PRF matrix passes.

### WXT and browser extension

- WXT is viable as an MV3 extension framework surface.
- In MV3, WXT's background entrypoint becomes a service worker.
- Chrome extension service workers are not durable. Chrome may terminate them after inactivity, long requests/events, or slow fetches.
- Chrome extension pages need a CSP that permits WebAssembly through `wasm-unsafe-eval`.
- Chrome offscreen documents can spawn workers and are the credible place to route heavy proving work from an extension.
- WXT issue `wxt-dev/wxt#1448` remains relevant for WASM imported from a background script. The extension must not assume background-service-worker proving works.
- Freighter compatibility is not just a popup. It means matching the `@stellar/freighter-api` postMessage/content-script/background request contract closely enough for dapps and Stellar Wallets Kit.

## Inferences

- It is valid to write a spec only if these unsolved areas are represented as validation gates, not as solved assumptions.
- Funding/faucets/test tokens are not a blocker because the founder has said they can be provided. That changes the next process: live evidence should be demanded instead of waived.
- The first spec should make the web app the first judged surface because it can prove the private-payment loop without MV3 lifecycle constraints.
- The extension should stay in scope, but as a shared-core follow-on with an explicit WXT/offscreen/dedicated-worker prover spike.
- The bridge should ship as safe two-step bridge then shield unless the atomic adapter earns proof through local contract tests, simulation, and real testnet execution.
- Mainnet-capable configuration can be designed from the beginning, but mainnet claims require deployed mainnet pool IDs, feature gates, and real-funds test evidence.

## Unknowns And Questions

- No live XLM shield/private-send/unshield digest exists in the cleaned project state.
- No USDC pool has been deployed or round-tripped.
- No missing-USDC-trustline failure/success UX has been executed.
- No Sepolia -> Stellar CCTP bridge run has been executed in this session.
- No custom CCTP adapter has been implemented, simulated, or deployed.
- No proof exists that CCTP receive + USDC mint + pool Groth16 verify + pool transfer fits Stellar resource limits in one transaction.
- No browser benchmark exists for the Nethermind prover on the target device/browser.
- No WXT offscreen/dedicated-worker prover spike exists.
- No target phone/passkey PRF matrix has been run.
- No mainnet deployment manifest exists for ZK Freighter pools.
- The final user-facing label for optional public receive-key publishing is still unsettled.

## Validation Gates Before Claims

These are the proof gates that should be attached to the later spec and build prompts.

1. **Tooling gate:** closed for CLI install, Rust target install, network health, SAC derivation, and read-only SAC-interface fetch. Still open for funded identities and transaction submission.
2. **XLM privacy gate:** run real testnet shield, private transfer, and unshield against the XLM pool, with transaction hashes and balance/event evidence.
3. **USDC pool gate:** deploy or locate a real testnet USDC pool, then run shield, private transfer, and unshield with transaction hashes.
4. **USDC trustline gate:** prove the app handles missing recipient trustlines correctly, including reserve requirements and fail/success behavior.
5. **Bridge gate:** run Sepolia USDC -> Stellar USDC through Circle CCTP, record the EVM burn, Iris attestation, Stellar mint/forward transaction, amount conversion, and final public Stellar balance.
6. **Atomic adapter gate:** before exposing atomic bridge-and-shield, test adapter -> pool authorization locally, simulate the full invocation, prove resource fit, bind proof data to the CCTP message, and execute a real testnet transaction.
7. **Passkey gate:** run PRF determinism on the actual target device set: same device, synced second device, restored/fresh device, hybrid/QR path, and unsupported-authenticator failure.
8. **Extension gate:** prove WXT MV3 packaging with background -> offscreen document -> dedicated worker running the real Nethermind prover artifacts, not a mock.
9. **Extension companion gate:** prove WXT MV3 packaging, offscreen/dedicated-worker proving, and read-only/fail-closed dApp detection/network responses. External public-key access and signing must stay disabled unless Abu explicitly reopens the public dApp wallet scope.
10. **Mainnet gate:** before mainnet demo claims, deploy/verify mainnet pool IDs, use mainnet RPC/explorer links, feature-gate unsupported assets/bridge modes, and run a small real-funds transaction.

## Not Included

- No implementation.
- No source scaffold.
- No spec.
- No contract deployment.
- No transaction submission.
- No phone/passkey test.
- No claim that atomic bridge-and-shield works today.

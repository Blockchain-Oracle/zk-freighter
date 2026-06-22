# Spec: ZK Fighter product MVP

## Objective

ZK Fighter is a self-custody Stellar wallet for shielded XLM and USDC payments. It must let a user create or import a seed-backed wallet, shield public funds into a privacy pool, send privately inside the pool, unshield back to a public Stellar address, and optionally publish private receive keys for discoverability.

The judged product must use real zero-knowledge proofs against Stellar testnet/mainnet contracts. It must not use mocked proofs, mocked balances, mocked bridge state, or fake transaction hashes in any judged path.

## Background And Current Reality

ZK Fighter builds on the Nethermind `stellar-private-payments` reference implementation. That engine already has browser-side proving, Soroban contracts, ASP membership/non-membership, and a deployed testnet XLM pool. The engine's pool entry point is `transact(env, proof, ext_data, sender)`.

The privacy model has public edges and private in-pool activity:

- Shield/deposit is public at the boundary.
- Private in-pool transfer hides sender/recipient/amount relationship from chain observers.
- Unshield/withdraw is public at the boundary.

Private receiving does not require the pool's `register()` function. Direct private receive only requires a recipient's public note key and public encryption key. `register()` is optional discovery: it links a public Stellar owner to those private receive keys.

Current tooling state is ready for spec/planning:

- Stellar CLI `27.0.0` is installed.
- Rust target `wasm32v1-none` is installed.
- Testnet RPC is healthy through the built-in CLI `testnet` config.
- Mainnet RPC is healthy with explicit RPC `https://mainnet.sorobanrpc.com` and passphrase `Public Global Stellar Network ; September 2015`.
- Canonical testnet/mainnet native and USDC SAC IDs are derived and RPC-resolved.

The current repo has no app scaffold, contract scaffold, git repo, deployed USDC pool, bridge run, passkey implementation, extension implementation, or transaction digest produced by ZK Fighter itself.

## Users

- **Primary user:** a Stellar user who wants to hold XLM/USDC and make shielded transfers without understanding nullifiers, Merkle trees, trustlines, CCTP domains, or ZK proof internals.
- **Recipient:** a ZK Fighter user who shares a private receive code or opts into public discovery so others can send privately.
- **Demo reviewer/judge:** a technically informed hackathon judge who needs to see load-bearing ZK, real Stellar integration, honest privacy framing, and real transaction evidence.
- **Auditor/accountant recipient:** a party who receives a user-held view key or selective disclosure artifact, with read-only power and no spend ability.

## Goals

- Ship a real web app first.
- Use **ZK Fighter** as the product name.
- Use seed phrase creation/import as the default recovery and identity path.
- Keep passkey optional and fail-closed.
- Support both XLM and USDC as separate privacy pools.
- Support private code sharing by default.
- Support optional public discovery/publishing for users who choose it.
- Support safe two-step CCTP USDC inflow: bridge publicly, then shield.
- Keep mainnet capability in the config model from the beginning.
- Preserve an extension path using shared core logic after the web flow is proven.
- Make privacy boundaries explicit: never claim "anonymous" or "fully private."

## Non-goals

- Do not build a general-purpose public Stellar wallet to replace Freighter.
- Do not write new ZK circuits for the MVP.
- Do not claim atomic bridge-and-shield until a custom adapter is implemented and tested with real transactions.
- Do not put proof generation in an MV3 background service worker.
- Do not make passkeys the only recovery path.
- Do not add recovery secrets or support-controlled wallet recovery.
- Do not hide public shield/unshield/bridge boundary facts from the user.
- Do not use demo-only mocked chain state in the judged path.

## Requirements

### R1. Wallet Identity And Recovery

- The app must support create-new-wallet and import-existing-wallet through a seed phrase.
- The seed phrase is the only guaranteed recovery path.
- The app must explain that losing the seed phrase can permanently lose access.
- The app must derive the private-payment engine's note and encryption keys deterministically from the wallet identity.
- Reload/import must derive the same private receive identity for the same seed.

### R2. Optional Passkey

- Passkey must be optional.
- If enabled, passkey use must be framed as convenience unlock/signing or envelope access, not guaranteed universal recovery.
- If PRF output is unsupported or mismatched, the flow must fail closed and preserve the seed phrase path.
- Passkey ceremonies in extension contexts must use a page, tab, or side panel, not an action popup.

### R3. Private Receive Code

- The default private receive surface must be a bundled private receive code containing the public note key and public encryption key.
- The user should be able to copy and display the private receive code as a QR.
- The private receive code must not expose private spend keys, seed phrases, or note plaintext.
- The UI must explain that the code lets someone pay the user privately inside the pool.

### R4. Optional Public Discovery

- The MVP must support both receive modes:
  - direct private code sharing by default.
  - optional public publishing/discovery for users who choose it.
- Publishing must be opt-in, never automatic during wallet creation.
- Publishing copy must explain: it does not expose private keys or funds, but it creates a public on-chain link between the user's public Stellar identity and private receive identity.
- User-facing copy should avoid "registry" unless explaining technical details. Preferred product copy is equivalent to "Make my private code discoverable."

### R5. Shield, Private Send, Unshield

- The app must support XLM shield, private send, and unshield against the deployed testnet XLM pool.
- The app must support USDC shield, private send, and unshield after a real USDC pool is deployed or located.
- The app must represent public/shielded balances separately enough that users understand what is public and what is shielded.
- The app must scan pool events, trial-decrypt notes, and surface spendable private notes owned by the user.
- The app must show proof-generation and submission progress honestly.
- The app must surface failed proof, failed submission, ASP, sync, missing trustline, and network errors.

### R6. Asset Model

- XLM and USDC must be treated as separate single-asset pools.
- The app must route transactions to the pool matching the selected asset.
- The app must use canonical SAC IDs from network config:
  - Testnet native XLM: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
  - Testnet USDC: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - Mainnet native XLM: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`
  - Mainnet USDC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
- The app must handle USDC's trustline/reserve requirements before public withdrawal to a `G...` address.

### R7. Network Configuration

- Network must be a configuration record, not scattered constants.
- Each network record must include passphrase, RPC URL, explorer URL shape, native SAC, USDC issuer/SAC, CCTP contracts where applicable, and pool deployment IDs.
- Testnet must be the first working network.
- Mainnet must be possible without source-code changes, but unsupported mainnet features must be disabled or clearly gated until deployed and tested.
- The app must not rely on this local Stellar CLI install's built-in `mainnet` RPC entry; use explicit mainnet RPC config.

### R8. CCTP Bridge

- The safe product bridge flow is two-step:
  1. Circle CCTP moves USDC publicly from Ethereum/Sepolia into public Stellar USDC.
  2. ZK Fighter shields that public Stellar USDC into the USDC privacy pool with a separate Stellar transaction.
- The bridge UI must show that the bridge leg is public.
- The bridge UI must show progress for source approval/burn, Circle attestation, Stellar mint/forward, and shield.
- The app must link to real explorer entries for submitted bridge/shield transactions.
- The app must not claim stock Circle `CctpForwarder` performs privacy-pool deposit.

### R9. Atomic Bridge-And-Shield

- Atomic bridge-and-shield may exist only as an experimental mode after a custom adapter passes its validation gate.
- The product must not expose atomic mode as standard MVP behavior before that proof.
- Any atomic mode must bind CCTP message data to proof/ext data so public attestations cannot be front-run into someone else's private note.
- Any atomic mode must define revert and recovery semantics for failed shielding after mint.

### R10. Compliance / Selective Disclosure

- The app must let the user generate or export a read-only disclosure artifact.
- The disclosure artifact must not grant spend authority.
- The product must frame disclosure as user-held and user-controlled, not custodial monitoring.
- Compliance features must not imply ZK Fighter can disclose on the user's behalf.

### R11. Extension Surface

- The web app is the first product surface.
- The extension must reuse shared core logic instead of becoming a separate wallet implementation.
- WXT is acceptable as the framework only after proving real prover packaging.
- The extension background service worker must coordinate only; it must not be the prover runtime.
- The credible prover path is extension page or offscreen document plus dedicated worker.
- The current extension direction is a ZK Fighter companion for receive, QuickShield, and bridge handoff, not a general public dApp signing wallet.
- Freighter-style detection/network responses may exist for research, but external public-key access and signing must fail closed unless a later product decision explicitly reopens that scope.

### R12. UX And Copy

- The app must use "shielded transfers" language.
- The app must label deposits, withdrawals, and bridge arrivals as public.
- The app must avoid "anonymous," "fully private," and "untraceable."
- The app must keep protocol terms out of primary UX where possible.
- The app must use user-level copy for Stellar trustlines, e.g. "This address cannot receive USDC yet," not "missing trustline."
- The app must make network mode visible.
- The app must include unaudited/testnet/mainnet-risk disclaimers where relevant.

## Acceptance Criteria

### A1. Tooling And Config Evidence

- Stellar CLI and `wasm32v1-none` are available.
- Network config contains testnet and mainnet records.
- Canonical SAC IDs are verified against `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.
- The app can switch network config without code edits.

### A2. XLM Privacy Evidence

- A real testnet shield transaction succeeds against the XLM pool.
- A real private transfer succeeds between two ZK Fighter identities.
- A real unshield transaction succeeds to a public Stellar address.
- Evidence includes transaction hashes, explorer links, and before/after balance notes.

### A3. Load-Bearing ZK Evidence

- A valid proof is generated client-side and accepted on-chain.
- A deliberately tampered proof is rejected on-chain or during faithful simulation.
- The demo can explain why the ZK proof is required for state transition.

### A4. USDC Evidence

- A real testnet USDC pool exists in config.
- A real USDC shield/private-send/unshield round-trip succeeds.
- Missing-recipient-trustline behavior is reproduced and handled.
- The successful trustline-ready path is reproduced and documented.

### A5. Receive Evidence

- A recipient can receive privately from a copied private receive code without having published discovery data.
- A user can opt into public discovery/publishing.
- Published mode emits/uses the expected public key-discovery event.
- The app copy explains the privacy trade-off before publishing.

### A6. Bridge Evidence

- A real CCTP testnet bridge run succeeds from Sepolia to Stellar testnet.
- Evidence includes EVM approval/burn hash, Circle/Iris attestation reference, Stellar mint/forward hash, and final public Stellar USDC balance.
- The user can then shield the bridged USDC with a separate real transaction.

### A7. Passkey Evidence

- Seed-only wallet works without passkey.
- Passkey-enabled wallet unlocks or derives the expected protected material where PRF is supported.
- Unsupported/mismatched PRF paths fail closed.
- Target-device PRF matrix is recorded before claiming phone/passkey support in the demo.

### A8. Compliance Evidence

- User can export a read-only disclosure artifact.
- A reviewer can use that artifact to inspect relevant user activity without spend authority.
- Copy states ZK Fighter cannot disclose on the user's behalf.

### A9. Extension Evidence

- Extension claims are only made after the real Nethermind prover runs in a WXT-compatible extension page/offscreen-document/worker path.
- Background service worker lifetime does not break proving.
- A test dapp can detect the extension and read network details, while public-key access and signing fail closed. Full dapp compatibility must not be claimed unless Abu explicitly reopens that scope and real runtime tests pass.

### A10. Mainnet Evidence

- Mainnet features are disabled unless their mainnet pool/contract IDs exist in config and have been tested.
- Any mainnet demo uses explicit founder approval, real-funds risk copy, and small-value transactions.
- Mainnet claims include transaction hashes and explorer links.

## Constraints

- Deadline: DoraHacks submission deadline is 2026-06-29 19:00 UTC.
- The product must credit Nethermind and Circle where their code/protocols are used.
- Nethermind privacy-pool code is unaudited/WIP and must be disclosed.
- Browser proof generation can be slow or memory-heavy; UX must handle long pending states.
- Stellar RPC event retention is limited; event scanning must start from known deployment ledgers and cannot assume infinite archive availability.
- Mainnet deploys and transactions spend real funds.
- CCTP bridge timings depend on source-chain finality and Circle attestation.
- Extension MV3 runtime is constrained; proving in the background service worker is out of scope.

## Stories Needed

- Create/import seed-backed wallet.
- View public and shielded balances.
- Copy/share private receive code.
- Opt into public discovery.
- Shield XLM.
- Send XLM privately.
- Unshield XLM.
- Deploy/configure USDC pool.
- Shield USDC.
- Send USDC privately.
- Unshield USDC with trustline handling.
- Generate and reject a tampered proof.
- Export read-only disclosure/view artifact.
- Enable optional passkey.
- Bridge Sepolia USDC to Stellar USDC.
- Shield bridged USDC.
- Toggle testnet/mainnet config safely.
- Spike WXT extension proving.
- Spike read-only/fail-closed extension dapp detection; external signing is not an active product target.
- Spike atomic bridge-and-shield adapter.

## Open Questions

- What exact final demo network posture should the video use: testnet only, testnet plus one small mainnet proof, or full mainnet where available?
- What exact user-facing phrase should label optional publishing: "Make my private code discoverable," "Let people find my private code," or another equivalent?
- Should optional publishing be available in the first working private-send slice, or enabled after direct private-code sends work?
- What exact private receive address prefix/encoding should be used for the bundled code?
- What mainnet features should be visibly disabled if mainnet USDC pool or bridge contracts are not deployed by demo time?

## Source References

- `.thoughts/research/2026-06-22-founder-decisions.md`
- `.thoughts/research/2026-06-22-pre-spec-validation-gates.md`
- `.thoughts/research/2026-06-22-domain-readiness-audit.md`
- `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`
- `.thoughts/research/2026-06-22-atomic-bridge-shield-reality.md`
- `.thoughts/research/2026-06-22-wxt-extension-reality-check.md`
- `.thoughts/research/2026-06-21-nethermind-privacy-pool.md`
- `.thoughts/research/2026-06-21-resolved-trustline-sac.md`
- `.thoughts/research/2026-06-21-cctp-bridge.md`
- `.thoughts/research/2026-06-21-resolved-ids-addresses.md`
- `docs/START-HERE-concept.md`
- `docs/GLOSSARY.md`
- `docs/VERIFIED-FACTS.md`

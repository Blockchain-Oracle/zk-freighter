# Plan: Multichain CCTP Bridge Into ZK Fighter

## Inputs

- Reality research: `.thoughts/research/2026-06-25-multichain-cctp-bridge.md`
- Product spec: `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- Stories: `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- Quality profile: `.thoughts/quality/2026-06-22-project-quality-profile.md`
- Existing bridge code:
  - `packages/core/src/networks.ts`
  - `packages/core/src/cctp-bridge.ts`
  - `packages/core/src/cctp-types.ts`
  - `apps/web/src/BridgePanel.tsx`
  - `apps/web/src/bridge-storage.ts`
  - `apps/extension/src/ExtensionBridgePanel.tsx`
- Current evidence:
  - `.thoughts/research/spikes-log.md`
  - `.thoughts/research/2026-06-25-mainnet-readiness.md`

## Implementation Status

- 2026-06-25: Phase 1 and the code part of Phases 2, 3, and 5 are implemented for EVM source chains.
- Active configured source chains:
  - Testnet: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia.
  - Mainnet: Ethereum, Base, Arbitrum One, OP Mainnet.
- Base is the default source on testnet and mainnet.
- Resume state now stores `sourceChainKey`, so a burn hash is not resumed against the wrong Circle source domain.
- Extension handoff now passes source-chain context to the web bridge route.
- Still pending: real Base Sepolia and Arbitrum Sepolia bridge-to-shield evidence, then optional OP evidence, then a separately approved mainnet route.

## Assumptions

- ZK Fighter's bridge remains an inbound bridge: source-chain USDC -> public Stellar USDC -> separate shield/deposit.
- The bridge leg is public. Privacy starts only after the user shields on Stellar.
- The first multichain implementation targets EVM source chains only.
- Base and Arbitrum are the first new source chains because they preserve the same CCTP EVM burn flow while lowering mainnet gas cost.
- Ethereum remains supported, but it is not the only product route.
- Mainnet spend or live evidence runs still require explicit Abu approval at the moment of execution.

## Open Questions

- Which live testnet evidence should run first after implementation: Base Sepolia, Arbitrum Sepolia, or both?
- Should OP Sepolia ship visibly at the same time as Base/Arbitrum, or only after Base/Arbitrum evidence lands?
- Should Avalanche and Polygon appear in the UI immediately, or be configured but hidden until evidence is recorded?
- Which source chain should be the first mainnet bridge-to-shield route: Base mainnet or Arbitrum One?

## Prototype Reintegration Gate

No new high-fidelity bridge prototype has been accepted for multichain source selection. Existing design docs are Ethereum-first and partly stale. For this phase:

- Core and evidence work can proceed without waiting for new visual design.
- UI must stay minimal and honest.
- No mocked route can appear as a working bridge route.
- Any source chain without real evidence must be labeled as configured/untested or hidden from the judged path.

## Phase 1: Source-Chain Registry

### Goal

Replace the singular Ethereum `evmSource` model with a verified source-chain registry.

### Work

- Add a `CctpSourceKey` type for source chains.
- Change network config from `evmSource` to `evmSources`.
- Add verified config for:
  - testnet: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia.
  - mainnet: Ethereum, Base, Arbitrum.
- Consider adding OP, Avalanche, and Polygon config in the same registry, but gate visible use until tests/evidence are ready.
- Keep Stellar CCTP contract IDs unchanged.
- Add lookup helpers:
  - `getCctpSource(network, sourceKey)`
  - `getDefaultCctpSource(network)`
  - `getEnabledCctpSources(network)`

### Real Integration Path

All configured values must trace to Circle or official chain docs. No reference-only config without citations in the research note.

### Mock/Simulation Policy

No mock source chains. A configured source can be hidden, disabled, or labeled untested, but not faked as working.

### Checks

- Unit tests for source lookup.
- Unit tests for network/domain/chain ID mapping.
- Unit tests that Ethereum remains backward-compatible as the default source.

### Acceptance Criteria Covered

- Bridge remains real and evidence-backed.
- Network switching stays config-driven.
- No hard-coded Ethereum-only bridge limitation.

### Stop Condition

Stop if a source chain's Circle domain, USDC contract, TokenMessenger, MessageTransmitter, or chain ID cannot be verified from current docs.

## Phase 2: Core Bridge Selector

### Goal

Make the bridge runner and resume path source-chain-aware.

### Work

- Add `sourceChainKey` to `RunCctpBridgeOptions`.
- Add `sourceChainKey` to `ResumeCctpBridgeOptions`.
- Add `sourceChainKey`, source domain, chain ID, and label to `CctpBridgeReport`.
- Replace hard-coded Ethereum progress copy with selected source-chain copy.
- Use the selected source's:
  - USDC contract
  - TokenMessengerV2
  - MessageTransmitterV2
  - chain ID hex
  - CCTP domain
  - explorer base URL
- Make blockers say "source-chain" or the selected chain label, not "Ethereum."
- Preserve current `depositForBurnWithHook` and Stellar `mint_and_forward` path.

### Real Integration Path

This phase still uses the existing EVM client abstraction. The wallet submits the source-chain approval and burn; ZK Fighter polls Circle Iris; Stellar `mint_and_forward` submits on the destination.

### Mock/Simulation Policy

Unit tests may use fake clients for deterministic error coverage. Product UI and evidence must not show fake hashes or fake bridge states.

### Checks

- Existing bridge unit tests still pass for Ethereum Sepolia.
- New tests prove source-chain selection changes `chainIdHex`, source domain, explorer URL, approval target, and burn token.
- Resume tests prove a Base/Arbitrum burn hash polls Iris with the selected source domain, not Ethereum domain `0`.

### Acceptance Criteria Covered

- Multichain bridge core is real and source-aware.
- Resume/recovery does not lose the source-chain context.

### Stop Condition

Stop if the resume path cannot reliably retain source-chain identity alongside the burn hash.

## Phase 3: Web Bridge UI Selector

### Goal

Let users choose a source chain without weakening the privacy explanation.

### Work

- Add a source-chain selector to the web bridge panel.
- Default testnet to Base Sepolia or Ethereum Sepolia depending on evidence posture.
- Default mainnet to Base or Arbitrum, not Ethereum L1, once evidence exists.
- Show per-source:
  - chain name
  - gas token
  - required public USDC
  - public burn warning
  - explorer links
  - evidence status if relevant
- Require wallet network match before approval/burn.
- Store selected `sourceChainKey` in bridge storage.
- Update stale "Ethereum only" copy in active bridge UI.

### Real Integration Path

The UI calls the source-aware core bridge runner. It does not create a second bridge path.

### Mock/Simulation Policy

No fake balances, fake gas estimates, fake hashes, or fake route success. If balances are not loaded, say so.

### Checks

- Browser smoke for each enabled testnet source selector state.
- Wrong network rejects before approval.
- Missing wallet rejects before approval.
- Stored bridge resume includes source-chain key.

### Acceptance Criteria Covered

- User can understand that the bridge source is configurable.
- Public/private boundary remains legible.

### Stop Condition

Stop if the UI cannot prevent a selected-chain mismatch before sending approval/burn.

## Phase 4: Testnet Evidence Matrix

### Goal

Prove at least one cheap EVM source-chain route before any mainnet claim.

### Work

- Run Base Sepolia -> Stellar testnet -> USDC shield.
- Run Arbitrum Sepolia -> Stellar testnet -> USDC shield if funding/faucets are available.
- Keep Ethereum Sepolia evidence as the baseline route.
- Record every approval, burn, Iris attestation, Stellar mint/forward, public USDC balance, ASP insert, and USDC shield/deposit in `.thoughts/research/spikes-log.md`.
- Update README/docs only with accepted hashes.

### Real Integration Path

Use Circle testnet USDC and source-chain test gas. Destination stays Stellar testnet.

### Mock/Simulation Policy

No simulated bridge claims. Failed or timed-out attempts are recorded as failures, not success.

### Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Browser bridge smoke for each attempted source.
- Explorer verification for each transaction hash.

### Acceptance Criteria Covered

- Multichain bridge is no longer theoretical.
- The selected source chain can produce a complete bridge-to-shield path.

### Stop Condition

Stop if Circle faucet/source gas funding is unavailable, or if Iris/mint/forward fails in a way that cannot be verified safely.

## Phase 5: Extension Bridge Handoff Context

### Goal

Keep the extension as a QuickShield companion while preserving selected source-chain context.

### Work

- Update extension bridge copy from "Ethereum Sepolia" to "source-chain USDC via Circle CCTP."
- Add optional source-chain parameter to the extension web handoff URL.
- Keep extension-native EVM provider access deferred.
- Keep external dApp signing disabled.

### Real Integration Path

The extension opens the web bridge route with network, destination, and selected source-chain context. The web page handles the EVM wallet connection.

### Mock/Simulation Policy

No extension-native bridge claim until a Chrome runtime spike proves EVM provider access safely.

### Checks

- `pnpm extension:bridge`
- `pnpm extension:runtime`
- `pnpm extension:dapp`
- `pnpm extension:runtime:deep`

### Acceptance Criteria Covered

- Extension remains product-aligned.
- Bridge handoff works with multichain context.

### Stop Condition

Stop if the handoff URL cannot preserve source-chain state reliably.

## Phase 6: Mainnet Bridge-To-Shield Evidence

### Goal

Record one real mainnet bridge-to-shield route before claiming mainnet bridge support.

### Work

- Prefer Base mainnet or Arbitrum One for first mainnet evidence.
- Keep Ethereum mainnet available but not the default evidence route because of higher source-chain gas.
- Fund the selected source wallet with:
  - small native gas token amount.
  - small native USDC amount.
- Bridge a tiny USDC amount into the ZK Fighter Stellar mainnet public address.
- Shield the arrived USDC into the mainnet USDC pool.
- Record accepted hashes and balance notes.

### Real Integration Path

Base/Arbitrum mainnet CCTP burn -> Circle Iris mainnet attestation -> Stellar mainnet `mint_and_forward` -> mainnet USDC shield/deposit.

### Mock/Simulation Policy

No mainnet bridge claim until real hashes are recorded.

### Checks

- Full quality gates before and after evidence.
- Manual explorer verification.
- README/docs updated only after accepted hashes.

### Acceptance Criteria Covered

- Mainnet bridge-to-shield moves from capability claim to evidence-backed claim.

### Stop Condition

Stop before any mainnet spend unless Abu explicitly approves that exact run and funding source.

## Phase 7: Later Routes

### Goal

Avoid mixing future ideas into the immediate judged path.

### Work

- Bridge-out from Stellar to EVM: separate plan after inbound bridge is clean.
- Non-EVM sources such as Solana or Starknet: separate wallet/signing research and plan.
- Atomic bridge-and-shield: still deferred until a custom adapter passes real tests.
- Confidential Tokens: separate future privacy mode, not part of this bridge phase.

### Real Integration Path

None in this phase. This is a boundary marker.

### Mock/Simulation Policy

Do not expose future routes as active product features.

### Checks

- Docs audit to ensure no unsupported route is claimed.

### Acceptance Criteria Covered

- Product remains focused and honest.

### Stop Condition

Stop if a future route starts becoming necessary for the current demo story; write a new research brief first.

## Verification Checkpoint

Before claiming this phase complete:

- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build`.
- Run docs/file/secret checks.
- Run browser smoke for the bridge selector.
- If extension copy or handoff changes, run:
  - `pnpm extension:bridge`
  - `pnpm extension:runtime`
  - `pnpm extension:dapp`
  - `pnpm extension:runtime:deep`
- Update `.thoughts/research/spikes-log.md` with real chain evidence only.
- Update `README.md` and `docs/SUBMISSION-PACKAGE.md` only for routes with accepted evidence.

## Handoff Notes

- The immediate next build phase is not "bridge everything at once." It is:
  1. Source-chain registry.
  2. Core bridge selector and resume state.
  3. Web source selector.
  4. Base Sepolia evidence.
  5. Arbitrum Sepolia evidence.
  6. Mainnet Base or Arbitrum evidence after explicit approval.
- The safest demo story remains: public bridge arrival, then separate shield. Do not present it as a private bridge.
- Ethereum is supported, but Base/Arbitrum should become the practical default for mainnet evidence because source-chain gas is lower.

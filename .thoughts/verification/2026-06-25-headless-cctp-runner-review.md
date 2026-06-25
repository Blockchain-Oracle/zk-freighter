# Verification Review: Headless CCTP Runner

## Scope

- Feature checkpoint: headless CCTP bridge evidence runner and post-feature review-gate enforcement.
- Feature commit reviewed: `490b07657d9a7ec7303339e207b6e0a3258ba9fa`.
- Follow-up fixes in this working set:
  - invalid `ZKF_CCTP_SOURCE` now fails closed.
  - mainnet Stellar destination readiness is checked read-only before any source-chain transaction.
  - CCTP approval and runner funding preflight now account for `amount + maxFee`.
  - resume and shield-only modes were added to avoid replaying accepted burns or mints.
  - post-bridge shield now uses the actual bridged USDC amount, not a multiplier.
  - post-feature review gate was added to `AGENTS.md`, the quality profile, current handoff prompts, and the multichain bridge plan.

## Reviewers

- Implementation/security reviewer: subagent `019eff9a-2cf1-7c52-b5f1-4a4168a9eb97`.
- Process-enforcement reviewer: subagent `019eff9a-4faf-7a51-b51f-4feefcad0d9c`.
- Follow-up regression reviewer: subagent `019effb7-a612-7583-9299-414e0f4d2619`.

## Findings And Fixes

### Fixed: invalid CCTP source fallback

- Finding: a typo in `ZKF_CCTP_SOURCE` fell back to the default source chain.
- Risk: a funded default route could approve/burn on the wrong chain.
- Fix: invalid non-empty `ZKF_CCTP_SOURCE` now throws with the allowed values.
- Regression evidence: `scripts/cctp-bridge-source-support.test.ts` covers invalid source keys; manual `ZKF_CCTP_SOURCE=arbitrum-sepolia pnpm cctp:bridge:testnet` exits non-zero before transactions.

### Fixed: mainnet destination readiness before burn

- Finding: mainnet Stellar destination readiness was only checked inside the later mint path, after the EVM burn.
- Risk: a mainnet burn could happen before discovering the destination account was unfunded or had no USDC trustline.
- Fix: read-only Horizon readiness preflight blocks mainnet before any source-chain transaction if the destination account or USDC trustline is missing.
- Regression evidence: `scripts/cctp-bridge-source-support.test.ts` covers unfunded, no-trustline, and ready states; `ZKF_CCTP_MIN_GAS_WEI=1 pnpm cctp:bridge:mainnet` reports both EVM funding and destination-readiness blockers without submitting transactions.

### Fixed: CCTP V2 allowance amount

- Finding during live Base Sepolia run: approving only `amount` caused `ERC20: transfer amount exceeds allowance` before burn submission.
- Risk: CCTP V2 fast-transfer paths may debit `amount + maxFee`.
- Fix: core approval now uses `amount + maxFee`, and the runner requires `amount + maxFee` USDC in source funding preflight.
- Regression evidence: `packages/core/src/cctp-bridge.test.ts` asserts approval data for `1_000_500` atomic USDC when amount is `1_000_000` and max fee is `500`.

### Added: resume and shield-only modes

- Reason: the live Base Sepolia burn succeeded, but the first runner attempt hit a transient `fetch failed` before completing Iris/Stellar mint. Resume mode prevents duplicate burns. After mint completed, shield-only mode prevents duplicate mint attempts while retrying the separate shield.
- Commands:
  - `ZKF_CCTP_RESUME_BURN_HASH=... pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SHIELD_ONLY=1 pnpm cctp:bridge:testnet`

### Fixed: post-bridge shield amount

- Finding: the separate shield step multiplied the bridged USDC amount by `10`, so a default 1 USDC bridge would try to shield 10 USDC.
- Risk: if the public destination had unrelated pre-funded USDC, the evidence could accidentally prove "shielded available balance" instead of "shielded the bridged amount."
- Fix: post-bridge shield now passes through the bridged amount exactly.
- Regression evidence: `scripts/cctp-bridge-source-support.test.ts` covers `postBridgeShieldAmountAtomic(1_000_000n) === 1_000_000n`.

## Evidence Checked

- `.thoughts/research/spikes-log.md` now records:
  - Base Sepolia approval before fee fix: `0x242ac1a6b6f47a0697a9a55b5b167236e1c8ee5a1b5d8271f14f9521c8252865`.
  - Base Sepolia approval after fee fix: `0xd8b1724e3b65a8169b033aba17eb0536babf38fcddad0f9ae78dfe8870681d3e`.
  - Base Sepolia CCTP burn: `0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63`.
  - Circle Iris attestation status: `complete`.
  - Stellar testnet mint_and_forward: `08df05fe661f35dcf42c5ab054ae2bd404ed31091a629d963647ca3d5b293e11`.
- No Base Sepolia ASP insert or USDC shield hash is claimed.

## Remaining Risk

- The Node runner completes the public Base bridge leg, but post-bridge USDC shield is blocked because `insertAspMembershipLeaf` cannot read ASP membership contract state in this context.
- Next investigation should compare the Node runner's Nethermind runtime context with the extension/browser runtime, where ASP state and dry proof evidence have already worked.

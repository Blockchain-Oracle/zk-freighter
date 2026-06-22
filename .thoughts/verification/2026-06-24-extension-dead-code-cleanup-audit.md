# Verification Audit: Extension Signing Dead-Code Cleanup

## Verdict

Pass. The active extension code now matches the QuickShield + bridge companion decision: no public dApp permission model, no approval queue, no external signing command surface, and no active `extension:dapp:sign` path. The remaining dApp bridge is only the fail-closed detection/network probe required by `pnpm extension:dapp`.

## Artifacts Checked

- `README.md`
- `AGENTS.md`
- `.thoughts/plans/2026-06-24-extension-quickshield-bridge-plan.md`
- `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`
- `.thoughts/research/spikes-log.md`
- `apps/extension/src/dappMessages.ts`
- `apps/extension/src/dappRuntime.ts`
- `apps/extension/src/dappRuntimeHelpers.ts`
- `apps/extension/src/dappRuntimeState.ts`
- `packages/core/src/index.ts`
- `scripts/check-extension-dapp-bridge.mjs`

## Requirement Traceability

| Requirement | Evidence |
|---|---|
| Remove public dApp signing product path | Deleted `packages/core/src/dapp-wallet-mode.ts`, `packages/core/src/dapp-wallet-mode.test.ts`, and `apps/extension/src/dappPendingQueue.ts`. |
| Keep external signing fail-closed | `apps/extension/src/dappRuntime.ts` still returns unsupported errors for `SUBMIT_TRANSACTION`, `SUBMIT_AUTH_ENTRY`, `SUBMIT_BLOB`, `REQUEST_ACCESS`, and `SET_ALLOWED_STATUS`. |
| Keep QuickShield/bridge companion path | `apps/extension/src/dappRuntime.ts` still handles `quickShield` and `openBridgeHandoff`; the side-panel components remain in place. |
| Avoid stale docs steering future agents | Updated older active/referenced notes to say Wallets Kit/Freighter signing is historical or deferred unless Abu reopens scope. |
| Remove generated stale export | Deleted `packages/core/dist/dapp-wallet-mode.*` and removed the stale `dist` index export. |

## Acceptance Criteria Coverage

| Acceptance | Evidence |
|---|---|
| Active code has no permission/signing scaffolding | `rg` over `apps packages scripts` finds no module/helper names from the deleted signing path except the legacy-permission fixture inside `scripts/check-extension-dapp-bridge.mjs`. |
| Stale permission records are ignored | `pnpm extension:dapp` passes and reports `signTransaction: disabled-locked-unlocked-and-stale-permission`. |
| Extension runtime still works | `pnpm extension:runtime` and `pnpm extension:runtime:deep` passed in Chrome for Testing. |
| Real testnet evidence remains recorded | `.thoughts/research/spikes-log.md` includes the 2026-06-24 Friendbot hash and ASP insert transaction hash. |

## Quality Gates

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `pnpm extension:runtime` passed.
- `pnpm extension:dapp` passed.
- `pnpm extension:runtime:deep` passed.

## Deviations From Plan

- None against the QuickShield/bridge plan. Historical signing research remains in `.thoughts/research/` and superseded plan files, but now carries decision-update or superseded context where it could mislead future work.

## Gaps And Risks

- `scripts/check-extension-dapp-bridge.mjs` intentionally seeds a legacy permission-shaped record with `canShareAddress` and `canRequestSignatures` to prove old stored permissions do not re-enable signing. This is test data, not product code.
- Follow-up evidence now includes real extension QuickShield XLM and USDC deposit transactions. The extension still does not claim Wallets Kit compatibility or extension-native Ethereum bridge.

## Follow-ups

- Keep the reusable local testnet USDC funder topped up for future extension USDC harness reruns.
- Keep external arbitrary dApp signing disabled unless Abu explicitly reopens that product direction.

## Evidence Log

- Code audit sub-agent `Newton` found the stale queue, permission module, status plumbing, and unused helpers.
- Docs audit sub-agent `Leibniz` found stale active/referenced Wallets Kit/Freighter signing wording; those files were updated.
- Fresh runtime evidence recorded in `.thoughts/research/spikes-log.md` under `2026-06-24 18:59 UTC - Extension signing dead-code cleanup and rerun`.

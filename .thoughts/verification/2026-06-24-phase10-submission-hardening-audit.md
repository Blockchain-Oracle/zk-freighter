# Verification Audit: Phase 10 submission hardening

## Verdict

Conditional pass.

The repo now has public README evidence, a judge-facing submission package, explicit mainnet gating language, in-app demo evidence for both the USDC shielded loop and the CCTP bridge-to-shield path, and passing quality gates.

Remaining submission work is external/product-final rather than hidden implementation: set the final git author/remote and publish the public repo if desired, record the 2-3 minute video, choose final demo network posture, and get explicit Abu approval before any mainnet deploy/spend.

## Artifacts Checked

- `README.md`
- `docs/SUBMISSION-PACKAGE.md`
- `AGENTS.md`
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- `.thoughts/quality/2026-06-22-project-quality-profile.md`
- `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`
- `.thoughts/research/spikes-log.md`
- `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`
- `packages/core/src/networks.ts`
- `packages/core/src/demo-evidence.ts`
- `apps/web/src/DemoEvidencePanel.tsx`

## Requirement Traceability

| Requirement | Evidence |
|---|---|
| Mainnet config exists but unsupported mainnet features are gated | `packages/core/src/networks.ts` has mainnet RPC/Horizon/SAC records, but mainnet XLM and USDC `shieldedPool` values are `pending-deployment` and no pool IDs are set. |
| No unsupported atomic bridge claim | `README.md` and `AGENTS.md` point to the Phase 9 decision; atomic bridge-and-shield is deferred until a custom adapter passes real tests. |
| Public bridge boundary is explicit | `README.md`, `packages/core/src/demo-evidence.ts`, and `apps/web/src/DemoEvidencePanel.tsx` state that CCTP approval/burn/attestation/mint are public and shielding is separate. |
| Evidence table exists for submission | `README.md` includes a compact evidence table; `docs/SUBMISSION-PACKAGE.md` gives a judge-facing digest covering USDC shield, shielded transfer, unshield, CCTP approval, burn, mint/forward, ASP insert, post-bridge shield, and extension QuickShield evidence. |
| In-app demo evidence is copyable | `DemoEvidencePanel` now copies a combined submission digest containing the USDC shielded-loop and CCTP bridge evidence. |
| Credits and license posture are visible | `README.md` credits Nethermind, Circle, Stellar/SDF, and OpenZeppelin/SDF Confidential Tokens research; it notes Nethermind's mixed license and Circle CCTP's Apache-2.0 license. |

## Acceptance Criteria Coverage

| Acceptance | Status |
|---|---|
| A1 network config evidence | Covered by network tests and mainnet/testnet records. |
| A2 XLM privacy evidence | Previously recorded in `spikes-log.md`; not changed in this phase. |
| A3 load-bearing ZK evidence | Covered by accepted proof paths, tampered-proof rejection path, and demo evidence; not re-run on-chain in this phase. |
| A4 USDC evidence | Covered by USDC shield/private-send/unshield evidence and tests. |
| A5 receive evidence | Existing receive code and discovery work remain covered; no Phase 10 change. |
| A6 bridge evidence | Covered by `spikes-log.md`, README table, and in-app CCTP evidence digest. |
| A7 passkey evidence | Existing passkey support matrix still says real platform phone/passkey is not claimed. |
| A8 compliance evidence | Existing disclosure artifact path remains available; no Phase 10 change. |
| Phase 10 submission hardening | README evidence table, submission package, demo script, mainnet posture, credits, and quality gates are complete. Video/public-repo upload remain external. |

## Quality Gates

Commands rerun on 2026-06-25 after submission-package and extension-evidence cleanup:

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed: 19 core test files / 78 tests and 2 web test files / 4 tests.
- `pnpm build` passed.

`pnpm build` still emits the existing Vite large-chunk warning. It is not a failing gate.

## Deviations From Plan

- No mainnet deployment was attempted. This matches the approval rule: mainnet spend/deploy requires explicit Abu approval and funding.
- No video was generated. The README now includes a demo script, but recording/submission is still outside this code checkpoint.
- Atomic bridge-and-shield was not implemented. Phase 9 deferred it with proof gates.

## Gaps And Risks

- Local git is initialized on `main`, but no baseline commit or public remote is assumed because this environment has no configured git author identity.
- The app has a large bundled JS chunk. Build passes, but code-splitting would be useful after submission-critical work.
- Mainnet CCTP contract IDs exist in config, but bridge-to-shield remains gated by missing mainnet privacy-pool deployments.
- Real platform passkey/phone PRF support is still not claimed.

## Follow-ups

1. Choose final demo posture: testnet-only is currently evidence-backed; any mainnet action needs explicit approval.
2. Record the 2-3 minute video following the README demo script.
3. Set Abu's git author identity, create the baseline commit, and add/push a public remote if this workspace is the submitted repository.
4. Keep atomic bridge-and-shield hidden/deferred.

## Evidence Log

- Main evidence: `.thoughts/research/spikes-log.md`
- Phase 9 atomic decision: `.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`
- Submission README hardening: `README.md`
- Submission package: `docs/SUBMISSION-PACKAGE.md`
- In-app evidence surface: `apps/web/src/DemoEvidencePanel.tsx`

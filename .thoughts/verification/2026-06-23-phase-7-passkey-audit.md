# Verification Audit: Phase 7 Optional Passkey

## Verdict

Conditional pass.

The implementation matches the intended architecture: optional passkey unlock wraps the seed-backed vault and fails closed when PRF is unsupported or mismatched. The remaining acceptance gap is real platform PRF success on a user-approved target device/browser. That has not been run, so phone/passkey demo support is not claimed.

## Artifacts Checked

- `.thoughts/handoffs/2026-06-22-codex-build-prompts.md` Prompt 8.
- `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md` Phase 7.
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md` R2 / A7.
- `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md` S13.
- `.thoughts/research/2026-06-21-pov-passkey-determinism-truth.md`.
- `.thoughts/research/2026-06-21-passkey-prf.md`.
- `.thoughts/research/2026-06-21-stellar-passkey-accounts.md`.
- `packages/core/src/passkey.ts`.
- `packages/core/src/passkey.test.ts`.
- `apps/web/src/PasskeyPanel.tsx`.
- `apps/web/src/AccessPanels.tsx`.
- `apps/web/src/App.tsx`.
- `.thoughts/research/spikes-log.md`.

## Requirement Traceability

- Passkey optional: implemented as a separate passkey envelope and removable UI; create/import seed vault remains unchanged.
- Passkey framed as convenience, not recovery: UI copy says seed phrase remains recovery and password unlock remains available.
- PRF-supported path: implemented with WebAuthn `prf` create/get APIs and HKDF/AES-GCM envelope encryption; unit-tested with injected PRF-capable client.
- Unsupported/mismatched PRF fail closed: unit tests cover unsupported PRF, cancelled ceremony, invalid WebAuthn origin, corrupt envelope, and mismatched PRF output.
- Target-device matrix: recorded in `.thoughts/research/spikes-log.md`.

## Acceptance Criteria Coverage

- Seed-only wallet works without passkey: preserved by unchanged vault create/import/unlock path and locked-screen password fallback.
- Passkey setup is optional: implemented as a wallet security panel after unlock.
- PRF path unlocks expected protected material: covered by deterministic injected WebAuthn PRF unit test.
- Unsupported/mismatched PRF fails closed: covered by tests and Chrome virtual-authenticator smoke.
- Target-device PRF matrix recorded: recorded, with real platform PRF success marked not run.

## Quality Gates

- Focused passkey tests passed: 7 tests.
- Core typecheck passed.
- Web typecheck passed.
- Web lint passed.
- Browser smoke passed for UI rendering, mobile overflow, password fallback, and unsupported-PRF fail-closed behavior.

## Deviations From Plan

- Stellar passkey smart-account signing was not implemented. Research confirmed local Stellar passkey kits are signer/smart-account models, while this phase requires optional seed-wallet convenience.
- Real platform PRF success was not completed because it requires a user-approved OS/browser passkey prompt.

## Gaps And Risks

- Do not claim phone/passkey support in the demo until a real platform passkey PRF setup and unlock succeeds on the target device.
- WebAuthn local development must use `localhost` or HTTPS; `127.0.0.1` is rejected by Chrome as an invalid RP domain.
- The passkey envelope is local-browser storage. It is convenience unlock, not backup.

## Follow-ups

- Run a real platform passkey ceremony on the intended demo browser/device, then update the matrix.
- If the designer prototype includes a dedicated settings security flow, reintegrate this panel into that surface.
- For extension work, rerun WebAuthn ceremonies in a tab/side-panel context, not an MV3 service worker.

## Evidence Log

- Real support matrix and smoke evidence recorded in `.thoughts/research/spikes-log.md` under `2026-06-23 20:53 UTC - Phase 7 optional passkey implementation and matrix`.

# Plan: Extension Public dApp Wallet Mode

> **Superseded on 2026-06-24.** Abu rejected the public dApp signing wallet direction. Keep this file as historical research/planning context only. The active extension plan is `.thoughts/plans/2026-06-24-extension-quickshield-bridge-plan.md`.

## Inputs

- Product spec: `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`, especially R11/A9.
- MVP stories: `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`, especially S17.
- Quality profile: `.thoughts/quality/2026-06-22-project-quality-profile.md`.
- Phase 11 audit: `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`.
- Current signing research: `.thoughts/research/2026-06-24-extension-dapp-signing-reality.md`.
- Current official docs checked through Context7 and online primary sources:
  - Freighter browser API.
  - WXT MV3 extension entrypoints and runtime APIs.
  - Stellar Wallets Kit module interface.
  - Stellar protocol SEP-0043 and SEP-0053.
  - Chrome side panel API.
- Current code:
  - `apps/extension/entrypoints/content.ts`
  - `apps/extension/entrypoints/background.ts`
  - `apps/extension/src/ExtensionApp.tsx`
  - `packages/core/src/dapp-bridge.ts`
  - `packages/core/src/soroban-submit.ts`
  - `packages/core/src/vault.ts`
  - `scripts/check-extension-dapp-bridge.mjs`
- Reference-only sources:
  - `reference/freighter`
  - `reference/xbull-wallet`
  - `reference/stellar-build`
  - `reference/stellar-ecosystem-resources/connect-wallet`

## Assumptions

- This feature is named **Public dApp Wallet Mode** in internal planning.
- It is opt-in from the user perspective. ZK Fighter stays privacy-by-default, and dApp mode is explained as public Stellar address/signing behavior.
- It reuses the seed-derived public Stellar account already used by ZK Fighter. Do not invent a second public signing key unless Abu explicitly changes the product decision.
- Direct Freighter-style behavior is the first compatibility target because current Stellar dApps and the Nethermind reference already use Freighter-style flows.
- Stellar Wallets Kit compatibility is verified after direct Freighter-style messages pass. If Wallets Kit does not detect ZK Fighter cleanly, build a first-class ZK Fighter module/demo rather than pretending it is Freighter.
- xBull compatibility is research inspiration only. Do not implement xBull's protocol before Freighter-style compatibility passes.
- SEP-0043 is a draft standard, so claim compatibility narrowly by verified method rather than claiming full SEP-0043 support.
- SEP-0053 message signing is final, but message signing remains optional for this phase because the UX/phishing risk is higher than transaction signing.
- Current Freighter behavior is the implementation target where docs and source differ. In particular, transaction signing does not auto-request access, and current browser auth-entry responses should be treated as string-compatible.

## Open Questions

- Coexistence behavior when Freighter and ZK Fighter are both installed and a dApp sends Freighter-style page messages.
- Whether arbitrary `signMessage` belongs in the hackathon slice. The SEP-0053 shape is known, but it is still phishing-prone.
- How detailed transaction decoding should be in the first UI pass. At minimum, the user must see origin, network, signer, operation count/type summary, and raw XDR/hash fallback.
- Whether public dApp wallet mode should be surfaced in the web app settings too, or only in the extension.

## Prototype Reintegration Gate

No high-fidelity extension provider prototype exists. If one arrives, run prototype discovery and reintegration before replacing the approval/signing UI.

No prototype mock may ship as a real approval, signature, address, network, or transaction result.

## Phase 1: Provider State And Vault Unlock

### Goal

Give the extension enough real wallet state to answer public dApp requests only after the user has a wallet and has enabled dApp mode.

### Work

- Add extension-owned state for:
  - active network.
  - public dApp wallet mode enabled/disabled.
  - active public Stellar address metadata.
  - connected sites keyed by normalized origin, network, and public key.
  - permissions split into address-sharing and signing.
- Add an extension unlock path that can access the encrypted seed-backed identity without exposing mnemonic material to content scripts.
- Keep private receive code, note keys, encryption keys, membership blinding, proof state, and shielded balances out of all dApp bridge responses.
- Add settings UI for connected sites and revoke/disconnect.

### Real Integration Path

Use the existing encrypted vault/identity primitives from `packages/core`. Browser content scripts never receive secrets.

### Mock/Simulation Policy

Local fixtures are allowed in unit tests. Product UI must not show a fake connected site, address, or signature as real.

### Checks

- Unit tests for origin normalization, permission storage, lock/unlock behavior, and secret non-exposure.
- `pnpm --filter @zk-fighter/extension typecheck`
- `pnpm test`
- `pnpm extension:runtime`

### Acceptance Criteria Covered

- R11/A9 groundwork.
- Existing extension read-only bridge stays fail-closed when locked, disabled, or no wallet exists.

### Stop Condition

The extension can distinguish no-wallet, locked, dApp-mode-disabled, not-allowed, and allowed states without exposing private wallet material.

## Phase 2: Freighter-Style Access Grants

### Goal

Implement real access grants for the Freighter-style message contract without signing yet.

### Work

- Move Freighter-style request handling from pure synchronous `buildFreighterBridgeResponse()` into a content-script to background request pipeline.
- Implement:
  - `REQUEST_CONNECTION_STATUS`
  - `REQUEST_NETWORK`
  - `REQUEST_NETWORK_DETAILS`
  - `REQUEST_ALLOWED_STATUS`
  - `REQUEST_ACCESS`
  - `SET_ALLOWED_STATUS`
  - `REQUEST_PUBLIC_KEY`
- Reserve or fail closed for service types that will be added in later phases:
  - `SUBMIT_TRANSACTION`
  - `SUBMIT_AUTH_ENTRY`
  - `SUBMIT_BLOB` / message signing
- Open side panel/tab approval UI for access requests.
- Return an empty public key before access and the active public Stellar address after approval.
- Use copy equivalent to: "This shares your public Stellar address with this site. It does not reveal your private receive code or shielded notes."

### Real Integration Path

Use real Chrome runtime messaging and storage. Approval is user-driven in the extension UI.

### Mock/Simulation Policy

The test harness may automate clicking approve/reject. It must still exercise the real extension runtime.

### Checks

- Unit tests for request envelopes and error responses.
- Extend `pnpm extension:dapp` to cover approve/reject.
- Browser harness verifies:
  - public key empty before approval.
  - `requestAccess` opens approval.
  - approve returns address.
  - reject returns a structured error.
  - `isAllowed` and `getAddress` reflect stored state.

### Acceptance Criteria Covered

- First half of A9: real dApp detect/request path.

### Stop Condition

A real local test dApp can request and receive the public Stellar address through the extension after explicit approval.

## Phase 3: Transaction Signing

### Goal

Let approved dApps request public Stellar transaction signatures with a clear review step and local signature verification evidence.

### Work

- Implement `SUBMIT_TRANSACTION` / `signTransaction` for Stellar transaction XDR.
- Parse XDR with the active network passphrase.
- Match current Freighter source behavior: reject unapproved origins instead of silently prompting for access during `signTransaction`, unless a later product decision explicitly changes that flow.
- Reject:
  - malformed XDR.
  - network mismatch.
  - requested `address` not matching active public key.
  - locked wallet.
  - unapproved origin.
  - attempts to submit directly through unsupported `submit` fields.
- Show approval UI with origin, network, signer, operation summary, fee, timeout/sequence where available, raw XDR/hash fallback, and public-address warning.
- Sign with `signTransactionXdrWithWallet()` only after approval.
- Return `{ signedTxXdr, signerAddress }` in the Freighter-style response envelope.

### Real Integration Path

No chain transaction is required for the first signing proof. Build a valid unsigned XDR in the harness, sign it in the extension, then verify the signature locally with Stellar SDK. A separate optional evidence run may submit a small testnet payment if Abu funds/approves it.

### Mock/Simulation Policy

Do not fake signatures. Harness-created unsigned XDR fixtures are allowed.

### Checks

- Unit tests for all rejection paths.
- Unit test that signed XDR verifies against the derived public Stellar key.
- New Chrome runtime harness, proposed as `pnpm extension:dapp:sign`, verifies:
  - approved origin can sign.
  - rejected approval does not sign.
  - wrong network rejects.
  - wrong address rejects.
  - returned signer matches active public key.

### Acceptance Criteria Covered

- A9 dApp signing gate for transaction XDR.

### Stop Condition

A real local test dApp obtains a signed XDR from the unpacked extension and the signature verifies locally.

## Phase 4: Soroban Auth Entry Signing

### Goal

Support Soroban dApps that need `signAuthEntry`, without exposing private pool internals.

### Work

- Export or add a narrowly scoped core helper for signing a single Soroban authorization entry with the seed-derived account.
- Implement Freighter-style `signAuthEntry`.
- Return a string-compatible `signedAuthEntry` value for current browser provider compatibility, and document any caller-specific Buffer conversion if a harness exposes one.
- Require unlock, allowed origin, active public key match, and explicit approval.
- Show an auth-entry review UI. If decoding is incomplete, show raw XDR/hash and label it as an authorization entry, not a normal payment.

### Real Integration Path

Use a real auth-entry fixture generated by Stellar SDK/Soroban simulation or current ZK Fighter prepared transaction code. Verify the returned signed auth entry locally where possible.

### Mock/Simulation Policy

No fake signed auth entries. If we cannot verify semantics, keep the method disabled and document the blocker.

### Checks

- Unit tests for signing and rejection paths.
- Chrome runtime harness for an auth-entry request.
- `pnpm extension:dapp:sign`

### Acceptance Criteria Covered

- A9 Soroban dApp compatibility extension.

### Stop Condition

An approved local dApp receives a real signed Soroban auth entry, or the method remains explicitly disabled with a recorded reason.

## Phase 5: Message Signing Decision

### Goal

Decide whether to enable SEP-0053-compatible `signMessage` in the hackathon slice.

### Work

- Treat the protocol shape as known: SEP-0053 signed messages are base64-encoded XDR `SignedPayload` values.
- If enabled, add strict UI showing origin, network, signer, exact message, and warning that signed messages can be used as login/authorization proof.
- If enabled, return a Freighter/Wallets Kit-compatible `{ signedMessage, signerAddress }` response.
- If not enabled, keep a structured "not supported yet" error.

### Real Integration Path

Only enable after a local harness verifies the SEP-0053 signed payload against the public key and the UX is clear enough to avoid silent-login surprises.

### Mock/Simulation Policy

No fake message signatures.

### Checks

- Unit test for SEP-0053 payload construction/verification if implemented.
- Unit and Chrome runtime tests if implemented.

### Acceptance Criteria Covered

- Optional A9 extension.

### Stop Condition

Either message signing passes real verification, or it stays disabled and documented.

## Phase 6: Wallets Kit Compatibility

### Goal

Prove how dApps should integrate ZK Fighter through Stellar Wallets Kit.

### Work

- Build a small local dApp harness using `@creit.tech/stellar-wallets-kit`.
- Test whether the Freighter module can discover/use ZK Fighter without conflict.
- If not, build a minimal ZK Fighter Wallets Kit module in the harness or docs, with `isAvailable`, `getAddress`, `signTransaction`, and later `signAuthEntry`.
- Keep `isAvailable()` below the Wallets Kit 1000 ms expectation.
- Keep branding honest: do not present ZK Fighter as Freighter.

### Real Integration Path

Run the harness against the unpacked extension in Chrome-for-Testing.

### Mock/Simulation Policy

Do not claim Wallets Kit support from static type checks. It needs a browser runtime proof.

### Checks

- `pnpm extension:dapp`
- `pnpm extension:dapp:sign`
- Wallets Kit harness evidence recorded in `.thoughts/verification/`.

### Acceptance Criteria Covered

- A9 integration polish.

### Stop Condition

The repo documents a verified integration path for Wallets Kit, either through direct compatibility or a first-class module.

## Phase 7: Verification Audit And Claim Boundary

### Goal

Lock the public claim boundary before demo/submission language changes.

### Work

- Run the quality gates:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm extension:runtime`
  - `pnpm extension:dapp`
  - `pnpm extension:dapp:sign` if added.
- Write a verification audit under `.thoughts/verification/`.
- Update README only with claims backed by runtime evidence.

### Real Integration Path

All browser claims come from Chrome-for-Testing runtime harnesses. Any chain-touching optional evidence goes into `.thoughts/research/spikes-log.md`.

### Mock/Simulation Policy

No mocked wallet provider behavior in public claims.

### Acceptance Criteria Covered

- A9 final claim boundary.

### Stop Condition

The extension can be described precisely as one of:

- read-only dApp detection/network profile only.
- public dApp access/address provider.
- public dApp transaction signer.
- public dApp transaction/auth/message signer.

Anything not proven remains explicitly disabled or deferred.

## Verification Checkpoint

Before implementation is called complete, run a verification audit against:

- Freighter envelope compatibility.
- Origin/permission model.
- Lock/unlock and secret exposure.
- Transaction/auth/message signing correctness.
- Wallets Kit integration reality.
- README claim boundaries.

## Handoff Notes

- Keep this feature separate from shielded transfers. dApp mode is public Stellar wallet behavior.
- Never expose `zkf1...`, note keys, encryption keys, membership blinding, proof inputs, proof outputs, or shielded balances through provider APIs.
- Prefer side panel/tab approval UI over popup-only approval.
- Update `.thoughts/research/2026-06-24-extension-dapp-signing-reality.md` if new Freighter/Wallets Kit behavior is discovered during implementation.

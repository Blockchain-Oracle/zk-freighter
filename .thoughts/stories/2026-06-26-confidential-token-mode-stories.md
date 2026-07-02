# Stories: Confidential Token Mode (ZK Freighter Track B)

Status: B-T story gate. Traces to `.thoughts/specs/2026-06-26-confidential-token-mode-spec.md`. Behavior-facing slices only; no architecture (B-P). Chain-touching acceptance gates on **real recorded testnet evidence**.

## Traceability

| Story | Spec requirements | Acceptance IDs |
|------|------|------|
| S-CT-1 Enter mode + select token | R1, R2, R13 | AC11 |
| S-CT-2 Register account | R3 | AC3 |
| S-CT-3 Deposit (public→confidential) | R4, R5 | AC4 |
| S-CT-4 View confidential balance | R5 | AC10 |
| S-CT-5 Merge pending | R6 | AC6 |
| S-CT-6 Confidential transfer | R7 | AC5 |
| S-CT-7 Withdraw (confidential→public) | R8 | AC6 |
| S-CT-8 Dual-auditor disclosure | R9 | AC7 |
| S-CT-9 Recovery (wipe→reconstruct→spend) | R10, R12 | AC8 |
| S-CT-10 Compliance + isolation + honest states | R11, R12, R13 | AC9, AC10, AC11 |
| S-CT-11 Deploy contracts + register VKs | (infra) | AC2 |
| S-CT-12 Toolchain provenance + browser proof | (infra) | AC1 ✅ |

---

## Story 1 (S-CT-1): Enter Confidential mode and select a token

As a privacy-seeking holder,
I want a clearly separated Confidential Token area in the wallet,
so that I never confuse it with the shielded pool and I know it's testnet-only.

### Acceptance Criteria
- A Confidential mode destination exists in the redesigned shell, in the `packages/ui` language, visually distinct from shielded-pool flows, with a TESTNET indicator.
- The user can point the wallet at a deployed confidential token and see its identity + their registration state (registered / not registered).
- Copy uses "confidential amounts/balance", states addresses are public and an auditor can decrypt, and never says "anonymous/untraceable/fully private".

### Scenarios
- Given an unregistered user, when they open Confidential mode and select the demo token, then the screen shows "Not registered yet" with a register call-to-action and the boundary/auditor explanation.
- Given the network is mainnet, then Confidential mode is unavailable and the UI states it is testnet-only (no mainnet path).

### Notes
The prototype does NOT cover this mode — design it in the language; flag as a designer gap, don't invent a different visual system.

---

## Story 2 (S-CT-2): Register a confidential account

As a first-time holder,
I want to register my account on the confidential token,
so that I can receive and hold confidential balances under a designated auditor.

### Acceptance Criteria
- Registration establishes the user's confidential-account key material and binds an `auditor_id`, produces a `Register` (CircuitType=0) proof on-device, and submits a real testnet tx accepted on-chain (tx hash recorded).
- The UI explains an auditor is designated and what the auditor can/cannot do (decrypt, not spend).
- Live on-device proving is shown (proof-flow ring + stages); a failed/rejected proof or submission shows an honest error, never a fake success.

### Scenarios
- Given a registered account, when the user returns, then the wallet shows "Registered" and the register action is not offered again.
- Given proof generation fails, then an honest "couldn't generate proof" error is shown and no tx is submitted.

---

## Story 3 (S-CT-3): Deposit public → confidential

As a holder with public underlying tokens,
I want to move an amount into my confidential balance,
so that my holdings become confidential while the deposit itself is a public boundary.

### Acceptance Criteria
- The user enters an amount of the public underlying token; the deposit is labelled a **public boundary** (the deposited amount is visible on-chain) with an explicit callout; the resulting balance is confidential.
- A real testnet deposit tx is submitted (tx hash recorded); before/after public balance + resulting confidential balance are shown.
- Insufficient public balance, unregistered account, and proof/submission failure each show honest errors.

### Scenarios
- Given a registered, funded account, when the user deposits N, then public balance decreases by N (visible) and confidential spendable/pending reflects N after merge per the protocol.

---

## Story 4 (S-CT-4): View my confidential balance

As a holder,
I want to see my own confidential balance locally,
so that I know what I can spend while it stays hidden on-chain.

### Acceptance Criteria
- The wallet shows the user's **own decrypted** spendable and pending balances locally, while stating the balance is hidden on-chain.
- Spendable vs pending-not-yet-merged are distinguished.
- A zero / unregistered / failed-to-load state renders honestly (no fabricated number); loading shows a skeleton.

---

## Story 5 (S-CT-5): Merge pending into spendable

As a recipient of confidential funds,
I want to merge pending incoming amounts into my spendable balance,
so that I can spend everything I've received.

### Acceptance Criteria
- A `Merge` op + on-device proof + real testnet tx (tx hash recorded) moves pending into spendable.
- After merge, spendable reflects the consolidated amount; pending shows zero (or remaining).
- Nothing to merge → the action is disabled with an honest hint.

---

## Story 6 (S-CT-6): Confidential transfer (amount hidden)

As a holder,
I want to send a confidential amount to another registered address,
so that the recipient and the fact of payment are public but the amount stays confidential.

### Acceptance Criteria
- The recipient is a registered address (public); the **amount is not present in cleartext on-chain** (only commitments/ciphertexts); a `Transfer` (CircuitType=2) proof is generated on-device and accepted on a real testnet tx (tx hash recorded).
- The transfer emits the dual-auditor ciphertexts (recipient + sender channels).
- UI clearly states "amount confidential / address public"; live proving shown; over-balance / unregistered-recipient / proof failure show honest errors.

### Scenarios
- Given the recorded transfer tx, when its on-chain payload is inspected, then the cleartext amount does not appear (only commitments/ciphertexts). (Verifies AC5.)

---

## Story 7 (S-CT-7): Withdraw confidential → public

As a holder,
I want to move a confidential amount back to the public underlying token,
so that I can exit to a normal public balance, accepting that the withdrawn amount becomes visible.

### Acceptance Criteria
- A `Withdraw` (CircuitType=1) proof + real testnet tx (tx hash recorded) moves a confidential amount to the public underlying; the withdrawn amount becomes public.
- Labelled a **public boundary** with an explicit callout; over-balance / proof failure show honest errors.

---

## Story 8 (S-CT-8): Dual-auditor disclosure

As an auditor,
I want to decrypt a transaction's amount and the relevant balance from on-chain ciphertexts,
so that I can fulfil compliance review without being able to move funds.

### Acceptance Criteria
- From the on-chain ciphertexts of a recorded transfer, the recipient-auditor channel decrypts the correct `v_tx` (and randomness), and the sender-auditor channel decrypts `v_tx` + post-tx balance — matching the known plaintext.
- The wallet can produce/verify this auditor view; the auditor key **cannot** spend (no `sk`).
- A non-auditor / wrong-key attempt fails honestly.

### Scenarios
- Given the auditor key for the account's `auditor_id`, when decrypting the recorded transfer, then the recovered amount equals the amount actually sent.
- Given a wrong/rotated-away key, then decryption fails (honest error), proving channel binding.

---

## Story 9 (S-CT-9): Recovery (wipe → reconstruct → spend)

As a holder who lost local state,
I want my wallet to rebuild my confidential balance and openings from on-chain history,
so that my funds are never lost and I can spend again.

### Acceptance Criteria
- For an account with ≥1 deposit and ≥1 transfer, after wiping local confidential-mode state, the wallet reconstructs spendable balance + openings from on-chain event history using only the seed.
- The reconstructed balance equals the pre-wipe balance, and the user can then complete a real testnet spend (tx hash recorded).
- If event history is incomplete (indexer/RPC window gap), the wallet shows an honest "history incomplete — recovery may be partial" warning rather than a wrong balance.

---

## Story 10 (S-CT-10): Compliance, isolation, and honest states

As any user,
I want gating, isolation, and failure states to be truthful,
so that I'm never misled about confidentiality, compliance, or what happened.

### Acceptance Criteria
- A frozen account / policy-denied / SAC-denied operation shows the real reason (honest error), never a fake success or balance.
- Shielded-pool balances, keys, and activity are unaffected by any confidential-mode action and vice versa (regression check).
- Every flow renders real error/loading/empty states (unregistered, frozen, RPC/proof failure, zero balance).
- Copy audit: "confidential amounts" used; public boundaries + auditor-decryptable + testnet-only stated; no "anonymous/untraceable/fully private".

---

## Story 11 (S-CT-11): Deploy contracts and register verification keys

As the builder,
I want the confidential token, auditor registry, verifier registry, and a demo SEP-41 underlying deployed on testnet with VKs registered,
so that the user-facing stories have a real chain to run against.

### Acceptance Criteria
- The three contracts + a demo SEP-41-wrapped underlying are deployed on testnet; contract IDs recorded in `spikes-log.md`.
- One UltraHonk VK per `CircuitType` (our byte-identical-to-reference VKs) is registered in the verifier registry; at least one circuit's `verify_proof` accepts a real on-device proof on-chain (the first funded de-risk of AC1→on-chain).
- Auditor key(s) registered for the demo `auditor_id`.

### Notes
Gates on Abu funding (Constraint C6). This is the first chain-spending step.

---

## Story 12 (S-CT-12): Toolchain provenance + browser proof (DONE ✅)

As the builder,
I want our pinned toolchain to reproduce the on-chain VK and our browser path to prove+verify,
so that the whole track is de-risked before implementation.

### Acceptance Criteria — MET (AC1)
- Regenerated `transfer` VK byte-identical to committed/on-chain VK; 28/28 transfer tests pass; `noir_js`+`bb.js@0.87.0` generate+verify an UltraHonk proof; bb.js VK == bb-CLI VK == on-chain VK. Recorded in `2026-06-26-confidential-token-b1-spike.md`.

---

## Open Questions
- Q (S-CT-1/4): exact mode-switch placement and how Activity distinguishes confidential vs shielded entries — B-P + design.
- Q (S-CT-8): does the demo wallet act as its own auditor, or is there a separate auditor key/registry persona? — B-P.
- Q (S-CT-9): indexer scope (own scoped indexer vs RPC event window) and the "history incomplete" threshold — B-P (`INDEXER.md` absent upstream).
- Q (S-CT-11): demo underlying = freshly deployed demo SEP-41 vs existing testnet asset — B-P.

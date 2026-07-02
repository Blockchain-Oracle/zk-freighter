# Spec: Confidential Token Mode (ZK Freighter Track B)

Status: B-S spec gate (WHAT only). Architecture is intentionally deferred to B-P (research-backed plan), after the B1 spike (PASSED). Derived strictly from reality research; no solutioning.

## Objective

Add a **second, independent privacy mode** to ZK Freighter: **Confidential Tokens** — a SEP-41-wrapped Stellar token whose **amounts and balances are confidential** (hidden on-chain) while addresses and the fact of a transaction remain public, with **compliance built in** (auditor decryption channels + optional freeze/policy hooks). It complements — never replaces — the existing shielded-pool mode. A user can hold, deposit, transfer, and withdraw a confidential token on Stellar testnet, with every balance opening **recoverable** from on-chain events, proven on the user's device.

This mode exists to demonstrate the **other half** of real-world ZK on Stellar: where the shielded pool hides *linkage* (who paid whom), confidential tokens hide *amount* (how much) in a **regulator-compatible** way — the model financial institutions can actually adopt.

## Background And Current Reality

From `2026-06-25-confidential-token-repo-study.md`, `2026-06-26-confidential-token-deep.md`, `2026-06-26-confidential-token-b1-spike.md`:

- **Confidentiality, not anonymity.** Amounts/balances are hidden; **addresses are public**; a transfer is visibly *a transfer*, just not *how much*. (Distinct from the shielded pool, which hides the transaction-graph link.)
- **Upstream is the OpenZeppelin/SDF Confidential Tokens preview** (`reference/openzeppelin-stellar-contracts-confidential`, study-only). It ships **example `auditor` + `verifier` contracts only — no token example**; the token contract is ours to author.
- **Three on-chain contracts:** the confidential **token** (SEP-41 wrapper over an underlying SAC), an **auditor registry** (Grumpkin public keys per `auditor_id`), and an **UltraHonk verifier registry** (one VK per `CircuitType`).
- **Six circuits, fixed `CircuitType` on-chain** (MUST NOT change): Register=0, Withdraw=1, Transfer=2, SpenderTransfer=3, SetSpender=4, RevokeSpender=5. Each has a committed VK.
- **Eight operations**, each emitting recovery-critical events carrying ciphertext bytes (`r_e`, `sigma`, `b_tilde`, dual-auditor ciphertexts): Register, Deposit, Merge, Withdraw, Transfer, SpenderTransfer, SetSpender, RevokeSpender.
- **Recovery depends on full event history.** Openings (the secret `(value, randomness)` behind each commitment) are reconstructed by replaying events; `INDEXER.md` is *"to be added"* upstream (does not exist).
- **Dual-auditor ECDH:** the recipient-auditor channel recovers `(v_tx, r_tx)`; the sender-auditor channel recovers `(v_tx, post-tx balance)`. **Neither auditor can spend** (no `sk`). Auditor keys are Grumpkin affine points, validated on-curve (`y²=x³−17`), rotation append-only.
- **Compliance is real + configurable:** `freeze`/`unfreeze`, SAC `authorized()` passthrough, external `Policy.is_authorized` hook, `ComplianceHooks` on all 8 ops. **Clawback is outline-only** (unimplemented circuit; no entry point).
- **Maturity:** unaudited, dev-commit verifier backend (`rs-soroban-ultrahonk @ 661db07`); **testnet-only** (SDF productionization ~Aug).
- **B1 PASSED:** our pinned toolchain (`nargo 1.0.0-beta.11`, `bb 0.87.0`) reproduces the committed `transfer` VK byte-for-byte; 28/28 transfer tests pass; `@noir-lang/noir_js` + `@aztec/bb.js@0.87.0` generate+verify an UltraHonk proof in JS, and bb.js's VK == bb-CLI VK == on-chain VK. The browser-proving path is confirmed viable.
- **Wallet today:** redesigned sidebar SPA (`apps/web` on `packages/ui`): Home/Activity/Receive/Shield/Send/Unshield/Bridge/Discover/Disclosure/Settings, real prover `onStatus` progress, honest error/loading/empty states. Confidential mode must adopt this design language and live beside (not inside) the shielded-pool flows.

## Users

- **Privacy-seeking holder** — wants to hold/spend a token without revealing balances or amounts on-chain, while keeping a public, recoverable address.
- **Compliance-bound institution / issuer** — needs confidentiality that an **auditor can lawfully inspect** (decrypt amounts via the auditor channel) and that supports **freeze/policy** gating — the property a pure-anonymity system can't offer.
- **Auditor** — a designated party who can **decrypt** transaction amounts and balances for accounts under their `auditor_id`, but **cannot spend or move** funds.
- **Judge / evaluator** — must see a real testnet confidential transfer with on-chain evidence and a verifiable on-device proof, clearly distinguished from the shielded-pool mode.

## Goals

- G1. A distinct **Confidential Token mode** in the wallet, visually and conceptually separated from the shielded pool, in the `packages/ui` language.
- G2. End-to-end **account lifecycle** on testnet: register → deposit (public→confidential) → confidential transfer → withdraw (confidential→public), each with a real on-chain tx and an on-device UltraHonk proof.
- G3. **Merge** of pending incoming amounts into the spendable balance.
- G4. **Dual-auditor disclosure**: an auditor can decrypt a transaction's amount (and the relevant balance) from on-chain ciphertexts; the wallet can produce/verify the auditor view.
- G5. **Recoverable openings**: after a local-state wipe, the wallet reconstructs spendable balance + openings from on-chain event history and can then **spend** — proving no opening is lost.
- G6. **Honest boundary + confidentiality language** throughout: "confidential amounts", addresses public, deposit/withdraw are public-boundary, auditor can decrypt, testnet-only, not anonymous.
- G7. **Full isolation** from the shielded-pool path: separate key hierarchy, prover assets/runtime, and state store; no cross-contamination of note-keys vs confidential-account keys.
- G8. **Compliance surfaced honestly**: where freeze/policy/SAC gating exists, the UI explains it; a frozen/blocked account shows an honest error, not a fake success.

## Non-goals

- N1. **No clawback** (v1) — upstream is outline-only; do not implement or imply it.
- N2. **No mainnet** — confidential mode is testnet-only (sponsor + maturity constraint); the UI must state this and not offer mainnet.
- N3. **Not anonymity** — never claim addresses or counterparties are hidden; only amounts/balances are confidential.
- N4. **No replacement of the shielded pool** — both modes coexist; this spec does not change shielded-pool behavior.
- N5. **No production/custody claims** — unaudited preview; surface that.
- N6. **No architecture decisions here** — key model, prover wrapper, indexer scope, contract/circuit workspace layout, and deployment are decided in B-P.
- N7. **No bridge-to-confidential** in v1 scope (optional, later; flagged as a stretch in B-P).

## Requirements

Functional (WHAT the mode must let users and auditors do):

- R1. **Mode entry.** From the redesigned shell, the user can enter Confidential Token mode (a sidebar destination / mode switch), clearly labelled and visually distinct from shielded-pool flows, carrying a TESTNET indicator.
- R2. **Add / select a confidential token.** The user can point the wallet at a deployed confidential token (a demo SEP-41-wrapped token for the build) and see its identity and their registration state.
- R3. **Register.** A first-time user can register their account on the token: establish their confidential-account key material and bind to an `auditor_id`, producing a `Register` proof + on-chain tx. The UI explains an auditor is designated and what that means.
- R4. **Deposit (public → confidential).** The user moves a chosen amount of the public underlying token into their confidential balance. This is a **public-boundary** action (the deposited amount is visible); the resulting balance is confidential. Honest public-boundary callout required.
- R5. **View confidential balance.** The wallet shows the user's **own** decrypted confidential balance (spendable + pending) locally, while making clear it is hidden on-chain. Distinguish spendable vs pending-not-yet-merged.
- R6. **Merge.** The user can merge pending incoming amounts into spendable balance (a `Merge` op/proof + tx).
- R7. **Confidential transfer.** The user sends a confidential amount to another registered address: the recipient address is public, the **amount is hidden**, and the transfer emits the dual-auditor ciphertexts. Live on-device proving (ring + stages, reusing the proof-flow UI). Honest "amount confidential / address public" copy.
- R8. **Withdraw (confidential → public).** The user moves a confidential amount back to the public underlying token — a **public-boundary** action; the withdrawn amount becomes visible. Honest callout.
- R9. **Dual-auditor disclosure.** Given an account/transaction, the wallet (as the auditor, or producing an auditor-consumable view) can **decrypt** the amount via the recipient-auditor channel and the post-tx balance via the sender-auditor channel, and present/verify it. Auditor **cannot** spend.
- R10. **Recovery.** From only the seed + on-chain event history (local state wiped), the wallet reconstructs the user's spendable balance and openings, and can then complete a spend — demonstrating deterministic recovery.
- R11. **Compliance honesty.** If an operation is gated (frozen account, policy/SAC denial), the wallet shows the real error reason; it never fabricates success or balance.
- R12. **Isolation.** Confidential-mode keys, prover runtime/assets, and stored state are separate from the shielded-pool path; switching modes never mixes balances, keys, or activity.
- R13. **Language.** All copy uses "confidential amounts"/"confidential balance"; deposit/withdraw labelled public boundaries; auditor-can-decrypt stated; testnet-only badge; never "anonymous/untraceable/fully private".

## Acceptance Criteria

Each is independently verifiable; chain-touching ones gate on **real recorded testnet evidence** (tx hashes in `spikes-log.md`). Stories trace to these IDs.

- AC1. **(B1 — met)** Our toolchain reproduces a per-operation VK byte-identical to the committed/on-chain VK, and `noir_js`+`bb.js` generate a proof that verifies against it. *(Recorded.)*
- AC2. The three contracts (token + auditor registry + verifier registry) and a demo SEP-41 underlying are **deployed on testnet**; contract IDs recorded.
- AC3. **Register**: a real account registration tx on testnet, with an on-device-generated `Register` proof accepted on-chain; tx hash recorded.
- AC4. **Deposit**: a public→confidential deposit tx on testnet; before/after public balance + resulting confidential balance shown; tx hash recorded; UI shows the public-boundary callout.
- AC5. **Confidential transfer**: a real testnet transfer where the **amount is not present in cleartext on-chain** (only commitments/ciphertexts), recipient is a registered address, proof generated on-device and accepted; tx hash recorded.
- AC6. **Merge** and **Withdraw**: each a real testnet tx with on-device proof accepted; withdraw makes the amount public again; tx hashes recorded.
- AC7. **Dual-auditor disclosure**: from on-chain ciphertexts of a recorded transfer, the auditor channel decrypts the correct `v_tx` (and post-tx balance for the sender channel), matching the known plaintext; the wallet verifies this; the auditor key **cannot** spend.
- AC8. **Recovery**: wipe local confidential-mode state, reconstruct spendable balance + openings from on-chain events for an account with ≥1 deposit and ≥1 transfer, then **spend** successfully on testnet; recorded.
- AC9. **Isolation**: a regression check shows shielded-pool balances/keys/activity are unaffected by any confidential-mode action and vice versa.
- AC10. **Honest states**: each flow renders real error/loading/empty states (unregistered, frozen/denied, RPC/proof failure, zero balance) — no fabricated success/balance.
- AC11. **Language audit**: no "anonymous/untraceable/fully private"; "confidential amounts" used; public boundaries + auditor-decryptable + testnet-only stated. (`docs:check`/copy review.)
- AC12. **Gates green**: `pnpm lint && typecheck && test && build` + `files:check`/`secrets:check` pass with confidential mode present; circuit KATs (Poseidon2-t4 / Grumpkin / key derivation) pass.

## Constraints

- C1. **Testnet-only**; no mainnet path for confidential mode (N2).
- C2. **No clawback** (N1).
- C3. **`pnpm` only; source files < 300 lines; never import `reference/`** into production (study-only; reproduce with attribution + tests).
- C4. **Pinned toolchain**: `nargo 1.0.0-beta.11`, `bb 0.87.0`, `@aztec/bb.js@0.87.0`, `@noir-lang/noir_js@1.0.0-beta.11`; `CircuitType` ordinals fixed; verifier backend `rs-soroban-ultrahonk @ 661db07`.
- C5. **No fakes** — balances, amounts, proofs, tx hashes, on-chain acceptance must be real; record evidence.
- C6. **Pause for Abu**: testnet funding for deploy/registration/transfers; any irreversible publish; final demo posture. (Funding gates AC2–AC8.)
- C7. **Recovery is load-bearing** — event bytes are the source of truth; a lossy/mutating indexer breaks deterministic recovery (design care in B-P).
- C8. **Design**: adopt `packages/ui` patterns; re-check the prototype where it touches (note: the prototype does NOT cover confidential mode — design it in the language, flag as a designer gap).

## Stories Needed

(Expanded in B-T `story-writer`; traced to AC IDs.)

- S-CT-1 Enter Confidential mode + add/select a token + see registration state. → AC1-context, R1/R2, AC11.
- S-CT-2 Register an account (key setup + auditor binding + proof + tx). → AC3, R3.
- S-CT-3 Deposit public→confidential with boundary callout. → AC4, R4/R5.
- S-CT-4 View confidential balance (spendable vs pending). → R5, AC10.
- S-CT-5 Merge pending into spendable. → AC6, R6.
- S-CT-6 Confidential transfer (amount hidden, live proving). → AC5, R7.
- S-CT-7 Withdraw confidential→public with boundary callout. → AC6, R8.
- S-CT-8 Dual-auditor disclosure (decrypt + verify; cannot spend). → AC7, R9.
- S-CT-9 Recovery (wipe → reconstruct → spend). → AC8, R10.
- S-CT-10 Compliance + isolation + honest error/empty states. → AC9/AC10/AC11, R11/R12.
- S-CT-11 Deploy demo token + auditor + verifier registries; register VKs. → AC2.

## Open Questions

(Most resolve in B-P; none block the spec. The single architecture-blocking unknown — browser proving vs on-chain VK — is already resolved by B1.)

- Q1. Demo underlying: a freshly deployed demo SEP-41-wrapped token vs an existing testnet asset? (Plan leans demo-SEP-41-first.) — B-P.
- Q2. Indexer posture for recovery: own scoped indexer vs RPC event-window, with a fallback warning when history is incomplete. — B-P (`INDEXER.md` doesn't exist upstream).
- Q3. Auditor identity for the demo: wallet acts as its own auditor vs a separate auditor key/registry entry. — B-P/B-S follow-up.
- Q4. Confidential-account key model: distinct Grumpkin hierarchy derived from the seed, separate from BN254 note-keys (B1 confirmed feasibility, not the derivation). — B-P.
- Q5. Where exactly mode-switch lives (sidebar item vs a Home toggle) and how Activity distinguishes confidential vs shielded entries. — B-P + design.
- Q6. Literal on-chain `verify_proof` acceptance of *our* proof (de-risked by byte-identical VK; not yet executed) — first funded implementation step. — needs C6 funding.

## Source References

- `.thoughts/research/2026-06-25-confidential-token-repo-study.md`
- `.thoughts/research/2026-06-26-confidential-token-deep.md`
- `.thoughts/research/2026-06-26-confidential-token-b1-spike.md`
- `~/.claude/plans/you-re-in-plan-mode-velvet-beaver.md` (Track B)
- `reference/openzeppelin-stellar-contracts-confidential` (study-only): `packages/tokens/src/confidential/{mod.rs,docs/DESIGN.md,docs/COMPLIANCE.md,circuits/}`, `examples/confidential/{auditor,verifier}`

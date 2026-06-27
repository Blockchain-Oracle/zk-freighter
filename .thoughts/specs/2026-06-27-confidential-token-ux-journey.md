# Confidential Token — UX journey + screen map (Track B)

Companion to `2026-06-26-confidential-token-mode-spec.md` (the WHAT) and the on-chain evidence doc. This is the user-facing journey the `packages/ui` confidential screens implement. Grounded in the protocol design doc (`reference/.../confidential/docs/DESIGN.md`) and the live testnet register flow.

## Mental model (the one thing to get right)
A confidential token is an **existing public Stellar asset wrapped** so amounts/balances are hidden; addresses stay public. **Confidentiality, not anonymity.** A designated **auditor can decrypt amounts** (compliance). Two layers always: the public underlying asset + the confidential wrapper contract.

## Roles
- **Issuer/admin** — deploys the wrapper for an asset, wires verifier + auditor. Once per asset. (Us for the demo; optionally a "create" power-user feature.)
- **Holder** — registers, deposits, sends, receives, withdraws. The main user.
- **Auditor** — can decrypt a holder's amounts; **cannot spend**. Passive / a compliance view.
- **Spender** (optional) — time-limited delegate (AMM/custodial). Advanced.

## Screen-by-screen journey (the UI map)
Legend: **[ZK]** = on-device proof (proving ring); **[PUBLIC]** = public boundary, amount visible (boundary callout).

1. **Pick token** — enter Confidential mode, choose a confidential token; show registered/not. (No proof.)
2. **Register — one-time** **[ZK]** — "Set up your confidential account." Derives keys from the seed, proves, writes account on-chain. Gates everything else. *Proven working on testnet.*
3. **Deposit** **[PUBLIC]** — amount entry + boundary callout (like Shield). Public → confidential. (No ZK — amount is public by design.)
4. **Balance** — **two balances**: **Spendable** + **Receiving (pending)**, decrypted **locally only**. The one genuinely new concept.
5. **Merge** — fold Receiving → Spendable. Lightweight, needs the owner's tap (no proof, non-frontrunnable). UI: "X received — tap to make spendable."
6. **Send** **[ZK]** — recipient address (public) + hidden amount; proving ring; "amount confidential / address public." Recipient + auditor auto-recover the amount via ECDH (recipient does nothing to "decrypt" — it just lands in their Receiving).
7. **Receive** — share your public address; "amounts you receive are private."
8. **Withdraw** **[PUBLIC]** — confidential → public; boundary callout. **[ZK]** proof + public amount.
9. **Recovery** — balance openings are local wallet state, rebuilt from on-chain events. UI on a new device: "rebuilding your confidential balance…".

## UX rules that bite if ignored
- **Register is a hard gate** — disable all actions until registered; show a clear setup CTA.
- **Spendable vs Receiving + Merge** — model it as "X arrived → tap to use." This is the only new mental model vs a normal wallet.
- **Auditor visibility is a feature** — state plainly ("a compliance auditor can view your amounts"). Honest + it's the adoptable story.
- **Public boundaries** — deposit + withdraw amounts are visible; reuse the Shield/Unshield boundary-callout pattern.
- **No fakes** — only the holder sees their own decrypted amounts; never fabricate balances.

## Reuse from `packages/ui`
Proving ring + staged rows (`ProofRun`/`proofFlow`) for register/send/withdraw; amount entry + boundary `Callout` for deposit/withdraw; review card; status pills (PENDING/SPENDABLE); receive code/QR for the address. A new bit: the **Spendable/Receiving split + Merge** affordance.

## Optional "cool" features (ranked rough wow-vs-effort)
1. **Make any asset confidential** — a Create flow (pick a Stellar asset → deploy its wrapper). Wallet as a confidentiality factory. Strong demo.
2. **Selective disclosure / proof-of-funds** — prove balance ≥ X without revealing it (reuse the pool's disclosure primitive).
3. **Delegated spenders** — time-limited allowance (AMM/bot/custodian); protocol-native.
4. **Auditor dashboard** — compliance decrypt/audit view; doubles as the "regulator-friendly privacy" demo.
5. **Two modes side-by-side** — Shielded pool (hides *who*) + Confidential token (hides *how much*), wallet helps pick per payment.

## Storage facts (for accurate copy/limits)
Balances = Pedersen commitments (64-byte points); ~288 bytes/account on-chain. Deposit/withdraw are `i128` (SEP-41), validated ≥ 0. 6 circuits (Register/Withdraw/Transfer/SpenderTransfer/SetSpender/RevokeSpender); Deposit + Merge need no proof.

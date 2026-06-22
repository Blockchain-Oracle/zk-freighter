# Trustline + SAC mechanics + smooth withdraw UX (the hot one)

Date: 2026-06-21. All claims cite a primary Stellar/Soroban doc or a repo file:line. No punts.

TL;DR for the founder:
- The **deployed testnet pool uses native XLM, not USDC** (`deployments/testnet/deployments.json:1`, `asset:{"kind":"native"}`). For native XLM there is **NO trustline at all** — withdrawing XLM to a brand-new G-address even auto-creates the account (CAP-73). So on the current deployment, the "trustline problem" does not exist.
- The trustline question only bites if/when you deploy a **USDC pool** (`classic:USDC:issuer` or `contract:<SAC>` — both supported by `deployments/scripts/deploy.sh:204-232`).
- For a USDC pool: the pool's `token_client.transfer(this, recipient, amount)` (`contracts/pool/src/pool.rs:636`) **FAILS** if the recipient G-address has no USDC trustline — UNLESS the contract is changed to first call the SAC `trust` function (new in Protocol 26 / Yardstick, LIVE on mainnet since 2026-05-06).
- Even the new `trust` requires the **recipient's own auth + the recipient pays the 0.5 XLM reserve** (CAP-73) — so it is NOT a magic "create someone else's trustline for free." The smoothest UX is therefore: the user's **own** wallet ensures its USDC trustline at onboarding (self-auth, self-reserve), so any later withdraw lands cleanly.

---

## Resolved

### Q1 — transfer to a G-address with NO USDC trustline: fail or auto-create? (Protocol 26 mainnet)

**Status: CONFIRMED**

**Answer:** It **FAILS** by default. A plain `token_client.transfer(this, recipient, amount)` on a *classic issued asset* SAC (e.g. USDC) reverts if the recipient G-address has no (authorized) trustline. Stellar SAC docs: "If the trustline or account is missing, any function that tries to interact with that balance will fail." Protocol 26 did NOT make `transfer` auto-create a classic trustline — it added an *opt-in* path: the **contract must first call the SAC's `trust` function** to create the trustline before transferring.

The one exception is **native XLM**: CAP-73 also updates the XLM SAC so a `transfer` of **≥ 1 XLM (the min account balance) to a non-existent G-address auto-creates the AccountEntry**. XLM has no concept of a trustline, so an XLM withdraw never hits this failure.

**Evidence:**
- https://developers.stellar.org/docs/tokens/stellar-asset-contract — "If the trustline or account is missing, any function that tries to interact with that balance will fail … as of Yardstick, Protocol 26, a contract can create the missing trustline itself by first calling the SAC's trust function."
- CAP-73 (XLM auto-create): https://github.com/stellar/stellar-protocol/blob/master/core/cap-0073.md — "When an XLM transfer is performed to a G-address that does not exist yet … Soroban host will attempt to create a new AccountEntry … if the transfer amount is at least the minimum account balance (1 XLM as of this CAP)."
- Pool transfer call site: `contracts/pool/src/pool.rs:636` — `token_client.transfer(&this, &ext_data.recipient, &amount);`

### Q2 — Is there a SAC function to establish the recipient trustline as part of the flow? Can a contract create a trustline for a G-address?

**Status: CONFIRMED**

**Answer:** Yes — the SAC `trust` function, added in **Protocol 26 (Yardstick, CAP-73)**, which went **live on mainnet 2026-05-06** (today is 2026-06-21, so it is available now). Signature: `fn trust(env: Env, address: Address);`. It mirrors `ChangeTrustOp` semantics but is driven from Soroban — a contract (payout/airdrop/bridge) can call `trust(recipient)` before `mint`/`transfer`.

**Two hard constraints** that make it NOT a silent "create anyone's trustline":
1. **Recipient must authorize it.** CAP-73: "If the trustline is actually created, this will require authorization from `address` (i.e. `address.require_auth` will be called)." So the recipient must sign the same transaction.
2. **Recipient pays the reserve, no sponsorship.** CAP-73: "Sponsorship is not compatible with Soroban and thus base reserve may only belong to the trustline owner … the address must have sufficient XLM balance in order to be able to create a new trustline."

Net: `trust` is great for "ensure MY OWN trustline before I receive" (single signer = the user) but cannot conjure a trustline for an arbitrary third party without that party co-signing and funding the reserve.

**Evidence:**
- Signature + auth + reserve: https://github.com/stellar/stellar-protocol/blob/master/core/cap-0073.md
- "the SAC's `trust` function allows a contract to create an asset's trustline for a `G...` address as part of a contract invocation … `fn trust(env: Env, addr: Address);`": https://developers.stellar.org/docs/tokens/stellar-asset-contract
- Mainnet live date 2026-05-06: https://stellar.org/blog/foundation-news/yardstick-stellar-protocol-26 (announced live; "Yardstick (Protocol 26) is now live on Mainnet" — https://x.com/StellarOrg/status/2052072210290889131)
- CAP-73 discussion (rename from `allow_trust`, scope): https://github.com/orgs/stellar/discussions/1668

### Q3 — Does the POOL CONTRACT (C-address) need a classic trustline to HOLD USDC, or a SAC balance in storage?

**Status: CONFIRMED**

**Answer:** **No trustline.** A contract (C-address) holds a **SAC balance in contract storage**, as a 128-bit signed integer — never a classic trustline. So the pool itself can custody USDC with zero trustline setup. The trustline question is purely about the *withdraw recipient* (a G-address), not the pool.

**Evidence:**
- https://developers.stellar.org/docs/tokens/stellar-asset-contract — "The balance and authorization state will be stored in contract storage, as opposed to a trustline" (for `Address::Contract`); "Balances are stored in a 128-bit signed integer."
- The pool is invoked as `this = env.current_contract_address()` and receives via `transfer(&sender, &this, …)`: `contracts/pool/src/pool.rs:553-555`.

### Q4 — Stellar base reserve numbers (account min balance + per-trustline reserve)

**Status: CONFIRMED**

**Answer:**
- Base reserve = **0.5 XLM**.
- Minimum account balance = **2 base reserves = 1 XLM** (a bare new account).
- Each additional subentry (a trustline is one subentry) = **+0.5 XLM**.
- So an account that holds ONE asset trustline must keep ≥ **1.5 XLM** (1 XLM base + 0.5 XLM trustline) plus a tiny fee buffer.

**Evidence:**
- https://developers.stellar.org/docs/learn/fundamentals/lumens — "One base reserve is currently 0.5 XLM." / "An account must always maintain a minimum balance of two base reserves (currently 1 XLM)." / "Every subentry after that requires an additional base reserve (currently 0.5 XLM)."

### Q5 — What token does the deployed testnet pool actually use?

**Status: CONFIRMED**

**Answer:** **Native XLM.** The single deployed testnet pool is `poolContractId: CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`, `tokenContractId: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` (= the native XLM SAC id on testnet), with `"asset":{"kind":"native"}`. The deploy tooling supports three kinds — `native:<id>`, `contract:<id>` (arbitrary SAC, e.g. a USDC SAC), and `classic:USDC:<issuer>:<id>` — and defaults to one native XLM pool when no token is specified. **No USDC pool is currently deployed.**

**Evidence:**
- `deployments/testnet/deployments.json:1` — `"pools":[{"poolContractId":"CDQRXOD6...","tokenContractId":"CDLZFC3S...","asset":{"kind":"native"}}]`
- Supported asset kinds + default: `deployments/scripts/deploy.sh:204-232` (`contract` / `native` / `classic`) and `deploy.sh:54` ("If neither --token nor --pool is provided, one native XLM pool is deployed by default.").
- Native id resolution: `deploy.sh:120-122` — `stellar contract id asset --asset native`.

---

## UX implication — the smoothest one-click withdraw (user never touches a trustline)

**On the current native-XLM deployment:** there is nothing to do. XLM has no trustline; a withdraw to any G-address just works, and even auto-creates the destination account if you send ≥ 1 XLM (CAP-73). Ship withdraw as a single button. The only edge to guard: a withdraw of < 1 XLM to a *brand-new* unfunded G-address will fail to create the account — so for "send to a fresh address" UX, enforce a ≥ 1 XLM minimum or pre-fund.

**When you add a USDC pool (the real concern), make the trustline invisible like this — in priority order:**

1. **Self-ensure at onboarding (best, fully automatic).** When the user's own smart/passkey wallet is created or first opened, have it submit a `changeTrust`/SAC `trust` for USDC in the same onboarding transaction. Recipient = the user = the signer, so the `require_auth` is already satisfied and the user pays their own 0.5 XLM reserve (which they must hold anyway). Then every future pool withdraw to their own address lands with zero extra prompts. Freighter already models trustline ops in-wallet (`reference/freighter/.../signTransaction/Operations`), so the pattern is proven.

2. **Bundle `trust` into the withdraw PTB when recipient == the user's wallet.** If the user is withdrawing to themselves and the trustline is missing, atomically prepend an SAC `trust(recipient)` to the withdraw transaction. Since the user signs the withdraw anyway, the extra `require_auth` is free UX-wise; just ensure the wallet holds ≥ 0.5 XLM for the reserve. (Requires a contract/PTB change — `pool.rs` does not call `trust` today; see Phase-0.)

3. **Detect-and-guide for third-party recipients.** You CANNOT silently create someone else's trustline (CAP-73: recipient must auth + fund the reserve). For "withdraw to an external address," pre-flight check the recipient's trustline (a `getLedgerEntry`/Horizon account lookup) and, if missing, block with a clear message ("This address can't receive USDC yet — it needs a USDC trustline") rather than letting the on-chain `transfer` revert opaquely.

4. **Pre-fund the XLM reserve for gasless feel.** If you want the user to never even think about the 0.5 XLM, sponsor/airdrop the reserve XLM to their wallet at onboarding (classic sponsored reserves work for the trustline subentry via a normal `changeTrust` + sponsorship transaction — note: Soroban `trust` itself cannot be sponsored per CAP-73, so do the reserve top-up the classic way).

**Recommendation:** keep native XLM for the demo (zero trustline UX). If a USDC pool is required, do (1) + (2): trustline is ensured at onboarding and re-asserted in the withdraw bundle, so the user clicks once and never sees the word "trustline."

---

## Anything that needs a Phase-0 run (and the exact test)

1. **COMPLETED 2026-06-22 — Confirm the testnet `tokenContractId` really is the canonical native XLM SAC id.**
   `stellar contract id asset --asset native --network testnet` returned `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, matching the `tokenContractId` in `deployments/testnet/deployments.json`. A read-only `stellar contract info interface` call also resolved it as a token contract. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.

2. **NEEDS_PHASE0_RUN — Prove the USDC failure + the `trust` fix end-to-end on testnet (only if a USDC pool is on the roadmap).**
   Exact test WE run:
   (a) Create a fresh G-address with NO USDC trustline.
   (b) Deploy/point a pool at the testnet USDC SAC (`contract:<usdc_sac_id>`), fund it, and call the withdraw path with that address as recipient — assert it reverts with a balance/trustline error (confirms Q1).
   (c) Have that same G-address sign a tx that calls SAC `trust(self)` (it must hold ≥ 1.5 XLM), then retry the withdraw — assert success. This validates the onboarding self-ensure UX (recipient auth + recipient-paid reserve, per CAP-73).

3. **NEEDS_PHASE0_RUN — Confirm the contract can call SAC `trust` from inside the pool (interface availability in the pinned `soroban-sdk`).**
   `contracts/pool/src/pool.rs` uses `soroban_sdk::token::TokenClient`, which is the SEP-41 subset and does NOT expose `trust`. To bundle `trust` into withdraw (UX option 2) we'd need the full Stellar Asset client (`token::StellarAssetClient`) or a raw cross-contract call.
   Exact test WE run: in a scratch contract, `StellarAssetClient::new(&env, &usdc_sac).trust(&recipient)` against testnet and confirm it compiles against the repo's pinned `soroban-sdk` version (check `contracts/pool/Cargo.toml`) and executes. If the pinned SDK predates Protocol 26, note the SDK bump required.

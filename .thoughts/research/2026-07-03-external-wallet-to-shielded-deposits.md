# External Wallet / Exchange → Shielded Balance: Research (2026-07-03)

Goal: a sender on Bybit/Freighter/any plain Stellar wallet sends an ordinary payment and the funds end up in a ZK Freighter user's **shielded** balance, with minimal trust and friction. Constraint: pool deposits require a Soroban contract call with a Groth16 proof; plain payments cannot create notes; senders cannot use `zkf1…` codes.

Honesty baseline: **every shield/deposit is a public boundary.** Any design below produces a public on-chain link from the sender's payment to a pool deposit of the same (or nearly same) amount at a nearby time. We never claim "anonymous" or "untraceable"; privacy applies to what happens *inside* the pool afterwards.

## Track A — How other privacy systems solve this

### 1. zkBob direct deposits (Polygon/Optimism)
Depositor calls a **direct-deposit queue contract** (`approve` + `directDeposit(fallbackReceiver, amount, zkAddress)`, or `transferAndCall` for BOB, or `directNativeDeposit` for ETH). Tokens sit in the queue; the **relayer** later includes them in the shielded state tree (may take hours). Relayer cannot steal — worst case it ignores the deposit and anyone can call `refundDirectDeposit()` to the fallback address after 1 day. Flat fee (~0.1 USDC). Depositor **must know the recipient's zkAddress**, and must make a contract call — so exchanges cannot use it, but wallets/dApps/contracts can. Trust model: trustless custody, liveness-trusted relayer, refund escape hatch. Source: https://docs.zkbob.com/zkbob-app/zkbob-direct-deposits

### 2. Zcash transparent receive + auto-shielding (Zashi/Ywallet)
Recipient shares a plain **t-address** (exchanges support it); wallet **auto-shields on receipt** — received transparent ZEC is swept into the shielded pool by the recipient's own wallet next time it's online. Fully self-custodial; conversion is done by the recipient, not the sender or a service. Caveats: funds sit transparent until the wallet opens; t-addr→shield sweep is publicly linkable (amount/timing). Zashi 2.0.3 even removed transparent receivers from rotating UAs for privacy, keeping t-addresses specifically as the exchange on-ramp. Sources: https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/ , https://z.cash/learn/what-are-zcash-unified-addresses/
**This is the closest match to our problem** and the pattern with the least trust.

### 3. Umbra / stealth addresses (ERC-5564)
The **sender** derives a one-time address from the recipient's meta-address and publishes an ephemeral key announcement. Requires sender-side crypto — a stock exchange withdrawal flow cannot derive stealth addresses or emit announcements, so it only works wallet-to-wallet with stealth-aware senders. Also not a shielded pool: funds land at a plain EOA whose incoming history stays traceable. Sources: https://eips.ethereum.org/EIPS/eip-5564 , https://www.quicknode.com/guides/ethereum-development/wallets/how-to-use-stealth-addresses-on-ethereum-eip-5564

### 4. Pattern taxonomy footnotes: Monero, Aztec
Monero **subaddresses/integrated addresses** work from exchanges because *every* Monero payment is natively stealth — the sender's wallet software does the derivation as part of the protocol; there is no "plain" sender class. Aztec **portals** use an L1 Inbox contract: deposit into a rollup contract mints shielded notes on L2, with the new owner hidden on L2 — but the depositor must call the portal contract (not a plain transfer). Source: https://docs.aztec.network/developers/docs/concepts/communication/portals

### 5. Privacy Pools / 0xbow
Deposits are first-person: user deposits from their own wallet, then the ASP vets and includes the deposit in the association set. Docs describe **no third-party "deposit to someone else's shielded account" flow**; the deposit commitment is created by/for the depositor's own keys. Sources: https://0xbow.io/blog/getting-started-with-privacy-pools , https://github.com/0xbow-io/privacy-pools-core/

### Taxonomy table

| Mechanism | Who converts payment→note | Trust model | Works from exchange? | Works with recipient offline? |
|---|---|---|---|---|
| zkBob direct deposit | Relayer (queue contract) | Trustless custody, liveness-trusted relayer, refund after 1d | No (needs contract call + zkAddress) | Yes |
| Zcash t-addr auto-shield | **Recipient's own wallet** (sweep) | Fully self-custodial | **Yes** | No (shields on next open) |
| Umbra / ERC-5564 | Sender (derives stealth addr) | Self-custodial, no pool | No (sender-side derivation) | Yes |
| Monero subaddress | Sender's wallet (protocol-native) | Self-custodial | Yes (protocol forces it) | Yes |
| Aztec portal | Rollup contract + sequencer | Rollup trust assumptions | No (contract call) | Yes |
| Privacy Pools / 0xbow | Depositor for self only | Self-custodial + ASP vetting | N/A (no third-party deposit) | N/A |

## Track B — Stellar rails for an "inbox address" UX

1. **Muxed accounts (M-addresses, SEP-23).** Client-side abstraction over a real G account + 64-bit ID; removes memo errors. Exchange support is **partial**: Kraken supports M-addresses for deposits *and withdrawals* (since 2022-12-13: https://support.kraken.com/articles/360000184543-memo-for-stellar-lumens-xlm-deposits ), but Bybit's withdrawal flow is address+memo with no muxed support documented ( https://www.bybit.com/en/help-center/article/How-to-add-your-withdrawal-wallet-address ), and Stellar's own FAQ says adoption is incomplete ( https://stellar.org/blog/developers/muxed-accounts-faq ). Verdict: M-addresses can be an *optional* address format, never the only one.
2. **Federation (SEP-2).** `name*zkfreighter.app` → `{account_id, memo}` via a tiny HTTPS endpoint ( https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md ). Resolved by several Stellar wallets (Lobstr, Scopuly, StellarTerm lineage) on send — but **exchanges do not resolve federation addresses** in withdrawal forms. Useful as a human-readable alias for wallet senders only.
3. **Classic payment → C-address: NOT possible.** Stellar's payment-family operations cannot have contract addresses as source or destination; moving assets to a contract requires `InvokeHostFunctionOp` calling the SAC `transfer` ( https://developers.stellar.org/docs/build/guides/transactions/send-and-receive-c-accounts ). So a fully non-custodial **on-chain inbox contract is unreachable by exchange withdrawals** — this kills the "zkBob queue contract" shape for the exchange case on Stellar.
4. **Per-user derived inbox G-account.** Cost: account creation = 2 base reserves = **1 XLM minimum balance** (base reserve 0.5 XLM: https://developers.stellar.org/docs/learn/fundamentals/lumens ). CAP-33 **sponsored reserves** let our funding-api signer pay that reserve while the user's key controls the account ( https://developers.stellar.org/docs/build/guides/transactions/sponsored-reserves ). Our wallet already derives the primary Stellar key at `m/44'/148'/0'` (`packages/core/src/identity.ts`, `STELLAR_HD_PATH_SEGMENTS`), so an inbox key at account index 1 is derivable from the same seed → **the inbox is user-controlled, non-custodial by construction**. Exchange pays a normal G-address (no memo needed — it's dedicated); the wallet sweeps it into the pool client-side using the existing shield flow (`packages/core/src/shield-orchestration.ts`). A server watcher can only *notify* (it has no keys), so shielding happens on next wallet open — exactly the Zashi model.

## Viable Stellar designs, ranked

### Design 1 (recommended): Derived inbox account + client-side auto-shield (Zcash/Zashi pattern)
**Flow:** Wallet derives inbox keypair at `m/44'/148'/1'` from the user's own seed → funding-api creates/sponsors it (sponsored reserves; ~1 XLM, reclaimable) → Receive screen shows "External deposit address" (plain G, works in every exchange withdrawal form; no memo) → on wallet open (or push from an optional bootnode watcher), wallet sees the inbox balance and runs the existing shield-deposit flow with the inbox account as source, landing notes on the user's own `zkf1` keys.
**Custody:** none — user's seed controls the inbox at all times; funding-api only sponsors reserves and can never move funds.
**Public on-chain:** sender→inbox payment; inbox→pool shield deposit (amount, timing). Inbox is a fresh account not linkable to the user's primary G-account by address — but the sender knows it, and inbox→pool is a visible shield boundary. Say so in UX copy.
**Failure modes:** funds sit public until the user opens the wallet (mitigate: watcher + push/email nudge); dust below fees/pool minimum strands; XLM vs USDC — USDC needs a trustline on the inbox (sponsor it too); per-deposit pool limits require chunked sweeps.
**Build size:** small-medium. Identity: derive index-1 keypair (identity.ts already has HD machinery). funding-api: one endpoint using existing funded signer (`apps/funding-api/src/stellar.ts`) for create-account + sponsorship + USDC trustline. Core: parameterize shield-orchestration's source account. Web/extension: Receive screen section + on-open sweep check. Roughly a few focused days.

### Design 2 (optional accelerator): Service-relayed direct deposit (zkBob pattern, adapted)
**Flow:** `name*zkfreighter.app` federation + a service G-account; sender (wallet or exchange, via memo) pays the service; a relayer (extension of funding-api/bootnode) matches memo→registered `zkf1` code, runs the prover server-side, and deposits into the pool creating a note for the recipient's note public key. Recipient can be offline; sender needs zero new tech.
**Custody:** **custodial-in-transit** — the service holds funds between receipt and shielding. Unlike zkBob there is no trustless queue contract (exchanges can't call contracts, see B3), so this is real custody + compliance surface. Mitigate with small limits and an auto-refund policy, but be honest: this is a trusted service.
**Open verification:** confirm the Nethermind deposit circuit lets a depositor create a commitment for a *foreign* note public key (taken from the zkf1 code) without the note secret. Likely yes (commitment = hash over pubkey), must be tested against `packages/core/src/prover.ts` / the circuit before promising this design.
**Failure modes:** wrong/missing memo (funds in service limbo — the classic exchange-deposit failure), relayer downtime, service key compromise, regulatory exposure (money transmission).
**Build size:** medium-large — memo registry, watcher, server-side Groth16 proving (prover currently runs in-browser; needs a Node harness), refund handling, ops hardening.

### Design 3 (addressing layer, not a mechanism): Muxed + federation front-ends
On top of Design 1: publish the inbox as an M-address for muxed-aware senders (Kraken) and as `name*zkfreighter.app` for federation-aware wallets. Near-zero build (SEP-2 endpoint is ~50 lines), but it converts nothing by itself and exchange support is inconsistent — never the primary path.

## Recommendation

Build **Design 1** as the product answer: it is the only shape that is simultaneously (a) usable from any exchange or wallet today (plain G-address, no memo), (b) genuinely non-custodial (inbox derived from the user's own seed; funding-api merely sponsors reserves), and (c) buildable now on top of existing identity + shield-orchestration + funding-api code. Add **Design 3** aliases cheaply. Treat **Design 2** as a later opt-in "instant receive" tier only after verifying foreign-pubkey deposits in the circuit and accepting the custody/compliance cost — do not ship it as the default.

Honest caveats to carry into UX copy: the external deposit address is public; the sweep into the pool is a public shield boundary with visible amount and timing; funds received while the wallet is closed remain public until the next open; senders who know your inbox address can watch it forever (offer inbox rotation later). None of this makes the payment "anonymous" — it makes the *subsequent* shielded activity private.

## Sources
- https://docs.zkbob.com/zkbob-app/zkbob-direct-deposits
- https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/
- https://z.cash/learn/what-are-zcash-unified-addresses/
- https://eips.ethereum.org/EIPS/eip-5564
- https://www.quicknode.com/guides/ethereum-development/wallets/how-to-use-stealth-addresses-on-ethereum-eip-5564
- https://docs.aztec.network/developers/docs/concepts/communication/portals
- https://0xbow.io/blog/getting-started-with-privacy-pools
- https://github.com/0xbow-io/privacy-pools-core/
- https://support.kraken.com/articles/360000184543-memo-for-stellar-lumens-xlm-deposits
- https://www.bybit.com/en/help-center/article/How-to-add-your-withdrawal-wallet-address
- https://stellar.org/blog/developers/muxed-accounts-faq
- https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md
- https://developers.stellar.org/docs/build/guides/transactions/send-and-receive-c-accounts
- https://developers.stellar.org/docs/learn/fundamentals/lumens
- https://developers.stellar.org/docs/build/guides/transactions/sponsored-reserves

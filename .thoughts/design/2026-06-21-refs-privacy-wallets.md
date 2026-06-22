# Privacy-Wallet UX References — Zashi (Zcash) + Railway/RAILGUN + Penumbra/Prax

Date: 2026-06-21
Author: wallet-UX reference researcher
Scope: PRIVACY-specific screens for a privacy-by-default Stellar zk-wallet (XLM + USDC, fixed assets).
Method: official docs/help-centers + ECC blog + live web search (name-check). Every claim below is link-cited.

We are building a shielded-by-default wallet with these privacy-relevant screens: home (shielded balance vs small public balance), receive (private address + public Stellar address), send (private), shield (public->private), unshield (private->public), activity (private vs public + pending-proof), and compliance/view-key export. The references below are the three production privacy wallets that have already solved these exact problems.

---

## Name-check verdict (all REAL, all active in 2026)

- **Zashi** — Zcash mobile wallet built by Electric Coin Company (ECC). Real, shipping; "Zashi 2.0" / "2.0.3" releases documented on ECC blog. Now also distributed as "Zodl" on the App Store. Official pages: https://z.cash/ecosystem/zashi-wallet/ , https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- **Railway Wallet (RAILGUN)** — Real, open-source DeFi privacy wallet on iOS/Android/Desktop powered by the RAILGUN protocol. User guide at https://help.railway.xyz/ , dev docs at https://docs.railgun.org/ , source at https://github.com/Railgun-Community/wallet , confirmed active 2026 (https://www.railway.xyz/).
- **Penumbra / Prax** — Real. Penumbra is a shielded interchain (Cosmos/IBC) network; Prax is its browser-extension wallet. Guide at https://guide.penumbra.zone/ , protocol spec at https://protocol.penumbra.zone/ , registry repo https://github.com/prax-wallet/registry .

These are the right three sources for shielded-by-default UX. Use them; do not invent privacy patterns.

---

## Per-screen reference patterns (the meat of the brief)

### 1. Home / portfolio — shielded balance vs spendable vs pending
The universal pattern is **two numbers, not one**: a total and a smaller "spendable" figure, because shielding/proving introduces a delay before funds are usable.

- Zcash UX checklist (canonical): *"Show two balances, one which includes unconfirmed funds, and another not including unconfirmed funds, i.e. 'Balance: 621.14321 ZEC (605.35620 ZEC spendable).'"* — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html
- Zashi 2.0 introduced a dedicated **"Spendable" component** and "smarter balance displays"; after a tx confirms, the balance becomes spendable in the shielded pool. — https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- RAILGUN/Railway makes the **Pending vs Spendable split explicit and named**: newly shielded tokens sit in a **Pending Balance** (1-hour Unshield-Only Standby Period + awaiting proof) and only move to **Spendable Balance** once a proof is complete. *"Tokens marked as Spendable have a valid Private POI and can be spent by your 0zk address with no limitations."* — https://help.railway.xyz/private-proofs-of-innocence
- Penumbra/Prax shows **balance per account**, grouped by asset, with private tx detail visible only to the owner. — https://guide.penumbra.zone/usage/web/balances

**For our home screen:** show shielded total + "available to send/spend" sub-figure; show the small public/available balance separately for the on-ramp. When funds are mid-shield or mid-prove, surface a "pending" sub-line rather than silently hiding them.

### 2. Receive — private address + public address, "same wallet" framing, QR rotation
- Zashi shows a **shielded-only Unified Address** on Receive, and **generates a new shielded address every time the Receive screen is opened** (rotation reduces linkability). Copy + QR are first-class. — https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/ and https://forum.zcashcommunity.com/t/zashi-2-0-3-changes-to-shielded-addresses/51299
- Critical "same wallet" framing we should copy almost verbatim: *"All transactions sent to your different rotating Shielded Addresses will remain part of one wallet balance under the same seed phrase."* — https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/
- The transparent/public address is **still available but displayed separately** on the same Receive screen ("If users need a transparent address (starts with the letter 't'), it is still available and displayed separately"). This is exactly our "private address up top, public Stellar deposit address below" layout. — https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/
- Penumbra/Prax generates a **fresh IBC deposit address every time** you toggle the deposit-address option — same rotation principle for the public deposit path. — https://www.penumbra.zone/blog/how-to-get-started-with-penumbras-bespoke-wallet
- The checklist insists on **labeling the privacy property of each address**: *"Indicate that shielded addresses are encrypted!"* vs *"Indicate that transparent addresses are not encrypted! A transaction involving a transparent address ... posts the details ... publicly on the blockchain."* — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html

**For our receive screen:** private address (with QR + copy) framed as "your private address — same wallet," plus the public Stellar address below clearly labeled as public/for-deposits. Label which one is encrypted/private and which is public.

### 3. Shield (public -> private / deposit)
- Railway shield flow (clean, linear): select token -> "Shield" -> recipient private address (paste or pick saved) -> enter amount, "Confirm amount" -> password -> **review summary with fee** -> "Shield" to submit -> view under the "Private" toggle. — https://help.railway.xyz/transactions/shield-unshield
- Framing of the direction is explicit: tokens move "from a public 0x address to a private 0zk address" where the private address "is completely private and never appears on the blockchain." — https://help.railway.xyz/transactions/shield-unshield
- Penumbra frames shield as importing assets onto the shielded network, with a clear "your assets have officially been shielded" completion toast. — https://guide.penumbra.zone/usage/web/ibc-transfers

**For our shield screen:** amount from public balance -> review (tiny Stellar fee) -> sign -> the funds land in the shielded balance, possibly in a pending state first.

### 4. Unshield (private -> public / withdraw) — the "this reveals info" moment
This is the screen that most needs the disclosure framing, and the Zcash checklist is the authority:

- *"Warn users when sending from zaddrs to taddrs (deshielding transactions). Explicitly tell users that they are about to reveal transaction information."* — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html
- Railway unshield flow: select token -> "Unshield" -> enter destination public (0x) address -> amount/confirm -> password -> review + fees -> **"Generate Proof" (proof valid ~3 minutes)** -> submit. — https://help.railway.xyz/transactions/shield-unshield-1
- NOTE: Railway's own copy does NOT add a strong "this is public" warning here (we should do better — combine Railway's flow mechanics with the Zcash checklist's explicit reveal warning). — https://help.railway.xyz/transactions/shield-unshield-1

**For our unshield screen:** destination Stellar (public) address -> amount -> a prominent "this withdrawal will be publicly visible on Stellar" notice -> review -> sign. This is where shielded-by-default earns trust by being honest about the leak.

### 5. Private Send
- Railway private send: tap "Send" on the private balance -> paste/select recipient private (0zk) address -> token + amount -> choose broadcaster/self-broadcast -> **"Generate Proof to proceed"** -> "Send" -> notification; *"keep [the app] open ... 30 seconds on desktop and 1-2 minutes on mobile"* so the recipient's funds become immediately spendable. Details land in the "Activity" tab. — https://help.railway.xyz/transactions/private-transfers
- The checklist's shielded-send framing: a fully shielded tx "only reveals a transaction legitimately and safely happened" (no amount/sender/recipient leak). — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html

**For our send screen:** recipient private address (paste/scan) -> amount -> asset (XLM/USDC) -> review -> sign -> **pending-proof state** -> success.

### 6. Pending-proof / proving-latency states (how the delay is absorbed)
The whole genre treats proving time as a first-class UI state, never a frozen screen.

- Railway: a named **Pending Balance**, an explicit **"Generate Proof"** button as its own step, proof validity windows (unshield proof "valid for about 3 minutes"), and a "keep the app open while the proof is created" instruction with concrete timings. — https://help.railway.xyz/private-proofs-of-innocence , https://help.railway.xyz/transactions/private-transfers
- Zashi **status widget / status banners**: *"Whether you're shielding funds, backing up ..., or syncing, Zashi clearly shows your current status and best course of action"*; *"tap any status banner to get more details."* Sync progress is shown so users aren't "staring at the screen wondering when the funds will become available." — https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- Checklist: *"Visibly mark newly sent transactions in a 'pending' state"* with a dedicated pending/unconfirmed section; *"Tell the user the expected remaining time to expiry"*; if a tx expires, *"visibly mark the transaction expired and notify the user"* (don't delete it). — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html

**For our pending-proof state:** a progress/status surface ("Generating proof…"), a pending row in activity, honest timing, and a non-deleting failure/expiry path. Maps directly to our ASP-not-registered / sync-required / proof-failure states.

### 7. View-key / selective disclosure / compliance export
Two distinct models — copy BOTH ideas:

- **Railway view-only key** (the simple watch-only model): Settings -> Wallets -> wallet -> "Show View-Only Private Key" -> clickable text to copy. Warned bluntly: *"Viewing Keys grant full transaction viewing access and will permanently display all transactions (including future transactions) to a Viewing Key holder"* and *"Viewing Keys cannot be revoked once shared."* Import: Add Wallet -> "Add view-only wallet" (sync "up to 2 minutes"). — https://help.railway.xyz/setup/view-only-wallets
- **Penumbra transaction perspective** (the BETTER selective-disclosure model for compliance): instead of handing over a full viewing key (all past+future), Penumbra can disclose a single **TransactionPerspective / TransactionView** — *"we have the ability to selectively disclose information about specific transactions, rather than disclosing an account's long-term FullViewingKeys, which would give access to all past and future activity."* — https://protocol.penumbra.zone/main/concepts/addresses_keys.html and https://protocol.penumbra.zone/main/addresses_keys/viewing_keys.html
- Penumbra key hierarchy worth showing to designer (incoming vs outgoing vs full viewing key) so our "view-key export" can be scoped, not all-or-nothing. — https://protocol.penumbra.zone/main/addresses_keys/viewing_keys.html
- ECC viewing-keys explainer (use-cases + framing): full viewing key reveals "transaction value, memo field, and target address"; use cases are **auditor / accountant / exchange due-diligence**; it is "selective disclosure ... without compromising their private spend key." — https://electriccoin.co/blog/explaining-viewing-keys-2/
- Checklist on safe sharing: *"viewing keys should not be copy and pasted into a text or email"* — encourage a secure channel. — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html

**For our compliance screen:** offer (a) a scoped **viewing-key export** with strong "cannot be revoked / reveals all" warnings, AND (b) a **per-transaction disclosure proof** (the Penumbra "transaction perspective" idea) for one-off audit/compliance without surrendering lifetime visibility.

### 8. Activity / history — private vs public, what a private tx shows
- Checklist: *"Indicate that shielded addresses are encrypted!"* — a shielded tx in history "only reveals a transaction legitimately and safely happened" (so a private send row shows essentially: it happened, plus your own decrypted memo/amount, but no public counterparty leak); a transparent tx row should warn it "posts the details ... publicly." — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html
- Memo handling: *"Show the memo field in the UI. Even if the memo field is empty, show that the field is empty rather than removing it."* — https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html
- Railway: all private sends/shields/unshields appear in a single **"Activity" tab** with details; pending items show as "Incomplete" until their POI completes. — https://help.railway.xyz/transactions/private-transfers , https://help.railway.xyz/private-proofs-of-innocence
- Penumbra: you see your own decrypted private detail; public is what others see — a toggle between private and public views. — https://guide.penumbra.zone/usage/web/balances

**For our activity screen:** one unified list of shield / send / unshield rows with status; private rows show your decrypted amount/asset/memo but are visually marked "private" (counterparty hidden); unshield/public-touching rows visually marked as publicly visible; pending-proof rows clearly distinct.

### 9. Making shielded-by-default feel normal (the meta-pattern)
- Zashi's core stance: **"shield before spend"** — it does NOT let users spend transparent funds because it would jeopardize privacy; transparent receipts get a one-tap "shield now" shortcut via the status widget. Default routing is to the shielded pool. — https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- Framing line worth echoing: ECC treats **"usability is a security feature"** and informed action as essential to privacy. — https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- Penumbra normalizes it by making the **private view the default** and the public view the thing you opt into seeing. — https://guide.penumbra.zone/usage/web/balances

**For us:** private balance is the hero; the public/available balance is the small on-ramp helper; every public-touching action (unshield, public receive) is the labeled exception, not the norm.

---

## DO NOT COPY (out of scope for our v1 / wrong for our product)

- **RAILGUN's 0.25% protocol fee + Broadcaster fee market / "self-broadcast vs public broadcaster" choice** — Stellar fees are tiny and simple; do not build a fee-market or broadcaster-selection UI. (https://help.railway.xyz/transactions/shield-unshield)
- **DeFi inside the wallet (Uniswap/Aave/Beefy swaps, yield, LP)** — Railway's whole reason for existing; we are explicitly NOT building swaps/DEX/staking/earn. (https://www.railway.xyz/)
- **Multi-chain / interchain (IBC) network management + per-chain deposit chooser** — Penumbra's IBC import flow assumes many source chains; we toggle only testnet/mainnet of ONE chain. (https://guide.penumbra.zone/usage/web/ibc-transfers)
- **Arbitrary token import / wrapped-token auto-conversion (e.g. MATIC->WMATIC)** — our assets are fixed (XLM + USDC); no token-management or wrapping UI. (https://help.railway.xyz/transactions/shield-unshield)
- **Browser-extension dApp-connect surface** — Prax is an extension that connects to dApps; that surface is a later stretch, not v1. (https://guide.penumbra.zone/usage/web/prax)
- **Memo-field as a prominent send feature** — Zcash leans on memos; nice-to-have, but don't let it become a headline interaction. (https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html)
- **Unstoppable Domains / human-readable address aliasing** — Railway integrates it; out of scope. (https://help.railway.xyz/integrated-dapps/unstoppable-domains)
- **Watch-only as a full wallet TYPE in onboarding** — Railway/Penumbra both ship view-only wallets as a setup path. For us, the viewing key is an EXPORT/compliance artifact, not a wallet-creation onboarding branch. (https://help.railway.xyz/setup/view-only-wallets)

---

## Notes / synthesis for the designer

1. **Two-number balance is non-negotiable** (total + spendable/available). The Zcash checklist phrasing and Railway's Pending-vs-Spendable naming both confirm it. Hide nothing; explain the gap.
2. **Steal the "same wallet" sentence from Zashi 2.0.3** almost verbatim for the receive screen — it solves the #1 confusion (why does my address keep changing / are these the same account).
3. **Address rotation** (new private/deposit address each visit) is a real, shipped pattern in both Zashi and Prax. Worth adopting; if not, at least don't present a single static address as a privacy win.
4. **Unshield is the honesty screen.** Railway's flow is good mechanically but is too quiet about the privacy leak; pair it with the Zcash checklist's explicit "you are about to reveal transaction information" warning. This is our differentiator on trust.
5. **Proving latency = a status surface, not a spinner.** Railway's named "Generate Proof" step + "keep app open (timings)" and Zashi's tappable status banners are the two reference implementations. Our pending-proof / sync-required / ASP-not-registered / proof-failure states should all live in one consistent status component.
6. **Two tiers of disclosure for compliance.** Railway's permanent, all-or-nothing view-key (with blunt "cannot be revoked" warning) is the floor; Penumbra's per-transaction "transaction perspective" is the ceiling and the better story for a compliance/view-key screen — selective, scoped, one-off. Offer both: scoped viewing-key export AND a single-transaction disclosure proof.
7. **Name-check: all three references are real and current (2026).** Zashi/Zodl (ECC), Railway (RAILGUN, open-source, github.com/Railgun-Community/wallet), Penumbra/Prax (guide.penumbra.zone). Safe to cite to stakeholders.
8. **Local repo note:** the cloned `reference/stellar-private-payments` is a privacy *protocol/circuits* repo (Rust + a thin `app/` with disclosure.html), not a polished wallet UI — useful for the disclosure-proof concept but not a UX reference; rely on Zashi/Railway/Penumbra for screen design.

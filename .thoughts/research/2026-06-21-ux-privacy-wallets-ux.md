# Privacy wallet UX — the dual-address model + receive/scan/recover

Research date: 2026-06-21. Purpose: document the CURRENT REALITY of how shipped privacy/shielded wallets present the dual-address model and the receive / scan / recover flows to users, so a new ZK wallet can ground itself in patterns users already know. This documents how Railway (RAILGUN), Zcash Zashi, and Penumbra/Prax actually behave — it does NOT design our wallet.

The three wallets sit on a spectrum:
- **Railway / RAILGUN** — privacy as a *layer on top of a public chain* (Ethereum + L2s). User explicitly toggles between a Public (`0x`) world and a Private (`0zk`) world. Most "two addresses, two modes" of the three.
- **Zcash Zashi** — privacy as the *default*, with a legacy transparent escape hatch. One Unified Address (`u1…`) that hides the receiver-type choice; transparent (`t…`) only exists for legacy compatibility.
- **Penumbra / Prax** — privacy is *the only mode*; there is no public balance at all. The "two address" problem is reframed as "one account, many disposable deposit addresses."

---

## The flow (step by step)

### Railway Wallet (RAILGUN, browser + mobile)

**Onboard / find wallet**
1. Install Railway (mobile app or web). "Create a New Wallet" generates a BIP-39 12/24-word recovery phrase. A phrase from MetaMask (or any BIP-39 wallet) can be imported directly — RAILGUN derives both the public `0x` and the private `0zk` identity from the *same* seed.
2. One seed → one `0x` public address **and** one `0zk` private address (both derived from the same private key).

**Get funds private (shield)**
1. Top of the wallet has a **Public / Private** toggle (button, upper right). Start in **Public** mode.
2. Select a token (recommend stablecoins / base token first, to cover broadcaster fees later).
3. Tap **Shield**.
4. Choose recipient: usually **"My Wallet"** (your own `0zk`) or paste another `0zk` address into the **Recipient** box (or **Select** a saved address).
5. Enter amount → **Confirm amount**. (Shielding a base token like MATIC auto-wraps to WMATIC.)
6. Review summary: **0.25% shielding fee** + network gas. Adjust via **Network Fee** bar. Enter password → **Shield**.
7. Switch to **Private** mode (button, top right) to see the shielded balance.

**Pending vs spendable**
- Newly shielded tokens enter a **1-hour Unshield-Only Standby Period** → they show as **Pending Balance**. During this window the only allowed action is unshielding back to the original address (Private Proof of Innocence has not completed).
- After the hour, POI completes and the tokens move to **Spendable Balance**.

**Share a private receive address**
- Give the sender your `0zk` address. They shield *to* your `0zk` (or do a private transfer to it). The `0zk` is long (encodes both viewing + spending public keys; Bech32m, `0zk1q…` prefix).

**Get funds public again (unshield)**
- In Private mode, **Unshield** to a public `0x` address (0.25% fee again). This step is *public* — the unshield is visible on-chain.

**Recover / multi-device / audit**
- Recovery = re-enter the 12/24-word seed. Both `0x` and `0zk` regenerate. (HD: supports non-zero derivation indices — a recurring "I can't see my balance" cause is being on the wrong derivation path.)
- **View-Only Wallets**: export a **Shareable Viewing Key** (Settings → Wallets → "Show View-Only Private Key" → tap to copy). Import on another device via Settings → Wallets → Add Wallet → "Add view-only wallet". Import takes ~20s, sync up to ~2 min, results in **Activity**. The viewing key shows *all* past and future transactions and **cannot be revoked once shared**.

### Zcash Zashi (mobile, built by Electric Coin Co.)

**Onboard**
1. Install Zashi. Create wallet → 24-word seed backup. On *restore*, Zashi asks for / estimates a **wallet birthday height** (block height of first tx) to bound how far back it must scan — a deliberate fix for slow restores.
2. Defaults to the strongest privacy (Orchard pool, shielded) with no configuration.

**Receive (share an address)**
- **Receive** screen. As of Zashi 2.0.3, it generates a **new Zcash Shielded Address each time you open Receive** (rotating, shielded-only Unified Address under the **"Zcash Shielded Address"** label; `u1…`). All rotating addresses map to **one balance under one seed**.
- A separate transparent address (`t…`) is still available under its own label for legacy compatibility (exchanges that can't send to shielded receivers). Zashi 2.0.3 *removed the transparent receiver from the UA* so sharing a UA never leaks transparent history.

**Balance & scanning**
- Both transparent and shielded ZEC sent to a Shielded Address arrive and are stored as **shielded** ZEC.
- **Transparent ZEC cannot be spent directly** — Zashi forces you to **Shield** it first (a status widget reminds you "you have transparent funds that need shielding").
- Balance UI (redesigned in 2.0) distinguishes **spendable** ZEC. The wallet **status widget** shows where you are in sync/restore/shielding/backup ("no more staring at the screen wondering when funds become available").

**Recover / multi-device**
- Seed phrase + (optionally) birthday height restores the whole wallet. Light wallet: syncs via **lightwalletd** servers; first sync re-scans blocks to decrypt notes belonging to your keys.

### Penumbra / Prax (Chrome/Brave/Chromium extension)

**Onboard**
1. praxwallet.com → "Add to Chrome" (no Firefox). Click extension → "Create a wallet" → 12/24-word recovery phrase → confirm 3 random words → set password.
2. Approve connection to a network RPC. Prax then **syncs the chain state locally** ("a few seconds to a few minutes"). Until fully synced, Prax **re-syncs every time you open it**; after, it syncs continuously in the background.

**Address model on screen**
- Click the Prax icon → **Main Account**, holdings grouped **by asset type** (e.g. UM staking token, ATOM). Arrow control to move between accounts; each account shows its **Default Address**.
- **IBC Deposit Addresses**: toggle generates a **fresh IBC deposit address every time** — because IBC transfers from an external chain reveal the destination address publicly, so reuse would link deposits.
- **Validate Address** tool: paste an address to confirm it's yours and see which account it belongs to.

**Receive / first funds**
- After sync, select **"Shielded assets"** → pick external chain → connect a compatible wallet → choose amount → IBC transfer in. A notification confirms assets are shielded; they appear under the **Assets** tab.

**Selective disclosure**
- The default frontend (app.penumbra.zone) shows tx history with a **private view** (full details) and a **public view** (only the transaction fee is visible).

---

## Address model & mental model

| Wallet | Public address | Private / shielded receive address | What each is for |
|---|---|---|---|
| **Railway / RAILGUN** | `0x…` (standard Ethereum) | `0zk1q…` (Bech32m, long; encodes viewing + spending pubkeys + chain) | `0x` to bring funds in/out (shield/unshield, both public on-chain). `0zk` to receive/hold/transact privately. Same seed derives both. |
| **Zcash Zashi** | `t…` (transparent, legacy only) | `u1…` Unified Address, shielded-only, **rotates per Receive open** | `u1…` is the address you share — it hides which pool/receiver the sender uses (ZIP-316). `t…` only for exchanges that can't send shielded. |
| **Penumbra / Prax** | *none* (no public balance exists) | **Default Address** + unlimited **IBC deposit addresses** (disposable), all → same balance | No public/private split — everything is shielded. "Two addresses" is reframed: many unlinkable deposit addresses for one account. |

**Recurring mental-model devices these wallets use:**
- **"One seed, two/many addresses, same balance."** Railway (`0x`+`0zk` from one key), Zashi (rotating `u1…` all under one seed), Penumbra (default + many IBC addrs → one balance). Users are repeatedly reassured the rotating/extra addresses are not separate wallets.
- **Mode toggle vs. default-private.** Railway makes the user *choose* a world (Public/Private button). Zashi and Penumbra make private the default and treat public as either a legacy escape hatch (Zashi `t…`) or non-existent (Penumbra).
- **Unified Address as "travel adapter"** (Zcash's own metaphor): one address that plugs into whatever socket the sender has, so the user never has to reason about receiver types.
- **Viewing key ≠ spending key.** Railway makes this explicit and user-facing (export a viewing key for read-only/auditor access; spending key never leaves). Penumbra has the same split under the hood (full viewing key powers the view service; spend key signs). This is the foundation of "let someone see but not spend."

---

## Notable UX patterns

1. **Public/Private toggle as the primary navigation** (Railway): a single button in the top-right flips the entire wallet between the `0x` and `0zk` worlds. Balances, addresses, and available actions all change with it.
2. **Pending vs Spendable as first-class balance states** (Railway 1-hr standby; Zashi spendable vs needs-shielding; Penumbra sync-not-done). Users are shown *why* money isn't spendable yet, not just a number.
3. **Rotating/disposable receive addresses generated on every Receive open** (Zashi per-open `u1…`; Penumbra fresh IBC address per toggle). The wallet does the unlinkability work; the user just copies whatever is shown.
4. **Sync/restore progress made explicit** (Zashi status widget + birthday-height estimate; Penumbra "few seconds to a few minutes" + re-sync-on-open then background sync). Scanning is unavoidable in shielded wallets, so the answer is *visible progress*, not hiding it.
5. **Wallet birthday height** (Zashi): asks for / estimates the date of first activity to bound the scan, directly attacking slow restores.
6. **Forced shield-before-spend** (Zashi): transparent ZEC can't be spent; a widget nudges "shield this first." Keeps the user on the private path by default.
7. **Selective-disclosure / dual transaction views** (Penumbra private vs public view; Railway viewing keys). The user can prove or reveal on demand without going fully transparent.
8. **View-only wallet from a shareable viewing key** (Railway): explicit multi-device + accountant/auditor flow, with a blunt warning that the key is irrevocable and shows all future txs.
9. **"Import any BIP-39 seed"** (Railway): lowers onboarding friction by reusing an existing MetaMask seed rather than forcing a new one.
10. **Status widget that recommends the next action** (Zashi): one place that says whether you should shield / back up / wait for sync, instead of leaving the user to infer state.

---

## Confusion points & open questions

These are the recurring confusions these wallets visibly fight against — exactly the traps a new ZK wallet must pre-empt.

- **"I have two addresses — which one do I give people?"** Railway's `0x` vs `0zk` is the sharpest version. Sending to the wrong one (public `0x` when a private transfer was intended, or vice versa) is a real footgun. Zashi/Penumbra reduce this by showing essentially one shareable address and hiding the rest.
- **"Why can't I see / spend my private balance instantly?"** Shielded balances require *scanning* (decrypting notes that belong to your keys) before they appear, and Railway adds a 1-hour POI standby. Users perceive lag as "my money is gone." Mitigations seen: explicit sync progress, Pending vs Spendable labels, birthday height to shorten scans.
- **"Deposit and withdrawal are public."** Crossing the privacy boundary leaks. Railway shield/unshield are on-chain `0x` events; Penumbra IBC *deposits reveal the destination address publicly* (hence disposable deposit addresses); Zashi receiving to `t…` is fully transparent. Users often assume a "privacy wallet" makes *everything* private, including the on/off-ramp — it does not.
- **"My balance shows 0 after restoring."** Causes documented for Railway: wrong derivation index (HD non-zero paths), or not yet finished scanning. Zashi: wrong/missing birthday height makes restore look stuck/empty. Penumbra: not fully synced yet (it re-syncs on each open until done).
- **Transparent receiver leaked history (Zcash, pre-2.0.3).** A UA that bundled a transparent receiver could expose transaction history when the user thought they were sharing a "private" address — fixed by removing it from the UA. Cautionary tale: bundling a public receiver into a "private" address silently de-privatizes it.
- **Irrevocable viewing keys** (Railway): sharing a viewing key for multi-device/audit is permanent and covers all *future* transactions — a privacy cliff users may not appreciate at share time.
- **Address rotation vs "is this still my wallet?"** Rotating `u1…` (Zashi) and per-transfer IBC addresses (Penumbra) can make users doubt funds will land in the same place. Both wallets explicitly reassure "all under one seed / same balance."
- **Open question for our wallet:** which model maps best to a Stellar-based ZK wallet — Railway's explicit Public/Private toggle (familiar to EVM users, but two-address footgun), Zashi's default-private + legacy escape hatch (cleanest sharing story), or Penumbra's no-public-balance + disposable deposit addresses (strongest privacy, but on-ramp address rotation needs careful explanation)? And how to present the unavoidable scan/sync delay so users don't read it as lost funds?

---

## Sources

- Railway User Guide — home/index: https://help.railway.xyz/
- Railway User Guide — Shielding (Public/Private toggle, Shield button, 0.25% fee, 1-hr standby, Pending vs Spendable): https://help.railway.xyz/transactions/shield-unshield
- Railway User Guide — Create a New Wallet (BIP-39, import MetaMask seed, 0x+0zk same key): https://help.railway.xyz/setup/create-wallet
- Railway User Guide — View-Only Wallets (Shareable Viewing Key, irrevocable, import steps, Activity sync): https://help.railway.xyz/setup/view-only-wallets
- RAILGUN Docs — Shielding Tokens (shield = 0x→0zk, broadcaster anonymity, viewing vs spending key access): https://docs.railgun.org/wiki/learn/shielding-tokens
- RAILGUN Docs — Wallets and Keys (BIP-32/39, spending key Baby Jubjub, viewing key Ed25519, both encoded in 0zk, view-only sharing): https://docs.railgun.org/wiki/learn/wallets-and-keys
- Zcash — What are Unified Addresses (u1… format, Orchard/Sapling/transparent receivers, ZIP-316, "travel adapter", autoshielding, sender privacy): https://z.cash/learn/what-are-zcash-unified-addresses/
- Zcash — Shielded vs Transparent: https://z.cash/learn/what-is-the-difference-between-shielded-and-transparent-zcash/
- Electric Coin Co. — Zashi 2.0.3: Changes to Shielded Addresses (remove transparent receiver from UA, rotating shielded address per Receive open, one balance one seed, t… legacy label): https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/
- Electric Coin Co. — Zashi 2.0 (spendable balance UI, status widget, birthday height, transparent must be shielded before spend, sync/restore progress): https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/
- Penumbra Guide — Viewing Balances (Main Account, by asset type, Default Address, IBC deposit addresses, Validate Address, private vs public tx view): https://guide.penumbra.zone/usage/web/balances
- Penumbra Protocol — Addresses and Keys (default address + many randomized IBC deposit addresses → same balances): https://protocol.penumbra.zone/main/concepts/addresses_keys.html
- Penumbra Protocol — S-FMD detection/clue keys (per-address detection key, optional disclosure to detection service): https://protocol.penumbra.zone/main/crypto/fmd/system_mapping.html
- Penumbra Guide — Interchain privacy (fresh IBC deposit address per transfer to avoid linkability): https://guide.penumbra.zone/interchain-privacy
- Penumbra blog — How To Get Started With Penumbra's Bespoke Wallet (Prax install, create wallet, seed confirm, RPC connect, local sync timing, re-sync on open then background, Shielded assets / IBC deposit): https://penumbra.exchange/blog/how-to-get-started-with-penumbras-bespoke-wallet
- Prax Wallet — Chrome Web Store listing (custody + view service in extension): https://chrome.google.com/webstore/detail/prax-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe

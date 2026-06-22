# Designer refs — QR + address-sharing, Stellar UI specifics, name-collision check

Research date: 2026-06-21. Scope: a **privacy-by-default Stellar ZK wallet** (assets fixed to XLM + USDC; testnet/mainnet toggle of ONE chain). This brief documents REAL, link-cited reference patterns for three things the designer asked for: (1) QR + address sharing (SEP-0007 + long shielded-address QR), (2) Stellar-specific UI bits (funding / min-balance, `C…` vs `G…`, network indicator), and (3) a name-collision verdict for "Veil", "Obscura", "Hush" + clean alternatives.

Every claim cites a real URL or a file path under `reference/`.

---

## 1. QR + address sharing

### 1a. Plain Stellar address — SEP-0007 `web+stellar:` payment URI

A Stellar Receive QR should not encode just the bare `G…` string — the ecosystem standard for an actionable payment request is **SEP-0007**, the `web+stellar:` URI scheme. A wallet that scans one of these can pre-fill the whole Send form (destination, amount, asset, memo) instead of making the user type it. (Source: SEP-0007 — https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md)

Format: `web+stellar:<operation>?<param>=<value>&…`

The relevant operation for Receive is **`pay`**. Its parameters (per the SEP):

| Param | Required | Meaning / notes |
|---|---|---|
| `destination` | **required** | the recipient account id (`G…`) or a payment address |
| `amount` | optional | amount the recipient receives; **omit it** to let the sender choose |
| `asset_code` | optional | asset code; **defaults to XLM** if omitted |
| `asset_issuer` | optional | issuer account id of the asset; defaults to native XLM |
| `memo` | optional | text, or base64 for hash types |
| `memo_type` | optional | one of `MEMO_TEXT`, `MEMO_ID`, `MEMO_HASH`, `MEMO_RETURN` |
| `msg` | optional | human note shown to the payer, ≤300 chars pre-encoding |
| `network_passphrase` | optional | set this to disambiguate **testnet vs mainnet** |
| `callback`, `origin_domain`, `signature` | optional | callback URL + domain-signed verification (for verified payment requests) |

Example `pay` URI (from the SEP): `web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&memo_type=MEMO_TEXT&msg=pay%20me%20with%20lumens`

**For our wallet's PUBLIC Stellar deposit address (the on-ramp `G…` for Shield):** encode a SEP-0007 `pay` URI rather than the bare key — destination = the public `G…`, asset fixed to XLM or USDC (`asset_code`/`asset_issuer`), `amount` omitted, and **`network_passphrase` set to the active network** so a testnet QR can't be scanned-and-paid on mainnet. (Source: SEP-0007 param table above.)

Note: SEP-0007 also has a `tx` operation (signs a full XDR `TransactionEnvelope`, with `xdr` required + optional `replace`). That is for delegated-signing request flows, **not** a Receive QR — skip it for our receive screen.

### 1b. The long SHIELDED / PRIVATE address — QR of a long string

Our private receive address is a long Bech32m-style shielded string (the same class of artifact as RAILGUN's `0zk1q…` and Zcash's `u1…`, which "encode viewing + spending pubkeys"). It is much longer than a 56-char `G…`, so QR-encoding it has real constraints:

- **QR capacity vs error-correction is a hard tradeoff.** A QR has 4 EC levels — L (~7% recovery), M (~15%), Q (~25%), H (~30%) — and going from L to H **cuts usable capacity by more than half** (a v40 code holds 7,089 numeric at L but only 3,057 at H). Alphanumeric max is 4,296 chars (v40-L). (Source: https://www.qrcode.com/en/about/version.html and https://en.wikipedia.org/wiki/QR_code)
- **For a LONG string, prefer a LOWER EC level (L or M) so the module count stays scannable**, and never put a logo over it (logos force H). Keeping payloads under ~300 chars yields a code that "scans quickly at reasonable sizes"; long strings push you into high-version, dense codes that need a larger render + good contrast to scan. (Source: https://www.qrcodechimp.com/qr-code-storage-capacity-guide/, https://www.gocreateqr.com/blog/qr-code-error-correction-guide)
- **Designer guidance:** render the shielded QR **physically larger** than the `G…` QR, with high contrast and quiet-zone margin; default EC level **M** (fall back to L only if the address overflows M at a comfortable size). Do not overlay a brand mark on the shielded QR. Encode the raw shielded address (no SEP-0007 wrapper — that scheme is for `G…` Stellar accounts).

### 1c. Copy / scan / truncation / "same wallet" UX

Patterns observed in shipped wallets (use these, they're proven):

- **Receive = QR + label + truncated address + COPY + explorer link** — Freighter's `ViewPublicKey` screen is exactly: QR of the address, label **"Wallet Address"**, a truncated address, a **COPY** button, and **"View on stellar.expert"**. Minimal, single-purpose. (Source: `reference/freighter/extension/src/popup/views/ViewPublicKey/index.tsx`; summarized in `reference/../.thoughts/research/2026-06-21-ux-stellar-wallets.md`)
- **Truncate the middle, never the ends** — checksum/StrKey integrity lives in the head+tail; show `GCAL…7AOO` style. (Source pattern: Freighter `ViewPublicKey` truncated display.)
- **"One seed, two/many addresses, same balance" reassurance copy** — Railway (`0x`+`0zk` from one key), Zashi (rotating `u1…` "all under one seed"), Penumbra (default + many deposit addrs → one balance) all repeatedly reassure the user that the extra/rotating address is **not a different wallet**. Our receive screen MUST label the private address and the public deposit address as the **same wallet**. (Source: `reference/../.thoughts/research/2026-06-21-ux-privacy-wallets-ux.md`, "One seed, two/many addresses, same balance")
- **Copy gives instant feedback**; for a long shielded string, copy is the primary action (manual typing is infeasible) — make COPY the prominent control, QR secondary.
- **Anti-footgun: two addresses on one screen is the sharpest confusion point** ("which one do I give people?"). Railway's `0x`-vs-`0zk` mix-up is a documented real footgun. Visually separate **"Your private address (share this to receive privately)"** from **"Public Stellar deposit address (for funding / Shield only)"** and explain what each is for. (Source: same privacy-wallets-ux research, "Confusion points")

---

## 2. Stellar-specific UI bits

### 2a. Account funding & minimum-balance messaging

- **Address ≠ account.** A `G…` you generate is inert until **funded**; the network reports "account does not exist" for it. Users must see this as a friendly state, not an error. (Source: developers.stellar.org accounts docs, corroborated in `2026-06-21-ux-stellar-wallets.md`; and `reference/freighter/extension/src/popup/components/account/NotFundedMessage/index.tsx`)
- **Unfunded = a first-class empty state, not an error** — Freighter's `NotFundedMessage` shows *"To start using this account, fund it with at least 1 XLM."* + a "Learn more about account creation" link + (testnet only) a one-click **Fund with Friendbot** button. (Source: `reference/freighter/.../NotFundedMessage/index.tsx`)
- **Base reserve numbers (real, must be surfaced):** base reserve = **0.5 XLM**, minimum **2 base reserves** ⇒ a bare account locks **1 XLM**; **every trustline / subentry locks another 0.5 XLM**. Formula in Freighter: `minimumBalance = (2 + subentry_count + num_sponsoring − num_sponsored) × 0.5 XLM + sellingLiabilities`. (Source: `reference/freighter/@shared/constants/stellar.ts` `BASE_RESERVE=0.5`, `BASE_RESERVE_MIN_COUNT=2`; `reference/freighter/@shared/helpers/stellar.ts ≈ln 124–129`; developers.stellar.org base-reserves docs)
- **Show total vs available (reserved) balance.** Freighter distinguishes `total`, `available`, and `Reserved Balance*` with footnote *"All Stellar accounts must maintain a minimum balance of lumens."* + a "Learn more about account reserves" link. Our **small available/public balance** chip on home should carry this same reserved-balance honesty. (Source: `2026-06-21-ux-stellar-wallets.md`, "Reserve transparency")
- **USDC needs a trustline (0.5 XLM reserve) before it can land.** No trustline → senders get *"Destination account does not accept this asset."* Since our assets are fixed (XLM + USDC), the wallet should add/manage the USDC trustline for the user silently and surface the "+0.5 XLM reserved" cost — do NOT build a search-for-asset UI (out of scope). (Source: `2026-06-21-ux-stellar-wallets.md`, trustline section; Freighter `translation.json` destination-asset strings)
- **Funding a `C…` smart account ≠ Friendbot.** Friendbot only funds classic `G…`. A `C…` is funded by routing XLM through a temp `G…` + SAC transfer (testnet) or a relayer/sponsor. Our "your wallet isn't deployed yet" state is the `C…` analogue of Freighter's "not funded yet". (Source: `reference/smart-account-kit/src/kit/tx-ops.ts` `fundWallet`; `2026-06-21-ux-stellar-wallets.md` table + open Q)

### 2b. `C…` smart-account vs `G…` classic address display

| | `G…` classic | `C…` smart / contract account |
|---|---|---|
| Format | `G` + 55 base32 (Ed25519 pubkey, StrKey) | `C` + 55 base32 (Soroban contract addr) |
| Derived from | the keypair (offline-derivable) | deployment (WASM hash + args) — **not** key-derivable; must be discovered/indexed |
| Signer | Ed25519 secret (mnemonic) | WebAuthn passkey / policy / multisig |
| Recovery | 12/24-word BIP-39 mnemonic | depends on the configured signer/policy; a pure passkey smart account has no seed, but our v1 wallet remains seed-backed by default |
| Exists when | **funded** | **deployed** |

(Source: `2026-06-21-ux-stellar-wallets.md` address-model table; `reference/passkey-kit/README.md`; `reference/smart-account-kit/README.md`)

**Designer implication:** both `C…` and `G…` truncate identically (head…tail). In this product, onboarding is seed-first and the optional passkey is additive, so the recovery-phrase ceremony is always part of create/import. Do not introduce a seedless passkey onboarding path unless the founder explicitly changes the locked decision. Label which address type is on screen only where it matters (e.g. the public Stellar deposit address is a `G…`/`C…` distinction the user funds into).

### 2c. Network (testnet/mainnet) indicator

- We toggle **only** testnet/mainnet of ONE chain (config switch) — NOT arbitrary multi-chain network management. (In scope per the brief.)
- **One env switch flips the whole stack** (RPC, passphrase, USDC issuer/SAC, CCTP contracts). Keep it in one config block; the user picks the network and the wallet resolves everything — users never type a contract id. (Source: `2026-06-21-resolved-ids-addresses.md`, "UX implication")
- **Privacy-pool flows are testnet-only today** — the only live Nethermind privacy pool is a single **testnet** native-XLM pool; there is **no mainnet pool**. So the network indicator is load-bearing: on mainnet, private Shield/Unshield should be gated/disabled-with-reason until a mainnet pool exists, while plain XLM/USDC transfer stays available. (Source: `2026-06-21-resolved-ids-addresses.md` Q4 — repo `deployments/` has only `legal/scripts/testnet`, no `mainnet/`; testnet pool id `CDQRXOD6…2PZF`)
- **Designer implication:** a persistent, unmissable **network badge** (e.g. a "TESTNET" pill in the header) — because identical-looking `G…`/`C…` addresses and QR codes are network-specific and mis-network is a real money-loss path. Pair with SEP-0007 `network_passphrase` in receive QRs (§1a) as the technical backstop.

---

## 3. NAME-COLLISION CHECK

Method: live web search + GitHub search + app-store / Chrome-Web-Store hits, 2026-06-21. Verdict per name, then clean alternatives.

### "Veil" — **AVOID (hard collision)**
An established **privacy coin + wallet** already owns this exact name in our exact category:
- Veil Project — privacy-focused blockchain, RingCT + Dandelion, founded 2018. https://veil-project.com/ , https://veilproject.org/
- **"Veil – Privacy focused wallet" shipping on Google Play** (`org.veilproject.wallet`): https://play.google.com/store/apps/details?id=org.veilproject.wallet — and on **F-Droid**: https://f-droid.org/en/packages/org.veilproject.wallet/
- Listed on Coinbase price pages (VEIL): https://www.coinbase.com/price/veil
- Also a separate "Veil" privacy exchange (veil.exchange).
Verdict: a live, app-store-distributed privacy wallet with this name. Do not use.

### "Obscura" — **AVOID (multiple collisions, incl. our exact category)**
- **Obscura — confidential blockchain payments / privacy layer using ZK** (directly our space): https://obscr.io/
- **Obscura VPN** — privacy VPN, pays in BTC/XMR, "impossible to log": https://obscura.com/
Verdict: an existing ZK confidential-payments project AND a prominent privacy VPN. Crowded + on-the-nose. Do not use.

### "Hush" — **AVOID (hard collision, including a brand-new direct competitor)**
- **Hush** — privacy coin, a **Zcash fork** (ZK, Sapling), with full-node/light/Android wallets: https://hush.is/ , https://github.com/MyHush/hush3 , CoinMarketCap https://coinmarketcap.com/currencies/hush/
- **Hush — a brand-new (2025/26) privacy-first WALLET on Solana** with **auto-shielding, disposable addresses, shielded balances, ZEC bridging** — i.e. nearly our exact product on another chain, actively promoted by Solana/Bitcoin.com: https://x.com/solana/status/1986398701863248150 , https://x.com/BTCTN/status/1987249180176249230
Verdict: collides with both an established privacy coin and a current, heavily-marketed privacy wallet in our category. Strongly avoid.

### All three collide → clean alternatives

I checked a number of evocative privacy names; most are already taken in crypto (each verified via search):
- **Umbra** — taken: THE EVM stealth-payment protocol + Chrome wallet + Solana "Umbra" privacy. (https://app.umbra.cash/ , https://github.com/ScopeLift/umbra-protocol)
- **Penumbra** — taken: live mainnet privacy L1 + DEX + wallet. (https://www.penumbra.zone/)
- **Cloak** — taken: CloakCoin privacy coin + wallet. (https://www.cloakcoin.com/)
- **Vanta** — taken: VANTA Network token (Solana/ETH). (https://www.binance.com/en/how-to-buy/vanta-network)
- **Nocturne** — taken: private-accounts protocol on Ethereum mainnet. (https://nocturne-xyz.gitbook.io/)
- **Cinder** — taken: CNR/CIN tokens + Cinder.io NFT. (https://coinmarketcap.com/currencies/cinder/)
- **Hollow** — taken: HOLLOW privacy-positioned ERC-20. (https://etherscan.io/token/0x1020e32c0f831f61cc5be9e16ccc2fbc6c6c8369)
- **Solace** — taken: SOLACE insurance token + Solace Wallet SDK. (https://www.solace.money/ , https://github.com/solace-labs/Solace-Wallet)
- **Murmur** — taken (defunct): MUR coin on EOS. (https://coinmarketcap.com/currencies/murmur/)
- **Tacit** — taken: confidential Bitcoin DeFi protocol. (https://tacit.finance/)

**Two CLEAN alternatives (no crypto wallet / blockchain / privacy-project collision found across web + GitHub + app stores, 2026-06-21):**

1. **Sotto** — from Italian *sotto voce* ("in a hushed/under voice"); short, brandable, on-theme for privacy. No crypto collision (search surfaced only unrelated SATU/SATO/SotaTek — different names). GitHub `solace wallet`/`murmur` searches returned nothing for it. Verdict: **CLEAN — recommended.** (Verified: https://www.google.com/search → no "Sotto" crypto wallet; nearest hits SATU/SATO are distinct strings.)
2. **Lull** — "a temporary quiet/calm"; very short, soft, ownable. No cryptocurrency/blockchain project named "Lull" surfaced in search. Verdict: **CLEAN — recommended as backup.**

(Recommend a final trademark + domain availability check before committing; this brief covers crypto-ecosystem collisions only.)

---

## Sources (consolidated)

- SEP-0007 URI scheme (`web+stellar:`, `pay`/`tx`, all params): https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
- QR capacity/versions: https://www.qrcode.com/en/about/version.html · https://en.wikipedia.org/wiki/QR_code
- QR error-correction tradeoff + best practice: https://www.qrcodechimp.com/qr-code-storage-capacity-guide/ · https://www.gocreateqr.com/blog/qr-code-error-correction-guide
- Freighter receive screen: `reference/freighter/extension/src/popup/views/ViewPublicKey/index.tsx`
- Freighter unfunded state: `reference/freighter/extension/src/popup/components/account/NotFundedMessage/index.tsx`
- Base reserve constants/formula: `reference/freighter/@shared/constants/stellar.ts`, `reference/freighter/@shared/helpers/stellar.ts`
- `C…`/`G…` model: `reference/passkey-kit/README.md`, `reference/smart-account-kit/README.md`, `reference/smart-account-kit/src/kit/tx-ops.ts`
- Network/pool reality: `.thoughts/research/2026-06-21-resolved-ids-addresses.md`
- Prior UX research (reused): `.thoughts/research/2026-06-21-ux-stellar-wallets.md`, `.thoughts/research/2026-06-21-ux-privacy-wallets-ux.md`
- Name check: Veil https://veil-project.com/ + Google Play `org.veilproject.wallet`; Obscura https://obscr.io/ + https://obscura.com/; Hush https://hush.is/ + https://x.com/solana/status/1986398701863248150

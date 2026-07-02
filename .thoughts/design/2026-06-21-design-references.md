# Design references (link-cited, scoped to our features)

Consolidated from three UX-reference briefs (mainstream extension wallets · privacy wallets · QR/Stellar specifics/name-collision). Facts + links only. Scope: a Stellar ZK privacy wallet — fixed assets (XLM + USDC), single testnet/mainnet toggle, seed-phrase primary + optional passkey, Shield/Unshield + private send as first-class actions. No swaps, no on-ramp, no NFTs, no dApp-connect (v1).

> Source files: `.thoughts/design/2026-06-21-refs-mainstream-wallets.md` · `.thoughts/design/2026-06-21-refs-privacy-wallets.md` · `.thoughts/design/2026-06-21-refs-qr-stellar-and-name.md`

> Load-bearing primary reference: **Freighter** (shipping Stellar wallet) — `reference/freighter/extension/src/popup/views/` maps ~1:1 to our screen list. Pull layout/IA/microcopy from it first, then strip the DO-NOT-COPY surfaces.

---

## Per-screen reference table

For each of OUR screens → best 1–2 reference links + the pattern to borrow.

| Our screen | Pattern to borrow | Reference link(s) |
|---|---|---|
| Onboarding — welcome / choose path | Centered logo + name; two stacked rounded buttons: Create new / I already have a wallet (two paths only) | `reference/freighter/extension/src/popup/views/Welcome/index.tsx` · https://support.metamask.io/start/creating-a-new-wallet/ |
| Onboarding — create-new: set password | Password set BEFORE phrase reveal; one shared PasswordForm (password+confirm+terms) reused by create and import; Enter password → Next precedes Show Seed Phrase | `reference/freighter/extension/src/popup/views/AccountCreator/index.tsx` · https://www.coingecko.com/learn/how-to-use-rabby-wallet |
| Onboarding — seed-phrase generate + backup | Pre-reveal modal explains the phrase (full access, recovers wallet, keep safe) + warns a confirm step follows, then shows words; unique 12-word SRP; write down + store offline; wallet can't recover it; "I've Saved the Phrase" to advance | `reference/freighter/extension/src/popup/views/MnemonicPhrase/index.tsx` · https://support.metamask.io/start/learn/what-is-a-secret-recovery-phrase-and-how-to-keep-your-crypto-wallet-secure/ · https://help.phantom.com/hc/en-us/articles/45135465489555-Create-a-new-wallet-with-a-Secret-Recovery-Phrase |
| Onboarding — seed-phrase confirm | Dedicated confirm step re-checks the phrase; "we'll check if you got it right" framing set in pre-reveal modal | `reference/freighter/extension/src/popup/components/mnemonicPhrase/ConfirmMnemonicPhrase` |
| Onboarding — import seed phrase | Numbered per-word masked input grid + show/hide toggle + paste-whole-phrase fan-out + 12/24-word length toggle, then shared PasswordForm; "enter words in exact order" → Import | `reference/freighter/extension/src/popup/views/RecoverAccount/index.tsx` · https://help.phantom.com/hc/en-us/articles/15079894392851-Import-an-existing-wallet-into-Phantom |
| Onboarding — OPTIONAL passkey | Anonymous public-key auth factor "similar to a password or passkey"; optional layer, NOT a replacement — seed phrase stays primary. A passkey C... address has NO seed, so the passkey path must NOT show a seed-backup step | https://help.phantom.com/hc/en-us/articles/32367778944403-About-Phantom-Auth · https://support.metamask.io/start/creating-a-new-wallet/ · https://developers.stellar.org/docs/learn/glossary#account |
| Unlock / lock | "Welcome back" + "Enter password to unlock" via shared EnterPassword, primary Unlock; footer escape hatches to recover/create; manual lock via menu → Log out | `reference/freighter/extension/src/popup/views/UnlockAccount/index.tsx` · https://support.metamask.io/configure/wallet/how-do-i-log-out-of-lock-my-wallet/ |
| Home / portfolio | Account header (identicon + name + network badge) + total value + asset list; kebab menu = Copy address / Account details (QR) / Settings / Lock; central Send action | `reference/freighter/extension/src/popup/components/account/AccountHeader/index.tsx` · https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet/ |
| Home — balance numbers (Stellar) | Show total vs available + "Reserved Balance*" line + footnote ("All Stellar accounts must maintain a minimum balance of lumens") + Learn-more link. Base reserve 0.5 XLM, min 2 (1 XLM locked on bare account), +0.5 XLM per trustline/subentry | https://developers.stellar.org/docs/learn/fundamentals/lumens#minimum-balance |
| Send (plain) | Multi-step in-place slider: DESTINATION → AMOUNT + asset-picker → PAYMENT_CONFIRM → submit → home; animated, visited steps persist; recipient → amount → Next (review) → confirm | `reference/freighter/extension/src/popup/views/Send/index.tsx` · https://support.metamask.io/manage-crypto/move-crypto/send/how-to-send-tokens-from-your-metamask-wallet/ |
| Receive — address + QR | QRCodeSVG + middle-truncated address (keep head+tail for checksum) + CopyText "Copied!" + explorer link + inline-editable account name (pencil→check) | `reference/freighter/extension/src/popup/views/ViewPublicKey/index.tsx` · https://support.metamask.io/configure/accounts/how-to-view-your-account-details-and-public-address/ |
| Accounts — multiple / add / switch | Account list (identicon, truncated key, copy, inline-rename) with make-active switching; "Add another wallet" sheet with create-from-seed; an account = a set of addresses | `reference/freighter/extension/src/popup/views/Wallets/index.tsx` · https://help.phantom.com/hc/en-us/articles/45465816962579-About-wallets-accounts-and-addresses-in-Phantom |
| Settings | ListNavLink menu (Preferences, Security, Network, Help, About, Log Out, version footer); Security sub-view = Show recovery phrase (password+warning gate) + Auto-lock timer + Advanced | `reference/freighter/extension/src/popup/views/Settings/index.tsx` · https://help.phantom.com/hc/en-us/articles/25334064171795-View-your-recovery-phrase-or-private-keys-in-Phantom |
| Settings — network toggle | Persistent unmissable network badge (TESTNET pill in header); ONE switch flips RPC/passphrase/USDC issuer+SAC/CCTP contracts — user never types a contract id. Gate mainnet Shield/Unshield (testnet-only privacy pool today) with reason; plain transfer stays available | https://developers.stellar.org/docs/networks |
| Activity / history | Month-sectioned list with "No transactions to show" empty state, "History" header; activity enabled by default | `reference/freighter/extension/src/popup/views/AccountHistory/index.tsx` · https://support.metamask.io/configure/wallet/notifications/ |
| Shield/deposit — unfunded empty state | Unfunded account = friendly empty state, not an error: "To start using this account, fund it with at least 1 XLM" + Learn-more + (testnet) one-click Friendbot. USDC needs a 0.5-XLM-reserve trustline before it can land — add/manage silently (fixed assets) | https://developers.stellar.org/docs/learn/glossary#minimum-balance |

> **Change-password** has no built Freighter reference (commented TODO only) — use Phantom/MetaMask password-reset docs for that interaction model.

---

## Privacy-screen references

Our novel surface. Borrow framing/IA from privacy wallets; invent the layering specifics from spec.

| Privacy screen | Pattern to borrow | Reference link(s) |
|---|---|---|
| Home — shielded vs spendable vs pending | Two-number balance: total + smaller "spendable". Zcash checklist mandates showing confirmed AND unconfirmed; Zashi 2.0 added a "Spendable" component. RAILGUN: Pending Balance (1hr standby + awaiting proof) → Spendable once Private POI completes ("Spendable ... can be spent with no limitations") | https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html · https://help.railway.xyz/private-proofs-of-innocence |
| Receive — private + public, "same wallet" | Rotating shielded-only address (new each visit) with copy+QR; transparent address shown separately on same screen. Reassure same wallet: "All transactions sent to your different rotating Shielded Addresses will remain part of one wallet balance under the same seed phrase." Label encrypted (shielded) vs not-encrypted (transparent posts details publicly) | https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/ · https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html |
| Shield (public → private / deposit) | Linear flow: select token → Shield → recipient private address → amount/Confirm → password → review (summary+fee) → submit → view under "Private" toggle. Framed as moving public 0x → a private address that "never appears on the blockchain" | https://help.railway.xyz/transactions/shield-unshield |
| Unshield (private → public / withdraw) — REVEALS info | Authority on framing (Zcash checklist): "Warn users when sending from zaddrs to taddrs (deshielding). Explicitly tell users that they are about to reveal transaction information." Mechanics (Railway): destination 0x → amount/confirm → password → review+fees → Generate Proof (valid ~3 min) → submit. NOTE: Railway's own copy lacks a strong leak warning — we MUST add one | https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html · https://help.railway.xyz/transactions/shield-unshield-1 |
| Private send | Send on private balance → paste/select recipient private address → token+amount → "Generate Proof to proceed" → Send → notification; keep app open ~30s desktop / 1–2 min mobile so recipient funds become spendable; details land in Activity | https://help.railway.xyz/transactions/private-transfers |
| Pending-proof / proving-latency state | First-class state: named "Generate Proof" step, proof validity windows, explicit "keep app open (timings)" guidance; Zashi uses tappable status banners (current status + best next action) + visible sync progress | https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/ |
| Pending / expiry in Activity | "Visibly mark newly sent transactions in a pending state" (dedicated pending section); "Tell the user the expected remaining time to expiry"; if expired, "visibly mark the transaction expired and notify" — do NOT delete it | https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html |
| Activity — private vs public rows | Shielded row "only reveals a transaction legitimately and safely happened" (your own decrypted amount/memo, counterparty hidden); transparent rows warn details are public; "show the memo field even if empty"; Railway unifies shield/send/unshield in one Activity tab with "Incomplete" for pending-POI rows | https://help.railway.xyz/transactions/private-transfers · https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html |
| View-key export (simple watch-only) | Settings → Wallets → wallet → "Show View-Only Private Key" → click-to-copy. Blunt warnings: "Viewing Keys grant full transaction viewing access and will permanently display all transactions (including future)" and "Viewing Keys cannot be revoked once shared"; "viewing keys should not be copy and pasted into a text or email" | https://help.railway.xyz/setup/view-only-wallets · https://zcash.readthedocs.io/en/latest/rtd_pages/ux_wallet_checklist.html |
| Compliance / selective disclosure (BETTER model) | Penumbra "transaction perspective": disclose a single TransactionView for ONE transaction instead of a full viewing key — "selectively disclose information about specific transactions, rather than disclosing an account's long-term FullViewingKeys, which would give access to all past and future activity." Use cases: auditor/accountant/exchange due-diligence | https://protocol.penumbra.zone/main/concepts/addresses_keys.html · https://electriccoin.co/blog/explaining-viewing-keys-2/ |
| Shielded-by-default (meta-pattern) | Zashi "shield before spend": don't let users spend transparent funds; one-tap "shield now" on transparent receipts via status widget; default routing to shielded pool; make private view the default, public the opt-in. "Usability is a security feature" | https://electriccoin.co/blog/they-grow-up-so-fast-zashi-2-0/ |

---

## QR + address-sharing requirements + Stellar UI specifics

- **Public Stellar deposit QR (G... address):** Encode a SEP-0007 `web+stellar:pay` URI (not the bare G key): `destination` = public address, `asset_code`/`asset_issuer` fixed to XLM/USDC, `amount` omitted, `network_passphrase` set to active network so a testnet QR can't be paid on mainnet. Supports MEMO_TEXT/ID/HASH/RETURN. https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
- **Private/shielded QR (long Bech32m-style string):** Do NOT wrap in SEP-0007 (that's for G... accounts). Render the QR physically larger, high-contrast, with quiet-zone; default EC level M (drop to L if it overflows at a comfortable size); NEVER overlay a logo. Make COPY the primary action since manual typing is infeasible. https://www.qrcode.com/en/about/version.html
- **QR EC vs capacity** is a hard tradeoff (L ~7% / M ~15% / Q ~25% / H ~30%; L→H loses >50% capacity). Long shielded address → larger QR + EC M + no logo.
- **Receive layout/copy:** QR + label + middle-truncated address (e.g. `G..7AOO`, keep head+tail for checksum) + COPY + explorer link, mirroring Freighter ViewPublicKey. Visually separate "Your private address (receive privately)" from "Public Stellar deposit address (Shield/funding only)" and reassure same wallet — the two-address mix-up is a documented footgun. https://help.railway.xyz/transactions/shield-unshield
- **Stellar reserves are real:** base reserve 0.5 XLM, min 2 (1 XLM locked on a bare account), +0.5 XLM per trustline/subentry; USDC requires a trustline. Show total vs available/reserved with footnote + Learn-more. https://developers.stellar.org/docs/learn/fundamentals/lumens#minimum-balance
- **Address ≠ account:** a generated G... is inert until funded ("does not exist") — present unfunded as a friendly empty state (+ testnet Friendbot). A passkey C... is deployed-not-funded and has NO seed phrase → don't show seed-backup on the passkey path. https://developers.stellar.org/docs/learn/glossary#minimum-balance
- **C... vs G... display:** both truncate identically head..tail. C... = Soroban smart/contract account (deployed; recovery depends on its signer policy); G... = classic account (funded, keypair/seed-backed). In our v1 product decision, the wallet remains seed-backed by default and passkey is optional. https://developers.stellar.org/docs/learn/glossary#account
- **Network toggle:** persistent unmissable badge (TESTNET pill); one config switch flips RPC/passphrase/USDC issuer+SAC/CCTP contracts — user never types a contract id. Privacy Shield/Unshield is testnet-only today (no mainnet privacy pool deployed) — gate/disable-with-reason on mainnet while plain transfer stays available. https://developers.stellar.org/docs/networks

---

## DO NOT COPY (features in MetaMask/others we are NOT building)

- **Token swap / DEX / "Swap" on the home action row** (Freighter `views/Swap`, Phantom, Rabby, MetaMask) — no swaps. Railway's in-wallet DeFi (Uniswap/Aave/Beefy/yield/LP) is its core feature; we build none of it.
- **Fiat buy/sell on-ramp** ("Buy with Coinbase" Freighter `AddFunds`, MetaMask Buy/Portfolio) — keep only the transfer-to-address half, re-skinned as shield-in/receive.
- **NFT / collectibles gallery** (Freighter `AddCollectibles`/`AccountCollectibles`/`sendCollectible`; Phantom collectibles).
- **Arbitrary multi-chain / custom-RPC network management** (Freighter `ManageNetwork`+`AdvancedSettings`, Rabby multi-chain, MetaMask custom networks, Penumbra IBC/per-source-chain chooser) — ONE single testnet/mainnet toggle of ONE chain only.
- **In-wallet dApp browser / Discover / Explore** (Freighter `views/Discover` + home Sheet).
- **dApp-connect / connected-apps / grant-access / sign-message** (Freighter `GrantAccess`, `ManageConnectedApps`, `SignMessage`, `SignAuthEntry`, `SignTransaction`; Prax extension surface) — explicit later stretch, not v1.
- **Hardware-wallet support** ("Connect a hardware wallet" Freighter `Wallets`; MetaMask hardware hub).
- **Import private key / Stellar secret key as an add path** (Freighter "Import Stellar Secret Key", Rabby "Import Private Key") — add paths are seed-derived only.
- **Arbitrary token import / manage-assets / asset-search / add-token** (Freighter `ManageAssets`, `ManageAssetsLists`, `AddToken`, `SearchAsset`; Railway token import + wrapped-token auto-conversion) — assets are fixed XLM + USDC; manage the USDC trustline silently (just surface the +0.5 XLM reserve cost).
- **Custom gas / fee-market editor** (MetaMask advanced gas; RAILGUN 0.25% protocol fee + Broadcaster fee-market / self-broadcast-vs-public selection) — Stellar fees are tiny/flat, no fee UI.
- **Staking / earn, price charts, portfolio analytics** (MetaMask/Phantom) — home is balances + activity only.
- **Social/seedless login as the DEFAULT onboarding path** (MetaMask Google/Apple, Phantom seedless) — passkey may be OPTIONAL but the seed phrase stays primary and mandatory, not demoted.
- **Memo field as a prominent headline send feature** (Zcash nice-to-have) — keep it minor.
- **Unstoppable Domains / human-readable address aliasing** (Railway) — out of scope.
- **Watch-only wallet as a full onboarding branch** — for us the viewing key is an export/compliance artifact, not a setup path.
- **SEP-0007 `tx` (XDR signing) on the receive QR** — that's delegated signing, not receive; receive uses `pay` only.
- **Brand logo overlaid on the long shielded-address QR** — forces EC level H, makes a long payload too dense to scan.

---

## Name-collision check

Web + GitHub + app-store search, 2026-06-21. Crypto-ecosystem collisions only — run a final trademark + domain check before committing.

| Candidate | Verdict | Why |
|---|---|---|
| **Veil** | **AVOID** (hard collision) | Established privacy coin + shipping "Veil – Privacy focused wallet" on Google Play (`org.veilproject.wallet`) and F-Droid; on Coinbase price pages. Same name, same category. https://veil-project.com/ · https://play.google.com/store/apps/details?id=org.veilproject.wallet |
| **Obscura** | **AVOID** (multiple collisions, incl. our category) | "Obscura" confidential-blockchain-payments / ZK privacy layer (https://obscr.io/) AND prominent Obscura VPN (https://obscura.com/). On-the-nose + crowded. |
| **Hush** | **AVOID** (worst — direct competitor) | Established "Hush" privacy coin (Zcash fork, ZK; https://hush.is/) AND a brand-new 2025/26 "Hush" privacy WALLET on Solana with auto-shielding, disposable addresses, shielded balances, ZEC bridging — nearly our exact product. https://x.com/solana/status/1986398701863248150 |

Also ruled out (all taken in crypto): Umbra, Penumbra, Cloak, Vanta, Nocturne, Cinder, Hollow, Solace, Murmur, Tacit.

**Clean alternatives** (no crypto wallet/blockchain/privacy-project collision found):
1. **SOTTO** — from Italian "sotto voce" (in a hushed voice); short, brandable, on-theme. Search surfaced only unrelated SATU/SATO/SotaTek (distinct strings). **RECOMMENDED.**
2. **LULL** — "a temporary quiet/calm"; very short, soft, ownable. No crypto project found. **RECOMMENDED backup.**

> Product name is now **ZK Freighter**. A quick 2026-06-22 web search did not show a direct crypto-wallet collision, but this is not legal/trademark clearance; run a final trademark, domain, GitHub, app-store, and social-handle check before public launch. ("DeepBookie" in the host repo CLAUDE.md is a different monorepo project, irrelevant here.)

---

## Microcopy worth lifting

- Freighter phrase warnings: "Your recovery phrase gives you full access to your wallets and funds" / "Keep it in a safe place" / "For your security, we'll check if you got it right in the next step".
- MetaMask: frame the SRP as the single non-recoverable point of failure, distinct from the local unlock password.
- Zcash de-shielding warning: "Explicitly tell users that they are about to reveal transaction information."
- RAILGUN: "Tokens marked as Spendable have a valid Private POI and can be spent with no limitations."

## Caveats

- Freighter has NO passkey screen and NO built change-password (commented TODO only) — use Phantom Auth / MetaMask social-login + MetaMask/Phantom password-reset docs for those.
- No mainstream reference exists for our truly novel surfaces (private/public address layering on Receive; Shield/Unshield as home actions; pending-proof state on Send + in Activity; view-key/disclosure/compliance export; failure states ASP-not-registered, sync-required, proof-failure) — invent from spec; borrow only generic loading/empty/error/success scaffolding from Freighter (`components/Loading`, `Notification`, "No transactions to show").

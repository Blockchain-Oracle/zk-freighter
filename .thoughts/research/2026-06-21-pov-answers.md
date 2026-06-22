# Privacy-by-default wallet — answers (founder POV)

This brief answers your questions using only what we verified in the code and from primary sources. Where something is unknown or unbuilt, it says so plainly. It does not propose product positioning or a headline — that is yours to decide.

## How our wallet address looks (the key answer)

We are building a **privacy-by-default wallet**, not a general-purpose public wallet. There is no second "public account" experience to run alongside it. The only time anything public happens is when money crosses the edge: putting funds in ("shield in") and taking funds out ("unshield out"). Everything that happens between users inside the wallet is private.

**What the address actually is, in the engine.** A user's private identity is a **pair of keys**, both 32 bytes:
- a **note key** (BN254) — proves you own a note inside the privacy circuit, and
- an **encryption key** (X25519) — lets a sender encrypt a payment so only you can read it.

Both keys are derived from **one signature** from the user's Freighter wallet (a single signed message, run through a one-way hash). There is no per-address balance sitting somewhere public. You "receive" money by scanning the pool's activity and trial-decrypting it with your encryption key — if a note decrypts, it's yours.

**What it looks like in our code today.** Right now the repo does **not** combine these into one shareable string. It shows three separate fields with three copy buttons: the plain Stellar account (`G...`), the note key, and the encryption key. So today, "your address" is literally two privacy keys plus the underlying Stellar account.

**Could it be one clean string?** Yes — and every mature privacy-by-default wallet does exactly that. Zcash, Penumbra, and Railgun all bundle the "how to pay me privately" material into a **single string**. The closest match to our two-key design is Railgun's `0zk` address, which packs a viewing-type key and an ownership-type key into one string. We could do the same: encode our note key + encryption key into one string under our own prefix. **This is precedent, not a recommendation, and it is not built yet.**

**The minimal public Stellar account.** Each user still has one ordinary Stellar account (`G...`). It exists only to: sign the one message that derives the privacy keys, sign and submit the deposit (shield-in) and withdrawal (unshield-out), and act as the destination when withdrawing. Registering the privacy keys on-chain is **optional** — it only powers a discoverable address book, and is not required to use the wallet.

**Walkthrough — Bob receives a private payment.**
1. Bob shares his receiving info (today: his note key + encryption key; in the bundled future: one string).
2. Alice already has shielded funds. She builds a private transfer to Bob's two keys. Her Stellar `G...` address is not the recipient — the transfer happens by the privacy keys, inside the pool.
3. The payment lands in the pool as an encrypted note. Nothing public says "Alice paid Bob."
4. Bob's wallet scans the pool's activity and trial-decrypts each note with his encryption key. The one meant for him decrypts; he can now see and spend it.
5. If Bob ever wants the money on a normal Stellar address, he unshields — that withdrawal is the only public, transparent step, and it points at his `G...` account.

To be explicit: **we are not building general public-wallet functionality.** Public Stellar activity is limited to shield-in and unshield-out.

## Onboarding (corrected)

**Seed phrase is the default.** Create or import with a seed phrase is the primary onboarding path. **Passkey is optional**, offered as a convenience, not the default.

**There are no recovery secrets.** Lose your seed phrase and the wallet is gone. We are not adding a recovery backdoor.

**The truth about passkey determinism (so we don't ship a false promise):**
- A passkey can deterministically rebuild the same wallet: the same credential + the same fixed input always produces the same 32 bytes, which derives the same key/seed/wallet. That part is real and ships in other wallets today.
- **"Same fingerprint or Face ID on another device = same wallet" is FALSE.** The biometric is only a local unlock. It is not the key and is never seen by anything. What rebuilds the same wallet is the **same credential being present on the other device**, and that only happens through **passkey sync** inside one ecosystem: iCloud Keychain across a user's Apple devices, or Google Password Manager across the user's Android/Chrome. It does **not** cross ecosystems (Apple to Android), and "device-bound" passkeys (some security keys / Windows setups) can't move at all — re-registering creates a **different** credential and therefore a **different** wallet.
- **If a passkey is lost with no seed backup, it is permanently unrecoverable.** The deterministic value can't be regenerated without the original credential, and we keep no recovery secret. This is exactly why seed phrase stays the default.

So: passkey is a nice optional path with real determinism, but its "same wallet everywhere" behavior depends entirely on credential sync, never on the fingerprint itself.

## Mainnet plan

**Is a mainnet demo realistic? Yes, technically unblocked — with real-world constraints.** Every external dependency is live on Stellar mainnet today:
- The privacy math host functions (BN254 + Poseidon2) went live on mainnet around 2026-01-23 (Protocol 25, "X-Ray"). Mainnet is now on Protocol 26, so they are live now. (Note: these are Protocol 25 features, not Protocol 23.)
- Real **USDC** is issued on Stellar mainnet, and **Circle CCTP V2** is live on Stellar mainnet (since ~2026-05-19).

**The honest constraints:**
- Our reference privacy-pool contracts ship a **testnet-only** deployment and are **unaudited work-in-progress**. Putting real value behind unaudited contracts is a real risk.
- There is a **7-day event-retention window**: the app rebuilds its state from recent on-chain events, and won't work for users onboarded more than 7 days earlier unless we run a supporting node. On mainnet, a cleared browser database means permanently lost real funds.
- Mainnet costs real XLM. Fees per transaction are tiny (fractions of a cent), but there's **no friendbot** — we need a genuinely funded account. Accounts also carry a small minimum balance and ongoing storage rent.

**Minimal mainnet footprint:** deploy 4 contracts (they share one reusable verification key), fund a real deployer account with XLM, point at a mainnet RPC endpoint, and populate the required allow-list tree. A USDC pool and/or CCTP are optional add-ons.

**Network = config (no code change testnet ↔ mainnet).** This is already how the system works. There is one per-network record (network passphrase, RPC/Horizon URLs) selected by a single network key, plus a per-network contract-ID file. The deploy script already takes the network as an argument (with a "mainnet requires confirmation" guard). The mainnet passphrase is the standard `Public Global Stellar Network ; September 2015`. Switching networks is a config toggle, not a code change — so building mainnet-capable and demoing on mainnet is the right default posture.

## What changed from earlier docs (assumptions to remove)

- **Remove the invented "private USDC" headline / positioning.** No product headline is asserted here; positioning is the founder's call. Don't carry forward any prior implied tagline.
- **Remove the dual public/private "two tabs" framing.** This is one privacy-by-default wallet. There is no parallel public-wallet experience. Public touchpoints are only shield-in and unshield-out.
- **Remove any "recovery secrets" assumption.** There are none. Lose the seed phrase and it's gone. Passkey is optional and does not add recoverability.
- **Remove "testnet-only" as a ceiling.** Build mainnet-capable with network as a pure config toggle and aim to demo on mainnet; mainnet's dependencies are all live. Just respect the unaudited-WIP risk and the 7-day retention window.
- **Correct the protocol number.** The privacy host functions are Protocol 25 features, not Protocol 23.
- **Correct the passkey claim.** "Same biometric = same wallet on any device" is false; only synced credentials within one ecosystem rebuild the same wallet.

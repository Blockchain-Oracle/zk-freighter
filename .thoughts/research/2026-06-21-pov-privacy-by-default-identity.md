# Privacy-by-default wallet address & identity model

## Scope

Facts-only reality brief on how shielded-by-default wallets present a user's
ADDRESS / IDENTITY, and how that maps onto the Nethermind `stellar-private-payments`
engine the project is building on. Covers four reference privacy wallets/protocols
(Zcash Zashi, Penumbra, Railgun, Namada MASP) and the concrete recipient encoding in
`/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments`.

Founder POV honored: this is privacy-BY-DEFAULT, NOT a wallet that also rebuilds
normal public-wallet UX. No "private USDC" positioning, no dual public+private wallet,
no recovery-secret assumptions are introduced here. This documents current reality only;
no design recommendations.

A "private address" here means: the string a user gives others so they can send to the
user privately. A "public touchpoint" means the unavoidable transparent on-chain action
where value enters (deposit/shield-in) or leaves (withdraw/unshield-out) the shielded set.

---

## Verified Facts

### A. The Nethermind engine (`stellar-private-payments`) — what "your address" actually is

1. **The recipient is identified by TWO 32-byte public keys, not one.**
   - **Note public key** — BN254 curve point, used inside the ZK circuit to prove note
     ownership. Type `NotePublicKey(pub [u8; 32])`.
   - **Encryption public key** — X25519 key, used to encrypt the note payload (amount +
     blinding) so only the recipient can decrypt. Type `EncryptionPublicKey(pub [u8; 32])`.
   - Both are derived deterministically from a SINGLE Freighter wallet Ed25519 signature
     over the constant message `KEY_DERIVATION_MESSAGE` ("Privacy Pool Key Derivation
     [v1]" in code; doc comment shows a "[v2]" variant), via domain-separated SHA-256:
     `SHA-256("privacy-pool/note-key/v1" || sig)` → BN254 note key; `SHA-256(
     "privacy-pool/encryption-key/v1" || sig)` → X25519 encryption key.
     (`app/crates/core/prover/src/encryption.rs:50-72`, `119-179`.)

2. **Today there is NO single combined "private address" string.** The two keys travel
   as two separate `0x`-prefixed 64-hex-char strings.
   - Encoding helper: `encode_0x_hex` produces `"0x" + hex(32 bytes)` = 66 chars;
     `parse_0x_hex_32` accepts `0x`-prefixed or raw 64-hex. (`types/src/lib.rs:172-189`.)
   - The transfer API takes them as two distinct arguments:
     `recipient_note_key_hex` and `recipient_enc_key_hex`.
     (`app/crates/platforms/web/src/client/mod.rs:491-502`,
     `transact.rs:387-415`.)
   - The UI exposes THREE separate copy buttons per address-book row: "Copy address"
     (the Stellar `G...` account), "Copy note key", "Copy encryption key" — they are
     not concatenated into one shareable token.
     (`app/index.html:1162-1196`, address-book row template.)

3. **The Stellar account footprint is a normal Stellar account, used only at the edges.**
   - On-chain registration is an `Account { owner: Address, encryption_key: Bytes,
     note_key: Bytes }`. The `register` fn just emits a `PublicKeyEvent` binding the
     Stellar address to the two privacy keys. (`contracts/pool/src/pool.rs:146-154`,
     `674-680`.)
   - Registration is **explicitly optional**: the contract comment states it is
     "Not required to interact with the pool. But facilitates in-pool transfers via
     events. As parties can learn about each other public key."
     (`contracts/pool/src/pool.rs:144-145`.) Its purpose is a discoverable address book.
   - The standard Stellar `G...` account is needed to (a) sign the key-derivation message
     in Freighter, (b) sign/submit the deposit and withdraw transactions, and (c) act as
     `ext_recipient` for withdrawals. It is the gas/signing identity, not the private
     receive identity.

4. **The public touchpoints in the engine are deposit and withdraw, both keyed by a
   transparent Stellar `Address`.**
   - The transact request carries `ext_recipient: Address` and `ext_amount: ExtAmount`
     (positive = deposit into pool, negative = withdraw out). Internal recipients are the
     per-output note+encryption pubkeys; the external recipient is a plain Stellar address.
     (`app/crates/platforms/web/src/protocol.rs:149-166`.)
   - Withdraw UI collects `withdraw_recipient: String` (a Stellar address) and builds a
     `SpendTarget::withdraw(...)`. (`client/mod.rs:524-531`.)
   - Deposit/Withdraw are first-class tabs in the UI distinct from Transfer.
     (`app/index.html:165-188`.)

5. **Receiving is event-scan + trial-decrypt, not balance lookup.** The wallet scans pool
   commitment events and trial-decrypts each `encrypted_output` with its X25519 private
   key; a successful decrypt + commitment match means "this note is mine."
   (`app/crates/core/prover/src/notes.rs:31-84`, `encryption.rs:253-407`.) Encrypted
   payload wire format is `[ephemeral_pubkey 32][nonce 24][ciphertext+tag]` (120 bytes min),
   scheme X25519-XSalsa20-Poly1305 / NaCl crypto_box. (`encryption.rs:279-349`.)

6. **Blinding factors are NOT derived from the signature** — they are random per-note and
   must be stored locally; the keys are recoverable from the wallet seed but note state is
   not. (`encryption.rs:202-231`; README "Browser storage" / OPFS SQLite limitation.)

### B. Zcash / Zashi — Unified Addresses (ZIP-316), shielded-by-default

7. A **Unified Address (UA)** is ONE Bech32m string that bundles one or more receivers
   (Orchard 0x03, Sapling 0x02, transparent P2PKH/P2SH). The user shares this single string.
   (ZIP-316.)
8. HRP (prefix) by revision/network: Rev 0 = `u` / `utest`; Rev 2 shielded-only = `zu` /
   `zutest`; Rev 2 transparent-enabled = `tu` / `tutest`. A `zu` address MUST NOT contain
   any receiver that could leak info (i.e. no transparent receiver). (ZIP-316.)
9. **Zashi 2.0.3 made the default UA shielded-only** (Orchard) — it dropped the transparent
   receiver from the default UA because exchanges never adopted UA and a bundled t-receiver
   risked leaking history. The Receive screen shows a **rotating** shielded-only UA (a fresh
   UA each visit). (Electric Coin Co. blog; Zcash forum.)
10. **Public touchpoint handling:** if a user needs a transparent `t...` address (e.g. an
    exchange that only supports t-addrs), Zashi still exposes it, but **displayed separately
    on the Receive screen** — not merged into the default shielded UA. (ECC blog,
    "still available and displayed separately.")

### C. Penumbra — fully shielded diversified addresses

11. A Penumbra address has NO transparent component (fully shielded chain). Raw binary form
    is the **80-byte string `d || pk_d || ck_d`**: diversifier (16B) || transmission key
    (32B, decaf377) || clue key (32B, decaf377, for fuzzy message detection). It is run
    through F4Jumble, then Bech32m-encoded with HRP `penumbra` (mainnet) /
    `penumbra_tnXYZ_` (testnet). (protocol.penumbra.zone addresses chapter.)
12. One account can present **many unlinkable diversified addresses**, keyed by a 16-byte
    address index; addresses are opaque and reveal no account info — only the viewing key
    holder can decrypt. The clue key embedded in the address enables detection.
    (protocol.penumbra.zone concepts/addresses_keys.)

### D. Railgun — 0zk addresses (closest structural analog to the Nethermind two-key model)

13. A **0zk address is a single Bech32m string, prefix `0zk`**, that encodes BOTH the
    public **viewing key** AND the public **spending (master) key**, plus chain info — which
    is why 0zk addresses are longer than `0x` addresses. (Railgun docs, Wallets and Keys.)
14. Key types: **Spending key** = Baby Jubjub key (proves ownership / sends), analogous to a
    private key. **Viewing key** = Ed25519 key (decrypts/scans events to find received funds,
    cannot spend). Both derived BIP-32/BIP-39 from a mnemonic. (Railgun docs.)
15. **Public touchpoint handling:** "shielding" moves funds from a public `0x` address INTO
    the private 0zk address; the 0zk address is the single thing shared to receive privately.
    (Railgun docs, Shielding Tokens.)

### E. Namada — MASP, distinct shielded payment address string

16. Namada uses **distinct prefixes** rather than a unified address: transparent `tnam`;
    shielded **payment address `znam`** (the share-to-receive string, target-only); shielded
    spending key `zsknam`; shielded viewing key `zvknam`. The `znam` payment address is the
    public-facing string a user shares to receive into a shielded account. (Namada docs,
    addresses.)
17. **Public touchpoint handling:** a "shielding transfer" moves value from a transparent
    `tnam` to a shielded `znam`; transparent transfers expose sender/receiver/asset/amount.
    The MASP is one unified, asset-agnostic shielded set. (Namada docs, shielding.)

### F. Cross-cutting pattern across all four

18. Two recurring encodings for "your private address": (a) a SINGLE Bech32m string that
    bundles the receive material (Zcash UA, Penumbra, Railgun 0zk), or (b) a distinct
    prefixed shielded address string separate from the transparent one (Namada `znam`,
    Zashi's separate `t...`).
19. Every one of them keeps the deposit/withdraw (shield-in / unshield-out) edge as a
    transparent action, but does NOT surface that transparent address as the user's identity:
    the shielded string is the headline "your address"; the transparent address is either
    hidden, separated, or only the source side of a "shield" verb.

---

## Direct answers to the founder's questions

**Q: In a privacy-by-default ZK wallet on Stellar, what does the user's address look like
and what is it?**

- **What it IS (engine reality):** the recipient identity is a PAIR of 32-byte public keys —
  a BN254 **note key** (circuit ownership) and an X25519 **encryption key** (note payload
  encryption). Both deterministically derived from one Freighter signature. There is no
  spendable "balance" at an address; receiving = trial-decrypting pool events with the X25519
  key. (`encryption.rs`, `notes.rs`.)

- **What it LOOKS LIKE today:** two separate `0x`-prefixed 64-hex strings (note key, enc key),
  plus the ordinary Stellar `G...` account shown as a third, separate copy field. The repo
  does NOT currently concatenate them into one shareable token. (`types/src/lib.rs`,
  `client/mod.rs`, `index.html` address-book template.)

- **How it COULD be presented as ONE string (precedent, not a recommendation):** every mature
  shielded-by-default wallet bundles its receive material into a single Bech32m string
  (Zcash UA `u`/`zu`, Penumbra `penumbra1...` over `d||pk_d||ck_d`, Railgun `0zk...` over
  viewing+spending keys). The structural twin of the Nethermind model is **Railgun's 0zk**:
  one Bech32m string carrying a viewing-type key + an ownership-type key — i.e. exactly the
  X25519-encryption-key + BN254-note-key pair this engine already produces. A Bech32m
  encoding of `note_key (32) || encryption_key (32)` under a chosen HRP would be the direct
  analog. (This is a precedent mapping; the repo does not implement it yet — see Unknowns.)

**Q: What is the minimal underlying Stellar account footprint?**

- One ordinary Stellar Ed25519 account (`G...`). It is used to: sign the key-derivation
  message, sign+submit deposit/withdraw transactions, and serve as the `ext_recipient` on
  withdraw. On-chain key **registration is optional** (only powers a discoverable address
  book via `PublicKeyEvent`); the pool can be used without registering.
  (`pool.rs:144-154,674-680`; `protocol.rs:149-166`.)

**Q: How are the unavoidable public touchpoints handled without feeling like a normal public
wallet?**

- In the engine: deposit/withdraw are the only transparent edges, keyed by a Stellar
  `ext_recipient: Address`; everything in-pool (transfer) is by note+encryption pubkeys.
- In the reference wallets: the transparent address is never the headline identity. Zashi
  keeps the shielded UA as default and only shows the `t...` address separately on demand;
  Railgun/Namada frame the transparent side as the SOURCE of a "shield" verb (`0x`→`0zk`,
  `tnam`→`znam`), not as "your address." The shielded string is what the user shares.

---

## Unknowns

- **No single combined private-address encoding exists in the Nethermind repo today.** I
  verified the two keys are shared/parsed as separate `0x`-hex strings and shown as separate
  copy buttons. Whether a combined Bech32m (or other) "one string" address is planned is not
  evidenced in the code or docs I read. (Searched `app/`, `contracts/`, `types/`,
  `client/`, `index.html`.)
- **HRP / Bech32m choice for Stellar:** no Stellar-native convention for a shielded-address
  prefix was found in-repo; the Bech32m precedents cited are from Zcash/Penumbra/Railgun, not
  Stellar.
- **Penumbra `penumbra1` vs `penumbra` prefix:** the search summary said `penumbra1`
  (bech32m data follows the `1` separator); the protocol spec page states HRP = `penumbra`.
  Both are consistent (HRP `penumbra` + `1` separator → strings begin `penumbra1...`), but I
  did not see a rendered mainnet example string to confirm character-for-character.
- **Zashi UA rotation specifics** (how the next diversified UA is derived, exact cadence) were
  not read at spec level — only the product behavior (a fresh UA per Receive visit).
- **KEY_DERIVATION_MESSAGE version drift:** code constant says `[v1]`; the module doc header
  diagram says `[v2]` and there is a v1→v2 note about collapsing two signatures into one. The
  actual deployed message version on the target network is unverified.
- **Stellar account funding/reserve minimums** for the `G...` footprint were not measured here
  (general Stellar base-reserve rules apply but I did not verify against this repo's flows).

---

## Sources

- `/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments/app/crates/core/prover/src/encryption.rs` — key derivation (BN254 note key + X25519 enc key from one signature), encryption scheme, wire format.
- `.../app/crates/core/prover/src/notes.rs` — receive = trial-decrypt + commitment match + nullifier derivation.
- `.../app/crates/core/types/src/lib.rs` — `NotePublicKey`/`EncryptionPublicKey` (32B), `encode_0x_hex`/`parse_0x_hex_32`, `PublicKeyEntry` (Stellar address + two keys).
- `.../app/crates/platforms/web/src/protocol.rs` — `TransactRequest` with `ext_recipient: Address`, per-output note+enc pubkeys.
- `.../app/crates/platforms/web/src/client/mod.rs` and `.../client/transact.rs` — transfer takes `recipient_note_key_hex` + `recipient_enc_key_hex` (two strings); withdraw takes a Stellar `withdraw_recipient`.
- `.../app/index.html` (address-book row template ~1162-1196; deposit/withdraw tabs ~165-188) — three separate copy buttons (address / note key / enc key).
- `.../contracts/pool/src/pool.rs` — `Account{owner,encryption_key,note_key}`, `register` emits `PublicKeyEvent`, registration optional.
- `.../app/ARCHITECTURE.md` — keypair derivation summary, public key store / address book.
- `.../README.md` — transaction flow (deposit/withdraw/transfer), browser-storage (OPFS SQLite) note retention limits.
- ZIP-316 Unified Addresses — https://zips.z.cash/zip-0316 (Bech32m, HRP `u`/`zu`/`tu`, shielded-only `zu` forbids transparent receivers).
- Electric Coin Co., "Zashi 2.0.3: Changes to Shielded Addresses" — https://electriccoin.co/blog/zashi-2-0-3-changes-to-shielded-addresses/ (default UA shielded-only, rotating; t-address shown separately).
- Zcash forum, Zashi 2.0.3 — https://forum.zcashcommunity.com/t/zashi-2-0-3-changes-to-shielded-addresses/51299
- Penumbra protocol, Addresses — https://protocol.penumbra.zone/main/addresses_keys/addresses.html (80-byte `d||pk_d||ck_d`, F4Jumble, Bech32m HRP `penumbra`).
- Penumbra protocol, Addresses and Keys (concepts) — https://protocol.penumbra.zone/main/concepts/addresses_keys.html (diversified unlinkable addresses, clue key / FMD).
- Railgun docs, Wallets and Keys — https://docs.railgun.org/wiki/learn/wallets-and-keys (0zk encodes viewing + spending key; Baby Jubjub spend, Ed25519 view).
- Railgun docs, Shielding Tokens — https://docs.railgun.org/wiki/learn/shielding-tokens (0x → 0zk shield-in).
- Namada docs, Addresses — https://docs.namada.net/users/addresses (`tnam`/`znam`/`zsknam`/`zvknam`; `znam` = share-to-receive payment address).
- Namada docs, Shielding — https://docs.namada.net/users/shielded-accounts/shielding (shielding transfer `tnam`→`znam`).

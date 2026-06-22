# Wallet-First UX Flow & Open Questions

*Stellar ZK shielded wallet — designed wallet-first (a familiar wallet that happens to add privacy), not ZK-first. Grounded in the verified engine facts (Nethermind privacy pool, passkey smart account, Stellar account model) and the three wallet-UX research briefs.*

> **Current-decision correction, 2026-06-22:** this document originally explored a passkey-first/no-seed wallet. That is no longer the product direction. The locked direction is **seed phrase by default**, **passkey optional**, **no recovery secrets**, **web app first**, and **public deposit address + private receive address/code** under one wallet. Keep the receive/shield/scanning mental models below, but do not implement seedless onboarding or passkey-first recovery from this doc.

---

## TL;DR answers to the founder's 4 questions (plain English)

**1. "How do I even find my wallet in the first place?"**
Exactly like every wallet they already know. They open the web app first (extension later), and the first screen is the same fork everyone has seen: **Create new wallet** vs **I already have a wallet**. "Create" means: generate a seed phrase, force the user to back it up, then land them in the wallet. To get back in later, they use the local password; if they opted into passkey, they can use Face ID / Touch ID as a faster unlock. On a new device, the reliable recovery path is still the seed phrase.

**2. "Will I have a wallet address that I'll be able to find?"**
Yes. The wallet has two shareable receive targets, and the UI must explain the difference every time. The **public Stellar address** is for ordinary deposits, bridge landings, fees, and unshielding; anything sent there is public on-chain until the user shields it. The **private receive address/code** is for private in-pool payments; a sender uses it when they want the payment itself to stay shielded. One wallet, two receive targets, two different privacy meanings.

**3. "Even with Face ID login, this is just like a code. It's just an addition, not really the flow."**
Correct. **Passkey/Face ID is the lock on the door, not the house.** It can unlock the app faster and possibly authorize actions, but it is not the wallet, not the address, not the balance, and not the privacy layer. The actual wallet flow is the same as any wallet: see balance -> Receive -> Send -> see history. Passkey is optional convenience; the seed phrase remains the only recovery path.

**4. "We have to look at how the traditional wallet table looks like, because that's where users are coming from."**
Agreed — see the side-by-side table below. The headline finding from the research: across MetaMask, Phantom, Coinbase, Rabby, Freighter, and embedded/passkey wallets, **the user-facing flow is nearly identical** (onboard -> home -> receive -> send -> activity -> settings). Our wallet adds exactly three things on top of the familiar flow: a **private receive address/code**, a **Shield / Unshield** step, and a **shielded balance** with Pending vs Spendable states. Everything else should feel familiar.

---

## The traditional wallet flow table (what users know) — and our version side by side

| Step | Traditional wallet (MetaMask / Phantom / Coinbase / Rabby / Freighter) | Our Stellar ZK wallet |
|---|---|---|
| **1. First run** | Fork: Create new / Import seed / (newer) Social or Passkey login | Same fork: **Create new** / **I already have one**. Create = seed phrase backup + confirm. Optional passkey comes after, never instead of seed. |
| **2. Backup / recovery** | Show 12–24 words -> force write-down -> confirm-the-phrase -> set local password/biometric | Same seed ceremony, with stronger honesty: no reset, no support recovery, no hidden recovery secret. Passkey is optional daily convenience only. |
| **3. Home / portfolio** | Total fiat balance + token list + Receive/Send/Swap/Buy + Tokens/Activity tabs | Shielded balance is the hero. Public funds are smaller "available to shield" plumbing. Pending vs Spendable is visible. |
| **4. Receive** | Your address string + QR + Copy, network labeled ("copy, never type") | Same screen, **two clearly labeled receive targets:** private address/code for shielded payments and public Stellar address for deposits/bridge/unshield. |
| **5. Send** | Asset -> recipient (paste/scan/username) -> amount (+Max) -> fee preview -> confirm -> sign | Private send is the default product path. If the user pastes a public Stellar address, route them to Unshield / public withdrawal with a leak warning instead of pretending it is private. |
| **6. Activity / history** | List of sends/receives/swaps with status, links to a block explorer | Same list. Public txs link to stellar.expert. **Private txs show in *your* history (decrypted locally) but are NOT publicly traceable** — labeled "Private" with no explorer link, by design. |
| **7. Settings** | Security (reveal phrase, change password, auto-lock), address book, connected sites, networks | Same, including reveal recovery phrase behind strong auth. Adds: optional passkey on/off, selective disclosure / view-key export, per-asset pool status, testnet faucet. |
| **8. Network** | Network switcher dropdown; per-chain addresses (Phantom) | Single network (Stellar). No multi-chain footgun. (Cross-chain USDC arrives via the Bridge screen, not a network switch.) |
| **9. Lock / unlock** | Auto-lock on inactivity -> unlock via password or Face/Touch ID (local only) | Same. Password is always available; Face ID/passkey appears only if the user opted in. |
| **10. Connect-to-dApp** | Request shows origin + account + network → Connect → per-tx signing → revocable | Same pattern (Freighter's GrantAccess + Blockaid scan model), per-request signing via passkey. |

**The one-line takeaway for the founder:** onboarding stays familiar and seed-backed; the new product concepts are the private receive address/code, shielded balance, Shield/Unshield boundary, and private history.

---

## Our address model (THE key section)

This is the part to get exactly right, because "which address do I give people?" is the #1 way privacy wallets confuse users. We have **two things**, both belonging to **one wallet**, derived from the wallet's seed-backed private keys. A passkey may later unlock/sign as an optional convenience layer.

### Thing 1 — the public Stellar deposit address
- **What it is:** A normal Stellar receive target for public funds. In the simplest seed-first path this can be a classic `G...` account; if passkey smart-account auth is later enabled, this may become a `C...` contract account. Do not hard-code the UX around `C...` unless the implementation chooses that path.
- **What it's for:** The public side of the wallet. Holds or receives **public USDC and XLM**. It's where money lands when someone pays you normally, where bridged USDC arrives, and the address/account used around **Shield** (move money into privacy) and **Unshield** (move it back out).
- **Findable?** Yes. It's on stellar.expert, it has a QR, it's copyable. This is the address the founder is asking about — concrete and permanent.
- **How it's shown:** Receive screen -> **"Public deposit"** tab. Big QR, truncated address with Copy, "View on stellar.expert" link, network label "Stellar." Copy, never type.

### Thing 2 — the shielded receive code (the private receiving identity)
- **What it is:** Not a normal address. To receive a *private* payment in the Nethermind pool, the sender needs the recipient's two public keys: an **X25519 encryption key** (so the sender can encrypt the note) and a **BN254 note key** (the recipient's in-pool spend identity). The pool's **`register()`** call can publish those two public keys as an address-book/discovery event, but the contract explicitly says registration is not required to interact with the pool. The thing you hand a payer is a compact code that bundles these two keys (think of it as a shielded receiving address). The matching *private* keys never leave the user's device.
- **What it's for:** Receiving **private, in-pool** payments. When Alice pays Bob privately, she needs Bob's shielded code — not his public Stellar address.
- **Findable / traceable?** **No — by design.** A private payment to this code does NOT appear as a normal transaction to/from Bob on the explorer. That's the privacy. (The deposit that funded the pool and any withdrawal out of it *are* public — privacy is the in-pool transfer, not the boundary.)
- **How it's shown:** Receive screen -> **"Private code"** tab. QR + Copy, labeled **"Share this to get paid privately."** If the product chooses public key discovery, this tab can include a one-tap **"Publish private receiving keys"** step that calls `register()`; otherwise the bundled private code can be shared directly.

### When each is used (the rule we teach in one line)
> **Public deposit address = get paid in the open. Private code = get paid privately. Same wallet, same balance pages.**

We borrow Zcash Zashi's "travel adapter" reassurance and Penumbra's "all addresses = one balance" copy: every screen that shows the private code repeats *"This is the same wallet as your public address."* We do **not** copy Railway's bare two-address toggle without labels — that's the footgun the research flagged. Instead we put both under **Receive** as two clearly-purposed tabs, and on **Send** we let the wallet detect which kind of destination was pasted and auto-pick public vs private (with a visible confirm), so users can't send to the "wrong side."

### Concrete walkthrough — "Alice pays Bob privately"
1. **Bob has a private receive code/address.** Bob can share a bundled private code directly. If the product chooses a discoverable address-book mode, Bob can also turn on pool `register()` once, which publishes his X25519 + BN254 public keys as a public event. His private keys stay local either way.
2. **Bob shares his private code** with Alice (copy/QR/link). It is not his public Stellar deposit address.
3. **Alice needs shielded funds.** Alice's USDC is public, so she taps **Shield** to deposit, say, 50 USDC into the pool. *This deposit is public* — the explorer shows Alice's public account deposited 50 USDC into the pool. Her wallet now shows 50 USDC **Private**.
4. **Alice sends privately.** Send -> pastes Bob's private code -> amount 20 -> password/optional passkey. Her browser **generates a ZK proof locally** and submits the in-pool transfer. **No one watching the chain can see it went to Bob, or that it was 20.** Alice's private balance drops to 30; an encrypted note for Bob is posted on-chain.
5. **Bob's wallet finds the payment.** Bob's wallet is **scanning** new pool notes; it decrypts the one addressed to him with his X25519 key, confirms it, and shows **+20 USDC Private**. Bob got paid with no public trace linking him to Alice.
6. **Bob cashes out (optional).** Bob taps **Unshield** 20 USDC to a public Stellar address. *This withdrawal is public* — the pool paid out 20 USDC to that public address. The *link* between Alice's deposit and Bob's withdrawal is broken; that's the whole point.

**Confusion-avoidance rules baked into the design:**
- Never surface raw key blobs — show "your public address" and "your private code," never "X25519/BN254."
- On Send, if a public Stellar address is pasted into a private-send flow, the wallet routes to Unshield/public withdrawal and explains in one sentence that amount + destination will be public.
- Every Shield/Unshield screen carries the boundary warning: **"Deposits and withdrawals are public. Private sending happens between them."** (Addresses the research's "users assume a privacy wallet hides everything" risk.)

---

## Full screen-by-screen flow (passkey marked: optional if enrolled; password/seed path always exists)

### Onboarding
1. **Welcome** — "Create new wallet" / "I already have one." (◻)
2. **Create** — set local password -> reveal seed phrase -> confirm seed phrase -> create wallet keys. Optional passkey enrollment comes after the seed is safely backed up. No seedless path in v1.
3. **First home** — empty-state, friendly: "Add funds to get started." On testnet, a **"Fund with Friendbot"** button can exist for the public deposit account; on mainnet, **Add funds** (on-ramp / receive). Mirrors Freighter's unfunded-account friendly empty state.

### Home / portfolio
4. **Home** — shielded balance is the hero; public funds are "available to shield"; per asset (USDC, XLM) show **Spendable** and **Pending**. Buttons: **Send · Receive · Add funds · Unshield**. Auto-lock applies; reopening needs password or optional passkey if enrolled.

### Receive
5. **Receive -> Private address/code** — QR + Copy + "Share this to get paid privately. Same wallet as your public deposit address."
6. **Receive -> Public deposit address** — Stellar QR + Copy + explorer link + "Public until shielded" label.

### Send privately
7. **Send privately** — asset -> recipient (**private code**) -> amount (+Max, capped at Spendable shielded balance) -> review -> password/optional passkey -> browser generates the ZK proof locally (progress: "Preparing private payment..."), submits the in-pool transfer. Guardrails: if shielded spendable balance is 0, nudge **Shield first**; if a public Stellar address was pasted, route to Unshield/public withdrawal.

### Shield / Unshield
8. **Shield** (Public -> Private) — pick asset + amount -> "This deposit is public; private sending happens after." -> authorize deposit into pool -> balance moves Public -> Private. May show a brief **Pending -> Spendable** state while the note is confirmed/scanned.
9. **Unshield** (Private -> Public) — pick asset + amount + destination (defaults to own public deposit address) -> "This withdrawal is public." -> authorize withdrawal -> balance moves Private -> Public.

### Activity / history
10. **Activity** (◻) — unified list. Public txs: status + stellar.expert link. Private txs: labeled **"Private,"** amount + counterparty-as-you-know-it, **no explorer link** (decrypted locally from your notes). Shield/Unshield labeled as boundary events.

### Recovery
11. **Restore on new device** — "I already have a wallet" -> enter seed phrase -> set local password -> optional passkey enrollment -> scan the pool to rebuild private balance (progress bar, not a spinner; bounded by an account "birthday"/first-tx height like Zashi).

### Settings
12. **Settings** — security & auto-lock; reveal recovery phrase; enable/disable passkey; **export view key** or selective disclosure artifact for audit; connected sites if extension/dApp support exists; per-asset pool status; testnet faucet; address/contact book.

**Where passkey is invisible (important for the founder's point 3):** viewing balances, copying either address, viewing history, switching tabs, reading settings — all happen with **no** Face ID. If enrolled, passkey appears only at unlock, send, shield, unshield, and sensitive settings. It is the lock, not the flow.

---

## What private "receive" really requires (and how to make it feel normal)

Private receiving has three real mechanics the user must never see as homework:

1. **Pool registration (if the chosen receive model requires it).** To be discoverable by the pool contract, the recipient may call `register()` to publish their X25519 encryption key + BN254 note key with the pool. **UX:** if used, fold this into the Private-code tab as a single **"Enable private receiving"** tap. After that the private code just exists. Frame it like "turn on private receiving," never "register cryptographic keys." If direct bundled private-address sharing is enough, registration may be optional.

2. **Scanning for incoming notes.** There's no "to-address" the network routes to you; your wallet must watch every new pool note (`NewCommitmentEvent`) and try to decrypt it with your X25519 key — the ones that decrypt are yours. **UX:** a quiet background sync with a status chip ("Up to date" / "Syncing 1 of 3…"), exactly like Zashi/Penumbra. On a fresh restore, show a **progress bar bounded by the account's birthday height** so the scan is seconds-to-a-minute, not "forever." Critically: never let "still scanning" read as "funds gone" — show last-known private balance with a "syncing" badge.

3. **Pending vs Spendable.** A just-received or just-shielded note may be briefly pending until confirmed/scanned. **UX:** first-class **Pending** vs **Spendable** split with a reason ("confirming on Stellar…"), copied from Railway/Zashi — not a generic spinner.

**Making it feel normal:** the user's mental model stays "someone sent me money; it showed up." Registration, if used, is "turn on private receiving," scanning is "syncing," and pending state is "confirming." No ZK jargon reaches the surface.

---

## Stellar-specific UX gotchas

- **A `C...` smart account is optional, not the default mental model.** If we later choose passkey smart-account auth, a `C...` account must be deployed and funded to exist. Until then, keep the ordinary user model as "public deposit address + private receive address/code."
- **Funding a `C...` is asymmetric if we choose that route.** Friendbot funds `G...` accounts directly but **cannot fund a `C...`**; smart-account kits fund a `C...` by Friendbot-funding a throwaway `G...` then transferring XLM into the `C...` via the Stellar Asset Contract. On **mainnet there's no faucet** — needs an on-ramp or sponsored reserves. This is a later auth/account-model concern, not a reason to make onboarding passkey-first.
- **Minimum balance grows with subentries.** Base reserve locks ~1 XLM; **every trustline adds 0.5 XLM**, so spendable < total. **UX:** show **Available vs Reserved** with the Stellar footnote (Freighter's pattern).
- **Trustlines for USDC.** To hold non-XLM assets (USDC) the account must add a trustline first (0.5 XLM reserve), or USDC payments bounce ("destination does not accept this asset"). **UX:** auto-add the USDC trustline during onboarding/first-USDC-receive and make clear who pays the 0.5 XLM (we sponsor on testnet; decide for mainnet — see open questions). Use Freighter's domain-disambiguation anti-phishing warning if we ever let users add arbitrary assets.
- **Two failure modes look identical:** "recipient unfunded" vs "recipient lacks trustline." **UX:** detect and message each distinctly on Send.
- **Testnet vs mainnet gating.** Friendbot button only on testnet; bridge/faucet flows differ. Keep a single visible network label so users know where they are.
- **One pool per asset.** USDC and XLM are *separate* pools — registration, shielding, and balances are per-asset. **UX:** treat "private USDC" and "private XLM" as independent in the balance UI; enabling private payments may need to happen per pool (decide: enable both at once on first use).

---

## UX decisions & open questions to resolve (ranked)

**P0 — must decide before building screens**
1. **Address presentation model.** Locked recommendation: **one wallet, private receive address/code + public deposit address, both under Receive as labeled tabs, with Send detecting destination type.** Confirm the exact address encoding (one bundled private-address string vs separate note/encryption keys). *(Resolves the "which address do I give?" footgun.)*
2. **Which asset leads first in implementation.** Both XLM and USDC are in scope; sequencing is engineering-only. XLM has a live testnet pool; USDC needs a pool deploy. One pool per asset means each added asset is real extra work.
3. **Mainnet funding bootstrap.** Friendbot is testnet-only. If mainnet demo is chosen, decide how public-account reserves, fees, USDC reserve costs, and any optional smart-account deployment are funded.

**P1 — shapes the core flow**
4. **Enable-private timing.** Auto-`register()` during onboarding (zero-friction, costs a tx/reserve up front) vs lazy "Enable private payments" on first use (cleaner empty wallet). Recommendation: **lazy, on the Private-code tap.**
5. **Who pays reserves/fees** (trustline 0.5 XLM, registration, deposit). For demo: we sponsor. For mainnet: relayer/sponsor vs user-pays — decide and message it.
6. **Restore/scan bounding.** Adopt a birthday-height-style bound so first-device-restore scan is fast and never reads as "balance is 0/gone." Define the empty-but-syncing state copy.

**P2 — important polish, can follow**
7. **View-key / multi-device & audit.** Offer a read-only view key (see, can't spend) for second device + accountant — but avoid Railway's *irrevocable* cliff; communicate scope and revocability clearly. (Engine note: the encryption/view key is signature-derived, so "revocability" needs a real answer.)
8. **Private history semantics.** Confirm private txs appear in the user's own decrypted history with **no explorer link**, clearly labeled — and that we never imply deposits/withdrawals are private.
9. **dApp connect / signing.** Adopt Freighter's GrantAccess + Blockaid pattern; per-request passkey signing. Lower priority for a payments demo.

**Open questions the founder hasn't raised but should**
10. **What does optional passkey recovery actually mean?** Current answer: it does not replace seed recovery. Same-wallet return via passkey only works when the same credential is synced/available. Decide the supported-device matrix for the demo and the fallback when PRF isn't available.
11. **Passkey availability is OS/authenticator-dependent** (PRF support differs by browser/OS/authenticator). Treat it as optional until tested on the exact demo device.
12. **Cross-asset / change handling in the pool.** The pool uses note "change" outputs; make sure partial private sends show the right Spendable number and never strand change as "missing balance" (the classic "0 after restore" bug class).
13. **Counterparty naming in private history.** With no public addresses, how do we label who a private payment was to/from? (Contact book + locally-stored memo, since the chain won't tell us.)

---

*Sources: the three wallet-UX briefs (traditional / Stellar / privacy wallets) under `.thoughts/research/`, plus engine facts in `docs/VERIFIED-FACTS.md`, `docs/START-HERE-concept.md`, and `.thoughts/research/2026-06-21-nethermind-privacy-pool.md` (register() X25519+BN254, local scanning of NewCommitmentEvent, one pool per asset, public deposits/withdrawals).*

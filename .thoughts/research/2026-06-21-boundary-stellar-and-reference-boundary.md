# Stellar visibility + how Zcash/Railgun/Namada handle the public<->private boundary

> Facts-only current-reality brief. No solution design. Every load-bearing claim is cited to
> code (`file:line`) or an official doc URL. Items that could not be verified from a primary
> source are under **Unknowns**.

## Scope

Two questions, documented from primary sources only:

1. **Stellar reality** — what a public observer sees on the explorer for (a) a token transfer /
   deposit INTO a contract and (b) a contract withdrawal OUT to a Stellar address; the trustline
   requirement to hold/receive USDC; account funding / minimum-balance for a receiver.
2. **Reference wallets** — how Zcash (t<->z), Railgun (0x<->0zk), and Namada (tnam<->znam) handle a
   PUBLIC sender paying a PRIVATE recipient and a PRIVATE sender paying out to a PUBLIC recipient,
   and exactly what leaks at each edge.

Local code read: the **Nethermind `stellar-private-payments`** privacy-pool reference under
`/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments` (the closest
on-Stellar analogue to the boundary question). This is a **WIP, unaudited reference implementation**
of privacy pools — README states so explicitly (`README.md:14-17`).

---

## Verified Facts

### Stellar base layer

- **Base reserve = 0.5 XLM.** Each subentry (trustline, offer, signer, data entry) raises an
  account's minimum balance by **one base reserve (0.5 XLM)**. Max 1,000 subentries.
  (developers.stellar.org accounts doc.)
- **A receiver MUST hold a trustline to receive a non-native asset (e.g. USDC).** "Accounts must
  establish a trustline with the issuing account to hold that issuer's asset… except for the native
  token, Lumens." Without it, the payment fails. The trustline is created with a `changeTrust`
  operation, which must happen **before** receiving. (Stellar "Manage Trust" / "how-to-issue-an-asset".)
- **SAC (Stellar Asset Contract) honors the same trustline rule for classic G-addresses.** "The
  balance must exist in a trustline (or an account for the native balance)"; if a G-address lacks the
  trustline, "any function that tries to interact with that balance will fail" — unless the contract
  proactively creates it via the `trust` function introduced in **Protocol 26**.
  (developers.stellar.org `tokens/stellar-asset-contract`.)
- **Contract addresses (C-addresses) do NOT use trustlines.** Their balance + authorization state
  live in contract storage instead. (Same SAC doc.)
- **`AUTH_REQUIRED` assets** additionally require the trustline (G) or contract (C, via `set_auth`)
  to be explicitly authorized by the issuer before receiving. (Same SAC doc.)

### Stellar explorer / on-chain visibility

- A Soroban contract call is an **`InvokeHostFunction`** operation. On-chain it carries the **contract
  ID, the function name, and the XDR-encoded arguments**, plus emitted **events** and the resulting
  ledger-entry changes — all public. (developers.stellar.org InvokeHostFunction / Horizon op object.)
- The **SAC emits events** for transfers/admin ops (e.g. `set_admin` topic+data), and asset movement
  is reconstructable by consuming SAC Soroban events + classic ledger-entry changes (this is exactly
  what Stellar's Token Transfer Processor does). So **token transfers in/out of a contract are
  publicly visible** as events + balance changes. (developers.stellar.org Token Transfer Processor.)

### The `stellar-private-payments` pool (local code) — the on-Stellar boundary

This is a **single-entry** design: there is no separate "shield" vs "transfer" call. The one mutating
entry point is `transact(env, proof, ext_data, sender)` and `ext_data.ext_amount` sign selects the path
(`contracts/pool/src/pool.rs:535`).

- **DEPOSIT (public -> pool), `ext_amount > 0`:** requires `sender.require_auth()`
  (`pool.rs:541`) and performs a **public SAC transfer from the sender to the pool**:
  `token_client.transfer(&sender, &this, &amount)` (`pool.rs:555`). => the **depositor's address and
  the deposited amount are public** on-chain.
- **WITHDRAW (pool -> public), `ext_amount < 0`:** performs a **public SAC transfer from the pool to
  the named recipient**: `token_client.transfer(&this, &ext_data.recipient, &amount)`
  (`pool.rs:636`). The recipient is a plain `Address` field in public `ExtData`
  (`pool.rs:106-108`). => the **withdrawal recipient address and amount are public**.
- **No relayer / broadcaster / fee field exists in this implementation.** `ExtData` is only
  `{ recipient, ext_amount, encrypted_output0, encrypted_output1 }` (`pool.rs:106-114`); `Proof`
  carries `root, input_nullifiers, output_commitment0/1, public_amount, ext_data_hash, asp_*_root`
  (`pool.rs:78-97`). Because there is no relayer abstraction, the **`sender` that authorizes/funds a
  deposit (and the account that submits a withdraw) is the visible on-chain actor** — there is no
  third-party gas payer hiding it (contrast Railgun below). *(Unknown: whether the wider app/SDK adds
  a relayer; not found in the contract.)*
- **What stays private inside the pool:** amounts and the sender/receiver linkage of pool-internal
  moves are hidden behind Groth16 proofs over commitments (UTXOs) and nullifiers; events publish only
  `commitment`, `index`, and `encrypted_output` (`pool.rs:200-209`, README:96-110). A private->private
  transfer creates **output notes under the recipient's note key**: the protocol layer carries
  `out_recipient_note_pubkeys: [Option<NotePublicKey>; N_OUTPUTS]`
  (`app/crates/platforms/web/src/protocol.rs:161`) and encrypts the note to the recipient's X25519
  key (Account = `{owner, encryption_key(X25519), note_key(BN254)}`, `pool.rs:146-154`).
- **ASP (Association Set Provider) controls:** deposits must satisfy membership / non-membership
  Merkle proofs (`pool.rs:607-614`, README:79-89) — a compliance layer, orthogonal to the boundary.
- **Operational caveat (not privacy):** the app depends on Soroban events with a **~7-day RPC
  retention window** (README:116).

---

## Public -> private (a non-private sender pays a private recipient)

| System | Can a plain public sender pay a private recipient? | Does the SENDER need privacy software? | What leaks at this edge |
|---|---|---|---|
| **stellar-private-payments** | Deposit path. Output notes can be addressed to a recipient's note pubkey (`protocol.rs:161`), so a deposit can fund another party's private balance. | Yes — the depositor builds a Groth16 proof + `ExtData` and calls `transact`; `sender.require_auth()` is required (`pool.rs:541`). A wallet that only signs a plain SAC transfer cannot deposit. | **Public:** depositor address (`sender`), exact amount, the contract ID + `transact` invocation, commitment events. **Hidden:** which note/recipient the deposit credits. |
| **Zcash (t -> z)** | Yes. "ZEC can be sent between transparent and shielded addresses" (shielding tx). | The sender uses shielded-capable wallet software to construct the t->z tx, but funds originate from a transparent (Bitcoin-like) input. | **"Value is revealed on the sender end"** — the transparent sender address + amount are public; recipient z-addr and received amount are hidden. Timing of the boundary event is observable. |
| **Railgun (shield 0x -> 0zk)** | Yes — shield is the public->private entry. | The shielder submits a **normal public on-chain interaction from their own 0x wallet** (token approve/transfer to the Railgun contract). No broadcaster needed for shield. | **Public:** "the RAILGUN smart contract requires the amount and sending wallet address… the sender of a `shield` interaction's public key is broadcast to the wider blockchain network." Token + amount + sender 0x are visible. Shields are explicitly one of only two interaction types that contain public info. |
| **Namada (tnam -> znam, shielding)** | Yes. | Sender uses Namada client to build the MASP shielding tx. | "data about the sending address is shielded, but data about the receiving address is unshielded" per one source; the canonical docs/blog say the **shielding tx reveals the connection between the transparent sender and the shielded recipient's payment address, plus the amount**. Treat the **source tnam + amount + target payment address as public** at this edge (see Unknowns for the conflicting phrasing). |

---

## Private -> public (a private sender pays out to a public recipient)

| System | Who originates | Role of relayer/broadcaster | What leaks at this edge |
|---|---|---|---|
| **stellar-private-payments** | The withdrawer submits `transact` with `ext_amount < 0` and a public `recipient` Address. | **None in the contract** — no relayer/fee field; the submitting/auth account is the visible actor. | **Public:** recipient address + amount via `token.transfer(pool -> recipient)` (`pool.rs:636`), nullifier events, the contract invocation. **Hidden:** which input notes/sender funded it (behind nullifiers + proof). |
| **Zcash (z -> t)** | Shielded holder builds a deshielding tx. | n/a (no relayer needed; IP leak possible at broadcast). | **"Value is revealed on the receiver end"** — the transparent recipient address + amount are public; the shielded sender stays hidden. Boundary amount + timing observable. |
| **Railgun (unshield 0zk -> 0x)** | The 0zk holder authorizes the unshield. | **A Broadcaster submits the tx and pays gas.** "internally their 0zk address is debited, but externally it appears as if the Broadcaster's 0x address has sent the funds." | **Public:** the **Broadcaster's 0x address** and the **destination 0x address + amount/token** (unshield is the other public-info interaction). **Hidden:** the originating 0zk address (tx looks like it came from anyone in the pool). |
| **Namada (znam -> tnam, unshielding)** | Shielded holder builds the unshield tx. | n/a in docs read. | The **target transparent address + amount are public**; the source is the shielded set. Repeated shield-then-unshield into the *same* account is traceable ("we can trace the BTC back to their origin"); anonymity grows with more shielders. |

---

## What an observer can see (the general answer)

**Two distinct patterns exist; both are real and both leak the boundary amount + the public-side address.**

**Pattern A — sender self-shields (sender runs privacy tooling).**
Zcash t->z, Railgun shield, Namada shielding, and the stellar-private-payments deposit all work this
way: the **public-side party constructs a privacy transaction**. Across all of them, the **public
sender address and the amount are revealed on-chain** at the boundary; only the private-side
identity/notes are hidden. In Railgun and Namada the proof can credit a *recipient's* private address,
so a public payer can fund a private user directly — but the payer is doxxed for that deposit and the
amount is visible.

**Pattern B — recipient receives publicly, then self-shields.**
A plain public sender (no privacy software) sends a normal transfer to a public address the private
user controls; the private user then shields it themselves. This requires no privacy tooling on the
sender, but the **inbound public transfer (sender, recipient, amount) is fully visible** like any
transparent transfer, and the subsequent self-shield reveals that address + amount entering the pool.

**Net, verified:**
- A non-private user CAN pay a private user, but **in every system read here the public side of the
  boundary (the public address + the amount) is exposed**; only sender<->receiver *linkage* and
  in-pool amounts get hidden.
- To pay *directly into* a private recipient's shielded balance, the **sender must run privacy
  tooling** (build a proof / shielding tx): true for Zcash t->z, Railgun shield, Namada shielding,
  and the Stellar pool deposit.
- The only construct read here that hides the **submitter** on the public->...->public exit is
  **Railgun's Broadcaster** (the on-chain `from` becomes the broadcaster, not the user). Zcash z->t,
  Namada unshield, and the Stellar pool expose the actor/recipient at the exit edge.
- On **Stellar specifically**, the public-side recipient additionally needs a **USDC trustline**
  (0.5 XLM reserve) and a funded account; contract balances don't need trustlines but G-address
  payouts do.

---

## Unknowns

- **Railgun "shield to someone else's 0zk":** docs confirm shield reveals sender+amount and that you
  shield to a 0zk address, but I could not pull a primary-source line confirming you may shield to a
  *third party's* 0zk vs only your own. (404s on several docs.railgun.org deep links; treat as
  unverified.)
- **Namada shielding direction wording conflicts:** one search snippet says "sending address is
  shielded, receiving address is unshielded" while the Namada blog/docs say the shielding tx reveals
  the transparent sender + recipient payment address + amount. I did not fetch the canonical
  `docs.namada.net/users/shielded-accounts/shielding` page successfully to resolve which is exact.
- **stellar-private-payments relayer:** the contract has no relayer/fee abstraction; whether the
  surrounding app/SDK introduces a third-party submitter to hide the depositor/withdrawer was not
  confirmed in code.
- **Exact Stellar new-account minimum balance number:** base reserve is 0.5 XLM and the historical
  minimum is 1 XLM (2 base reserves), but the fetched accounts page did not state the integer; left
  unverified beyond "base reserve = 0.5 XLM, +0.5 per trustline."
- **Whether `transact`'s deposit can credit a recipient's note without the recipient pre-registering:**
  protocol supports `out_recipient_note_pubkeys`, but the exact UX requirement (recipient must publish
  an Account first, `pool.rs:146`) for cross-user deposits was not fully traced.

---

## Sources

**Local code (`/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments`):**
- `README.md:14-17` (WIP/unaudited), `:79-89` (ASP), `:96-110` (flows), `:116` (7-day events)
- `contracts/pool/src/pool.rs:535` (`transact` entry), `:541` (`require_auth`), `:555` (deposit
  transfer sender->pool), `:636` (withdraw transfer pool->recipient), `:78-97` (`Proof`),
  `:106-114` (`ExtData` = recipient/ext_amount/encrypted_output), `:146-154` (`Account` keys),
  `:200-209` (`NewCommitmentEvent`)
- `app/crates/platforms/web/src/protocol.rs:161` (`out_recipient_note_pubkeys`)

**Stellar docs:**
- Accounts / base reserve & trustline subentries — developers.stellar.org accounts data-structure doc
- Trustline required to receive USDC / `changeTrust` — developers.stellar.org `tokens/how-to-issue-an-asset`, `build/apps/.../manage-trust`
- SAC trustline rules, C-address storage, `trust` (Protocol 26), `AUTH_REQUIRED`, events — https://developers.stellar.org/docs/tokens/stellar-asset-contract
- InvokeHostFunction (contract id + args + events public) — https://developers.stellar.org/docs/learn/fundamentals/contract-development/contract-interactions/stellar-transaction ; Horizon op object
- Token Transfer Processor (asset movement = SAC events + ledger changes) — https://developers.stellar.org/docs/data/indexers/build-your-own/processors/token-transfer-processor

**Zcash:**
- https://zcash.readthedocs.io/en/latest/rtd_pages/addresses.html (t<->z visibility: value revealed on sender end for t->z, receiver end for z->t, hidden for z->z)
- bithide.io / Grayscale research (boundary amount+timing leak, IP at broadcast, KYC-link risk)

**Railgun:**
- https://docs.railgun.org/wiki/learn/shielding-tokens (shield requires amount + sending wallet address; sender pubkey broadcast publicly)
- https://docs.railgun.org/wiki/learn/privacy-system (shields/unshields are the only interactions with public info; Broadcaster appears as on-chain sender)
- Messari / Railgun Medium (broadcaster pays gas; user 0x not on tx; explorer hides amounts post-shield)

**Namada:**
- https://docs.namada.net/users/shielded-accounts (tnam vs znam, MASP, shield/unshield/shielded-shielded; same-account shield+unshield is traceable)
- https://namada.net/blog/shielding-the-multichain-how-namadas-data-protection-works ; docs `shielded-accounts/shielding` (shielding reveals transparent sender + recipient payment address + amount)

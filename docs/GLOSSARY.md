# Plain-English Glossary

A founder's-eye guide to the privacy and crypto terms behind our wallet. Every definition assumes you're smart but not a cryptographer. Where a term is unavoidable, it's defined the first time it appears.

---

## What Moonlight Protocol is (and how its privacy actually works)

**Moonlight Protocol** is a privacy wallet for payments built on Stellar (a public blockchain) by The Aha Company. It is a real, work-in-progress project: a browser-extension wallet, a developer toolkit, and on-chain smart contracts, funded with roughly $135,000 from the Stellar Community Fund. As of mid-2026 it is a testnet beta — XLM-only (Stellar's native coin), seed-phrase login, no USDC yet.

Here's the honest part most people skip: **Moonlight's privacy is statistical, not cryptographic.** It does NOT use zero-knowledge proofs — its own whitepaper explicitly rejects them as too heavy. Instead, privacy comes from two moves. First, it chops your money into random-sized chunks so a single payment is harder to match to you. Second, a mandatory middleman called a "Privacy Provider" submits your transaction for you, so your own wallet address never shows up on the blockchain. The catch: the amounts are still readable in plain text on-chain, and that Privacy Provider keeps off-chain records linking your identity to your activity (custodial compliance). So it hides you from outside observers, but not from the provider itself.

**Why it matters for our wallet:** Moonlight is the closest competitor and the clearest contrast — we use real zero-knowledge cryptography, so privacy doesn't depend on trusting a middleman who can see everything.

---

## Core privacy concepts

**Zero-knowledge proof (ZK)** — A way to prove a statement is true without revealing the underlying data. Think of proving you're over 21 without showing your birthday — just a yes/no answer that's mathematically impossible to fake. In crypto, it lets you prove a payment is valid without revealing the amount or who's involved.
*Why it matters for our wallet:* This is the engine of real privacy — it's how we keep transactions private without anyone (including us) needing to see them.

**Shielded / shielded transfer** — "Shielded" is Stellar's own word for a payment whose sensitive details are hidden using cryptography. A shielded transfer moves money between people while keeping amounts and addresses private. It's the honest term for what we do — narrower and more accurate than calling something "fully private."
*Why it matters for our wallet:* It's the precise language Stellar itself uses, so we describe our product the way the platform does — no overclaiming.

**Privacy pool** — A shared on-chain "pot" that many people deposit into and withdraw from. Once money is inside, payments between members can be hidden, because an observer can't tell which deposit connects to which withdrawal. The deposits and withdrawals at the edges are still visible; only the links inside the pool are obscured.
*Why it matters for our wallet:* This is the core structure that makes private transfers possible while still letting an operator screen out bad actors.

**Shield (deposit)** — The act of moving money *into* the privacy pool. This step is visible on-chain (everyone can see you put money in), but once it's inside, your later activity is hidden.
*Why it matters for our wallet:* It's the "enter privacy" button — the first step a user takes to make their funds private.

**Unshield (withdraw)** — The act of moving money *out* of the privacy pool back to a normal, public balance. Like shielding, the withdrawal itself is visible, but the trail of what you did inside the pool stays hidden.
*Why it matters for our wallet:* It's the "exit privacy" button — how users cash back out to spend or transfer publicly.

**Private transfer** — A payment made between two parties who are both already inside the privacy pool. Because it happens within the pool, the amount and the participants can stay hidden from outside observers.
*Why it matters for our wallet:* This is the actual private-payment moment — the feature users come for.

**Commitment** — A sealed, tamper-proof "receipt" posted on-chain when you put money in. It proves a coin exists without revealing its amount or owner — like a locked box everyone can see but no one can open.
*Why it matters for our wallet:* It's how the system tracks that your private funds exist without exposing what they are.

**Nullifier** — A unique one-time "spent" stamp. When you spend private funds, the system publishes a nullifier that marks that coin as used, so it can't be spent twice — but the stamp can't be traced back to the original deposit.
*Why it matters for our wallet:* It's the anti-double-spend safeguard that works without breaking privacy.

**Merkle tree** — A way of bundling many records into a single short fingerprint. You can prove one specific record is in the bundle without revealing the whole list — like proving your name is on a guest list without showing the rest of the names.
*Why it matters for our wallet:* It lets a user prove their deposit is genuine and in the pool, cheaply, without exposing every other deposit.

**View key / viewing key (selective disclosure)** — A special read-only key that reveals *your own* hidden transaction details to someone you choose — an auditor, an accountant, a tax authority — without giving them the power to spend. It's "selective disclosure": you decide who gets to look.
*Why it matters for our wallet:* It's how a privacy product stays compliance-friendly — users can prove their history when they need to, on their own terms.

**ASP (Association Set Provider) allow/deny list** — A maintained list that decides which deposits are allowed to participate in private transfers. It lets an operator include known-good funds and exclude flagged or sanctioned ones, so the privacy pool isn't a haven for illicit money.
*Why it matters for our wallet:* It's what makes privacy and compliance coexist — good actors get privacy, bad actors get screened out.

**Confidential Token (vs Privacy Pool)** — A different flavor of privacy on Stellar. A Confidential Token hides the *amounts and balances* but keeps the sender's and receiver's addresses publicly visible. A Privacy Pool does the opposite emphasis — it can hide the link between who paid whom. They solve different problems: one obscures "how much," the other obscures "who-to-whom."
*Why it matters for our wallet:* Knowing the difference lets us pick the right tool for each use case instead of treating "privacy" as one undifferentiated thing.

---

## Keys, login, and signing

**Seed phrase** — A list of ordinary words (typically 12 or 24) that is the master backup for a wallet. Anyone who has it can fully control the funds, and there's no "reset password" — if you lose it, the money is gone; if someone steals it, they take everything.
*Why it matters for our wallet:* It is our default recovery path. The app can make daily unlock smoother, but the seed phrase remains the thing that restores the wallet. There are no recovery secrets or support backdoors.

**Passkey** — The modern fingerprint or face-unlock login that replaces passwords for a specific unlock or signing action. Instead of typing a secret, you approve with your device's biometrics; the secret never leaves your device and can't be phished. It's the same login you already use on phones and laptops.
*Why it matters for our wallet:* It can be an optional faster unlock/signing layer. It does not replace the seed phrase, and it is not a recovery method unless the same passkey credential is actually synced and available on another device.

**WebAuthn PRF** — A real, shipped browser feature that lets a passkey produce a secret number tied to that exact passkey plus a chosen input. It's deterministic: the same passkey and same input always produce the same 32-byte (256-bit) secret, which can be turned into an encryption key. Real products like Bitwarden and Dashlane already use it to lock and unlock user data, and it works in current Chrome. In browser extensions, run the ceremony from a full extension page, tab, or side panel; extension popups can close when the credential prompt appears.
*Why it matters for our wallet:* It is the bridge that can turn an enrolled passkey into a convenience key for unlocking protected wallet data. In our current product decision, this is optional and seed-backed, not passwordless/seedless recovery.

**Spend key vs view key** — Two different powers, deliberately separated. The *spend key* can move your money; the *view key* can only *see* your hidden transactions. You keep the spend key tightly guarded, but you can safely hand out a view key to an auditor or accountant.
*Why it matters for our wallet:* Splitting "can see" from "can spend" is what makes safe, compliance-ready disclosure possible without ever risking the funds.

---

## Infrastructure and plumbing

**Relayer ("Privacy Provider")** — A middleman service that submits your transaction to the blockchain on your behalf, so your own wallet address never appears as the sender. In Moonlight's design this relayer is *mandatory* — you can't transact without one — and it logs who you are behind the scenes. A relayer can improve privacy, but if it's required and trusted, it's also a single point of control.
*Why it matters for our wallet:* It's the trust trade-off we're designed to avoid — real ZK means we don't need a mandatory middleman who can see everything.

**Soroban smart contract** — Soroban is the name of Stellar's smart-contract system — small programs that run on the Stellar blockchain and enforce rules automatically (like releasing funds only when conditions are met). Our privacy logic lives in Soroban contracts that verify proofs and move money on-chain.
*Why it matters for our wallet:* It's where our on-chain privacy rules actually run and get enforced — the trustworthy core of the system.

**Stellar Asset Contract / USDC on Stellar** — A Stellar Asset Contract (SAC) is the standard on-chain wrapper that lets a token like USDC be used inside Soroban smart contracts. USDC is the regulated, dollar-backed stablecoin from Circle; "USDC on Stellar" means real Circle dollars living natively on the Stellar network.
*Why it matters for our wallet:* It means users can hold and move real, stable dollars — not a volatile coin — through our privacy features.

**Circle CCTP bridge** — Circle's official system for moving native USDC between blockchains. Instead of creating a wrapped copy, it burns the USDC on the source chain and mints fresh, genuine USDC on the destination — so what arrives on Stellar is real Circle USDC, not an IOU. It's live on Stellar's testnet today (Stellar's "domain" in Circle's system is number 27).
*Why it matters for our wallet:* It's how a user can bring dollars from another chain (like Ethereum) and have them arrive natively on Stellar, ready to shield — a real, end-to-end demo we can show.

---

## The phrase to be careful with

**"Private by default" (and why it isn't literally possible)** — A tempting marketing line that means "everything is automatically hidden." On Stellar it's simply not true: Stellar's own docs state plainly that it's a public blockchain where every transaction is recorded and visible to anyone. Privacy exists only inside specific tools you opt into — Privacy Pools and Confidential Tokens — and even those don't hide everything (pool deposits and withdrawals stay visible; confidential tokens still show the addresses). The honest framing is "shielded transfers," not "a fully private wallet."
*Why it matters for our wallet:* Claiming "private by default" would be false and would erode trust — we describe exactly what's hidden and what isn't, which is both accurate and more credible.

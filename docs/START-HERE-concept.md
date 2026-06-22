# What We Could Build — in Plain English

> Current framing: this is a **privacy-by-default** wallet (not a dual public+private wallet). **Seed phrase is the default** onboarding, **passkey is optional**, there are **no recovery secrets**, the app is **mainnet-capable via config**, and **no final product headline/positioning is assumed**. Source of truth = [`.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`](../.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md) and [`.thoughts/research/2026-06-21-pov-answers.md`](../.thoughts/research/2026-06-21-pov-answers.md).

## 1. What we're building, in one paragraph

A web wallet first, with a browser extension as a later surface, that lets people **send money privately on Stellar** — a public blockchain run by a nonprofit, the Stellar Development Foundation. Normally every Stellar transaction is visible to anyone who looks; our wallet would let you move XLM and USDC so that private in-pool payments hide the sensitive details using real cryptography rather than trust in us. You create or import the wallet with a seed phrase as the default recovery path; if your browser/device supports it, you can optionally add a passkey for faster unlock and signing. We'd build it for the **"Stellar Hacks: Real-World ZK"** hackathon — a confirmed, real contest run by the Stellar Development Foundation on the DoraHacks platform, with a **$10,000 prize pool** (paid in Stellar's XLM token) and a submission deadline of **29 June 2026, 19:00 UTC**. To qualify we need a public code repository with a clear README, a 2–3 minute demo video, and genuine use of "zero-knowledge" cryptography tied to Stellar.

A quick term, since everything hinges on it: **zero-knowledge proof (ZK)** is a math technique that lets you prove a statement is true *without revealing the underlying data*. Think of proving "I'm over 21" without showing your birthdate. Here, it lets the network confirm "this private payment is valid and not double-spent" without seeing the amount or the people involved.

## 2. How private payments actually work here — and honestly what's hidden vs. visible

The flow has three steps. Picture a frosted-glass pool of money:

1. **Shield (deposit in):** You move some USDC *into* a shared privacy pool — a smart contract everyone can see. **This step is visible.** Anyone watching the blockchain sees "this address put X dollars into the pool."
2. **Private send (inside the pool):** You send money to someone else who is also in the pool. **This step is hidden.** A zero-knowledge proof, generated *on your own computer*, convinces the network the transfer is legitimate without revealing the amount or the recipient. To outsiders, money sloshes around inside the frosted glass but they can't see who paid whom or how much.
3. **Unshield (withdraw out):** The recipient pulls money back *out* of the pool to a normal address. **This step is visible again** — "this address took Y dollars out."

**The honest framing — this matters for the founder and for not overselling to judges:** Stellar's own developer documentation states plainly that *"Stellar is a public blockchain: every transaction is recorded onchain and visible to anyone."* You **cannot** make a "fully private wallet" where everything disappears. What you genuinely get is **shielded transfers** (Stellar's own word is "shielded") — the *link* between who put money in and who took it out is broken, and *in-pool* payments are private. Deposits and withdrawals themselves remain public. We should describe it exactly that way and never call it "fully private" or "anonymous."

There is a second, complementary Stellar privacy tool worth knowing exists: **Confidential Tokens**, which hide *amounts and balances* but keep sender/recipient addresses public — the inverse trade-off. Our build leans on the Privacy Pools model, where the people are hidden but pool entry/exit is visible.

## 3. What already exists that we will reuse (so we are NOT inventing cryptography)

This is the heart of why this is buildable in a week. Four real, verified pieces do the hard parts for us:

- **Nethermind's privacy pool (the big one).** `NethermindEth/stellar-private-payments` is a working, public reference implementation of privacy pools on Stellar. It already does browser-based proof generation (the math runs in your browser via WebAssembly — compiled code that runs fast in a web page), has an on-chain proof-verifier smart contract, and is **deployed on Stellar's free testnet** moving real test XLM. **Important honesty flag:** the Nethermind team itself labels it work-in-progress and explicitly says it has **not been security-audited** — so it's a foundation to learn from and build on, not something to put real money through. (It also ships under the brand name "PoolStellar" in its live demo — same project.)

- **Stellar's built-in ZK math.** In a network upgrade called **Protocol 25 (code-named "X-Ray," live January 2026)**, Stellar added native cryptography building blocks (the BN254 curve operations and Poseidon hash functions) directly into its smart-contract engine — the same primitives Ethereum uses, so existing ZK tooling works. A follow-up, **Protocol 26 ("Yardstick," live May 2026)**, made checking proofs meaningfully *cheaper*. Translation: verifying a privacy proof on Stellar is now fast and affordable instead of prohibitively expensive. We don't implement this math; we call it.

- **Optional passkey unlock and signing.** Since **Protocol 21 (June 2024)**, Stellar smart contracts can verify passkey signatures (fingerprint/face unlock, via the WebAuthn standard). An open-source toolkit, `passkey-kit`, makes passkey-controlled wallets buildable. **Honesty flag:** its author has marked it "legacy" and unaudited and points new builders to a successor, `smart-account-kit`, built on audited OpenZeppelin contracts — we'd prefer the successor.
  - Separately, a real shipped browser feature called the **WebAuthn PRF extension** lets a passkey produce a stable secret number that can help unlock encrypted wallet data. In our product this is an optional convenience layer over a seed-backed wallet, not the recovery source. Exact availability depends on the user's browser, operating system, and authenticator, so it is not a single clean "works everywhere" switch.

- **Circle's USDC bridge.** Circle's CCTP is live on Stellar with **native USDC** and documented testnet contracts — so we can bring real digital dollars onto Stellar without inventing a bridge. (More in section 5.)

- **Tooling for the later extension:** **WXT** (wxt.dev) is a genuine, actively maintained framework for building browser extensions with React + TypeScript. The extension still needs its own proving/passkey spike because Manifest V3 service workers are a constrained runtime.

## 4. Who else built something similar (Moonlight) — and how we'd differ

**Moonlight Protocol** is the closest existing thing: a real, funded privacy-payments project on Stellar by The Aha Company, with ~$135,000 from the Stellar Community Fund, a public GitHub org (17 repos), a browser-extension wallet, and a testnet beta — actively worked on as recently as mid-June 2026. It's name-checked in Stellar's own privacy blog. We should respect it as serious prior art.

Here's the **fair, specific difference**, all verified:

- **Moonlight does NOT use zero-knowledge proofs.** Its own whitepaper explicitly rejects ZK as too heavyweight, and there's zero ZK code in its repos. Its privacy is *statistical*, not cryptographic: it chops your funds into random-sized chunks to make tracing harder.
- **Moonlight requires a mandatory trusted middleman.** A "Privacy Provider" must co-sign and submit every transaction. That provider keeps **off-chain logs linking your identity to your activity** (custodial-style compliance). So your address is hidden from outside observers, but the provider itself can see what you did.
- **Amounts are plaintext on its blockchain** — the actual numbers are visible on-chain.
- **Its beta is seed-phrase only, XLM-only, no USDC.**

**Our differentiators, stated plainly:** (a) *real ZK proofs* (the very thing the hackathon rewards, and the thing Moonlight skipped); (b) *no mandatory trusted middleman holding identity logs* — the proof is generated on the user's own machine; (c) *optional passkey unlock/signing* on top of a seed-backed wallet; (d) *real USDC*, not just XLM. This isn't "Moonlight is bad" — it's a genuinely different and arguably more private architecture, and it lines up exactly with what this specific ZK hackathon is asking for.

(One fairness note for accuracy: Moonlight's repos are publicly viewable but carry no formal open-source license file, so "open source" is only loosely true of it. Not a knock — just precision.)

## 5. The cross-chain part — what's realistically demoable using an existing bridge

The compelling story is: **"a digital dollar leaves Ethereum and arrives, natively, on Stellar — then gets shielded for private spending."** Here's the honest read on what's real today.

**What's solidly real on testnet:** Circle's CCTP "burn-and-mint" bridge is live on Stellar. We can get free test USDC, "burn" it on Ethereum's test network (Sepolia), and have native USDC **minted onto Stellar's testnet** — every leg producing a real transaction you can click through to a block explorer. This bridging leg is **not a mock.**

**The catch (and we must be honest about it):** making "arrive on Stellar" and "get shielded" happen **automatically in one single transaction is the risky, hard part.** Circle's Stellar tool only does a plain transfer of the USDC to a recipient after minting — it does *not* automatically call our privacy pool's "deposit" function. Verified from Circle's actual source code.

**So the recommended, low-risk demo is two clearly-separate steps on the Stellar side:**
1. CCTP mints native USDC to the user on Stellar testnet (real bridge).
2. A *separate* Soroban transaction shields it into the privacy pool.

Both legs are real on testnet. The UI shows a clean progress timeline — Ethereum burn → Circle attestation → Stellar mint → shield — each step linking to a real explorer. That's a strong, honest demo narrative. The fully-automatic single-flow version is *possible* but depends on the privacy pool being rewritten to "catch" incoming USDC, which is non-standard and probably more than a week of work.

(One thing to not conflate: this CCTP flow brings *real Circle USDC*, which is a different asset from the dUSDC test token used in your existing Predict project.)

## 6. The choices YOU need to make

These are real forks in the road. I've given a recommendation for each, but none is a lock-in — they're yours to decide.

**Decision A — Do we include the cross-chain bridge at all, or keep it Stellar-only?**
- *Include it:* much stronger "real-world" story (real dollars crossing chains), which fits the hackathon's "Real-World ZK" theme. Costs extra time learning two different toolsets (Ethereum + Stellar) and adds moving parts that can break on stage.
- *Stellar-only:* simpler, faster, fewer failure points; the ZK privacy is still the headline.
- **My recommendation:** Include the bridge **but as the safe two-step version**, and only if the core shield→send→unshield loop is already working first. The bridge is a great closer, not the foundation. Build it last; cut it without regret if time runs short.

**Decision B — Do we reuse Nethermind's privacy pool, or write our own?**
- *Reuse:* fastest path; the cryptography is already done and deployed on testnet. Downside: it's unaudited and we're standing on someone else's WIP.
- *Write our own:* more "ours," but writing and deploying a ZK shielded-pool contract is the single biggest time sink and the likeliest thing to fail.
- **My recommendation:** **Reuse Nethermind's pool** as the engine and make *our* novel contribution the **wallet experience** — optional passkey unlock/signing, the clean shield/send/unshield UX, and the bridge. Building cryptography from scratch in a week is how hackathon projects die. (We'd clearly credit Nethermind.)

**Decision C — When do we add optional passkey unlock?**
- *Passkey early:* a real "wow" moment and genuinely shipped tech. Risk: passkey behavior varies by browser/OS/authenticator, which can eat debugging time.
- *Seed path first:* get the privacy loop working from the default seed-backed wallet, add passkeys once the core works.
- **My recommendation:** **Build the privacy loop from the seed path first, then layer passkeys in** as a fast-follow once the core works. Use the *successor* `smart-account-kit`, not the legacy one, if we add passkey smart-account auth. Keep passkeys high on the list — they're a strong demo moment — but don't let them block the core.

**Decision D — What do we shield: USDC or XLM?**
- *USDC:* the "real digital dollars" narrative, and the only way the cross-chain bridge makes sense (CCTP moves USDC).
- *XLM:* what Nethermind's deployed testnet pool already moves today (its pool uses native XLM), so it's the path of least resistance.
- **My recommendation:** If we do the bridge, the demo naturally wants **USDC**. If we skip the bridge, **XLM is the lower-friction choice** because the existing pool already handles it. Decide this *together with* Decision A — they're linked.

**Decision E (lighter) — Browser extension, or a normal web app?**
- *Extension:* matches the "wallet" mental model, differentiates from Moonlight, and WXT makes it pleasant. Slightly more setup.
- *Web app:* fastest to demo, easiest to record a video of.
- **My recommendation:** **Web app first, extension via WXT second.** A web app demonstrates the same ZK substance and is easier to test/film; the extension increases the wallet feel but has extra Manifest V3 runtime risk.

## 7. Honest risks / what could be hard

- **The biggest unknown is atomic mint-and-shield**, not the bridge itself. Doing it in one transaction needs the privacy pool rewritten to "catch" incoming funds — non-standard on Stellar. *Mitigation:* default to the two-step demo; both steps are real.
- **The privacy-pool contract is the real scope risk.** If we ever decide to write our own instead of reusing Nethermind's, that single task likely eats the whole week. *Mitigation:* reuse and credit.
- **Nothing here is security-audited** — Nethermind's pool and the passkey kits both carry explicit "not audited" warnings. This is fine for a testnet hackathon demo but must be stated clearly; never imply it's safe for real money.
- **Two different blockchain toolsets** (Ethereum-style for the burn, Stellar/Soroban for the mint and shield) is a learning curve if the team is new to one side. Signing, fees, and auth on Stellar's Soroban differ from Ethereum.
- **Cross-chain address encoding is fiddly** — the two chains format addresses differently, and getting it wrong makes the bridge silently fail. Budget debugging time.
- **Bridge latency:** Circle requires the source chain to finalize before it attests, which can take minutes. The UI needs a proper "waiting…" state; don't assume instant.
- **Passkey availability varies** by browser/OS/authenticator — it's not one clean on/off switch, so test on the exact setup we'll demo with.
- **A couple of exact technical details (specific Ethereum testnet contract addresses, the precise Circle polling endpoint) were not independently verified here** and should be pulled fresh from Circle's live docs at build time rather than trusted from memory.
- **Deadline is real and firm: 29 June 2026, 19:00 UTC**, and we *must* ship a public repo with README plus a 2–3 minute video. The ZK has to be genuinely load-bearing, not decorative — which, given we're building on real proofs, it will be.

**Bottom line:** Almost every hard, scary piece — the ZK math, the privacy pool, the bridge, the passkey crypto — already exists and is verified real on Stellar's free testnet. Our job is assembly and a great honest user experience, not inventing cryptography. The main discipline is sequencing: get the private-payment loop working first, then add the crowd-pleasers (passkeys, the bridge) as time allows.

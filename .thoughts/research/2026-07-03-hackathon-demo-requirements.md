# Hackathon Demo Requirements — Stellar Hacks: Real-World ZK

Date: 2026-07-03. Research only. Sources fetched live from the DoraHacks page (HTML via curl; page blocks plain fetchers with HTTP 405).

## Part 1 — THE FACTS

Live page: https://dorahacks.io/hackathon/stellar-hacks-zk (hackathon id 2198, organizer: Stellar Development Foundation, 582 registered hackers, Virtual).

### Deadline — EXTENDED TO TODAY, 2026-07-03 17:00 UTC

The event-timeline widget on the live page reads, verbatim:

> Submission deadline extended
> Submission 2026/06/15 07:00 · Deadline 2026/06/29 19:00 · Extended 2026/07/03 17:00

Timezone evidence: the page body's "Key Dates" section says "Submissions Open: June 15, 12:00AM PST / Submission Deadline: June 29, 12:00PM PST" while the widget renders those same moments as 07:00 and 19:00 — i.e. the widget renders UTC (12:00 PDT = 19:00 UTC). So the extended deadline is **2026-07-03 17:00 UTC = 10:00 AM PDT = 17:00 GMT today**. The original June 29 deadline did NOT stand — it was extended ~4 days.

Current phase: submission window still open (the "Submit BUIDL" button is live; page JSON shows `winnerAnnounced: false`). No judging-period or results dates are published anywhere on the page.

### Judging criteria and weights

**None are published.** The page JSON contains a single track: `{"name":"[DEFAULT_TRACK]","description":"","judgingCriteria":"","weight":0}` — the judgingCriteria field is empty. The detail page states there is "a single open innovation track" and no criteria/weights section exists on any tab. The only judge-intent language is in the submission requirements and ideas copy (below). Do not cite specific weights anywhere — they don't exist.

### Submission requirements (verbatim from the Details tab)

Sidebar badges: "GitHub/Gitlab/Bitbucket Link Required" and "Demo Video Required".

> "We're keeping requirements deliberately light. To be eligible, your submission needs:
>
> **An open-source repo.** A public GitHub, GitLab, or Bitbucket repository with your full source code and a clear README.md explaining what you built. The more detail, the better — and if something's unfinished or you used mock data in places, just say so in the README. We'd rather see an honest work-in-progress than a polished mystery.
>
> **A short demo video.** A 2–3 minute walkthrough showing what you built. It doesn't need to be heavily technical or produced — just clearly show the project working and explain what ZK is doing in it. You do not have to be in the video.
>
> **ZK + Stellar.** Your project should use zero-knowledge cryptography in a meaningful way, and it should touch Stellar — for example, verifying proofs in a contract, or otherwise integrating Stellar testnet or mainnet. The ZK should be load-bearing: it powers a real part of how the project works, rather than appearing only on a slide.
>
> That's it. No mandatory framework, no required boilerplate contract to call, no specific track to fit into."

No live-demo-link requirement is stated. No other BUIDL-page field requirements are listed beyond repo + video (standard DoraHacks BUIDL fields — name, description, links — apply at submit time).

### Demo-video-specific guidance (verbatim, this hackathon)

- "A 2–3 minute walkthrough showing what you built."
- "just clearly show the project working and explain what ZK is doing in it."
- "You do not have to be in the video."

### Judge-intent signals from the organizers' own copy

- "as long as ZK is doing real work in it (not just namechecked in the README)" (Details).
- "Stellar is best known for moving real money in the real world — stablecoins, cross-border payments... projects that bring ZK to those kinds of real-world use cases are a natural fit and especially welcome." (Details)
- Ideas tab closer: "'Mild' projects win hackathons all the time when they're sharp and well-executed. Pick something you can actually ship in the time you have, make the ZK genuinely essential, and document it clearly."
- Ideas tab "Wild" tier explicitly names our exact concept: "**Fully shielded stablecoin wallet.** A consumer-grade wallet where everyday USDC payments are private by default, with client-side proof generation, compliant disclosure built in, and a UX an ordinary person could actually use."

### Prizes and sponsors

"First Place: $5,000 in XLM · Second: $2,000 · Third: $1,250 · Fourth: $1,000 · Fifth: $750" — $10,000 total, single open track. Sole sponsor: Stellar Development Foundation (no Nethermind bounty/track; page JSON: `bounties: [], bountyCount: 0`). Nethermind appears only as a resource author: the Resources tab lists `NethermindEth/stellar-private-payments` ("Nethermind's proof-of-concept Privacy Pools implementation... Caution: research prototype, not audited") and `NethermindEth/stellar-risc0-verifier`.

Support channels: Stellar Dev Discord #zk-chat (https://discord.gg/stellardev), Stellar Hacks Telegram (https://t.me/+e898qibDUVExODkx).

### What I could NOT verify

- Exact judging criteria/weights (empty on the platform — confirmed absent, not just unfound).
- Judging window / results-announcement date (not published).
- Whether a further extension exists beyond 2026-07-03 17:00 UTC (page shows only the one extension as of fetch time today).

Sources: https://dorahacks.io/hackathon/stellar-hacks-zk/detail · /resources · /ideas (fetched 2026-07-03); https://dorahacks.io/blog/news/dora-hackathons

## Part 2 — Demo craft (winning sub-5-minute crypto demos)

Sources: ETHGlobal official event guidance (https://ethglobal.com/events/ethonline2025/info/details, https://ethglobal.com/events/ethonline2023/info/details); DoraHacks judging guides (https://dorahacks.io/blog/guides/hackathon-judge/, https://dorahacks.io/blog/guides/hackathon-judging-plan); James Bachini — ETHGlobal winner and author of this hackathon's official E2E tutorials (https://jamesbachini.com/ethglobal-hackathon/).

**Structure that works in 2–3 minutes:**
- ≤20 seconds on intro/backstory (ETHGlobal: "Keep introductions short — you don't need to spend more than 20 seconds"). One sentence of problem → straight into the product.
- Bulk of the video = the live product working. ETHGlobal judge criteria are Practicality ("could it be used by its target audience today?"), Usability, and WOW factor — all three are demonstrated by watching the app run, not by slides.
- Cut all dead time: "Show your project in action and skip any unnecessary waiting (like MetaMask confirmations)" (ETHGlobal). Jump-cut wallet popups, proof generation waits, block confirmations — show them start, cut to done with a timer caption if speed matters.
- Architecture gets ~15–30 seconds, one diagram, placed AFTER the demo — enough to establish the ZK is real, no more. For this hackathon the copy literally asks you to "explain what ZK is doing in it," so name the moment: "this button generates a Groth16 proof client-side; here's the verifier contract call on testnet."
- Show on-chain evidence explicitly: DoraHacks judges flag "submission lacks working demo" as a red flag and reward "complete integration" — flash the explorer tx for shield/unshield, the deployed verifier contract ID, real testnet hashes. Seconds each, but they convert skeptics.
- Team info: one slide at the very end, if at all (DoraHacks guidance: don't spend talk time on the team).
- Audio: clear voice, no echo, unhurried pace (ETHGlobal). Judges watch async at 1x with no patience for mumble.

**What judges skip:** long intros, roadmap/tokenomics, code scrolling, anything they can't see working. Async first-round judging (ETHGlobal model) means the video is a screening filter — if the product isn't visibly working by ~40 seconds, you've lost the judge.

**Practical for ZK Freighter:** open on a real person's problem (public Stellar payments expose salary/balances), do one full shielded USDC send end-to-end in the redesigned UI, cut proof-gen wait, show the explorer proving amounts/counterparties are hidden while shield/unshield boundaries are public, 20s on the Noir/Groth16 + Soroban verifier architecture, close with what's real vs. testnet-only. Honest scoping is explicitly rewarded: "We'd rather see an honest work-in-progress than a polished mystery."

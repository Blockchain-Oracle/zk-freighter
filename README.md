# ZK Fighter

A **privacy-by-default**, self-custody **zero-knowledge** wallet for **shielded** payments on Stellar. Your identity is your private keys; the only public moments are shield-in (deposit) and unshield-out (withdraw). We build the privacy layer only — NOT a duplicate general-purpose public wallet. Honest framing: these are *shielded transfers*, not a "fully private" chain.

Built for **Stellar Hacks: Real-World ZK** (DoraHacks, sponsored by the Stellar Development Foundation). **Deadline: 2026-06-29 19:00 UTC.** Requirements: public repo + README, 2–3 min demo video, load-bearing ZK touching Stellar. Testnet is fine.

> **Status:** Phase 11 now has a WXT MV3 extension scaffold with a passing production build, Chrome-for-Testing runtime smoke, offscreen Nethermind browser/WASM module initialization, dry XLM deposit proof generation, real extension QuickShield XLM and USDC shield/deposit transactions on testnet and mainnet, bridge handoff runtime evidence, and Freighter-style detection/network responses that fail closed for external public-key access and signing. The extension is a QuickShield + bridge companion, not a general public dApp signing wallet. The web app remains the safest judged surface unless Abu chooses to include the extension in the final demo. The app includes seed-backed identity, encrypted local vault, deterministic `zkf1...` receive codes, real testnet shield/unshield/send/disclosure/passkey slices, and CCTP bridge-then-shield evidence for Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and OP Sepolia. The bridge code now has source-chain selection for Ethereum, Base, Arbitrum, and OP CCTP routes, with accepted approval, burn, Stellar mint/forward, extension-offscreen ASP insertion, and USDC shield/deposit hashes for each configured testnet source. Atomic bridge-and-shield is deferred until a custom adapter passes real tests. See [`.thoughts/research/spikes-log.md`](.thoughts/research/spikes-log.md) for hashes and runtime evidence, [`.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md`](.thoughts/research/2026-06-24-phase9-atomic-bridge-shield-decision.md) for the atomic decision, [`.thoughts/plans/2026-06-25-multichain-cctp-bridge-plan.md`](.thoughts/plans/2026-06-25-multichain-cctp-bridge-plan.md) for the multichain bridge path, and [`.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`](.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md) for the extension boundary.

> **Mainnet note:** Mainnet XLM/USDC SACs, Circle CCTP contract IDs, public USDC plumbing, ZK Fighter XLM/USDC pool deployments, extension QuickShield XLM/USDC shield/deposits, and XLM/USDC shielded transfer + public unshield smokes are recorded. Mainnet bridge-to-shield still needs its own accepted hashes before being claimed. See [`.thoughts/research/2026-06-25-mainnet-readiness.md`](.thoughts/research/2026-06-25-mainnet-readiness.md) and [`.thoughts/research/spikes-log.md`](.thoughts/research/spikes-log.md).

> 🤝 **CODEX HANDOVER — START HERE:** [`.thoughts/handoffs/2026-06-22-codex-build-prompts.md`](.thoughts/handoffs/2026-06-22-codex-build-prompts.md), one phase at a time.

## Where everything lives (handover map)

| Path | What |
|---|---|
| [`docs/START-HERE-concept.md`](docs/START-HERE-concept.md) | **Read first.** Plain-English concept, how privacy works here, how we differ from Moonlight, the choices. |
| [`docs/SUBMISSION-PACKAGE.md`](docs/SUBMISSION-PACKAGE.md) | Judge-facing project summary, evidence digest, demo script, and non-claims. |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Every term in plain English (ZK, shielded, passkey, view key, the bridge, etc.). |
| [`docs/VERIFIED-FACTS.md`](docs/VERIFIED-FACTS.md) | Anti-hallucination record: every claim, confirmed/corrected, with sources. |
| [`.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`](.thoughts/specs/2026-06-22-zk-fighter-product-spec.md) | **The locked product spec**: MVP, validation gates, non-goals, risks, open questions. |
| [`.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`](.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md) | **Testable product stories** traced to spec requirement and acceptance IDs. |
| [`.thoughts/quality/2026-06-22-project-quality-profile.md`](.thoughts/quality/2026-06-22-project-quality-profile.md) | **Quality gates** for web, contracts, proofs, network evidence, CI, hooks, and file-size policy. |
| [`.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`](.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md) | **The current implementation plan** traced to spec, stories, quality gates, and research. |
| [`.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md`](.thoughts/plans/2026-06-21-stellar-zk-wallet-plan.md) | Earlier build plan retained as historical context. |
| [`.thoughts/research/`](.thoughts/research/) | 8 build-readiness reality briefs (facts-only, cited) + `00-INDEX-build-readiness.md`. |
| [`.thoughts/research/exploratory/`](.thoughts/research/exploratory/) | Earlier exploratory research (01–09): tech reality, wallet arch, prior art, Moonlight teardown, etc. |
| [`reference/`](reference/) | Cloned reference repos (gitignored; on disk for grep). See below. |

### Key reference repos (in `reference/`)
- `stellar-private-payments` — **the ZK engine we reuse** (Nethermind Privacy Pool; Rust→WASM, Circom/Groth16, on-chain BN254 verifier, ASP contracts). Deployed XLM pool on testnet.
- `freighter` — canonical Stellar extension-wallet architecture + dApp bridge reference; not the product direction for ZK Fighter.
- `xbull-wallet` — open-source Stellar extension-wallet reference for permissioned site connection/signing UX; reference-only.
- `stellar-build`, `stellar-ecosystem-resources` — Stellar ecosystem/project discovery and connect-wallet references; reference-only.
- `passkey-kit`, `smart-account-kit` — Stellar passkey smart accounts (secp256r1).
- `stellar-cctp` — Circle CCTP V2 (USDC bridge Ethereum↔Stellar).
- `openzeppelin-stellar-contracts-confidential` — OpenZeppelin/SDF Confidential Tokens preview branch (SEP-41 wrapper, Noir/UltraHonk, reference-only).
- `browser-wallet`, `moonlight-sdk`, `soroban-core`, `*-platform`, `ui`, `landing-page`, `network-dashboard` — **Moonlight Protocol** (the competitor; not ZK — fragmentation + mandatory trusted relayer).
- `soroban-examples` (groth16_verifier), `stellar-risc0-verifier` — verifier references.

## Locked decisions
- **Privacy-by-default** — build the privacy layer only; do NOT rebuild general public-wallet functionality.
- Real ZK (reuse Nethermind pool; novelty = the privacy wallet experience + compliance + CCTP-to-shield flow).
- Shield **both USDC and XLM** (one pool per asset).
- **Web app first, browser extension second** (extension is the riskier surface for in-browser proving + passkey).
- **Seed phrase is the default onboarding; passkey is optional** (deterministic via PRF, same-wallet only via synced credential). **No recovery secrets** — lose your phrase, it's gone.
- **Build mainnet-capable** — network is a config toggle (testnet ↔ mainnet, no code change); mainnet XLM and USDC have QuickShield, shielded transfer, and unshield evidence; bridge-to-shield still needs separate evidence before demo claims.
- Cross-chain USDC via **Circle CCTP** if included (never build our own bridge).
- Private receive code is locked to Bech32m HRP `zkf`, rendered as raw `zkf1...` text/QR.
- Ship real, network-verified; **no mockups in the judged path.**

**Remaining founder calls (not assumed):** exact optional public-discovery warning copy, demo network posture for final video, and which mainnet features are enabled before submission.

## Submission posture

- **Recommended demo network:** Stellar testnet + Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and OP Sepolia are recorded full bridge-to-shield evidence paths.
- **Mainnet posture:** XLM/USDC pools are deployed/configured. Mainnet XLM/USDC QuickShield, shielded transfer, and unshield are proven with accepted hashes. Mainnet bridge-to-shield must not be claimed until separate evidence is recorded.
- **Atomic bridge-and-shield:** deferred. The proven bridge path is public CCTP arrival, then separate USDC shield/deposit.
- **Extension posture:** WXT MV3 scaffold/build, Chrome-for-Testing runtime smoke, extension offscreen dry proof generation, receive-code QR/copy, real extension QuickShield XLM and USDC shield/deposit, reusable local USDC funder automation, and web bridge handoff runtime evidence are implemented under `apps/extension`. Freighter-style external public-key access and signing intentionally fail closed. Extension passkey, Wallets Kit detection/branding, Soroban auth-entry signing, SEP-0053 message signing, extension-native Ethereum bridge, and Chrome Web Store packaging remain deferred.
- **Unaudited warning:** this is hackathon software built on research/reference implementations. Do not use for real funds.

## Evidence table

| Flow | Network | Evidence |
|---|---|---|
| USDC shield | Stellar testnet | `8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405` |
| USDC shielded transfer | Stellar testnet | `3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698` |
| USDC unshield | Stellar testnet | `9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed` |
| Sepolia USDC approval | Ethereum Sepolia | `0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e` |
| Sepolia CCTP burn | Ethereum Sepolia | `0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f` |
| Stellar CCTP mint/forward | Stellar testnet | `3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790` |
| ASP membership insert | Stellar testnet | `b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64` |
| Post-bridge USDC shield | Stellar testnet | `30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d` |
| Base Sepolia USDC approval | Base Sepolia | `0xd8b1724e3b65a8169b033aba17eb0536babf38fcddad0f9ae78dfe8870681d3e` |
| Base Sepolia CCTP burn | Base Sepolia | `0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63` |
| Base Stellar CCTP mint/forward | Stellar testnet | `08df05fe661f35dcf42c5ab054ae2bd404ed31091a629d963647ca3d5b293e11` |
| Base post-bridge USDC shield | Stellar testnet | `b1e1ca6e81fb34d2d7218099722c0f9b76e3a7a2debf29e90701592da6acd87a` + `6e9369c5c9e0d3d5226f0af63ec75f4ec49176ede1cc7c0f0b19ce004dda215d` |
| Arbitrum Sepolia USDC approval | Arbitrum Sepolia | `0x53d17d1ada27bae89036cce765173984b20e1edc24b5c1e8fa872524e4b210a4` |
| Arbitrum Sepolia CCTP burn | Arbitrum Sepolia | `0xcf0c0e093fc3fc8cfa8310e1b423e400fb157aa263b6d5187488f9d053a2b3a7` |
| Arbitrum Stellar CCTP mint/forward | Stellar testnet | `730edcfa3b3eddf279f5dc0dd338ef3aa9f96616e0efcbe2f709abefad5e16d1` |
| Arbitrum ASP membership insert | Stellar testnet | `8a13e5a8d91e447f3ee9a8156be5ab33fa0bdb89a6a91ef0be0f4ce8f523d60b` |
| Arbitrum post-bridge USDC shield | Stellar testnet | `a2aa117ef0973f979cad85b3c4387fd056d99d5f3fe20af8de107a502c924648` |
| OP Sepolia USDC approval | OP Sepolia | `0x2e264ca0dbfee0865ae9e32ddd9702693f2b39c37c21804e781d86a96a2111f4` |
| OP Sepolia CCTP burn | OP Sepolia | `0x817d31c2af0407e35b1279ec731e50ff3665431a444ca5b271e2e3691c2e0a82` |
| OP Stellar CCTP mint/forward | Stellar testnet | `dc1c3f77bacf4da21035c3059dbb5dae81bc9e8f3dfd83477a5c0fe9069f8b1f` |
| OP ASP membership insert | Stellar testnet | `3fb620d5ecf5eaa90cdcff3a6b5890b389b2ac79d199c45d36e1e81698b9958c` |
| OP post-bridge USDC shield | Stellar testnet | `8205379a7d00710820b1b7e96a2eac6c4b7816b29185771bd00328abd18e1344` |
| Extension QuickShield XLM setup | Stellar testnet | `a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90` |
| Extension QuickShield XLM shield | Stellar testnet | `a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b` |
| Extension QuickShield USDC receive setup | Stellar testnet | `258d671b27b36196d6b0d31a94a686bb07251ea2ceba5db654879383d7555adc` |
| Reusable extension USDC funder setup | Stellar testnet | `9865511b6e57101563dc1ab574cc997ea8559210cf5718a39d11a8f003a9cbf8` |
| Extension QuickShield USDC fund transfer | Stellar testnet | `b8b17c66909ad24d6986408badacfc6986051c281a44a54e9c30d1e4243098cf` |
| Extension QuickShield USDC setup | Stellar testnet | `4fdc92e9df466d506a3e0c0237f2fd87eddbe65a788a260efaed78b8511b2cfa` |
| Extension QuickShield USDC shield | Stellar testnet | `0bc63cf0b7212d961d880acae3a3b72ae939e2a0fdf65c538b828684f6010e17` |
| Mainnet USDC trustline | Stellar mainnet | `ca4fe0556c8a71c32c4634c3e8ad282a230e71377c6d7771e50daced7aeb4ef7` |
| Mainnet XLM to USDC path payment | Stellar mainnet | `439b8b609c03ab890da55912529b767eeb6974128d9c9afbdf860416f9ecefae` |
| Mainnet ASP permission toggle | Stellar mainnet | `2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a` |
| Mainnet Extension QuickShield XLM setup | Stellar mainnet | `8afa10dbcf6c82ba56f0f0abf96d00e5af55190f9a985aecc52147c34271c3ce` |
| Mainnet Extension QuickShield XLM shield | Stellar mainnet | `269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179` |
| Mainnet Extension QuickShield USDC receive setup | Stellar mainnet | `1acef069110b3015b72c8ad5df13b9647480e3af952188581921e56cfae555e5` |
| Mainnet Extension QuickShield USDC fund transfer | Stellar mainnet | `8581307efcb3ad4f1ed9b9789f595cf6c1a44018dc62432d6372b4463adcd658` |
| Mainnet Extension QuickShield USDC setup | Stellar mainnet | `84c33d8ff7798a5be616b0c402265be9cbd9518674dd75f00443cfdc1e56d65c` |
| Mainnet Extension QuickShield USDC shield | Stellar mainnet | `a3fb0596b7cf5d79f093dcca9ff4faa6c5975499a1d36afdcf1a893f554aedcb` |
| Mainnet XLM shielded transfer | Stellar mainnet | `5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd` |
| Mainnet XLM unshield | Stellar mainnet | `df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70` |
| Mainnet USDC shielded transfer | Stellar mainnet | `5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1` |
| Mainnet USDC unshield | Stellar mainnet | `2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b` |
| Extension bridge handoff | Local Chrome runtime | `pnpm extension:bridge` opened `http://localhost:5173/?zkfAction=bridge&network=testnet&destination=...&resumeBurnHash=...` |
| Extension offscreen dry proof | Local Chrome runtime + Stellar testnet ASP | `pnpm extension:runtime:deep` generated a dry XLM proof after ASP insert `f18a1e7666ef827da5636d810ba26afc4d3808bf8d56a6b2249cbe7b2aaaec17` |

Full evidence, explorer links, balances, and failure notes live in [`.thoughts/research/spikes-log.md`](.thoughts/research/spikes-log.md).

## Demo script

1. Create or unlock the seed-backed wallet and show the visible network badge.
2. Copy the raw `zkf1...` private receive code and QR.
3. Show USDC shielded-loop evidence: public shield, shielded transfer, public unshield.
4. Show load-bearing ZK: valid proof accepted and tampered proof rejected.
5. Show the bridge panel: source-chain selection, recorded Ethereum/Base/Arbitrum/OP testnet approvals and burns, Iris attestations, Stellar mint/forward transactions, then separate USDC shields.
6. Show disclosure/export as user-held compliance evidence.
7. State the boundaries: bridge, shield/deposit, and unshield/withdraw are public; shielded transfers happen inside the pool.

## Credits and licenses

- Nethermind `stellar-private-payments` supplies the privacy-pool engine, browser prover path, circuits, and Soroban contracts. Its README states a mixed license structure: mostly Apache-2.0 with `circuits/build.rs` under LGPLv3.
- Circle `stellar-cctp` supplies the Stellar CCTP V2 reference contracts and examples. The project is Apache-2.0.
- Stellar/SDF documentation and protocol work provide the Soroban, BN254, Poseidon/Poseidon2, USDC/SAC, and CCTP network context.
- OpenZeppelin/SDF Confidential Tokens are tracked as future wallet research only; they are not part of the current judged path. See [`.thoughts/research/2026-06-23-confidential-tokens-preview.md`](.thoughts/research/2026-06-23-confidential-tokens-preview.md) and [`.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md`](.thoughts/plans/2026-06-24-confidential-token-wallet-mode-plan.md).

## Differentiators vs Moonlight (the funded incumbent)
Real ZK proofs (they have none) · no mandatory custodial relayer (theirs is mandatory + logs identity) · optional passkey (they're seed-only) · USDC (they're XLM-only) · user-held cryptographic view-key compliance (theirs is relayer-custodial).

## Design (ready to hand to a designer)
- **Paste-ready designer prompt** (hand this to a designer / AI design tool): [`.thoughts/design/2026-06-21-designer-prompt.md`](.thoughts/design/2026-06-21-designer-prompt.md) — landing page + full wallet app, all states, QR specs, do-not-build list; points to repo references.
- **Full design brief** (exhaustive): [`.thoughts/design/2026-06-21-designer-brief.md`](.thoughts/design/2026-06-21-designer-brief.md); per-screen specs in [`.thoughts/design/screens/`](.thoughts/design/screens/).
- **Visual inspiration:** live Freighter screenshots in [`reference/screenshots/freighter/`](reference/screenshots/freighter/); Freighter UI source in `reference/freighter/extension/src/popup/views/`.

## Next step
Finish the external submission steps or continue mainnet bridge evidence. All configured EVM testnet CCTP sources now have accepted safe-path bridge-to-shield hashes: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and OP Sepolia. Use `ZKF_CCTP_PREFLIGHT_ONLY=1 ZKF_CCTP_SOURCE=<source> pnpm cctp:bridge:testnet` to inspect funding/readiness without submitting a burn; use `pnpm cctp:bridge:testnet` only when a new burn is intended; use `ZKF_CCTP_RESUME_BURN_HASH=... pnpm cctp:bridge:testnet` to resume an accepted burn. For post-bridge shielding from the local CCTP destination wallet, use `pnpm cctp:shield:extension`; this imports the bridge destination wallet into the extension harness and runs ASP insert + USDC QuickShield through Chrome/offscreen Nethermind. Set `ZKF_CCTP_SOURCE=base`, `arbitrum`, `optimism`, or `ethereum` for a configured source. If extending the browser extension, run `pnpm extension:runtime`, `pnpm extension:dapp`, and `pnpm extension:runtime:deep` before updating claims. For testnet extension USDC QuickShield, keep the reusable local USDC funder `GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ` topped up, then run `pnpm extension:quickshield:usdc`; it auto-transfers from that funder into the fresh extension harness address, waits for the balance, then submits the shield transaction. The next mainnet bridge evidence target should use Base or Arbitrum before Ethereum L1, with separate accepted hashes; the runner blocks non-preflight mainnet CCTP execution unless `ZKF_CCTP_MAINNET_APPROVED=1` is set after explicit approval for that exact run and funding source. The safe MVP bridge path remains public CCTP bridge arrival followed by a separate USDC shield/deposit. Keep atomic bridge-and-shield hidden/deferred unless a custom adapter later passes real tests and records transaction evidence. Confidential Token mode is a separate future track: private amounts and balances between public addresses, testnet/unaudited preview only.

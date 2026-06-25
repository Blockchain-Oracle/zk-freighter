# Designer Brief: ZK Fighter Web, Extension, And Mobile Direction

## Purpose

ZK Fighter is a self-custody wallet for shielded XLM and USDC payments on Stellar. The product should make shielded transfers feel understandable and trustworthy without pretending that every blockchain action is hidden.

The designer's job is to redesign the current rough web and extension UI into a high-fidelity product experience, and to map a mobile app direction if time allows. The design should be creative and premium, but it must preserve the product's honesty: shield/deposit, unshield/withdraw, and bridge arrival are public boundaries; shielded transfers happen inside the pool.

Do not prescribe or inherit the current UI's visual taste. The current app proves functionality and evidence, not the final interface.

## Prototype Scope

Design a high-fidelity prototype with mocked data and mocked integrations. The prototype should cover:

- Web app: primary full product surface.
- Browser extension: compact companion for receive, QuickShield, and bridge handoff.
- Mobile app: future surface direction if time allows.

The prototype may simulate balances, proofs, bridge progress, QR scans, and transaction results for design purposes only. Every mocked integration must be clearly distinguishable as demo data in the prototype. Do not imply a mocked balance, proof, bridge state, transaction hash, or mainnet action is real.

## Product Context

ZK Fighter already has:

- `apps/web`: React/Vite web app.
- `apps/extension`: WXT MV3 extension scaffold.
- `packages/core`: shared wallet/prover/network logic.
- XLM and USDC shield/deposit evidence on testnet and mainnet.
- CCTP bridge-then-shield evidence on testnet.
- Extension QuickShield XLM/USDC evidence.
- Mainnet XLM/USDC pool deployments and extension QuickShield evidence.

Important current boundaries:

- Web app remains the safest judged surface unless Abu chooses to include extension in the demo.
- Extension is a QuickShield + receive + bridge handoff companion.
- Extension public-key access and dApp signing are intentionally disabled.
- Extension passkey, Wallets Kit detection/branding, Soroban auth-entry signing, message signing, extension-native Ethereum bridge, and Chrome Web Store packaging are deferred.
- Mainnet shielded transfer, unshield/withdraw, and bridge-to-shield are not claimed yet.
- Atomic bridge-and-shield is deferred.

Current UI reality:

- Web currently displays a top-level `zkf1...` receive QR, "wallet plumbing" metadata, and many separate technical panels.
- Extension currently displays runtime checkpoint/readiness, import/unlock, receive copy, QuickShield, bridge handoff, and evidence status.
- These are functional proof surfaces, not good product UX.

## Target Users

Primary wallet user:

- Wants to hold XLM/USDC and make shielded transfers without learning nullifiers, Merkle roots, SACs, CCTP domains, ASP roots, or proof internals.
- Needs to know when funds are public, shielded, pending, or spendable.
- Needs clear recovery expectations: seed phrase is the recovery path; passkey is optional convenience.

Recipient:

- Needs a private receive code and QR that are safe to copy/share.
- Needs a public deposit address too, but must understand it is not the same privacy path.

Bridge/on-ramp user:

- Has USDC on Ethereum/Sepolia or elsewhere and wants to get it onto Stellar, then shield it.
- Needs a multi-minute bridge wait to feel trackable, resumable, and honest.

Auditor/accountant reviewer:

- Receives user-held disclosure material.
- Must be able to verify scoped activity without gaining spend authority.

Hackathon judge:

- Needs to see load-bearing ZK and real Stellar integration.
- Needs evidence links, hashes, and clear boundaries.

## Domain Knowledge The Designer Needs

### One wallet, two receive targets

ZK Fighter has two user-facing receive targets:

- Private receive code: raw `zkf1...` Bech32m string. This bundles public note key and public encryption key. It is copied and QR encoded as the raw string, not as a Stellar URI. It lets someone pay the user privately inside the pool.
- Public Stellar address: normal `G...` address. This is for public deposits, fees, bridge arrival, and unshield/withdraw destinations.

These must appear as two clearly labeled jobs under one wallet, not as two equal "addresses" with unclear meaning.

### Address and code format details

- Private receive HRP: `zkf`.
- Current payload: version byte + network byte + 32-byte note public key + 32-byte encryption public key.
- Network byte: testnet or mainnet.
- Encoded length limit in code: 180 chars.
- QR payload: raw `zkf1...`.
- Public Stellar addresses use `G...`.
- Contract IDs use `C...`.
- Ethereum source addresses and hashes use `0x...`.
- Transaction hashes should be middle-truncated in compact views and fully copyable in details.

### Money states

Use these product states consistently:

- Public funds: visible on Stellar until shielded.
- Shielded funds: funds inside the privacy pool.
- Pending: proof, scan, bridge, or confirmation is still in progress.
- Spendable: confirmed and ready to send privately or withdraw.
- Public boundary: shield/deposit, unshield/withdraw, public bridge arrival.
- Private transfer: in-pool shielded transfer.

### What is hidden and what is public

Shield/deposit:

- Public: source account, amount, asset, pool transaction.
- Private after entry: later in-pool linkage.

Private send:

- Public: a pool transaction and proof/nullifier/commitment events.
- Hidden from chain observers: sender-recipient relationship, amount, memo, recipient note ownership.

Unshield/withdraw:

- Public: destination, amount, asset, withdrawal transaction, spent marker, submitting account metadata.
- Hidden: which deposit/note funded the withdrawal.

Bridge:

- Public: Ethereum burn, Circle attestation, Stellar mint/forward, public Stellar USDC arrival.
- Separate shield step: public shield/deposit into ZK Fighter's USDC pool.

### Recovery and auth

- Seed phrase is the default and reliable recovery path.
- Passkey/Face ID is optional convenience for unlock or protected local material.
- Passkey must not look like the wallet, the balance, or recovery.
- No recovery secrets, no support recovery, no passkey-only recovery.

## Core User Journey

1. Create or import wallet.
2. Save and confirm recovery phrase.
3. Optionally enable passkey for convenience.
4. Land on home with shielded balance as the primary model.
5. Copy/share private receive code or public deposit address depending on the job.
6. Add funds publicly through a public Stellar deposit or public CCTP bridge.
7. Shield public funds into XLM or USDC pool.
8. Wait through proof/sync/confirmation until funds become spendable.
9. Send shielded funds to a `zkf1...` private receive code.
10. Unshield/withdraw to a public `G...` address only with explicit public-boundary confirmation.
11. Track activity with visibility labels and explorer links only for public legs.
12. Export scoped disclosure material when needed.

## Screen-by-screen Direction

### Web app

Design the web app as the complete wallet, not a landing page first. The first screen after unlock should be the product, not marketing.

Recommended screen order:

1. Welcome and create/import decision.
2. Set password.
3. Recovery phrase warning, reveal, copy, and confirm.
4. Optional passkey setup.
5. Unlock.
6. Home with shielded balance, public funds, Pending/Spendable split, and recent activity.
7. Receive with private code tab and public deposit tab.
8. QR full-screen scanner/share mode.
9. Send privately flow: recipient -> amount -> review -> auth -> proof progress -> success/error.
10. Shield flow: source/asset -> amount -> review public boundary -> proof/submission -> success.
11. Unshield flow: destination -> amount -> leak acknowledgement -> proof/submission -> success.
12. Add funds / bridge: source -> amount -> Ethereum wallet -> review -> burn -> attestation timeline -> Stellar mint -> shield prompt.
13. Activity list and activity detail.
14. Public discovery opt-in: "Make my private code discoverable".
15. Disclosure hub and proof/export flow.
16. Settings: security, reveal seed, passkey, network, about, lock.
17. Evidence/demo mode or judge view, if needed, showing verified hashes without letting it dominate normal wallet UX.

### Extension

Design the extension as a companion, not as a full dApp signing wallet.

Surfaces:

- Popup: glanceable status and fast actions.
- Side panel: richer workspace for QuickShield, receive QR/copy, bridge handoff, and evidence/state details.
- Offscreen/prover state should be represented to the user as proof work running safely, not as technical runtime details.

Core extension screens:

1. Locked/import/unlock state.
2. Receive code QR/copy.
3. QuickShield XLM/USDC.
4. Prepare public setup / prepare USDC receive readiness, with plain-language copy.
5. Proof progress and submission status.
6. Bridge handoff to web app.
7. Readiness/evidence drawer for demo/judges, demoted from everyday use.
8. Fail-closed dApp status: if shown, it should say external public-key access and signing are disabled by product choice.

Extension constraints:

- Popup is narrow and interruptible. Keep critical proving or confirmation in side panel/tab/offscreen-backed surfaces, not ephemeral popup-only UI.
- Do not design external dApp connect/sign flows as active product flows.
- Do not make it look like Freighter-compatible public signing.
- The extension should feel useful even if it only does receive, QuickShield, and bridge handoff.

### Mobile app direction

Mobile can be designed now as a future surface, but it should not imply production mobile support already exists.

Recommended mobile scope:

- Same seed-backed wallet model.
- Same private receive code and public deposit address.
- Native scanner-first send/receive.
- Mobile home with shielded balance and Pending/Spendable split.
- QuickShield and private send.
- Bridge tracking as resumable timeline.
- Activity and disclosure viewing.

Mobile-specific interaction opportunities:

- Bottom-sheet review and confirmation for send/shield/unshield.
- Camera scanner with paste fallback.
- QR full-screen receive mode.
- Biometric unlock if passkey/device support is available, with password/seed fallback.
- A deliberate gesture such as hold-to-confirm or drag-to-confirm only for public-boundary or irreversible actions like unshield/withdraw, bridge burn, viewing seed, or exporting broad viewing material.
- Push/local notifications for bridge arrival and proof completion, if implemented later.

Do not make the mobile app a separate wallet product with different recovery, assets, or privacy claims.

## Data, States, And Mocking Rules

Design these states for every applicable screen:

- Empty.
- Loading.
- Syncing.
- Pending proof.
- Pending bridge attestation.
- Pending confirmation.
- Disabled with reason.
- Error with retry.
- Success.
- Expired or interrupted.
- Network switched.
- Mainnet risk / unavailable action.
- Copy success and clipboard failure.
- Camera denied and paste fallback.
- Account locked mid-flow.

Important long-running states:

- Proof progress should be staged: preparing inputs, generating proof, submitting, confirming, spendable.
- Bridge progress should be staged: Ethereum approval, Ethereum burn, Circle attesting, Stellar mint/forward, arrived publicly, shield prompt, shield/deposit.
- Sync progress should reassure the user that funds are not gone while scan/indexing catches up.
- Pending rows should remain visible in Activity and on Home; never silently disappear.

Mocking rules:

- Use realistic mock data.
- Mark mocked balances, proof states, bridge state, transaction hashes, and disclosure artifacts as demo data in prototype.
- Do not use fake hashes that look like accepted evidence unless clearly marked.
- Do not invent mainnet support beyond the evidence boundaries.

Suggested mock values:

- Private code: `zkf1...` long string around 120-180 characters.
- Public Stellar address: `G...`.
- Pool or contract IDs: `C...`.
- Ethereum burn hash: `0x...`.
- Assets: XLM and USDC only.
- Networks: Stellar Testnet and Stellar Mainnet only.

## Prototype Quality Bar

The design should feel like a serious wallet built for repeated use. It needs to be rich enough for a demo, but not overloaded with generic crypto features.

Quality requirements:

- The user can always answer "is this public or shielded right now?"
- Receive screen prevents private/public address confusion.
- Proof waits feel intentional and trackable.
- Bridge waits feel resumable and honest.
- Activity history makes visibility obvious.
- Mainnet actions show risk and evidence boundaries.
- Mobile scanner and QR surfaces are practical, not decorative.
- Extension popup and side panel respect their real constraints.
- All important flows have empty, loading, disabled, error, success, and pending states.

## Anti-slop Risks To Avoid

- Generic crypto dashboard with token charts, swaps, NFTs, and trending cards.
- Generic SaaS landing-page structure that hides the actual wallet.
- Wall-of-cards where every item has the same visual weight.
- Decorative privacy theatre that does not explain what is public or shielded.
- Bare spinners during proof or bridge waits.
- "Anonymous", "fully private", or "untraceable" product claims.
- Burying unshield/withdraw leakage in small print.
- Making public deposit and private receive look interchangeable.
- Making passkey look like recovery.
- Fake metrics, fake hashes, fake balances, or fake bridge completions without demo marking.
- Designing a general public dApp signing extension despite the current product decision.

## Interaction Opportunities

The designer has freedom to decide the visual system and motion language. Useful interaction ideas:

- Segmented controls for private/public receive tabs and XLM/USDC asset selection.
- Drawers/sheets for explanations that should not interrupt flow.
- Modal gates for seed reveal, unshield/withdraw, bridge burn, and broad disclosure export.
- Timeline for bridge and proof progress.
- Pinned pending tray on Home and Activity.
- QR full-screen mode for scanning.
- Copy buttons with clear success and fallback states.
- Scanner overlay with torch, paste, and permission recovery states.
- Activity detail with "Your view" and "What others can see".
- Disclosure proof builder with "auditor will see" preview.
- Optional premium-feeling confirmation gesture only where risk justifies it.

## Inspiration And Source Material

Local first:

- `reference/screenshots/freighter/freighter-landing-hero.png`
- `reference/screenshots/freighter/freighter-landing-full.png`
- `reference/freighter/extension/src/popup/views/`
- `reference/freighter/extension/e2e-tests/*-snapshots/`
- `reference/xbull-wallet/src/app/`
- `reference/xbull-wallet/src/extension/`

Open-source wallet references:

- Freighter: https://github.com/stellar/freighter
- xBull: https://github.com/Creit-Tech/xBull-Wallet
- LOBSTR Signer Extension: https://lobstr.co/signer-extension/ and https://github.com/Lobstrco/lobstr-browser-extension
- Albedo: https://github.com/stellar-expert/albedo
- MetaMask: https://github.com/MetaMask/metamask-extension and https://github.com/MetaMask/metamask-mobile
- Rabby: https://github.com/RabbyHub/Rabby
- Rainbow: https://github.com/rainbow-me/rainbow and https://github.com/rainbow-me/browser-extension
- Uniswap Wallet: https://github.com/Uniswap/interface and https://wallet.uniswap.org/
- Backpack: https://github.com/coral-xyz/backpack
- Taho: https://github.com/tahowallet/extension
- Enkrypt: https://github.com/enkryptcom/enKrypt
- Zerion Extension: https://github.com/zeriontech/zerion-wallet-extension
- Ambire: https://github.com/AmbireTech/extension and https://github.com/AmbireTech/wallet
- OneKey: https://github.com/OneKeyHQ/app-monorepo
- Safe Wallet: https://github.com/safe-global/safe-wallet-monorepo
- Coinbase Smart Wallet / SDK: https://github.com/coinbase/smart-wallet and https://github.com/coinbase/coinbase-wallet-sdk
- Zodl/Zashi: https://zodl.com/, https://github.com/zodl-inc/zodl-ios, https://github.com/zodl-inc/zodl-android
- Railway: https://www.railway.xyz/ and https://github.com/Railway-Wallet/Railway-Wallet
- Penumbra/Prax: https://github.com/penumbra-zone/web and https://guide.penumbra.zone/usage/web/prax
- Brume: https://github.com/brumeproject/wallet
- Daimo: https://github.com/daimo-eth/daimo
- Cake Wallet: https://github.com/cake-tech/cake_wallet
- Zingo Mobile: https://github.com/zingolabs/zingo-mobile

Visual-only references:

- Phantom: https://phantom.com/
- Coinbase Wallet / Base app help and app listing.
- Trust Wallet app.
- Zerion app.
- LOBSTR mobile wallet.
- LI.FI, Relay, and Bungee bridge status surfaces.

Designer should inspect `.thoughts/wiki/wallet-design-references.md` for the reference-to-screen map.

## Creative Freedom

The designer owns color, type, composition, visual language, illustration, animation, and component styling. Do not inherit the current web app's panel-heavy look unless the designer chooses to reinterpret it.

The only hard constraints are product truth and usability:

- Keep public/private boundaries legible.
- Keep shielded transfers honest.
- Keep recovery honest.
- Keep mocked prototype data marked.
- Keep the extension in its actual companion scope.

## Explicit Non-goals

Do not design these as MVP product features:

- Token swap/DEX as a primary action.
- Fiat buy/sell on-ramp.
- NFT gallery.
- Token import or asset search.
- Custom gas/fee editor.
- Arbitrary multi-chain network management.
- In-wallet dApp browser.
- Public dApp connect/sign flow for the ZK Fighter extension.
- Hardware wallet support.
- Import private key/secret key as a main path.
- Staking, earn, price charts, or portfolio analytics.
- Passkey-only wallet.
- Support recovery or recovery secrets.
- Atomic bridge-and-shield as a normal mode.
- Confidential Token wallet mode.

## Open Questions

- Should the first prototype include a public landing page or focus only on app surfaces?
- Should extension be designed as part of the final demo path or as a companion/future surface?
- Should mobile be a full wallet prototype, a focused QuickShield/receive prototype, or a lower-fidelity future-direction flow?
- How visible should public discovery be in the first redesign?
- What final demo network posture should the screens assume: testnet-first, mainnet evidence view, or both?
- Should broad disclosure export exist in the prototype, or should the prototype only show scoped disclosure proof?

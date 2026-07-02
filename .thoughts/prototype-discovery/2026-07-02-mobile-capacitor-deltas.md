# Prototype Discovery: Mobile Capacitor Deltas

## Prototype Inspected

- `/Users/abu/Downloads/GitHub repository link(2)/ZK Fighter Mobile Home.dc.html`
- `/Users/abu/Downloads/GitHub repository link(2)/ZK Fighter Mobile Flows.dc.html`
- Repo design map: `docs/redesign/DESIGN-MAP.md`
- Repo component catalog: `docs/redesign/COMPONENTS.md`
- Existing mobile framework research: `.thoughts/research/2026-06-25-mobile-app-framework-options.md`

## Screen Map

- Home: shielded/public balance card stack, Send/Receive/Shield/Bridge action tiles, activity preview, bottom tabs.
- Shield/Unshield: shared sheet with segmented mode, public boundary and reveals-info badges, amount, available balance, Max, proof phases.
- Bridge: full-screen route with staged CCTP progress, resume behavior, and mainnet guard copy.
- Disclosure: Create and Verify modes with read-only proof boundary.
- Confidential: testnet hidden-amount token surface with merge-to-spend language.
- Receive: Private code and public address tabs, QR, copy actions.
- Activity: All, Shielded, Public filters in prototype; implementation should also keep Pending/Failed from desktop.
- Settings/More: bottom-tab More sheet grouped as Move, Prove & Discover, Account.
- Send states: proving, sent, unconfirmed, failed.
- Discover: make code discoverable, lookup public address, pay discovered code.
- Scan-to-pay: prototype exists, but camera flow is not part of the first Capacitor checkpoint.

## Revealed Product Requirements

- Mobile should feel like the compact extension/mobile-wallet shell: bottom tabs, bottom sheets, route-level back controls, and boundary badges.
- Mobile must not copy prototype mocks as behavior. It must reuse real web/extension funding, bootnode, activity, discover, send, shield, unshield, disclosure, and runtime classification paths.
- Public send is required even though the older mobile prototype focused on private send. Web/extension discovered this gap.
- Explicit sync/refresh is required for shielded notes and activity, matching the newer web/extension lessons.
- Passkey UI should remain hidden until device WebAuthn/PRF support is proven.

## Target-stack Translation

- First mobile implementation remains a Capacitor React/Vite app in `apps/mobile`.
- Native app config: `appId=com.zkfighter.wallet`, `appName=ZK Fighter`, `webDir=dist`.
- Runtime gate comes before wallet flows: static proof assets, workers, WebCrypto, `/js/web.js`, Nethermind module init, and prover readiness.
- Later wallet screens should reuse `@zk-fighter/core` and `@zk-fighter/ui`, especially shared `Sheet`, `BoundaryBadge`, `QrCard`, `ProvingRing`, `ProofStepList`, `ActivityRow`, and formatting helpers.

## Mocked Prototype Surfaces

- Example balances and activity rows are visual only.
- Scan-to-pay camera behavior is visual only until camera permission and decode path are implemented.
- Bridge mobile behavior is visual only until external wallet or web-handoff is proven on device.
- Passkey settings are visual only until Capacitor device support is proven.

## Plan Deltas

- Keep current checkpoint as `mobile runtime viability`.
- After bootnode/shield reliability is stable, implement mobile wallet screens in this order: onboarding/vault, Home, Receive, Activity, Send with Private/Public tabs, Shield/Unshield with auto-prerequisites, Settings/More, Discover, Disclosure, Confidential.
- Bridge starts disabled-with-clear-copy or web handoff until WalletConnect/MetaMask/Circle mobile flow is proven.
- Every mobile chain/proof claim needs real device evidence in `.thoughts/research/spikes-log.md`.

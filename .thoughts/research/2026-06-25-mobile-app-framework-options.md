# Reality Research: ZK Fighter Mobile App Framework Options

## Scope

Research the best path for a real Android and iOS ZK Fighter app without starting implementation. This research is grounded in the current repo and focuses on framework/runtime fit, ZK prover compatibility, secure storage, bridge constraints, passkeys, install/distribution without stores, and what must be proven before we commit to a mobile build lane.

This does not replace the current web app or WXT extension track. It evaluates the mobile track as a future product surface.

## Sources Checked

### Local repo context

- `README.md`
- `AGENTS.md`
- `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
- `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
- `.thoughts/quality/2026-06-22-project-quality-profile.md`
- `.thoughts/research/2026-06-25-mainnet-readiness.md`
- `.thoughts/research/2026-06-25-multichain-cctp-bridge.md`
- `.thoughts/plans/2026-06-24-extension-quickshield-bridge-plan.md`
- `package.json`
- `apps/web/package.json`
- `apps/extension/package.json`
- `packages/core/package.json`
- `packages/core/src/nethermind-runtime.ts`
- `packages/core/src/prover.ts`
- `packages/core/src/vault.ts`
- `packages/core/src/passkey.ts`
- `packages/core/src/xlm-shield.ts`

### Current docs and official references

- Context7 lookup and docs for Expo React Native: `/expo/expo`
- Context7 lookup for Capacitor: `/ionic-team/capacitor-docs`, `/ionic-team/capacitor`
- Capacitor docs: https://capacitorjs.com/
- Ionic WebView docs: https://ionicframework.com/docs/core-concepts/webview
- Tauri 2.0 mobile announcement/docs: https://v2.tauri.app/blog/tauri-20/
- React Native Turbo Native Modules docs: https://reactnative.dev/docs/turbo-native-modules-introduction
- Expo native modules docs: https://docs.expo.dev/modules/native-module-tutorial/
- Expo internal distribution docs: https://docs.expo.dev/build/internal-distribution/
- Expo WebView docs: https://docs.expo.dev/versions/latest/sdk/webview/
- Expo SecureStore docs: https://docs.expo.dev/versions/latest/sdk/securestore/
- MetaMask multichain React Native docs: https://docs.metamask.io/metamask-connect/multichain/quickstart/react-native/
- MetaMask Solana React Native docs: https://docs.metamask.io/metamask-connect/solana/quickstart/react-native/
- WalletConnect React Native Wallet SDK resources: https://docs.walletconnect.network/wallet-sdk/react-native/resources
- Circle Arc Bridge Kit docs: https://docs.arc.io/app-kit/bridge
- MDN WebAuthn extension docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions

## Verified Facts

### Current ZK Fighter architecture

- The product is already a React/Vite web app plus a WXT MV3 extension, sharing wallet and proof logic through `packages/core`.
- `packages/core` depends on browser-style primitives:
  - `crypto.subtle`, `crypto.getRandomValues`, `btoa`, and `atob` for vault encryption.
  - `fetch`, `performance`, static asset URLs, and browser-loaded WASM artifacts for prover readiness checks.
  - dynamic loading of `/js/web.js` for the Nethermind browser runtime.
  - `navigator.credentials`, `PublicKeyCredential`, and the WebAuthn PRF extension for optional passkey wrapping.
- The Nethermind path is specifically browser/WASM oriented. `packages/core/src/nethermind-runtime.ts` imports `/js/web.js`, initializes the generated WASM module, and calls browser-facing functions such as deposit, transfer, withdraw, disclosure, key derivation, and event sync.
- The prover artifact set is large and browser-delivered. The current readiness check expects worker scripts, worker WASM, bindgen WASM, circuits, R1CS files, proving key, verification key, and Soroban verification key under web-style asset paths.
- The current bridge implementation uses EVM browser wallet assumptions for the web route. Mobile cannot assume `window.ethereum` exists inside an app WebView or React Native runtime.
- Product decisions remain:
  - seed phrase is the default recovery path.
  - passkey is optional only.
  - `zkf1...` private receive code stays internal to ZK Fighter.
  - shield/deposit, unshield/withdraw, and bridge arrival are public boundaries.
  - extension is a ZK companion, not a general public dApp signing wallet.
  - no fake proof, balance, bridge, or transaction claims.

### Capacitor facts

- Capacitor is a native runtime for web apps. It packages HTML/CSS/JavaScript into iOS, Android, and web/PWA apps.
- Capacitor can be added to an existing web app by installing `@capacitor/core` and `@capacitor/cli`, initializing native config, then adding Android/iOS platforms.
- Capacitor apps run in native WebViews: WKWebView on iOS and Android WebView on Android.
- Capacitor/Cordova-style apps are served through a local HTTP server instead of `file://`, which is important for web asset loading.
- Native functionality is exposed through plugins and native bridges.

### Expo / React Native facts

- Expo can build Android and iOS apps and can create local native projects with `pnpm expo run:android` and `pnpm expo run:ios`.
- Expo internal distribution can produce installable builds for testers without public app-store release. Android uses APK-style install flows; iOS uses signed IPA/internal distribution requirements.
- `expo-secure-store` is for securely storing small sensitive values locally on Android/iOS. Expo docs warn that large payloads can be rejected by the underlying platform, with historical iOS limits around roughly 2048 bytes.
- `react-native-webview` can render web content inside a native React Native app.
- React Native does not provide every browser API. Missing native capabilities are added through Turbo Native Modules or Expo Modules using platform code.
- MetaMask React Native docs require explicit polyfills such as `react-native-get-random-values` before SDK imports for multichain/EVM usage.
- MetaMask Solana React Native docs state that `@solana/wallet-adapter-react` does not support React Native and requires a different multichain client path.

### Tauri mobile facts

- Tauri 2.0 supports mobile targets for iOS and Android.
- Tauri uses a web frontend with a Rust-native core and OS WebViews.
- This can be attractive if ZK Fighter later wants Rust-native cryptography/prover integration, but it introduces a new Rust/mobile runtime track beyond the current React/Vite/pnpm app architecture.

### Bridge and wallet-connectivity facts

- The current ZK Fighter CCTP route has proven web browser wallet behavior. Mobile app runtimes should not assume injected EVM providers.
- MetaMask Connect supports React Native multichain flows with EVM and Solana support, but it needs React Native-specific setup and polyfills.
- Circle Bridge Kit abstracts CCTP bridge operations across adapters such as Viem, Ethers, Solana, and Circle Wallets. It is a candidate for future mobile bridge integration, not proof that ZK Fighter mobile bridge already works.
- WalletConnect has React Native wallet SDK resources, but the exact ZK Fighter bridge UX and external wallet handoff still need a runtime spike.

### Passkey facts

- The existing ZK Fighter passkey code uses browser WebAuthn PRF APIs.
- WebAuthn PRF support in a native mobile shell is not proven by the current repo.
- Passkey must remain optional on mobile until PRF behavior is proven on physical iOS and Android devices or replaced with a native module strategy that has equivalent tested behavior.

## Option Fit

| Option | Fit for current codebase | Main advantage | Main risk | Research verdict |
| --- | --- | --- | --- | --- |
| Capacitor wrapping existing web app | High | Reuses React/Vite UI, `packages/core`, browser WASM path, and web asset model | WKWebView/Android WebView memory, worker, static asset, passkey, and external wallet behavior must be proven on devices | Best first mobile spike |
| Expo / React Native native app | Medium | Strong mobile app ecosystem, internal distribution, native UI, native modules | Pure RN is not a browser; prover, Web Crypto, WebAuthn PRF, static WASM, and bridge providers need adapters/polyfills/WebView/native modules | Good later product app, higher initial risk |
| Expo / React Native with WebView shell | Medium-high | Keeps a browser-like surface while using Expo distribution/native wrappers | More manual than Capacitor for turning the existing web app into an app shell; still must solve asset and bridge boundaries | Viable backup to Capacitor |
| Tauri mobile | Medium | Web UI plus Rust core could fit future native prover work | Mobile maturity and Rust integration burden are higher than Capacitor for this repo right now | Interesting later, not first |
| PWA install | High for demo, low for native app | Fastest install-like path and maximum web reuse | Not a real native app; weaker device integration and distribution story | Emergency fallback, not the mobile product direction |
| Flutter | Low | Polished cross-platform UI | Large rewrite; poor reuse of existing TS/React/core/browser prover path | Not recommended now |
| Native Swift/Kotlin or Kotlin Multiplatform | Low | Maximum platform control | Highest rewrite and slowest path | Not recommended now |

## Inferences

### Recommended first path: Capacitor mobile shell

Capacitor is the strongest first mobile path because ZK Fighter is already browser-prover heavy. The biggest technical risk is not UI; it is whether the Nethermind browser/WASM runtime, workers, proof assets, Web Crypto, and memory profile behave correctly on real iOS and Android WebViews. Capacitor gives us the closest runtime to the already-working web app while still producing installable Android and iOS apps.

The right first mobile milestone is not a redesigned native app. It is a proof-bearing shell:

1. Package the existing web app into Capacitor.
2. Make prover asset URLs work from the mobile local server.
3. Run the real artifact readiness check on Android and iOS.
4. Run dry proof/prover initialization on physical Android and iPhone.
5. Record timings, failures, device model, OS version, app build hash, and screenshots.

If that passes, the second milestone can adapt storage, receive, QuickShield, and bridge handoff.

### Expo / React Native should not be the first implementation unless we accept a bigger rewrite

Expo is a strong long-term option if the goal becomes a polished native app with native navigation and deeper OS integration. But starting there means we must bridge or replace several browser assumptions:

- `crypto.subtle` and Web Crypto behavior.
- `btoa`/`atob` compatibility.
- WebAuthn PRF behavior.
- static `/js/web.js` and worker/WASM artifact loading.
- browser worker model.
- EVM wallet provider availability.
- local encrypted vault persistence.

React Native can solve these through polyfills, WebView, Expo Modules, or Turbo Native Modules. That is a valid engineering path, but it is more unknown than Capacitor for the current codebase.

### Mobile bridge should be treated as a separate spike

The current bridge path should not be assumed to work inside mobile. Mobile users generally will not have browser-extension wallet injection. The likely strategies are:

- external handoff to the existing web bridge route.
- WalletConnect or MetaMask Connect for EVM wallet connection.
- Circle Bridge Kit for a cleaner CCTP abstraction after wallet integration is proven.

For mobile MVP, bridge should either hand off to web or remain behind a "prove first" flag until a real device completes source-chain burn, attestation, Stellar mint/forward, and separate shield.

### Passkey remains optional

The seed phrase and password-encrypted vault should remain the mobile baseline. Passkey wrapping should not block mobile because the current implementation depends on browser WebAuthn PRF. A mobile passkey track needs its own physical-device matrix and may need native platform modules.

### Storage needs a mobile adapter boundary

Today the web app stores encrypted vault state in browser storage. Mobile should introduce a platform storage boundary before any serious implementation:

- encrypted vault payload can live in app storage or file storage.
- small secrets or wrapping material can use Keychain/Keystore through Capacitor plugin or Expo SecureStore.
- large encrypted vault JSON should not blindly go into SecureStore because platform size limits and native errors are documented concerns.

This argues for a `packages/core` adapter interface instead of direct mobile-specific calls from wallet logic.

## Proposed Mobile Research Spikes

These are research/verification spikes, not product claims.

### Spike 1: Capacitor shell viability

- Add a temporary Capacitor app wrapper around the existing web build.
- Load the current ZK Fighter UI on Android and iOS.
- Confirm static prover assets resolve from the app runtime.
- Confirm `fetch`, `crypto.subtle`, `crypto.getRandomValues`, `btoa`, `atob`, workers, and dynamic `/js/web.js` loading.
- Record device/OS/build evidence.

Pass condition: the app loads, artifact readiness is green, and no proof claim is made yet.

### Spike 2: Mobile prover runtime

- Run Nethermind browser runtime initialization on Android and iOS.
- Attempt dry proof or equivalent pre-submit proof path.
- Record timing, memory/thermal notes, console logs, and failure text.

Pass condition: at least one real device completes the same prover readiness/dry proof path without fake status.

### Spike 3: Mobile vault adapter

- Keep password-based seed vault semantics.
- Use a mobile storage adapter rather than direct `localStorage`.
- Validate wrong-password and corrupt-vault failure behavior.
- Evaluate Keychain/Keystore plugin behavior for small secret material only.

Pass condition: create, lock, unlock, import, and reload preserve the same Stellar address and `zkf1...` receive code on device.

### Spike 4: Mobile receive and QuickShield

- Show public Stellar funding address.
- Show private `zkf1...` receive code and QR.
- Run XLM/USDC shield through the real mobile runtime after prover is proven.
- Record transaction hashes only when actually submitted.

Pass condition: real device QuickShield evidence, not simulator-only evidence.

### Spike 5: Mobile bridge strategy

- Test web handoff first.
- Separately test WalletConnect or MetaMask Connect for EVM source-wallet connection.
- Evaluate Circle Bridge Kit only after source wallet connection and CCTP network support are clear.

Pass condition: source-chain burn, attestation, Stellar arrival, and separate shield evidence from mobile-controlled flow.

### Spike 6: Optional mobile passkey

- Test whether WebAuthn PRF works inside the selected mobile runtime.
- If not, research native passkey modules and whether they expose equivalent PRF-like behavior.
- Keep seed phrase recovery as the required baseline.

Pass condition: optional passkey wrapper works on physical iOS and Android without becoming the only recovery path.

## Unknowns And Questions

- Does Nethermind `/js/web.js` plus its worker/WASM artifacts run correctly in Capacitor WKWebView and Android WebView?
- Does iOS WKWebView have enough memory headroom for the current proving key, worker WASM, circuits, and runtime heap during proof generation?
- Do mobile WebViews allow the worker and WASM loading pattern exactly as the current web app expects?
- Do mobile WebViews expose the Web Crypto algorithms used by the vault consistently enough across target OS versions?
- Does Capacitor app serving preserve the exact asset paths currently assumed by `packages/core/src/nethermind-runtime.ts` and `packages/core/src/prover.ts`?
- Which native secure-storage plugin is safest for Capacitor, and what payload-size behavior does it have on both platforms?
- Can mobile bridge use WalletConnect, MetaMask Connect, or Circle Bridge Kit without weakening the privacy-boundary copy?
- Is Solana CCTP worth a future mobile bridge path, given the current React Native docs require a different wallet path and Solana is not part of the immediate bridge scope?
- Does WebAuthn PRF work inside a mobile app WebView, or does optional passkey require native modules?
- Does Abu have an Apple developer account or internal distribution setup for iOS device installs?

## Not Included

- No mobile implementation.
- No Capacitor, Expo, Tauri, Flutter, or native project files added.
- No mobile chain evidence.
- No mobile proof-generation claim.
- No store submission or publishing plan.
- No replacement of the current web app or extension track.

## Bottom Line

The first mobile research-backed move should be **Capacitor proof-of-viability**, not a full native rewrite. ZK Fighter's hard constraint is the browser/WASM proving stack, not generic mobile UI. Capacitor gives the highest reuse and the shortest path to honest device evidence. Expo/React Native remains a serious later option if we decide native polish is worth the adapter and prover-runtime work.

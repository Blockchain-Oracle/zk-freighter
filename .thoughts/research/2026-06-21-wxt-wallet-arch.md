# Reality Research: WXT extension framework + wallet architecture (Freighter reference)

## Scope

Two distinct things, documented as current reality only (no proposals, no "we should"):

1. **WXT framework facts** — project structure, entrypoints, `wxt/utils/storage`, messaging stance, WASM bundling + manifest CSP, cross-browser build, dev/HMR loop. Sourced from wxt.dev official docs + GitHub issues + npm.
2. **Canonical wallet architecture** — mapped concretely from the already-cloned **Freighter** repo (`/Users/abu/dev/hackathon/stellar-research/repos/freighter`). Where keys live, popup UI, content-script ↔ injected-provider ↔ background bridge, signing flow, what is shared between a web/dApp surface and the extension surface.

**Critical caveat established up front:** Freighter does **NOT** use WXT. Freighter is built on **Webpack 5** (`extension/webpack.common.js`, `extension/webpack.extension.js`) with a hand-written `manifest/v3.json`. So Freighter is a reference for *wallet architecture patterns*, not for *WXT mechanics*. None of the other cloned repos use WXT either (`browser-wallet` is Deno-based with a manual `manifest.json`). All WXT-specific facts therefore come from official docs, not from a cloned WXT project.

## Sources Checked

WXT (official docs + ecosystem):
- https://wxt.dev/guide/essentials/project-structure.html
- https://wxt.dev/guide/essentials/entrypoints.html
- https://wxt.dev/guide/essentials/storage.md (markdown variant — gave exact API)
- https://wxt.dev/guide/essentials/messaging.html
- https://wxt.dev/guide/essentials/config/manifest.html
- https://wxt.dev/guide/essentials/config/browser-startup.html
- https://wxt.dev/guide/essentials/config/auto-imports.html
- https://wxt.dev/guide/essentials/content-scripts.html
- https://wxt.dev/guide/essentials/extension-apis.html
- https://github.com/wxt-dev/wxt/issues/1448 (WASM in background — open issue)
- https://webext-core.aklinker1.io/messaging/installation (@webext-core/messaging API)
- Medium: WXT + Vue + Go/WASM (CSP strings for Chrome vs Firefox)
- `npm view` for live versions

Freighter (PRIMARY — read from clone):
- `extension/public/static/manifest/v3.json` — MV3 manifest
- `extension/public/background.ts`, `extension/public/contentScript.ts` — entry shims
- `extension/src/contentScript/helpers/redirectMessagesToBackground.ts` — the bridge
- `extension/src/background/index.ts` — listener wiring
- `extension/src/background/messageListener/freighterApiMessageListener.ts` — dApp request handling + popup spawn
- `extension/src/background/messageListener/popupMessageListener.ts` — popup→bg dispatch
- `extension/src/background/messageListener/handlers/signTransaction.ts` — actual key use + signing
- `extension/src/background/helpers/session.ts` — key encryption/session
- `@stellar/freighter-api/src/index.ts`, `signTransaction.ts`, `requestAccess.ts` — the npm provider package
- `@shared/api/helpers/extensionMessaging.ts`, `@shared/api/external.ts` — the postMessage transport
- `extension/webpack.common.js` — build entrypoints
- root `package.json` — yarn workspaces layout

Live versions (from `npm view`, 2026-06-21):
- `wxt@0.20.26`
- `@webext-core/messaging@3.0.2`
- `vite-plugin-wasm@3.6.0`
- `vite-plugin-top-level-await@1.6.0`
- Freighter manifest `version: 5.42.0`; `@stellar/freighter-api@6.0.1`

---

## Verified Facts

### A. WXT framework

**A1. Build system / version.** WXT is a Vite-based web-extension framework. Latest published version is `wxt@0.20.26` (`npm view wxt version`). It is pre-1.0.

**A2. Project structure (flat-by-default).** Default directories (https://wxt.dev/guide/essentials/project-structure.html):
- `entrypoints/` — everything bundled into the extension
- `components/`, `composables/`, `hooks/`, `utils/` — auto-import roots
- `assets/` — processed assets; `public/` — copied verbatim
- `.output/` — build output; `.wxt/` — generated TS config
- Config file is **`wxt.config.ts`** at project root.
- Optional `srcDir: 'src'` moves source dirs under `src/`. Configurable: `srcDir` (default `.`), `modulesDir` (`modules`), `outDir` (`.output`), `publicDir` (`public`), `entrypointsDir` (`entrypoints`).

**A3. Entrypoints are detected by filename convention** in `entrypoints/`, "zero or one levels deep" (https://wxt.dev/guide/essentials/entrypoints.html):
- **Background:** `background.ts` / `background.js` / `background/index.ts`; helper `defineBackground()`; output `/background.js`. MV3 → service worker, MV2 → script. `defineBackground` accepts manifest options including `persistent` (`undefined|true|false`) and `type` (`undefined|'module'`).
- **Popup:** `popup.html` or `popup/index.html` → `/popup.html`.
- **Content scripts:** `content.ts`, `content/index.ts`, `{name}.content.ts`, `{name}.content/index.ts`; helper `defineContentScript()`; requires `matches: string[]`; output `/content-scripts/content.js` (or `{name}.js`).
- **Options:** `options.html` / `options/index.html`.
- **Side panel:** `sidepanel.html`, `sidepanel/index.html`, `{name}.sidepanel.html`.
- **Unlisted script:** `{name}.ts`; helper `defineUnlistedScript()` → `/{name}.js` (NOT auto-added to manifest; you reference it yourself — e.g. an injected page-world script).
- **Unlisted page:** `{name}.html`; **Unlisted CSS:** `{name}.css/.scss`.

**A4. Background runtime constraint.** WXT imports the background file in a Node environment at build time, so **no runtime code may sit outside the `main` function**, and **extension APIs must not be called outside `main()`** in any entrypoint (background, content scripts, unlisted scripts). (WebSearch corpus on entrypoints; consistent across multiple WXT docs/issues.) MV3 SW idles after seconds and is killed after ~5 min; persist via storage.

**A5. `wxt/utils/storage` API** (https://wxt.dev/guide/essentials/storage.md):
- Import: `import { storage } from 'wxt/utils/storage'`.
- `storage.getItem('local:key')`, `storage.setItem('local:key', value)`.
- `storage.defineItem('local:key', { fallback, version, migrations, init })` — reactive item with versioned migrations.
- `storage.watch('local:key', (newValue) => {})`.
- **Keys MUST be prefixed with a storage area**: `local:`, `session:`, `sync:`, `managed:`. The prefix is required (a bare key throws).
- It is a wrapper over the vanilla `chrome.storage` / `browser.storage` APIs. Alternatives noted by WXT: `webext-storage`, `@webext-core/storage`.

**A6. Messaging: WXT ships NO built-in messaging.** Direct quote (https://wxt.dev/guide/essentials/messaging.html): *"The vanilla APIs are difficult to use and are a pain point to many new extension developers. For this reason, WXT recommends installing an NPM package that wraps around the vanilla APIs."* Recommended packages: `@webext-core/messaging`, `webext-bridge`, `trpc-chrome`, `@webext-core/proxy-service`, `Comctx`.

**A7. `@webext-core/messaging` API** (`@webext-core/messaging@3.0.2`; https://webext-core.aklinker1.io):
- `import { defineExtensionMessaging } from '@webext-core/messaging'`.
- Define a `ProtocolMap` interface (method name → `(data) => returnType`).
- `export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();`
- `sendMessage(name, data)` / `sendMessage(name, data, tabId)` / `sendMessage(name, data, { tabId, frameId })`.
- `onMessage('name', (message) => message.data)` registers a handler; return value is the response.
- Type-safe, cross-browser. NOTE (inference flag, see Inferences): this is for **extension-internal** contexts (bg/popup/content), routed over `runtime.sendMessage`/`tabs.sendMessage`. It does NOT itself bridge the page's `window` to the content script.

**A8. WASM bundling + CSP.** WXT has **no dedicated WASM docs page**; the working pattern uses Vite plugins and a manifest CSP override.
- Plugins (live): `vite-plugin-wasm@3.6.0`, `vite-plugin-top-level-await@1.6.0`. Wired via `vite: () => ({ plugins: [wasm(), topLevelAwait(...)] })` in `wxt.config.ts`.
- Concrete config from GitHub issue #1448 (https://github.com/wxt-dev/wxt/issues/1448):
  ```ts
  manifest: {
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000;",
      sandbox: "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000;"
    },
  },
  vite: () => ({
    plugins: [react(), wasm(), topLevelAwait({
      promiseExportName: "__tla",
      promiseImportName: i => `__tla_${i}`,
    })],
  }),
  ```
- **MV3 CSP `extension_pages` only permits `'none'`, `'self'`, and `'wasm-unsafe-eval'` for script content** (WebAssembly/CSP and MDN). `wasm-unsafe-eval` is publishable to Chrome Web Store and shows no install-time warning.
- Firefox uses `'wasm-eval'` instead of `'wasm-unsafe-eval'` (Medium WXT+Go/WASM article: Chrome `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'`, Firefox `script-src 'self' 'wasm-eval'; object-src 'self'`).
- **KNOWN UNRESOLVED problem (issue #1448, still OPEN, "pending-triage"):** WASM with top-level-await in the **MV3 background service worker** fails — the SW is bundled as IIFE and *"Module format 'iife' does not support top-level await. Use the 'es' or 'system' output formats."* So WASM-in-background is not confirmed-supported by WXT. (WASM in extension *pages*/popup is the working path.)

**A9. Manifest config** (https://wxt.dev/guide/essentials/config/manifest.html):
- `manifest` in `wxt.config.ts` is an object **or a function** `({ browser, manifestVersion, mode, command }) => ({...})`.
- Permissions are mostly manual: `manifest: { permissions: ['storage','tabs'], host_permissions: ['https://www.google.com/*'] }`.
- WXT generates the final manifest from: global `wxt.config.ts` options + entrypoint-specific options + WXT modules + hooks → written to `.output/{target}/manifest.json`.

**A10. `browser` API — NOT webextension-polyfill by default** (https://wxt.dev/guide/essentials/extension-apis.html):
- `import { browser } from 'wxt/browser'` is a thin wrapper: `export const browser = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;`
- Promise-style API works across MV2/MV3 and Chromium/Firefox/Safari.
- Types are based on `@types/chrome`; Firefox-only APIs (e.g. `browser.sidebarAction`) may need manual type augmentation.
- Opt-in real polyfill available via `@wxt-dev/webextension-polyfill`.

**A11. Auto-imports** (https://wxt.dev/guide/essentials/config/auto-imports.html):
- Powered by `unimport` (same as Nuxt). Auto-imports WXT APIs (`defineBackground`, `defineContentScript`, `createShadowRootUi`, `browser`, etc.) and exports from `components/`, `composables/`, `hooks/`, `utils/`.
- Manual path: `#imports` module re-exports all WXT APIs.
- `wxt prepare` generates `.wxt/types/imports-module.d.ts` (put in `postinstall`). Disable with `imports: false`. ESLint 9 via `imports: { eslintrc: { enabled: 9 } }` (paraphrased).

**A12. Content-script UI + worlds** (https://wxt.dev/guide/essentials/content-scripts.html):
- `defineContentScript({ matches, world, runAt, registration, cssInjectionMode, main(ctx){} })`.
- `world`: `'ISOLATED'` (default, shares only DOM) vs `'MAIN'` (page main world, full page-context access; MV3 Chromium only). `registration`: `'manifest'` (default) vs `'runtime'`.
- UI mounting helpers: `createShadowRootUi()` (style-isolated shadow DOM; needs `cssInjectionMode: 'ui'`), `createIntegratedUi()` (inherits page CSS), `createIframeUi()` (iframe, supports HMR).
- `ctx` provides `ctx.isValid` / `ctx.isInvalid` and lifecycle-safe `ctx.setTimeout` / `ctx.addEventListener` to survive SPA navigations / invalidation.

**A13. Dev / HMR / build loop** (https://wxt.dev/guide/essentials/config/browser-startup.html + WebSearch):
- `wxt` / `wxt dev` runs Vite dev + uses Mozilla **`web-ext`** to auto-open a browser with the extension loaded.
- Config for startup: `web-ext.config.ts` (project, git-ignored), `wxt.config.ts`, or `$HOME/web-ext.config.ts`. `disabled: true` turns off auto-open.
- `web-ext` creates a **fresh profile each run** by default; Chromium can persist via `chromiumProfile` + `keepProfileChanges: true`.
- Build/dist: `wxt build`, `wxt zip`; target a browser with `-b` (e.g. `wxt -b firefox`, `wxt build -b firefox`). Cross-browser is a first-class build target via the function-form manifest + `browser` context arg.

### B. Wallet architecture — Freighter as concrete reference

**B0. Freighter build reality.** Freighter is a **yarn workspaces monorepo** (root `package.json` workspaces: `@shared/api`, `@shared/constants`, `@shared/helpers`, `docs`, `extension`, `@stellar/freighter-api`). The extension is bundled by **Webpack 5** with three entrypoints (`extension/webpack.common.js`):
```js
entry: {
  background: "./public/background.ts",
  index: ["babel-polyfill", "./src/popup/index.tsx"],   // the popup/sidepanel UI
  contentScript: ["./public/contentScript.ts"],
}
```
Background and contentScript are emitted unhashed (`background.min.js`, `contentScript.min.js`) because the hand-written manifest hard-codes those names. **No WXT anywhere.**

**B1. MV3 manifest shape** (`extension/public/static/manifest/v3.json`, `version 5.42.0`):
- `background.service_worker = "background.min.js"` (also lists `scripts` for compat).
- One content script: `matches: ["<all_urls>"]`, `js: ["contentScript.min.js"]`, `run_at: "document_start"`.
- `action.default_popup = "index.html"` — the popup IS the React app.
- `permissions: ["storage", "alarms", "sidePanel"]` — note: NO host/tabs permissions; the dApp bridge runs via the all-URLs content script + `window.postMessage`.
- `side_panel.default_path = "index.html?mode=sidebar"` and Firefox `sidebar_action` — same UI bundle re-used as a side panel (mode passed via query param).
- `browser_specific_settings.gecko.id` present for Firefox.

**B2. Where keys live (THE key fact).** Private keys are NEVER in the popup or content script. The flow in `background/helpers/session.ts` + `handlers/signTransaction.ts`:
- The secret key is stored **encrypted** in extension **local storage** under `TEMPORARY_STORE_ID`, encrypted with **AES-CBC via WebCrypto** (`crypto.subtle.encrypt`, `TEMPORARY_STORE_ENCRYPTION_NAME = "AES-CBC"`), IV prepended to ciphertext.
- The **decryption key/hash lives only in the in-memory background redux store** (`sessionStore`, `hashKeySelector`) — i.e. in service-worker memory, not persisted.
- A **`browser.alarms`** timer (`SESSION_ALARM_NAME = "session-timer"`) fires session expiry → `clearSession` + broadcast `SESSION_LOCKED` (`background/index.ts` `initAlarmListener`). This is how MV3 (no persistent BG) enforces auto-lock.
- At rest, long-term keys are managed by `@stellar/typescript-wallet-sdk-km` `KeyManager` + `BrowserStorageKeyStore` + `ScryptEncrypter` (scrypt-encrypted keystore in browser storage) — constructed in `background/index.ts initExtensionMessageListener`.

**B3. Signing flow (end to end), from the dApp's call to a signature:**
1. dApp imports the npm package `@stellar/freighter-api` (`v6.0.1`) and calls e.g. `signTransaction(xdr, opts)` (`@stellar/freighter-api/src/signTransaction.ts`) → `submitTransaction()` in `@shared/api/external.ts`.
2. `@shared/api/external.ts` calls `sendMessageToContentScript(msg)` (`@shared/api/helpers/extensionMessaging.ts`), which does `window.postMessage({ source: EXTERNAL_MSG_REQUEST, messageId, ...msg }, origin)` and waits for a matching `EXTERNAL_MSG_RESPONSE` (correlated by a per-call `MESSAGE_ID = Date.now()+Math.random()` to avoid race conditions). For `isConnected`/`requestPublicKey` there's a 2s timeout fallback (handles "Freighter not installed").
3. The **content script** (`redirectMessagesToBackground.ts`) listens for `window` messages, validates `event.source === window`, that `event.data.type` is in `EXTERNAL_SERVICE_TYPES`, and `event.data.source === EXTERNAL_MSG_REQUEST`, then forwards via `browser.runtime.sendMessage(event.data)` to the background, and posts the result back with `window.postMessage({ source: EXTERNAL_MSG_RESPONSE, messagedId, ...res })`.
4. The **background** `initExtensionMessageListener` (`background/index.ts`) routes by `type`: external types → `freighterApiMessageListener`, internal popup types → `popupMessageListener`.
5. `freighterApiMessageListener` checks the allow-list (`isSenderAllowed`, per-origin), and if approval is needed it **pushes the request onto a queue** (`transactionQueue`, `responseQueue`, etc.) and **opens a signing UI** via `openSigningWindow` — either `chrome.sidePanel.open()` / Firefox `sidebarAction.open()` (if a sidebar is connected) or `browser.windows.create({ url: index.html#/sign... , type:'popup' })`. It returns a Promise that resolves when the user approves/rejects (or rejects on window close via `rejectOnWindowClose`, or TTL timeout).
6. The **popup/sidebar UI** (React app, `src/popup`) shows the tx; on approve it sends an internal `SIGN_TRANSACTION` message → `popupMessageListener` → `handlers/signTransaction.ts`.
7. `handlers/signTransaction.ts` reads `KEY_ID`, calls `getEncryptedTemporaryData()` to **decrypt the secret key in background memory**, `Sdk.Keypair.fromSecret(privateKey)`, finds the queued tx by `uuid`, `transactionToSign.sign(sourceKeys)`, and resolves the original dApp Promise via the stored `responseQueue` callback with the signed XDR + signer pubkey. The signed XDR travels back out the same content-script → `window.postMessage` path to the dApp.

**B4. Trust boundaries enforced in code:**
- Content script only forwards messages whose `type` is a known external service type and only `event.source === window` (rejects cross-frame spoofing of the source check).
- Background distinguishes **extension-page senders** from content-script senders: `initSidebarConnectionListener` rejects ports unless `!port.sender?.tab && port.sender?.id === browser.runtime.id && url.startsWith(browser.runtime.getURL(""))`. Some internal handlers gate on `isFromExtensionPage` (e.g. `REJECT_SIGNING_REQUEST` returns `Unauthorized` otherwise).
- Per-origin **allow-list** authorization (`background/helpers/allowListAuthorization.ts`, `isSenderAllowed`) gates whether a dApp gets the public key without a prompt.

**B5. The injected provider IS an npm package, not an injected script.** Freighter does NOT inject a `window.freighter` object via a MAIN-world script. Instead the dApp installs `@stellar/freighter-api` and that package talks to the content script over `window.postMessage`. The content script is declared on `<all_urls>` at `document_start`, so it is always present to relay. (Contrast with EVM `window.ethereum` injection; Freighter's model is library-import + postMessage relay.)

**B6. What is shared between the web/dApp surface and the extension surface.**
- **`@stellar/freighter-api`** (published npm, `v6.0.1`): the dApp-facing surface. Pure functions (`getAddress`, `signTransaction`, `requestAccess`, `signMessage`, `signAuthEntry`, `getNetwork`, `isConnected`, `WatchWalletChanges`, …). Guards with `isBrowser = typeof window !== 'undefined'` and returns `FreighterApiNodeError` in Node. This package contains NO keys and NO signing — it only marshals postMessage calls.
- **`@shared/*` workspaces** (`@shared/api`, `@shared/constants`, `@shared/helpers`): shared between the api package, the extension background, and the popup. Includes the message transport (`extensionMessaging.ts`), the service-type constants (`EXTERNAL_SERVICE_TYPES`, `SERVICE_TYPES`, `EXTERNAL_MSG_REQUEST/RESPONSE`), error objects, and Stellar SDK helpers. This is the contract layer both surfaces compile against.
- `DEV_SERVER` switch in `extensionMessaging.ts`: when running the popup React app as a normal web page in dev, `sendMessageToBackground` falls back to `sendMessageToContentScript` (postMessage) instead of `browser.runtime.sendMessage` — i.e. the same UI code runs both as an extension page and as a plain dev web page.

---

## Inferences

(Clearly-labeled; not verified facts.)

- **[Inference]** Mapping Freighter's three Webpack entrypoints onto WXT would be near 1:1: `public/background.ts` → `entrypoints/background.ts` (`defineBackground`); `public/contentScript.ts` → `entrypoints/content.ts` (`defineContentScript`, `matches: ['<all_urls>']`, `runAt: 'document_start'`); `src/popup` → `entrypoints/popup/` + a `sidepanel` entry. This is structural correspondence only — not tested.
- **[Inference]** `@webext-core/messaging` covers the **content↔background↔popup** legs (it wraps `runtime`/`tabs.sendMessage`). The **page↔content** leg (the `window.postMessage` bridge in Freighter B3 step 2–3) is a separate concern `@webext-core/messaging` does not address; a wallet would still hand-roll that or use `@webext-core/messaging`'s window-messaging variant / `webext-bridge` (`window` context). Needs verification of exact API.
- **[Inference]** Because WASM-in-MV3-background via top-level-await is unresolved (A8/#1448), any WASM crypto (e.g. a Rust/WASM signer) in a WXT wallet would more reliably live in an extension *page* (popup/offscreen) than in the background service worker. Not confirmed; depends on whether the WASM lib uses top-level await and whether `vite-plugin-top-level-await`'s `promiseExportName` workaround makes it work in the SW (the issue suggests it does not, out of the box).
- **[Inference]** Freighter's "decryption key in BG memory + encrypted blob in local storage + alarm-based lock" pattern is a direct response to MV3 service-worker non-persistence (the SW can die any time, so the encrypted blob survives in storage while the in-memory key is intentionally ephemeral). WXT's `storage` with `session:` prefix maps to `chrome.storage.session` (in-memory, cleared on browser close) which is a closer primitive, but Freighter predates/avoids relying on it. Behavioral equivalence not tested.

## Unknowns And Questions

- **WASM in MV3 background under WXT:** Is there ANY confirmed-working config to run a top-level-await WASM module inside a WXT MV3 service worker? Issue #1448 is open/unresolved; the `offscreen` document path was not investigated. **(Riskiest unknown.)**
- **Exact `content_security_policy` object shape WXT accepts** for MV3 vs MV2: docs page did not surface the full schema; verified only via issue #1448 (`{ extension_pages, sandbox }`) and the Medium article. `worker-src` need for WASM in SW is unconfirmed (the task hypothesized `worker-src`; no source confirmed it's required — MV3's blocking factor was the IIFE/TLA bundling, not a missing `worker-src` directive).
- **`@webext-core/messaging` for the page↔content (`window`) bridge:** does v3.0.2 expose a window-messaging API, or is that strictly `webext-bridge`? Not confirmed from primary docs in this pass.
- **WXT HMR specifics:** docs explicitly did not detail HMR differences between UI vs content vs background (UI hot-reloads; content/background typically full-reload the extension). Not verified from a primary statement.
- **WXT `offscreen` document support** (relevant for keeping crypto/WASM alive off the SW) — not investigated.
- **Whether any cloned repo demonstrates WXT** — confirmed NONE do (`freighter` = Webpack, `browser-wallet` = Deno + manual manifest). No in-repo WXT example exists to read; all WXT facts are docs-derived.
- **Safari** target specifics under WXT (`wxt -b safari`?) and Freighter's Safari story — not investigated.

## Not Included

- No proposals, architecture recommendations, or "we should" statements (per reality-research mandate).
- Did not deep-read Freighter's hardware-wallet, Ledger, or migration code beyond noting their existence.
- Did not enumerate all 27 Freighter `@shared` message types or every handler in `handlers/`.
- Did not benchmark or run WXT (`wxt dev`) — no WXT project present to run; facts are doc/issue/npm-derived.
- Did not cover non-wallet WXT features (i18n, modules authoring, analytics, auto-update).
- Did not investigate `webext-bridge` or `trpc-chrome` APIs in depth (only named as WXT-recommended).

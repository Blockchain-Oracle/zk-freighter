# 03 — Browser Extension Framework for a React Wallet (2026)

**Question:** What is the single best browser-extension framework for a React-based crypto
wallet in 2026, optimizing for **developer experience** (HMR, debugging, cross-browser)?

**TL;DR:** Use **WXT** (`wxt.dev`). It is the de-facto 2026 standard — Vite-based, file-based
entrypoints, the best HMR/dev loop of any MV3 framework, framework-agnostic React support,
single-command cross-browser (Chrome + Firefox) output, and actively maintained. Plasmo (the old
"React-first" pick) is effectively in maintenance mode. CRXJS is a Vite *plugin*, not a framework,
and only wins on one narrow axis (true content-script HMR). WASM (for client-side ZK proving) works
in WXT via `vite-plugin-wasm` + `vite-plugin-top-level-await` plus a one-line `wasm-unsafe-eval` CSP
entry in the manifest — publishable to the Chrome Web Store.

---

## 1. Comparison table

| Axis | **WXT** ✅ winner | Plasmo | CRXJS | Raw Vite / hand-rolled MV3 |
|---|---|---|---|---|
| **Bundler / core** | Vite | Parcel | Vite plugin | Vite (you wire it all) |
| **HMR / dev loop** | Best-in-class: instant HMR for popup/options UI, fast auto-reload for content + background, auto-opens browser with extension installed | React-only HMR; "hit or miss" for non-trivial extensions; background changes often need manual reload; Parcel 2–3× slower builds | Excellent Vite HMR; **uniquely true HMR for content scripts** (preserves page state) | Whatever you build; usually full reload + manual gymnastics |
| **React + TS** | First-class via `@wxt-dev/module-react`; TS by default | First-class (React is the headline) | First-class (it's just Vite) | Manual |
| **Cross-browser (Chrome+Firefox)** | Yes — MV2 **and** MV3, all browsers, one `--browser` flag | Yes (all browsers) | Partial; pick MV2 **or** MV3, not both | DIY per browser |
| **Entrypoints (popup/bg/content)** | File-based `entrypoints/` + `defineBackground` / `defineContentScript` / `defineContentScriptUi` | File-based, very declarative | Manual via manifest in Vite config | Fully manual |
| **Built-in storage wrapper** | Yes (`wxt/storage`, `storage.defineItem`) | Yes (`@plasmohq/storage` + `useStorage` hook) | No | No |
| **Built-in messaging** | No built-in wrapper (use `webext-bridge`/`@webext-core/messaging`; plain `browser.runtime` works) | Yes (`@plasmohq/messaging`, `sendToBackground`) | No | No |
| **Content-script UI helper** | Yes (`createShadowRootUi` — Shadow DOM isolation, important for a wallet injected into hostile pages) | Yes (CSUI) | No | No |
| **i18n** | Yes (only one with native i18n) | No | No | No |
| **Maturity / maintenance (2026)** | ~7.9k★, **actively maintained**, healthy community, fast release cadence | ~12.3k★ but **maintenance mode**, stale deps, feature dev stalled | ~3.5k★, revived; v2.0 (Jun 2025) after an unmaintained gap | n/a |
| **Proven at scale** | Eye Dropper (1M+ users), ChatGPT Writer (600k+ users) | Many extensions historically, but momentum gone | Niche | Many (MetaMask-class teams), but high cost |
| **WASM story** | `vite-plugin-wasm` + `vite-plugin-top-level-await`; CSP via `manifest.content_security_policy` | Works but Parcel WASM path is fiddlier | Standard Vite WASM | Fully manual |

**Net:** WXT wins every axis that matters for DX except (a) it has no *built-in* messaging wrapper
(trivially solved by a 1-dep add) and (b) CRXJS edges it on content-script-only HMR. For a wallet,
WXT's Shadow-DOM content-script UI, cross-browser output, and maintenance health dominate.

---

## 2. Wallet-specific pain points — how WXT solves them

| Pain (raw extension dev) | WXT answer |
|---|---|
| **Hot-reload of the popup** | True Vite HMR — edit React, see it without losing popup state. |
| **Hot-reload of background / service worker** | No framework does *true* SW HMR (MV3 limitation — the SW is re-registered). WXT does the next best thing automatically: file change → background rebuilds → extension auto-reloads + the dev browser re-opens the extension. No manual "click reload" in `chrome://extensions`. (Tracked upstream: wxt-dev/wxt#53.) |
| **Debugging the service worker** | Standard MV3 flow (`chrome://extensions` → "Inspect views: service worker" → DevTools). WXT adds detailed dev console output + error overlays. The auto-reload removes the main friction; debugging itself is normal DevTools. |
| **Persistent storage** | `wxt/storage` (`storage.defineItem<T>('local:key', { defaultValue })`) — typed, area-scoped (`local`/`sync`/`session`), with `.watch()` for cross-context reactivity. For a wallet, keep secrets in `local`/`session`, never `sync`. |
| **Messaging popup ↔ background ↔ content** | Use `@webext-core/messaging` or `webext-bridge` (typed, promise-based) on top of WXT. This is the *correct* wallet architecture: keystore + signing logic live in the background SW; popup and content are thin clients that RPC into it. |
| **Long-lived injected provider script (`window.ethereum`-style)** | WXT's first-class pattern: a `*.content.ts` runs in the isolated world and calls `injectScript('/injected.js', { keepInDom: true })` to put the provider into the page's **main world**; communicate via `CustomEvent` / `window.postMessage` between injected ↔ content, then content ↔ background via runtime messaging. `defineUnlistedScript` defines the injected payload. This is exactly the MetaMask/Rabby provider topology, expressed declaratively. |

> Architecture note for a wallet: **background SW = the only place with key material**. Popup/content/injected
> are untrusted-adjacent and talk to it via typed messages. This is independent of the framework but WXT's
> entrypoint model makes it natural.

---

## 3. WASM for in-extension ZK proving — verdict

Generating ZK proofs client-side via WASM **works in an MV3 extension and is Chrome-Web-Store-publishable**,
with two requirements:

1. **CSP must allow WASM.** MV3 forbids `unsafe-eval`, but allows the dedicated `wasm-unsafe-eval`
   keyword. Set it in the manifest (WXT lets you patch the manifest in `wxt.config.ts`):
   ```jsonc
   "content_security_policy": {
     "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
   }
   ```
   For heavy crypto that instantiates WASM in workers too, widen it:
   `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self' 'wasm-unsafe-eval';`
   Firefox also honors `wasm-unsafe-eval` for MV3.

2. **Build plumbing.** Vite needs `vite-plugin-wasm` and (because most `wasm-bindgen`/proving libs
   instantiate with top-level `await`) `vite-plugin-top-level-await`. Without TLA you hit
   *"Module format 'iife' does not support top-level await."*

**Why WXT is the best home for this:** it's Vite, so the entire Vite WASM/worker ecosystem applies
directly — `vite-plugin-wasm`, `vite-plugin-top-level-await`, `?worker`/`?url` imports, and
`new Worker(new URL(...))` all work. Plasmo (Parcel) has a clumsier, less-documented WASM path.
**Gotcha:** run the prover in the **background SW or a dedicated Web Worker**, never on the popup's
main thread (proving is multi-second; it'd freeze the UI / can be killed when the popup closes). The
background SW can be terminated by MV3 idle timeout mid-proof — chunk the work or keep it alive with
an active port while proving.

---

## 4. Recommended stack

```
WXT (latest)  +  @wxt-dev/module-react  +  React 18/19 + TypeScript
Storage:   wxt/storage (built-in, typed)
Messaging: @webext-core/messaging (typed RPC popup/content ↔ background)
WASM/ZK:   vite-plugin-wasm + vite-plugin-top-level-await, prover in background SW / Worker
Output:    pnpm dev (Chrome) / --browser firefox ; pnpm zip / zip:firefox for store builds
```

---

## 5. Starter recipe (the winner)

### Scaffold
```sh
# Interactive: choose the "react" template + pnpm
pnpm dlx wxt@latest init my-wallet
cd my-wallet
pnpm install

# (or non-interactive)
pnpm dlx wxt@latest init my-wallet --template react
```

### `wxt.config.ts` — React module + WASM + wallet CSP
```ts
import { defineConfig } from 'wxt';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'My Wallet',
    permissions: ['storage'],
    // MV3 CSP: allow WebAssembly for client-side ZK proving
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self' 'wasm-unsafe-eval';",
    },
  },
  vite: () => ({
    plugins: [wasm(), topLevelAwait()],
  }),
});
```
```sh
pnpm add -D vite-plugin-wasm vite-plugin-top-level-await
pnpm add @webext-core/messaging
```

### Storage (typed, built-in) — `utils/storage.ts`
```ts
import { storage } from 'wxt/storage';

// Never put secrets in 'sync' (it leaves the device). Use 'local' / 'session'.
export const selectedAccount = storage.defineItem<string | null>('local:selectedAccount', {
  defaultValue: null,
});
// usage: await selectedAccount.setValue(addr); const a = await selectedAccount.getValue();
// reactive: selectedAccount.watch((next) => { ... });
```

### Messaging (typed RPC) — `utils/messaging.ts`
```ts
import { defineExtensionMessaging } from '@webext-core/messaging';

interface Protocol {
  getAccounts(): string[];
  signMessage(data: { account: string; message: string }): string;
}
export const { sendMessage, onMessage } = defineExtensionMessaging<Protocol>();
```

### Background = the keystore/signer — `entrypoints/background.ts`
```ts
import { onMessage } from '@/utils/messaging';

export default defineBackground(() => {
  onMessage('getAccounts', () => {/* read keyring */ return ['0xabc…'];});
  onMessage('signMessage', async ({ data }) => {/* sign with key in SW */ return '0xsig…';});
});
```

### Popup (React) — `entrypoints/popup/App.tsx`
```tsx
import { useEffect, useState } from 'react';
import { sendMessage } from '@/utils/messaging';

export default function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  useEffect(() => { sendMessage('getAccounts', undefined).then(setAccounts); }, []);
  return <ul>{accounts.map((a) => <li key={a}>{a}</li>)}</ul>;
}
```

### Injected provider (the long-lived `window.*` provider)
```ts
// entrypoints/inpage.content.ts  — runs in the isolated world, injects into the page
export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    await injectScript('/injected.js', { keepInDom: true }); // -> page main world
    // bridge: page (window.postMessage / CustomEvent) <-> background (sendMessage)
  },
});

// entrypoints/injected.ts  — the actual provider object exposed to dApps
export default defineUnlistedScript(() => {
  (window as any).myWallet = {
    request: (req: unknown) =>
      new Promise((resolve) => {
        // postMessage to the content script, which RPCs the background, then resolves
      }),
  };
});
```

### Dev / build commands
```sh
pnpm dev                 # Chrome, opens browser w/ extension installed + HMR
pnpm dev:firefox         # Firefox (web-ext under the hood)
pnpm build               # Chrome prod build  -> .output/chrome-mv3
pnpm build:firefox       # Firefox prod build
pnpm zip                 # store-ready zip (Chrome)
pnpm zip:firefox         # store-ready zip (Firefox)
```

---

## 6. Gotchas / watch-list
- **Background SW HMR is a re-register, not true HMR** (MV3-wide). WXT auto-reloads; expect a sub-second
  blip and a reset of in-memory SW state on background edits — fine, just don't keep unsaved secrets only in SW memory.
- **No built-in messaging in WXT** — add `@webext-core/messaging` (typed) or `webext-bridge` (good for
  injected/main-world hops). Don't roll raw `runtime.sendMessage` for a wallet; you want typed protocols.
- **ZK proving must not run on the popup thread** — use the background SW or a Worker; guard against MV3
  idle termination (keep an active port open during a proof, or checkpoint).
- **Content-script-only HMR**: if (and only if) you need true state-preserving HMR *inside* the injected
  page UI, CRXJS is the one thing that does it better — but it's not worth giving up WXT's everything-else.
- **`wasm-unsafe-eval` is store-safe** — Chrome Web Store and Firefox AMO both accept it; it is NOT the
  forbidden `unsafe-eval`.

---

## Sources
- WXT comparison (built-ins, cross-browser, maintenance): https://wxt.dev/guide/resources/compare
- WXT docs (init, React module, storage, content scripts, injectScript, defineUnlistedScript): https://wxt.dev
- 2025 State of Browser Extension Frameworks (verdict, stars, prod users, SW reload, CRXJS content HMR): https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/
- BuildPilot WXT vs Plasmo vs CRXJS 2026: https://trybuildpilot.com/649-wxt-vs-plasmo-vs-crxjs-2026
- Plasmo docs (useStorage, @plasmohq/messaging): https://docs.plasmo.com
- WXT WASM + CSP (vite-plugin-wasm, top-level-await, manifest CSP): https://github.com/wxt-dev/wxt/issues/1448 ; https://github.com/lionelhorn/wxt-wasm-vlcn-repro
- MV3 WASM CSP `wasm-unsafe-eval`: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy ; https://bugzilla.mozilla.org/show_bug.cgi?id=1766027
- WXT background SW reload tracking: https://github.com/wxt-dev/wxt/issues/53

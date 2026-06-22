# Reality Research: WXT extension feasibility for the Stellar ZK wallet

## Scope

Current-reality check for a WXT-based browser extension surface that would reuse the web wallet core, run a WebAssembly ZK prover, support optional passkey/WebAuthn, and originally considered a Freighter-compatible dApp bridge.

> **Decision update, 2026-06-24:** the active extension product direction is QuickShield + bridge companion. Freighter/Wallets Kit signing compatibility is not an active build target; public-key access and external signing must fail closed unless Abu explicitly reopens that scope.

This is not implementation work. No extension was scaffolded or run.

## Sources Checked

- Existing local research: `.thoughts/research/2026-06-21-wxt-wallet-arch.md`
- Context7:
  - `npx ctx7@latest library WXT "Is WXT feasible for a Manifest V3 browser extension wallet that needs WebAssembly ZK proving, dedicated workers or offscreen documents, and optional WebAuthn passkeys? What are the MV3 service worker limitations and workarounds?"`
  - `npx ctx7@latest docs /websites/wxt_dev_guide "Is WXT feasible for a Manifest V3 browser extension wallet that needs WebAssembly ZK proving, dedicated workers or offscreen documents, and optional WebAuthn passkeys? What are the MV3 service worker limitations and workarounds?"`
- WXT official docs:
  - https://wxt.dev/guide/essentials/config/manifest
  - https://wxt.dev/guide/essentials/entrypoints
  - https://wxt.dev/guide/essentials/extension-apis
  - https://wxt.dev/guide/essentials/remote-code
- Chrome official docs:
  - https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
  - https://developer.chrome.com/docs/extensions/reference/api/offscreen
  - https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy
  - https://developer.chrome.com/docs/extensions/whats-new
- MDN:
  - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
- GitHub primary issue check:
  - `gh issue view 1448 --repo wxt-dev/wxt --json number,title,state,createdAt,updatedAt,labels,body,url`
  - Result: issue `#1448`, title `wasm support at background script.`, state `OPEN`, label `pending-triage`, updated `2025-03-21T15:11:22Z`.

## Verified Facts

- WXT is a real web-extension framework. Context7 resolved the official docs as `/websites/wxt_dev_guide`; the WXT docs page showed version `v0.20.26`.
- WXT does not keep a source `manifest.json`; it generates the manifest from `wxt.config.ts`, entrypoint options, modules, and hooks. The final manifest is output under `.output/{target}/manifest.json`.
- WXT supports MV3 manifest configuration through `wxt.config.ts`; manual manifest fields such as permissions, host permissions, content security policy, action, side panel, and web-accessible resources are added there.
- WXT entrypoints map naturally to extension surfaces: background, popup, content script, options, side panel, unlisted scripts/pages, and other extension pages. For MV3, the background entrypoint is a service worker.
- WXT's extension API helper exposes a unified `browser` variable over Chrome/Firefox-style extension APIs; it is not a full webextension-polyfill unless that optional package is added.
- WXT's remote-code docs state that `url:` imports are downloaded and bundled so the extension does not depend on remote code at runtime, which matters for MV3 review.
- Chrome's MV3 extension service worker is not a durable long-running process. Chrome normally terminates it after 30 seconds of inactivity, when a single request/event/API call exceeds 5 minutes, or when a fetch response takes more than 30 seconds. Chrome docs explicitly say service workers should be resilient against unexpected termination.
- Chrome MV3 extensions that use WebAssembly must explicitly include `wasm-unsafe-eval` in the `extension_pages` content security policy. Chrome's extension updates page states this became required in Chrome 103, and Chrome also has official WASM-in-MV3 samples.
- Chrome's Offscreen API is available in Chrome 109+ for MV3 extensions. It creates a hidden extension document from a static bundled HTML file; it cannot be focused; only `chrome.runtime` is available as an extension API inside it; and one offscreen document can be open per profile. Chrome lists `WORKERS` as an offscreen reason for documents that need to spawn workers.
- The WXT GitHub issue `wxt-dev/wxt#1448` is still open. The reported failure is specifically a WASM package imported by the background script failing with `Module format "iife" does not support top-level await`, even with `vite-plugin-wasm`, `vite-plugin-top-level-await`, and `wasm-unsafe-eval` configured.
- MDN states that browser extensions can use WebAuthn with an RP ID covered by `host_permissions` starting with Chrome 122 and Firefox 150. MDN also notes a known popup issue: the WebAuthn flow may fail because the extension popup closes when the credential prompt appears; the documented workaround is to open the page in a new tab.
- MDN's WebAuthn extension docs state that the `prf` extension can be used during credential creation and authentication, returns deterministic PRF outputs for supplied inputs, and may return `{ prf: {} }` if the authenticator does not support PRF.
- Existing local Freighter research confirms Freighter is not WXT. Freighter is a Webpack MV3 extension and is useful as a wallet architecture/dApp-bridge reference, not proof that WXT can run this project's prover.

## Inferences

- WXT is feasible as the later extension framework, but not as a reason to assume the extension will be easy. The hard part is not React or extension packaging; it is where the prover and passkey ceremony run under MV3 constraints.
- The MV3 background service worker should be treated as a coordinator/router, not as the ZK prover runtime. It can wake up, route messages, create an offscreen document, persist state, and coordinate UI, but long proving work in the service worker conflicts with the lifecycle model and the open WXT WASM/background issue.
- The most plausible prover surfaces are an extension page, an offscreen document, or a dedicated worker spawned from an extension/offscreen page. The exact Nethermind prover stack must still be tested there before the extension can be promised.
- Passkey ceremonies should not be designed around the action popup. A full extension tab or side panel is safer because MDN documents popup closure during credential prompts.
- If Freighter/Wallets Kit compatibility is ever reopened, it likely needs to mirror Freighter's postMessage/content-script/background request contract closely enough for `@stellar/freighter-api` and Stellar Wallets Kit expectations. That is not the current product path; the current bridge is read-only/fail-closed for public-key access and signing.
- The web app remains the correct first judged surface because it avoids MV3 service-worker lifetime constraints while still proving the load-bearing ZK product.

## Unknowns And Questions

- The Nethermind prover WASM has not been tested inside a WXT offscreen document or a WXT-managed dedicated worker.
- It is not yet verified whether WXT exposes an ergonomic first-class offscreen entrypoint pattern or whether the project needs an unlisted page plus manual manifest/offscreen calls.
- The exact CSP needed for the prover worker path is untested. `wasm-unsafe-eval` is verified as required for WASM, but worker-specific policy and packaging need a spike.
- Passkey PRF has not been tested on the founder's actual phone/browser/OS/authenticator. It cannot be honestly marked verified until a real target-device test is run.
- WebAuthn in extensions with a stable RP ID requires host permissions. The final RP domain and extension-origin allowlist behavior are not yet product/infra decisions.

## Not Included

- No WXT scaffold.
- No local extension build.
- No prover benchmark.
- No phone/passkey test.
- No Chrome Web Store packaging test.
- No implementation plan beyond the factual implications above.

# Verification Audit: Phase 11 WXT extension surface

## Verdict

Conditional pass for extension scaffold, build, Chrome runtime smoke, extension dry proof generation, Freighter-style detection/network details, explicit fail-closed behavior for external public-key access and signing, real XLM and USDC QuickShield submits, reusable local USDC funder automation, and bridge handoff. QuickShield and bridge handoff are the active extension direction. Passkey, Wallets Kit branding/detection, Soroban auth-entry signing, SEP-0053 message signing, extension-native Ethereum bridge, and Chrome Web Store packaging remain deferred.

ZK Fighter now has an `apps/extension` WXT MV3 app that reuses `@zk-fighter/core`, builds a popup, side panel, background coordinator, content-script status probe, and offscreen document. The WXT production build includes the same browser prover assets used by the web app.

Chrome-for-Testing runtime smoke now passes: the unpacked extension loads in a temporary profile, popup/side-panel render, the background creates/queries the offscreen document, the content script answers a status probe, non-status signing requests are rejected, and the Nethermind browser/WASM module initializes in the offscreen context.

A separate Chrome-for-Testing dApp bridge harness now passes: a local test page sends Freighter-style page messages, the content script responds with the verified Freighter response envelope, connection and testnet network details are returned, public key stays empty, and external access/signing requests fail closed even after vault import and stale permission seeding.

Earlier local signing work proved feasibility, but Abu rejected the general public signing-wallet direction. That evidence is retained as a superseded spike only and is no longer part of active extension gates.

A deeper Chrome-for-Testing runtime gate also passes: an ephemeral testnet account is Friendbot-funded, inserted into the testnet ASP membership contract, and then used to generate a dry XLM deposit proof in the extension offscreen runtime. The dry proof reaches the submit callback and intentionally stops before submitting a deposit transaction.

This is not a Freighter-compatible wallet extension by product choice. It keeps detection/network responses for research, while public-key access and signing are disabled. The extension is now a ZK companion for receive, QuickShield, and bridge handoff.

USDC QuickShield now has real Chrome-for-Testing runtime evidence: the harness used a reusable local testnet USDC funder, transferred USDC into the fresh extension account, inserted ASP membership, generated the proof, and submitted a public USDC shield/deposit transaction.

## Artifacts Checked

- `apps/extension/package.json`
- `apps/extension/wxt.config.ts`
- `apps/extension/entrypoints/background.ts`
- `apps/extension/entrypoints/content.ts`
- `apps/extension/entrypoints/popup/index.html`
- `apps/extension/entrypoints/sidepanel/index.html`
- `apps/extension/entrypoints/prover-offscreen.html`
- `apps/extension/src/ExtensionApp.tsx`
- `apps/extension/src/dappMessages.ts`
- `apps/extension/src/dappRuntime.ts`
- `apps/extension/src/dappRuntimeHelpers.ts`
- `apps/extension/src/dappRuntimeState.ts`
- `apps/extension/src/offscreen.ts`
- `packages/core/src/dapp-bridge.ts`
- `packages/core/src/dapp-bridge.test.ts`
- `packages/core/src/extension-runtime.ts`
- `scripts/check-extension-dapp-bridge.mjs`
- `apps/extension/.output/chrome-mv3/manifest.json`

## Requirement Traceability

| Requirement | Evidence |
|---|---|
| Reuse shared core | Extension imports `@zk-fighter/core`; no separate wallet implementation was added. |
| Use WXT if packaging research remains valid | `apps/extension` uses `wxt@0.20.26` and `@wxt-dev/module-react`. |
| Keep MV3 background as coordinator | `entrypoints/background.ts` handles install/status/side-panel messages only; no prover runs in background. |
| Extension/offscreen prover-capable surface | `prover-offscreen.html` exists, build output includes prover assets, and the runtime harness initializes the Nethermind browser/WASM module in offscreen context. |
| Do not expose shielded internals through dApps | dApp responses expose only connection/network metadata; public-key access and signing fail closed. |
| Do not claim dApp compatibility early | Direct public-key access, transaction signing, auth-entry signing, message signing, Wallets Kit, and coexistence are unclaimed. |
| Do not claim extension passkey support early | `phase11ExtensionReadiness` still marks passkey as deferred. |
| Prepare extension USDC honestly | Internal extension USDC receive prep creates a public trustline and reports public evidence only; the funded harness now records a real USDC shield submit. |

## Build Evidence

Commands run on 2026-06-24:

- `pnpm --filter @zk-fighter/extension typecheck` passed.
- `pnpm --filter @zk-fighter/extension build` passed.
- `pnpm extension:runtime` passed using Chrome for Testing `150.0.7871.24`.
- `pnpm extension:dapp` passed using Chrome for Testing `150.0.7871.24`.
- `pnpm extension:runtime:deep` passed using Chrome for Testing `150.0.7871.24`.
- `pnpm extension:quickshield` passed for a real XLM shield submit.
- `pnpm extension:quickshield:usdc` passed for a real USDC shield submit after reusable local funder setup.

WXT output:

- target: `chrome-mv3`
- manifest: `apps/extension/.output/chrome-mv3/manifest.json`
- popup: `popup.html`
- side panel: `sidepanel.html`
- offscreen page: `prover-offscreen.html`
- background service worker: `background.js`
- content script: `content-scripts/content.js`
- total output size: `32.01 MB`

Bundled prover assets present in output:

- `js/web.js`
- `js/web_bg.wasm`
- `js/prover-worker.js`
- `js/prover-worker_bg.wasm`
- `js/storage-worker.js`
- `js/storage-worker_bg.wasm`
- `circuits/policy_tx_2_2.wasm`
- `circuits/policy_tx_2_2.r1cs`
- `circuit_keys/policy_tx_2_2_proving_key.bin`
- `circuit_keys/policy_tx_2_2_vk.json`
- `circuit_keys/policy_tx_2_2_vk_soroban.bin`

## Generated Manifest Summary

The generated Chrome MV3 manifest includes:

- `action.default_popup = "popup.html"`
- `side_panel.default_path = "sidepanel.html"`
- `background.service_worker = "background.js"`
- content script on `<all_urls>` at `document_start`
- permissions: `storage`, `sidePanel`, `offscreen`
- CSP: `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`

## Runtime Evidence

Smoke command run on 2026-06-24:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "chrome": "Chrome/150.0.7871.24",
  "popup": "rendered",
  "sidePanel": "rendered",
  "offscreen": "not-generated",
  "nethermindModule": {
    "runtime": "nethermind-browser-wasm",
    "elapsedMs": 13,
    "proofGenerated": false
  },
  "dryProofAttempt": {
    "status": "blocked",
    "durationMs": 4488,
    "proofGenerated": false,
    "submitReached": false,
    "blockerCount": 1,
    "firstBlocker": "ASP membership/indexer precondition stopped before proving; latest observed sync gap was 3,256,708 ledgers.",
    "lastEvent": "Building witness inputs…"
  },
  "contentScript": "status-ok-and-signing-rejected"
}
```

dApp bridge command run on 2026-06-24:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "chrome": "Chrome/150.0.7871.24",
  "dappBridge": {
    "connection": "ready",
    "network": {
      "network": "TESTNET",
      "networkName": "Test Net",
      "networkUrl": "https://horizon-testnet.stellar.org",
      "networkPassphrase": "Test SDF Network ; September 2015",
      "sorobanRpcUrl": "https://soroban-testnet.stellar.org/",
      "friendbotUrl": "https://friendbot.stellar.org"
    },
    "publicKey": "empty-before-access",
    "requestAccess": "disabled-before-vault",
    "signTransaction": "disabled-before-vault"
  }
}
```

The former dApp signing command was removed from active scripts. Its local signed-XDR verification is historical spike evidence only.

Deep proof command run on 2026-06-24:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "friendbot": {
    "hash": "7a863b870e2339d9580b8a0b08acc4fe56326f82c84f44519ebe9ce6741d084e",
    "successful": true
  },
  "userAddress": "GCETJEC6HNDOZFFMOGEP6QPY6SOLXP6QVSSMPVYADYJEINR76TV2ZKUL",
  "aspInsert": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "20acd7465c4fa640a41876e03c5fc5334e5ba777a749aace48f83898c2034b6f"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "durationMs": 8503,
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

Chrome runtime gates now covered:

- Load unpacked extension in temporary Chrome-for-Testing profile.
- Verify popup and side panel render.
- Create/open the offscreen document from background and verify runtime messaging.
- Attempt Nethermind module load from extension/offscreen origin.
- Verify content-script status probe and fail-closed non-status signing request.
- Verify Freighter-style request/response envelope for dApp connection and network details.
- Verify dApp public-key access stays empty before an access grant exists.
- Verify external public-key access and signing reject explicitly before and after vault import.
- Verify stale stored dApp permissions do not expose an address or signing capability.
- Friendbot-fund an ephemeral testnet account without exposing its mnemonic.
- Submit ASP `insert_leaf` for that ephemeral account.
- Generate a dry XLM deposit proof in extension offscreen runtime and stop before transaction submission.

Still deferred:

- Test WebAuthn PRF in a tab/side-panel surface on the target device/browser.
- Test Wallets Kit detection/branding only if Abu reopens public dApp wallet scope.
- Keep Soroban auth-entry signing and SEP-0053 message signing disabled unless the product direction changes.
- Test coexistence behavior if Freighter and ZK Fighter are both installed.
- Chrome Web Store packaging/review.

## Update: QuickShield Companion Lockdown

After Abu rejected the public dApp signing wallet direction, the extension runtime was updated to keep Freighter-style detection/network responses while disabling external public-key access and signing. The active Chrome runtime gates are now:

- `pnpm extension:runtime`
- `pnpm extension:dapp`
- `pnpm extension:quickshield`
- `pnpm extension:quickshield:usdc`
- `pnpm extension:bridge`
- `pnpm extension:runtime:deep`

Fresh runtime evidence on 2026-06-24:

```json
{
  "dappBridge": {
    "publicKey": "empty-before-access",
    "requestAccess": "disabled-before-and-after-vault",
    "signTransaction": "disabled-locked-unlocked-and-stale-permission"
  },
  "aspInsert": {
    "txHash": "f18a1e7666ef827da5636d810ba26afc4d3808bf8d56a6b2249cbe7b2aaaec17"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

Follow-up cleanup on 2026-06-24 removed the unused public dApp permission/signing module, pending approval queue, active approval/revoke runtime commands, and stale `extension:dapp:sign` path. The remaining dApp bridge code is only the fail-closed detection/network probe used by `pnpm extension:dapp`.

## Update: QuickShield Runtime Evidence

`pnpm extension:quickshield` passed on 2026-06-24 with a throwaway seed-backed extension vault in a temporary Chrome-for-Testing profile. The harness funded the public Stellar address with Friendbot, submitted the public ASP setup transaction, then submitted the real public XLM shield/deposit transaction through the extension offscreen runtime:

```json
{
  "asset": "XLM",
  "userAddress": "GAQMOLRAGW4RHHDXKYUXKJXSVGEAXJWOKTWAZSQA6AG2NSHGMFGJY5W2",
  "friendbot": {
    "hash": "8e843e09f495d76d8b5f4ec447e06385d2e0e06560f989ee7cec415671f66539"
  },
  "access": {
    "txHash": "a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90"
  },
  "quickShield": {
    "txHash": "a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b",
    "proofGenerated": true,
    "transactionSubmitted": true
  }
}
```

`pnpm extension:quickshield:usdc` passed on 2026-06-25 after Abu funded the reusable local testnet USDC funder. The harness created a fresh extension vault, created the public USDC trustline, transferred USDC from the reusable funder, submitted ASP setup, then submitted the real public USDC shield/deposit transaction through the extension offscreen runtime:

```json
{
  "asset": "USDC",
  "userAddress": "GBKZBDQE43NMIFDW4B7C4NQCN2JPXQEDM5XNBLL7UTSAZE5Q3ATE5SZV",
  "usdcFunding": {
    "txHash": "b8b17c66909ad24d6986408badacfc6986051c281a44a54e9c30d1e4243098cf"
  },
  "access": {
    "txHash": "4fdc92e9df466d506a3e0c0237f2fd87eddbe65a788a260efaed78b8511b2cfa"
  },
  "quickShield": {
    "poolContractId": "CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY",
    "txHash": "0bc63cf0b7212d961d880acae3a3b72ae939e2a0fdf65c538b828684f6010e17",
    "proofGenerated": true,
    "transactionSubmitted": true
  }
}
```

## Update: Bridge Handoff Runtime Evidence

`pnpm extension:bridge` passed on 2026-06-24 with a throwaway seed-backed extension vault in a temporary Chrome-for-Testing profile. The harness called the extension bridge handoff action and verified Chrome opened the web bridge route with the current network, public Stellar destination, and resume burn hash.

```json
{
  "publicKey": "GBR3PRKDGEJOF4GBYMFAS2UYUORVCMUH3HY2ZI6WHXQAKZ4VCZ7PIAOO",
  "openedTabUrl": "http://localhost:5173/?zkfAction=bridge&network=testnet&destination=GBR3PRKDGEJOF4GBYMFAS2UYUORVCMUH3HY2ZI6WHXQAKZ4VCZ7PIAOO&resumeBurnHash=0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
}
```

## Final Claim Boundary

The web app remains the safest judged surface unless Abu chooses to include the extension in the final demo. The extension may be described as a WXT MV3 scaffold with passing production build, Chrome-for-Testing runtime smoke, bundled prover assets, offscreen Nethermind module initialization, dry XLM deposit proof generation, receive-code QR/copy, real XLM and USDC QuickShield shield/deposit evidence, reusable local testnet USDC funder automation, web bridge handoff runtime evidence, and Freighter-style detection/network responses that fail closed for public-key access and signing. It must not be described as a Freighter-compatible provider, Wallets Kit-ready wallet, public dApp signer, Soroban auth-entry signer, message-signing provider, passkey-supported extension, extension-native Ethereum bridge, or Web Store-ready extension until those gates pass and Abu approves the scope.

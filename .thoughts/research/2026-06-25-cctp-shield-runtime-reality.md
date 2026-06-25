# Reality Research: CCTP Arrival Shield Runtime

## Scope

This note records why the Base Sepolia public bridge leg could complete in the headless Node runner while the separate USDC shield/deposit needed the extension/browser runtime.

## Sources Checked

- `packages/core/src/nethermind-runtime.ts`
- `packages/core/src/asp-membership-insert.ts`
- `packages/core/src/xlm-shield.ts`
- `scripts/check-cctp-bridge-source.ts`
- `scripts/check-extension-cctp-shield.mjs`
- `reference/stellar-private-payments/deployments/testnet/deployments.json`
- Context7 docs for `/stellar/js-stellar-sdk` on Soroban transaction submission.
- Runtime command output from `pnpm cctp:shield:extension`.

## Verified Facts

- The CCTP bridge leg can run from Node because it uses EVM JSON-RPC, Circle Iris, Stellar RPC, and signed Soroban transactions.
- Nethermind proof generation and ASP state helpers are packaged as browser/WASM code staged under `apps/web/public/js`.
- The default Nethermind importer resolves `/js/web.js`; in Node this resolves as `file:///js/web.js` and fails.
- Loading `apps/web/public/js/web.js` directly with `web_bg.wasm` initializes the WASM module, but `mainThread` still fails in pure Node with browser assumptions including `Window`, `location.href`, and worker spawning.
- The extension offscreen runtime supplies the browser environment required by Nethermind and has prior accepted XLM/USDC QuickShield evidence.
- Testnet deployment source of truth:
  - ASP membership: `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`
  - USDC pool: `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`
- CCTP USDC atomics use 6 decimals, while Stellar asset stroops use 7 decimals. A bridged `1_000_000` CCTP atomic USDC must shield as `10_000_000` Stellar stroops.

## Inferences

- The right automation split is: headless Node for public CCTP bridge leg, extension/offscreen runtime for post-bridge ASP insertion and USDC shield proof.
- A pure Node Nethermind runner would require a separate, properly supported Node/WASI build or a browser-compatible worker/runtime shim; it should not be assumed from the current browser artifact.

## Unknowns And Questions

- Whether Nethermind can expose a first-class Node proof runtime later.
- Whether ASP insertion should become idempotent in product UX instead of asking users to prepare access repeatedly.

## Not Included

- No new contract deployment.
- No atomic bridge-and-shield claim.
- No mainnet bridge-to-shield claim.

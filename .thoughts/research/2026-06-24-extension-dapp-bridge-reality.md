# Reality Research: Extension dApp Bridge Profile

## Scope

Check what ZK Freighter can truthfully claim about a Freighter-style dApp bridge in the WXT extension. This covers detection, network/profile responses, public-key access, and transaction signing boundaries.

## Sources Checked

- Context7: `npx ctx7@latest library "@stellar/freighter-api" "Implement a browser extension dApp bridge compatible with Freighter API methods isConnected, getAddress, requestAccess, getNetwork, signTransaction; expected message transport and response shapes"` resolved `/stellar/freighter`.
- Context7: `npx ctx7@latest docs /stellar/freighter "Implement a browser extension dApp bridge compatible with Freighter API methods isConnected, getAddress, requestAccess, getNetwork, signTransaction; expected message transport and response shapes"`.
- Local reference: `reference/freighter/@stellar/freighter-api/src/*.ts`.
- Local reference: `reference/freighter/@shared/api/external.ts`.
- Local reference: `reference/freighter/@shared/api/helpers/extensionMessaging.ts`.
- Local reference: `reference/freighter/@shared/constants/services.ts`.
- Local reference: `reference/freighter/extension/src/contentScript/helpers/redirectMessagesToBackground.ts`.
- Local reference: `reference/freighter/extension/src/background/messageListener/freighterApiMessageListener.ts`.
- Current ZK Freighter source: `apps/extension/entrypoints/content.ts`, `packages/core/src/extension-runtime.ts`, `scripts/check-extension-runtime.mjs`.

## Verified Facts

- Freighter dApps can use `@stellar/freighter-api` functions such as `isConnected`, `getAddress`, `requestAccess`, `getNetwork`, and `signTransaction`. Context7 docs show result objects shaped around `isConnected`, `address`, `network`, `networkPassphrase`, `signedTxXdr`, `signerAddress`, and optional `error`.
- Freighter API source sends page messages with `source: "FREIGHTER_EXTERNAL_MSG_REQUEST"`, a `messageId`, and an external service `type`.
- Freighter content script accepts same-window `postMessage` events only, validates the request source, forwards to background, then posts `source: "FREIGHTER_EXTERNAL_MSG_RESPONSE"` with the original ID under the misspelled field `messagedId`.
- Freighter external service type strings include `REQUEST_ACCESS`, `REQUEST_PUBLIC_KEY`, `SUBMIT_TRANSACTION`, `REQUEST_NETWORK`, `REQUEST_NETWORK_DETAILS`, `REQUEST_CONNECTION_STATUS`, `REQUEST_ALLOWED_STATUS`, and `SET_ALLOWED_STATUS`.
- `getNetwork()` in `@stellar/freighter-api` calls the same network-details path and returns both `network` and `networkPassphrase`.
- Freighter `requestAccess()` and `signTransaction()` are approval flows. In Freighter, background opens a grant/signing window and resolves from a queue after user action.
- The current ZK Freighter extension content script only supports a custom `ZKFIGHTER_EXTENSION_REQUEST` status probe and rejects non-status requests.
- `@stellar/freighter-api` and Stellar Wallets Kit are not installed in this repo.

## Inferences

- ZK Freighter can add a Freighter-style message profile for detection and network responses without claiming full Freighter compatibility.
- `REQUEST_PUBLIC_KEY` should return an empty public key until the extension has a tested unlock/access grant path.
- `REQUEST_ACCESS`, `SET_ALLOWED_STATUS`, and `SUBMIT_TRANSACTION` should fail closed with explicit API errors until an extension vault, user approval surface, and signing test pass.
- A Chrome runtime harness should test the exact message-source/service-type/`messagedId` contract because content-script presence alone is not wallet compatibility.

## Unknowns And Questions

- Stellar Wallets Kit detection is not yet tested against ZK Freighter. This pass should not claim Wallets Kit support.
- Coexistence behavior when Freighter and ZK Freighter are both installed needs a later browser test before public extension distribution.
- Extension signing requires a separate design and security pass for vault unlock, origin allowlisting, user approval UI, network mismatch warnings, and transaction review.

## Not Included

- No Wallets Kit compatibility claim.
- No Chrome Web Store packaging claim.
- No coexistence proof when Freighter and ZK Freighter both respond to Freighter-style page messages.

## Update: QuickShield Companion Decision

The read-only bridge profile was briefly extended on 2026-06-24 to prove public dApp signing feasibility. Abu then rejected making ZK Freighter a general public dApp signing wallet because it shifts the product toward Freighter replacement behavior.

The active extension claim is now narrower:

- Freighter-style connection and network-detail responses are allowed for detection research.
- `REQUEST_PUBLIC_KEY`, `REQUEST_ACCESS`, `SET_ALLOWED_STATUS`, `SUBMIT_TRANSACTION`, `SUBMIT_AUTH_ENTRY`, and `SUBMIT_BLOB` fail closed.
- `pnpm extension:dapp` must prove this disabled behavior before/after vault import and with stale stored dApp permissions.
- QuickShield and bridge handoff are the active extension product direction.

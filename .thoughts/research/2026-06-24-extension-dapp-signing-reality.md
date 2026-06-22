# Reality Research: Extension dApp Signing

> **Decision update, 2026-06-24:** Abu rejected making ZK Fighter a general public dApp signing wallet. Keep this research as feasibility and risk context only. The active extension direction is QuickShield + bridge companion, with external public-key access and signing disabled.

## Scope

Research whether ZK Fighter should become a normal Stellar signing wallet for dApps, similar to Freighter or MetaMask connect/sign flows. This covers current Stellar wallet APIs, what Freighter and Wallets Kit expect, what the Nethermind reference app needed from wallets, and what ZK Fighter currently lacks.

## Sources Checked

- Context7: `npx ctx7@latest docs /creit-tech/stellar-wallets-kit "How Stellar Wallets Kit detects wallets, connects to Freighter-compatible browser extensions, requests an address, reads network, and signs Stellar transaction XDR"`.
- Context7: `npx ctx7@latest docs /stellar/freighter "current browser extension dApp API requestAccess getAddress signTransaction signAuthEntry signMessage networkPassphrase address options"`.
- Context7: `npx ctx7@latest docs /websites/wxt_dev_guide "Chrome MV3 extension content script background messaging side panel storage offscreen document build configuration"`.
- Context7: `npx ctx7@latest docs /creit-tech/stellar-wallets-kit "module interface isAvailable getAddress signTransaction signAuthEntry signMessage browser wallet detection options"`.
- Online Freighter guide: `https://github.com/stellar/freighter/blob/master/docs/docs/guide/usingFreighterWebApp.md`.
- Online Wallets Kit module guide: `https://github.com/creit-tech/stellar-wallets-kit/blob/main/docs/files/wallets/create-wallet-module.md`.
- Online WXT guide: `https://wxt.dev/guide/essentials/entrypoints` and `https://wxt.dev/guide/essentials/extension-apis`.
- Online Chrome side panel docs: `https://developer.chrome.com/docs/extensions/reference/api/sidePanel`.
- Stellar protocol SEP-0043: `https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md`.
- Stellar protocol SEP-0053: `https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0053.md`.
- Local Freighter API docs: `reference/freighter/docs/api-integration.md`.
- Local Freighter source:
  - `reference/freighter/@shared/api/external.ts`
  - `reference/freighter/@shared/api/helpers/extensionMessaging.ts`
  - `reference/freighter/@shared/constants/services.ts`
  - `reference/freighter/extension/src/background/messageListener/freighterApiMessageListener.ts`
  - `reference/freighter/docs/docs/guide/usingFreighterWebApp.md`
- Local Wallet/UX research: `.thoughts/research/2026-06-21-ux-traditional-wallets.md`.
- Local ecosystem bundle: `reference/stellar-build` at commit `00d26c9`.
- Local xBull wallet reference: `reference/xbull-wallet` at commit `8308875`.
- Local Stellar ecosystem connect-wallet workshop: `reference/stellar-ecosystem-resources/connect-wallet` at commit `907fd48`.
- Local Nethermind app reference:
  - `reference/stellar-private-payments/app/js/wallet.js`
  - `reference/stellar-private-payments/app/js/admin.js`
- Current ZK Fighter source:
  - `packages/core/src/dapp-bridge.ts`
  - `apps/extension/entrypoints/content.ts`
  - `apps/extension/entrypoints/background.ts`
  - `packages/core/src/identity.ts`
  - `packages/core/src/soroban-submit.ts`
  - `packages/core/src/vault.ts`
- Current ZK Fighter audit: `.thoughts/verification/2026-06-24-phase11-wxt-extension-audit.md`.

## Verified Facts

- Freighter-style dApp connection is not just extension detection. Its normal flow is: `isConnected()`, `isAllowed()`, `requestAccess()` when needed, then `getAddress()` for already-approved sites.
- Freighter request/response transport uses page `postMessage` with `FREIGHTER_EXTERNAL_MSG_REQUEST`, a `messageId`, service types such as `REQUEST_ACCESS` and `SUBMIT_TRANSACTION`, and responses tagged `FREIGHTER_EXTERNAL_MSG_RESPONSE` with `messagedId`.
- Freighter stores allow-list state by site origin, public key, and network segment. Its background checks `isSenderAllowed` before returning a public key.
- Freighter opens a grant-access window for `requestAccess()` / `setAllowed()`, then resolves the dApp request from a response queue only after user confirmation.
- Freighter `signTransaction()` accepts transaction XDR and optional `networkPassphrase` / `address`. It parses the transaction, checks account/network context, opens a signing UI, and returns `{ signedTxXdr, signerAddress }` or an API error.
- Freighter also exposes `signAuthEntry()` and `signMessage()`. Local docs say `signTransaction()` does not auto-request access, while `signAuthEntry()` and `signMessage()` can auto-request access.
- Current Freighter docs/source have an auth-entry return-shape nuance: some docs describe `signedAuthEntry` as `Buffer | null`, while current API source returns a string value for the browser API path. ZK Fighter should treat the provider response as string-compatible and test against real callers.
- Freighter `signTransaction()` does not auto-request access in current local source. ZK Fighter should reject unapproved origins for transaction signing unless the product deliberately chooses a prompt-on-sign flow.
- Stellar Wallets Kit modules expose `isAvailable()`, `getAddress()`, `signTransaction()`, `signAuthEntry()`, and `signMessage()`. Wallets Kit docs say module availability should answer in less than 1000 ms.
- Wallets Kit `signTransaction()` options are aligned with SEP-0043-style fields: `networkPassphrase`, `address`, and sometimes hardware-wallet `path`.
- Wallets Kit modules return `{ signedTxXdr, signerAddress? }`, `{ signedAuthEntry, signerAddress? }`, and `{ signedMessage, signerAddress? }`. ZK Fighter needs browser runtime evidence, not only TypeScript compatibility.
- SEP-0043 is still `Draft` as of the checked protocol file. It defines a wallet interface with `getNetwork`, `getAddress`, `signTransaction`, `signAuthEntry`, `signMessage`, and optional transaction-submit fields. ZK Fighter should not claim full SEP-0043 support until the runtime paths are proven.
- SEP-0053 is `Final` and defines message signing as a base64-encoded XDR `SignedPayload` containing the account, payload, and decorated signature. If ZK Fighter enables `signMessage`, it must either follow SEP-0053 or explicitly document why it is disabled.
- WXT current guidance keeps extension APIs inside entrypoint `main`/`defineBackground` callbacks. ZK Fighter's current entrypoints already follow that shape; future runtime listeners should stay there.
- Chrome's side panel API is a real extension-controlled approval surface and fits longer dApp approval/signing review better than popup-only UX.
- `stellar-build` is a skills/data bundle, not a wallet implementation. Its useful local data confirms the active comparison set: Freighter, xBull, Albedo, Hana, LOBSTR, Moonlight, Zarf, zkCross, and ZKLiquid.
- The `stellar-build` resource link for `stellar/ecosystem-resources/connect-wallet` points to a workshop focused on smart wallets/passkeys, not browser-extension provider compatibility. It is useful for UX context but does not replace Freighter/xBull provider research.
- xBull is an open-source Stellar wallet extension whose README describes it as a bridge between websites/users and Stellar. It supports site permissions, public-key requests, XDR signing, and message signing.
- xBull protects public keys from websites until the user accepts sharing, stores site permissions, and opens an extension-controlled popup for connection and signing requests.
- xBull recommends Stellar Wallets Kit for multi-wallet integration. Its own SDK exposes `getAddress`, `signTransaction`, `getNetwork`, and `signMessage` style methods.
- The Nethermind privacy-pool app already wrapped Freighter as a wallet adapter with `connectWallet()`, `getWalletAddress()`, `getWalletNetwork()`, `signWalletTransaction()`, `signWalletAuthEntry()`, and `signWalletMessage()`.
- The Nethermind app used `signMessage()` to derive privacy keys from a wallet signature, and used `signTransaction()` / `signAuthEntry()` for Soroban client calls.
- ZK Fighter already has core signing primitives for its own identity: `deriveWalletKeypair()` and `signTransactionXdrWithWallet()` sign XDR from the seed-backed public Stellar account.
- ZK Fighter’s encrypted vault exists in the web core, but the extension does not yet have an unlock flow, persisted vault state, approval queue, transaction review UI, or origin allow-list.
- ZK Fighter’s current extension dApp bridge only proves read-only detection/network behavior and intentionally returns no public key before access.
- ZK Fighter's current `packages/core/src/dapp-bridge.ts` only models the read-only/access/sign-transaction subset. It does not yet include explicit `SUBMIT_AUTH_ENTRY` or `SUBMIT_BLOB`/message-signing request handling.

## Inferences

- This feature makes product sense. It would let ZK Fighter act like a Stellar wallet extension for dApps while still keeping shielded transfers as the main differentiator.
- The first honest compatibility target should be direct Freighter API behavior because many Stellar dApps already understand it, and Wallets Kit can be tested after the direct methods pass.
- A full dApp signing feature needs at least three separable gates: origin access grant, public-key sharing, and transaction/auth/message signing.
- ZK Fighter should not expose the private receive code, note keys, encryption keys, membership blinding, proof artifacts, or shielded balances through the dApp bridge. The bridge should expose only the public Stellar address and signing results for explicitly approved requests.
- Signing should reuse the public Stellar account derived from the seed phrase only after the extension vault is unlocked. It should not invent a second key unless the product deliberately chooses a separate public-wallet identity.
- The extension approval UI should be a side panel, tab, or dedicated extension page. A popup-only ceremony is risky because browser popups can close during auth or longer review flows.
- Public dApp signing and shielded transfers create different privacy postures. Connecting to a dApp publicly links that origin to the user’s public Stellar address; it does not reveal shielded notes by itself, but it can create user-facing privacy confusion if copy is weak.
- Wallets Kit support likely requires either matching Freighter closely enough for its Freighter module or publishing a first-class ZK Fighter module later. The second path is cleaner long-term but slower for hackathon evidence.
- xBull reinforces that public-key access and signing permission should be separate capabilities. For ZK Fighter, this supports a permission model with at least `share public Stellar address` and `request signatures`.
- The connect-wallet workshop reinforces a separate smart-wallet/passkey path, but it does not change ZK Fighter's current locked decision: passkey remains optional and seed phrase remains the guaranteed recovery path.
- Message-signing semantics are no longer the main unknown because SEP-0053 is final. The real product question is whether ZK Fighter should expose message signing during the hackathon, because signed messages can act as login or authorization proof.

## Unknowns And Questions

- Whether Wallets Kit will treat a non-Freighter extension answering Freighter messages as the Freighter module, or whether a dedicated ZK Fighter Wallets Kit module is required for clean detection and branding.
- How ZK Fighter should behave when Freighter and ZK Fighter are both installed and both answer Freighter-style page messages.
- Whether `signMessage()` should be supported in the hackathon slice. The protocol shape is clear enough, but the phishing/login UX risk is higher than transaction signing.
- Whether dApp signing should be limited to classic transaction XDR first, then Soroban `signAuthEntry()` later, or whether both are needed for a credible Stellar dApp wallet demo.
- How much transaction decoding/review ZK Fighter can safely implement without importing a large Freighter-style transaction-inspection stack.
- Whether users should explicitly opt into “public dApp wallet mode” so the privacy-by-default product does not surprise them by sharing a public address with external sites.

## Not Included

- No Wallets Kit module implementation or Wallets Kit detection proof.
- No Soroban `signAuthEntry()` implementation.
- No SEP-0053 `signMessage()` implementation.
- No coexistence proof when Freighter and ZK Fighter are both installed.
- No Chrome Web Store packaging claim.

## Superseded Implementation Evidence

On 2026-06-24, ZK Fighter briefly implemented the first public dApp wallet-mode slice:

- Extension-owned encrypted vault import/unlock state.
- Opt-in public dApp wallet mode.
- Origin grants keyed by normalized origin, active network, and public Stellar key.
- Content-script to background routing for Freighter-style page messages.
- `REQUEST_ACCESS`, `REQUEST_PUBLIC_KEY`, `REQUEST_ALLOWED_STATUS`, `SET_ALLOWED_STATUS`, and `SUBMIT_TRANSACTION` handling.
- Explicit fail-closed behavior for no-wallet, disabled mode, locked vault, unapproved origin, wrong network, wrong signer, and malformed XDR.
- Transaction signing via shared core `signTransactionXdrWithWallet()`.
- No dApp bridge exposure of `zkf1...`, note keys, encryption keys, ASP membership blinding, proof state, or shielded balances.

Runtime evidence:

```json
{
  "command": "pnpm extension:dapp:sign",
  "ok": true,
  "chrome": "Chrome/150.0.7871.24",
  "publicKey": "GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX",
  "signedXdrVerified": true
}
```

The signed XDR was not submitted to chain; the harness verified the Stellar transaction signature locally against the seed-derived public key.

This evidence proves feasibility only. It is no longer an active product claim or active test gate.

# Plan: Extension QuickShield And Bridge Companion

## Inputs

- Product decision from Abu on 2026-06-24: ZK Freighter should not become a general dApp signing wallet.
- Current web evidence: XLM/USDC shielded flows, disclosure, passkey wrapper, and safe CCTP bridge-then-shield.
- Current extension evidence: WXT MV3 build, Chrome runtime smoke, offscreen Nethermind module load, and offscreen dry XLM proof generation.
- Superseded plan: `.thoughts/plans/2026-06-24-extension-public-dapp-wallet-mode-plan.md`.

## Assumptions

- Internal transaction signing remains required for ZK Freighter-owned actions such as shield, unshield, bridge mint/forward, and proof-backed pool calls.
- External arbitrary dApp signing is deferred and disabled because it would shift the product toward a Freighter replacement.
- Mobile is a later track. Extension work continues first because WXT/offscreen prover evidence already exists.
- Extension-native Ethereum bridge is not claimed until a real Chrome runtime spike proves safe access to an Ethereum signer from the extension surface.

## Phase 1: Product Posture Cleanup

### Goal

Remove active public dApp signing claims and make the extension posture match the privacy-by-default product.

### Work

- Update README, AGENTS, extension readiness, and verification notes.
- Remove `pnpm extension:dapp:sign` from active scripts.
- Keep signing evidence only as a superseded feasibility spike.

### Checks

- `pnpm docs:check`
- Search active docs for stale public dApp signing claims.

## Phase 2: External Signing Lockdown

### Goal

Keep Freighter-style detection/network responses for compatibility research while preventing public-key access or signing.

### Work

- Make `REQUEST_PUBLIC_KEY` return an empty public key.
- Make `REQUEST_ACCESS`, `SET_ALLOWED_STATUS`, `SUBMIT_TRANSACTION`, `SUBMIT_AUTH_ENTRY`, and `SUBMIT_BLOB` return explicit disabled errors.
- Ignore stale stored dApp permissions for address/signing behavior.

### Checks

- Unit tests for fail-closed bridge responses.
- `pnpm extension:dapp` proves disabled behavior before/after vault import and with stale permissions.

## Phase 3: QuickShield Extension Surface

### Goal

Turn the side panel into a ZK Freighter companion: vault, public deposit address, private receive code, and shield action.

### Work

- Add create/import/unlock/lock UI using the shared vault and identity primitives.
- Show network, public Stellar address, private `zkf1...` receive code, and QR.
- Run XLM/USDC shield attempts through the extension offscreen runtime.
- Show real submit reports, blockers, hashes, and explorer links. Do not show fake balances or proof success.

### Checks

- `pnpm extension:runtime`
- `pnpm extension:runtime:deep`

## Phase 4: Bridge Handoff

### Goal

Let the extension start or resume the proven web bridge flow without pretending extension pages can use injected Ethereum wallets.

### Work

- Open the web app bridge surface with public destination/network context.
- Pass an optional resume burn hash.
- Web bridge reads the handoff context and keeps the existing public CCTP bridge then separate shield flow.

### Checks

- Browser build verifies the handoff code.
- The bridge UI still labels Ethereum burn, Circle attestation, Stellar mint, and shield/deposit boundaries as public.

## Verification Checkpoint

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm extension:runtime`
- `pnpm extension:dapp`
- `pnpm extension:runtime:deep`

Do not claim extension QuickShield or bridge handoff as judged surface until the Chrome runtime gates pass after implementation.

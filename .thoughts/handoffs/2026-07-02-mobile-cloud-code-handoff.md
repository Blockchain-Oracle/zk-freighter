# Handoff: Mobile, Bootnode, Web/Extension Re-Verification

## Objective

Continue from the current mobile/runtime instability work without trusting this session blindly. The goal is to make ZK Freighter work as a real product across web, WXT extension, and Capacitor mobile: funding, shield/unshield, activity, discover, receive, settings, and mobile UI must be real integration, not placeholders.

## Current State

- Repo root: `/Users/abu/dev/hackathon/stellar-zk-wallet`
- Branch: `feat/web-wallet-redesign`
- Worktree is dirty with broad web/extension/bootnode/mobile changes. Do not revert without auditing.
- Running local services at handoff time:
  - Mobile HTTPS Vite preview: `https://192.168.18.4:4183/` (PID `96651`)
  - Funding API: `http://192.168.18.4:8787` (PID `45988`)
  - Testnet bootnode: `http://192.168.18.4:8788/rpc` (PID `84508`)
  - Mainnet bootnode: `http://192.168.18.4:8789/rpc` (PID `84648`)
- Abu saw `ERR_CERT_AUTHORITY_INVALID` on the phone browser. That is expected for Vite self-signed HTTPS and is not yet resolved for phone browser testing.
- Native Capacitor should be tested separately from the phone browser preview. Phone browser preview needs a trusted tunnel or trusted cert.

## Key Decisions

- Mobile is a full product surface, not a companion-only mock.
- Mobile uses Capacitor (`apps/mobile`) with React/Vite, `appId: com.zkfreighter.wallet`, `appName: ZK Freighter`, `webDir: dist`.
- Mobile must reuse shared `@zk-freighter/core` behavior where web/extension already work.
- Phone browser testing over `http://192.168.18.4:4183` fails Web Crypto because LAN HTTP is not a secure context.
- Vite HTTPS preview enables Web Crypto locally, but phone browser still rejects the self-signed cert unless trusted.
- Recommended next direction: use a trusted tunnel (for example Cloudflare quick tunnel) or a proper locally trusted cert; also make mobile preview API calls same-origin/proxied to avoid HTTPS page -> HTTP API mixed-content failures.
- Do not trust this handoff as proof that the product is complete. Reproduce independently.

## Artifacts

- Mobile prototypes Abu wants treated as direction, not copied blindly:
  - `/Users/abu/Downloads/GitHub repository link(2)/ZK Freighter Mobile Home.dc.html`
  - `/Users/abu/Downloads/GitHub repository link(2)/ZK Freighter Mobile Flows.dc.html`
- Redesign docs:
  - `/Users/abu/dev/hackathon/stellar-zk-wallet/docs/redesign/DESIGN-MAP.md`
  - `/Users/abu/dev/hackathon/stellar-zk-wallet/docs/redesign/COMPONENTS.md`
- Project context:
  - `/Users/abu/dev/hackathon/stellar-zk-wallet/AGENTS.md`
  - `/Users/abu/dev/hackathon/stellar-zk-wallet/.thoughts/research/spikes-log.md`
- Generated mobile delta note:
  - `/Users/abu/dev/hackathon/stellar-zk-wallet/.thoughts/prototype-discovery/2026-07-02-mobile-capacitor-deltas.md`

## Files Changed

High-level changed/created areas:

- `apps/mobile/` new Capacitor app with iOS/Android native projects, mobile UI, vault, home, receive, activity, more/settings, flows.
- `apps/mobile/src/MobileHome.tsx`
  - Added horizontal swipe/scroll balance rail.
  - Public card hides Add funds outside Testnet and after balances are sufficient.
- `apps/mobile/src/MobileApp.tsx`
  - Mobile Add funds now uses shared `requestDemoFunding`, not low-level hosted funding only.
  - Activity records funding tx hashes.
- `apps/mobile/src/MobileShieldFlow.tsx`
  - Mobile Shield calls shared `submitShieldWithPrerequisites`.
- `packages/core/src/runtime-config.ts`
  - Reads `import.meta.env`.
  - Local endpoints can infer LAN host for phone preview.
- `apps/bootnode/src/rpc.ts`
  - Warmed `getEvents` now includes `latestLedgerCloseTime` and `oldestLedgerCloseTime`.
  - This fixed a mobile Shield preflight error: `network error: error decoding response body`.
- `apps/bootnode/src/rpc.test.ts`, `apps/bootnode/src/rpc-warmed.test.ts`
  - Regression coverage for warmed response shape.
- `apps/mobile/vite.config.ts`, `apps/mobile/package.json`, root `package.json`
  - Added `pnpm mobile:dev:https` via `@vitejs/plugin-basic-ssl`.
- `apps/mobile/README.md`
  - Notes that physical phone browser previews need HTTPS; native app is the real Capacitor path.
- `pnpm-lock.yaml` changed after adding `@vitejs/plugin-basic-ssl`.

Also many unrelated or previous-turn files are dirty in web/extension/core/bootnode. Inspect `git status --short` before touching.

## Commands And Results

Commands that passed in this session:

```bash
CI=true pnpm --filter @zk-freighter/bootnode test -- rpc
CI=true pnpm --filter @zk-freighter/bootnode typecheck
CI=true pnpm --filter @zk-freighter/bootnode build
CI=true pnpm --filter @zk-freighter/mobile typecheck
CI=true pnpm --filter @zk-freighter/mobile build
CI=true pnpm --filter @zk-freighter/core test -- runtime-config
CI=true pnpm mobile:sync
node scripts/check-file-size.mjs
```

Observed mobile smoke (browser, desktop `127.0.0.1:4183`, after bootnode fix):

- Create fresh mobile wallet.
- Add funds.
- Public balances became `1.00 USDC` and `9,999.999 XLM`.
- First Shield attempt submitted ASP setup and stopped with:
  - `Shield access is confirming. Wait a few ledgers, then shield again; no deposit was submitted yet.`
- Second Shield attempt after wait submitted a real USDC deposit:
  - tx hash `f7a952ff064f28033fea1cc06a114e4e30818aede3fab05522fee2a275937fe3`
  - UI showed `Deposit submitted`
  - No `decoding response body` error.

Important caveat: this was desktop browser smoke, not physical iPhone/Android proof.

Docs checked with Context7:

- Capacitor docs: secure context / localhost / Android scheme behavior.
- Vite docs: `server.https`, `server.proxy`, LAN host.
- Cloudflare docs: quick tunnel command shape.

## Open Questions

- Phone browser preview still needs a trusted HTTPS route. Current `https://192.168.18.4:4183` has `ERR_CERT_AUTHORITY_INVALID`.
- If using a public HTTPS tunnel, mobile runtime endpoints must not point at local `http://192.168.18.4:*` APIs from an HTTPS page. Use same-origin proxy paths or separate trusted HTTPS tunnels.
- Need independent verification that web and extension still work after broad changes.
- Need mobile native iOS Simulator and physical iPhone tests, not only browser preview.
- Need Android build/device test.
- Mobile design still needs review against prototypes and extension/web patterns. Abu dislikes the current visual direction.

## Risks Or Blockers

- Worktree is broad and dirty; commits should be staged carefully by feature.
- `apps/mobile/.env.local` is local/untracked and currently points at LAN HTTP services:
  - `VITE_ZKF_TESTNET_FUNDING_API_URL=http://192.168.18.4:8787`
  - `VITE_ZKF_TESTNET_BOOTNODE_URL=http://192.168.18.4:8788/rpc`
  - `VITE_ZKF_MAINNET_BOOTNODE_URL=http://192.168.18.4:8789/rpc`
- HTTPS phone preview plus HTTP APIs may trigger mixed-content failures. Verify in real phone browser.
- Native Capacitor local assets should be tested separately; do not infer native failure from LAN browser HTTP failure.
- The bootnode fix should be independently validated against Nethermind response expectations. The reference Rust type requires `latestLedgerCloseTime`, `oldestLedgerCloseTime`, `oldestLedger`, `latestLedger`, `cursor`, `events`.
- Do not claim mainnet readiness from this session. Re-test mainnet bootnode/web/extension/mobile separately.

## Next Steps

1. Start by reading `AGENTS.md`, current `git status`, and the relevant changed files. Do not trust this handoff blindly.
2. Reproduce phone browser issue:
   - `http://192.168.18.4:4183/` should fail Web Crypto.
   - `https://192.168.18.4:4183/` should hit cert authority failure on phone.
3. Choose a real phone-preview approach:
   - Preferred: trusted tunnel to mobile Vite server, with same-origin Vite proxies for funding/testnet bootnode/mainnet bootnode.
   - Alternative: install/trust local cert on iPhone/Android using `mkcert`, then use HTTPS LAN URL.
4. Implement same-origin dev proxy for mobile preview:
   - `/zkf-funding` -> `http://127.0.0.1:8787`
   - `/zkf-bootnode-testnet/rpc` -> `http://127.0.0.1:8788/rpc`
   - `/zkf-bootnode-mainnet/rpc` -> `http://127.0.0.1:8789/rpc`
   - Ensure `runtime-config` can use same-origin endpoint paths for browser preview.
5. Re-run mobile smoke from physical phone browser or native simulator:
   - create/import wallet
   - add funds
   - shield USDC
   - wait/index/retry if ASP setup is first-time
   - verify real tx and activity
6. Re-test web and extension:
   - Add funds
   - shield USDC/XLM
   - unshield
   - discover status
   - activity filters/network scoping
   - extension popup/native WXT behavior
7. Run gates:
   - `CI=true pnpm --filter @zk-freighter/core test`
   - `CI=true pnpm --filter @zk-freighter/web test && CI=true pnpm --filter @zk-freighter/web build`
   - `CI=true pnpm --filter @zk-freighter/extension test && CI=true pnpm --filter @zk-freighter/extension build`
   - `CI=true pnpm --filter @zk-freighter/mobile test && CI=true pnpm --filter @zk-freighter/mobile build`
   - `CI=true pnpm mobile:sync`
   - Android/iOS native build checks
   - `node scripts/check-file-size.mjs`
8. Only then decide what to commit and push.

## Resume Prompt

Continue ZK Freighter from `/Users/abu/dev/hackathon/stellar-zk-wallet` on branch `feat/web-wallet-redesign`. First read `AGENTS.md` and `.thoughts/handoffs/2026-07-02-mobile-cloud-code-handoff.md`, then independently verify the claims. The immediate issue is mobile phone testing: HTTP LAN preview lacks Web Crypto, HTTPS LAN preview has an untrusted cert, and same-origin/tunnel/proxy setup is needed before judging mobile. Also re-test web and extension because Abu no longer trusts that they still work. Do not trust previous conclusions blindly; reproduce, research docs where needed, then patch.

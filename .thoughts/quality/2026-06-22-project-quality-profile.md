# Project Quality Profile: ZK Fighter

## Detected Stack

Current repository state:

- Project root: `/Users/abu/dev/hackathon/stellar-zk-wallet`.
- The original Phase 0 foundation exists, and the repo has since implemented through the Phase 11 WXT extension scaffold checkpoint.
- Root `package.json`, root `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `apps/web`, and `packages/core` exist.
- No root `Cargo.toml`, `Makefile`, `contracts/`, or `.git` directory exists.
- `reference/` contains cloned projects for research and grep only. It is gitignored and must not be treated as this repo's source tree.
- `.thoughts/`, `docs/`, `README.md`, and handoff artifacts are the active project artifacts.
- `skills-lock.json` records installed Stellar/OpenZeppelin skills.

Planned implementation stack from the spec and plan:

- Web app first: TypeScript + React + Vite unless changed explicitly before scaffold.
- Core wallet/prover facade: TypeScript wrapping the Nethermind browser/WASM prover and Stellar client calls.
- Smart-contract/deployment work: Soroban/Stellar CLI + Rust contract workspace only where needed for USDC pool/deployment scripts.
- Extension later: WXT, sharing core logic from the web app after web proof is stable.
- ZK engine: reuse Nethermind `stellar-private-payments`; do not write new circuits for MVP.
- Network integration: Stellar testnet first, mainnet config gated; Circle CCTP for bridge.

Inspection notes:

- The project-quality helper script sees many source files because it includes `reference/`. That signal is intentionally noisy.
- Actual source state is determined by root files excluding `reference/`.
- `AGENTS.md` records stable project instructions and the current post-Phase 11 state.

## Existing Commands

Root project commands now exist:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm preview`
- `pnpm docs:check`

Verified local tools from prior research:

- `stellar --version` -> Stellar CLI `27.0.0`.
- `rustup target list --installed` includes `wasm32v1-none`.
- `stellar network info --network testnet` succeeds.
- Mainnet should use explicit RPC config, not the local CLI's built-in `mainnet` entry.

Reference-only commands:

- `reference/stellar-private-payments` has its own build/test commands. Use them for study and benchmark spikes, but do not treat their green status as ZK Fighter CI.

The foundation created project-owned commands before feature work proceeded.

## Required Local Checks

### Before New Source Phases

- Verify no accidental implementation directories exist unless intentionally created:
  - `find . -maxdepth 2 -type d \( -name apps -o -name contracts -o -name .git \) -print`
- Verify locked decisions remain consistent:
  - no old product name/codename.
  - no "product name TBD" language.
  - no "anonymous" / "fully private" product claims.
  - no bridge wording that claims stock CCTP atomically shields into the pool.
- Keep the README handover map aligned with spec, stories, plan, and quality profile.

### Web App Checks Once Scaffolded

The workspace defines stable scripts with these names:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm preview`

Required web checks:

- TypeScript strict mode.
- ESLint for React/TypeScript.
- Unit tests for deterministic key derivation, receive-code parsing/encoding, network config, asset routing, and trustline/error copy mapping.
- Build check that catches WASM/prover packaging errors.
- Browser smoke test before demo claims.
- No committed secrets, funded keys, generated seed phrases, or private key material.

### Crypto/Wallet Checks

These are mandatory before any flow touches real funds:

- Deterministic seed derivation vector:
  - same seed -> same private receive identity.
  - different seed -> different private receive identity.
  - reload/import -> identical derived keys.
- Private receive code round-trip:
  - encode -> parse -> same public note/encryption keys.
  - malformed codes fail closed.
- Network config checks:
  - testnet and mainnet records exist.
  - passphrase, RPC URL, native SAC, USDC issuer/SAC, explorer URL, and pool IDs are typed.
  - unsupported features are disabled rather than silently omitted.
- Proof tamper check:
  - valid proof path succeeds.
  - tampered proof or public inputs fail in faithful local simulation or on-chain rejection evidence.

### Soroban/Contract Checks Once Contract Workspace Exists

Use these gates where the project owns Rust/Soroban code or deployment scripts:

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace`
- `stellar contract build` for deployable contracts when applicable.
- Deployment scripts must support dry-run/read-only validation before submitting transactions.
- Deployment records must be written to a tracked config/evidence file, not only terminal history.

### Real-Network Evidence Checks

These are not fast unit tests. They are milestone gates and must write evidence:

- XLM shield/private-send/unshield on testnet.
- Client-side valid proof accepted by on-chain verifier.
- Tampered proof rejected.
- USDC pool deploy/locate and USDC shield/private-send/unshield.
- Missing USDC receive readiness/trustline failure reproduced and handled.
- Sepolia -> Stellar testnet CCTP bridge, then separate shield.
- Mainnet actions only after explicit founder approval and small funded test.

Evidence file target:

- `.thoughts/research/spikes-log.md`

Each evidence entry should include:

- date/time.
- network.
- command or UI path used.
- accounts/addresses with secrets redacted.
- contract IDs.
- transaction hashes.
- explorer links.
- before/after balance notes.
- failure mode and fix, where applicable.

## Required CI Gates

CI does not exist yet. When the repo is initialized, CI should include:

- Install dependencies from lockfile.
- Web lint.
- Web typecheck.
- Web unit tests.
- Web production build.
- Rust format check, if a Rust workspace exists.
- Rust clippy/test/build, if a Rust workspace exists.
- File-size check.
- Secret scanning for common key material patterns:
  - Stellar secret keys (`S...`).
  - seed phrase fixtures outside explicit test fixtures.
  - `.env` contents.
  - Circle/EVM private keys.
- Docs consistency check for forbidden claims:
  - `anonymous`
  - `fully private`
  - fake/mock claims in judged path.
  - old codename/product-name placeholders.

CI should not require live funded network transactions on every push. Live network checks belong to milestone evidence runs because they depend on funding, RPC health, and external services.

## Suggested Hooks

Local hooks should be fast and non-destructive:

- Format/lint staged web files once a web scaffold exists.
- Typecheck when TypeScript config exists.
- File-size guardrail for source files.
- Secret scan on staged files.
- Markdown lint or basic docs consistency scan for `.thoughts/`, `docs/`, and `README.md`.

Do not run slow real-proof generation, CCTP bridge, or mainnet checks in pre-commit hooks.

## File Size Policy

Default recommendation:

- Target: 200 source lines.
- Warning: above 200 source lines.
- Hard cap: above 300 source lines.
- Exclusions: generated files, build output, vendored code, reference clones, fixtures, lockfiles, compiled WASM, proving/verifying keys, and framework output.
- Escape hatch: allow larger files only with a written reason in the quality profile, implementation plan, or PR notes.

Practical source boundaries:

- Keep UI screens small and composed from shared components.
- Keep cryptographic derivation code isolated and test-heavy.
- Keep network config typed and centralized.
- Keep bridge/CCTP logic separate from privacy-pool shielding logic.
- Keep extension adapters separate from shared wallet/prover core.

## Commit Policy

The repo is not currently initialized with git.

When initialized:

- Make a clean baseline commit after docs/spec/quality artifacts are accepted.
- Use conventional, boring commit messages when practical:
  - `docs: add ZK Fighter quality profile`
  - `feat: add seed wallet derivation`
  - `test: cover receive code parsing`
  - `chore: configure CI`
- Never commit secrets, generated keys, local funded identities, `.env`, or `reference/`.
- Keep milestone evidence in `.thoughts/research/spikes-log.md` with secrets redacted.

## AGENTS.md Notes

- `AGENTS.md` records the current implementation state and read order.
- Future agents must inspect the filesystem before acting and must not rely on stale memory over current files.
- Keep using Context7 for current docs when asking about SDK/API/CLI/framework usage.
- For implementation, future agents should read in this order:
  1. `README.md`
  2. `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`
  3. `.thoughts/stories/2026-06-22-zk-fighter-mvp-stories.md`
  4. `.thoughts/quality/2026-06-22-project-quality-profile.md`
  5. `.thoughts/plans/2026-06-22-zk-fighter-implementation-plan.md`
  6. relevant research/design docs for the active phase.

## Open Questions

- Should the first git baseline commit happen now that the current implementation has no `.git` repository?
- Should live-network evidence scripts remain manual-only, or should they be wrapped as explicit `pnpm evidence:*` commands?

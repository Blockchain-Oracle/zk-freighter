# Reality Research: Stellar CLI and SAC verification

## Scope

Current-reality checkpoint for the local Stellar CLI/toolchain setup and canonical Stellar Asset Contract IDs needed before writing ZK Freighter specs.

This is tooling and read-only network verification. It does not deploy contracts, submit transactions, fund accounts, or prove the privacy flow.

## Sources Checked

- Project Stellar setup skill:
  - `.agents/skills/setup-stellar-contracts/SKILL.md`
- Context7 official docs lookup:
  - `npx ctx7@latest library "Stellar CLI" "official recommended install Stellar CLI on macOS verify version contract id asset testnet mainnet"`
  - `npx ctx7@latest docs /websites/developers_stellar "official recommended install Stellar CLI on macOS verify version contract id asset testnet mainnet"`
  - `npx ctx7@latest docs /websites/developers_stellar "Stellar RPC public mainnet endpoint current configure Stellar CLI network mainnet rpc providers"`
- Official docs surfaced by Context7:
  - https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup
  - https://developers.stellar.org/docs/tools/cli/install-cli
  - https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli
- Installer/release:
  - `https://github.com/stellar/stellar-cli/raw/main/install.sh`
  - `https://github.com/stellar/stellar-cli/releases/download/v27.0.0/stellar-cli-27.0.0-aarch64-apple-darwin.tar.gz`
- Local command checks listed below.

## Verified Facts

### Install method and version

- Current official docs list the installer script for macOS/Linux:
  - `curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh`
- The local setup skill recommends the same installer script.
- The installer selected Stellar CLI `27.0.0` for `aarch64-apple-darwin` and install target `/Users/abu/.local/bin`.
- The script download failed once during release tarball download, so the same official release tarball was downloaded directly with `curl --fail --location --retry 3`.
- The archive contained a single `stellar` binary. It was installed to `/Users/abu/.local/bin/stellar`.
- `/Users/abu/.local/bin` is already on this shell's `PATH`.
- `stellar --version` now returns:
  - `stellar 27.0.0 (5a7c5fe76530bf4248477ac812fc757146b98cc4)`
  - `stellar-xdr 27.0.0 (5262803470be965e42f80023d12fba12808c774a)`

### Rust target setup

- `rustc --version` returns `rustc 1.96.0 (ac68faa20 2026-05-25)`.
- Before this pass, `wasm32v1-none` was missing.
- `rustup target add wasm32v1-none` completed successfully.
- `rustup target list --installed | rg 'wasm32v1-none|wasm32-unknown-unknown'` now returns:
  - `wasm32-unknown-unknown`
  - `wasm32v1-none`

### CLI network state

- `stellar network ls` returns:
  - `local`
  - `futurenet`
  - `mainnet`
  - `testnet`
- `stellar network info --network testnet` succeeds and reports:
  - Network ID `cee0302d59844d32bdca915c8203dd44b33fbb7edc19051ea37abedf28ecd472`
  - RPC version `27.0.0-1d4c6b9e6552921bd87df92f2824c1a2841d40be`
  - Protocol Version `27`
  - Passphrase `Test SDF Network ; September 2015`
  - Friendbot URL `https://friendbot.stellar.org/`
- `stellar network health --network testnet` succeeds and reports healthy.
- `stellar network info --network mainnet` fails with `Invalid URL Bring Your Own: https://developers.stellar.org/docs/data/rpc/rpc-providers`; the built-in mainnet entry in this CLI install is not a usable RPC endpoint.
- Context7 surfaced an official docs example using `https://mainnet.sorobanrpc.com` as a mainnet RPC URL.
- `stellar network info --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'` succeeds and reports:
  - Network ID `7ac33997544e3175d266bd022439b22cdb16508c01163f26e5cb2a3e1045a979`
  - RPC version `26.0.0-b626d30b0541158335c6c8f060b75fcab671b8de`
  - Protocol Version `26`
  - Passphrase `Public Global Stellar Network ; September 2015`
- `stellar network health --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'` succeeds and reports healthy.

### Canonical SAC IDs derived by Stellar CLI

The CLI command shape was checked with `stellar contract id asset --help`.

- Testnet native XLM:
  - Command: `stellar contract id asset --asset native --network testnet`
  - Output: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Testnet USDC:
  - Command: `stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet`
  - Output: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- Mainnet native XLM:
  - Command: `stellar contract id asset --asset native --network mainnet`
  - Output: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`
- Mainnet USDC:
  - Command: `stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN --network mainnet`
  - Output: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`

### SAC interfaces resolve on RPC

The following read-only `stellar contract info interface` checks returned token-interface entries including `allowance`, `authorized`, `approve`, and `balance`.

- Testnet USDC:
  - `stellar contract info interface --contract-id CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA --network testnet --output json-formatted`
- Mainnet USDC:
  - `stellar contract info interface --contract-id CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015' --output json-formatted`
- Testnet native XLM:
  - `stellar contract info interface --contract-id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --network testnet --output json-formatted`
- Mainnet native XLM:
  - `stellar contract info interface --contract-id CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015' --output json-formatted`

## Inferences

- The tooling gate is now closed for local CLI availability, Rust target availability, deterministic SAC derivation, and read-only SAC-interface resolution.
- The tooling gate is not closed for deployments or transactions because no funded identity has been configured and no transaction has been submitted.
- The mainnet config should not rely on this CLI install's built-in `mainnet` RPC entry. Use an explicit mainnet RPC URL or add a project-specific network alias before mainnet work.
- The mainnet USDC SAC can now be treated as verified by deterministic CLI derivation plus read-only RPC interface fetch, not merely expected from SDK math.

## Unknowns And Questions

- No funded testnet or mainnet deployer identity is configured in this research pass.
- No pool contract was deployed.
- No XLM or USDC privacy-pool transaction was submitted.
- No Sepolia -> Stellar CCTP bridge transaction was submitted.
- Public mainnet RPC suitability for production has not been evaluated. `https://mainnet.sorobanrpc.com` was used only for read-only verification.
- No live balance or trustline checks were run for a real G-address.

## Not Included

- No app scaffold.
- No contract scaffold.
- No secret key handling.
- No funding.
- No deployment.
- No transaction digest.
- No mainnet spend.

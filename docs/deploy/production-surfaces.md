# Production Surfaces

ZK Fighter is deployed as separate surfaces:

- `@zk-fighter/landing`: root product site.
- `@zk-fighter/web`: wallet app and primary judge path.
- `@zk-fighter/funding-api`: testnet XLM/USDC funding service.
- `@zk-fighter/bootnode`: private-pool event cache and narrow RPC.
- `@zk-fighter/extension`: WXT browser extension companion.

`dev` commands run source code for local work. `build` creates a deployable artifact. `start` serves or runs the built artifact.

The Node services load `.env.local` automatically when it exists, using Node's built-in env-file support. Set `ZKF_ENV_FILE` to load another local file such as `.env.mainnet.local`. No `dotenv` package is required.

## Ports

Local defaults:

- web preview: `4173`
- landing preview: `4174`
- funding API: `8787`
- bootnode testnet: `8788`
- bootnode mainnet: `8789`

The Node services also accept `PORT`, which is what most hosts set during deployment.

## Funding API

Run locally:

```bash
ZKF_TESTNET_FUNDER_SECRET=SA... pnpm funding-api:dev
```

Build/start:

```bash
pnpm funding-api:build
ZKF_TESTNET_FUNDER_SECRET=SA... pnpm funding-api:start
```

Deploy with the variables documented in `apps/funding-api/.env.example`.

Funding amounts are decimal asset units. Defaults are `25` XLM and `5` USDC.

The service refuses mainnet funding. USDC is sent only after the destination account has the canonical testnet USDC trustline.

## Bootnode

Run locally:

```bash
pnpm bootnode:dev
pnpm bootnode:dev:mainnet
```

Build/start:

```bash
pnpm bootnode:build
pnpm bootnode:start
pnpm bootnode:start:mainnet
```

Deploy with the variables documented in `apps/bootnode/.env.example`.

The service allows only `getEvents` and `getLatestLedger`, and rejects contract IDs outside the pool allowlist. It must be deployed while fresh pools are still inside the upstream RPC event window so requests can warm the Postgres cache.

## Client Builds

Production extension builds should provide deployed endpoints:

```bash
VITE_ZKF_TESTNET_FUNDING_API_URL=https://api.<domain> \
VITE_ZKF_TESTNET_BOOTNODE_URL=https://bootnode.<domain>/rpc \
VITE_ZKF_MAINNET_BOOTNODE_URL=https://mainnet-bootnode.<domain>/rpc \
pnpm extension:build
```

Local extension builds can point at local services:

```bash
pnpm extension:build:local
```

Chrome's unpacked extension path is:

```text
/Users/abu/dev/hackathon/stellar-zk-wallet/apps/extension/.output/chrome-mv3
```

The extension has no production `start` process. Build it, then reload that unpacked directory in Chrome or package it with `pnpm extension:zip`.

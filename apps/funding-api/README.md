# ZK Fighter Funding API

Hosted testnet funding service for the ZK Fighter product surfaces.

It funds a Stellar testnet account with XLM and, when the destination trustline is ready, testnet USDC. It keeps a request ledger for cooldowns, rate limits, budget tracking, and activity evidence. Mainnet funding is intentionally unavailable.

## Commands

```bash
pnpm funding-api:dev
pnpm funding-api:build
pnpm funding-api:start
```

`dev` runs TypeScript with `tsx`. `build` typechecks and creates `dist/server.js`. `start` runs that production bundle.

Both `dev` and `start` load `.env.local` automatically when it exists. Set `ZKF_ENV_FILE` to load a different local file. Deployed environments can provide the same variables through the host without committing local files.

## Local URL

Default port: `8787`.

```bash
curl http://127.0.0.1:8787/health
```

Set `PORT` when the host assigns a different port.

## Environment

Copy `.env.example` into your deployment provider and set real values there. For local work, use `.env.local`; it is ignored by git. The funding secret must be a capped Stellar testnet hot-wallet seed, not a user wallet seed.

Recommended local database URL:

```text
DATABASE_URL=postgresql://abu@127.0.0.1:5432/zkf_funding_api
```

Funding amounts are decimal asset units. Defaults are `25` XLM and `5` USDC.

Without `ZKF_TESTNET_FUNDER_SECRET`, the service still starts but reports `fundingConfigured: false` from `/health` and will not send funds.

## API

- `GET /health`
- `GET /v1/funding/status?network=testnet&address=G...`
- `POST /v1/funding/request`

Request body:

```json
{
  "network": "testnet",
  "address": "G...",
  "assets": ["XLM", "USDC"]
}
```

Responses include per-asset status, transaction hashes when submitted, public balances, trustline-needed state, cooldown, and blockers.

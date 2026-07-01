# ZK Fighter Bootnode

Hosted event cache and narrow RPC for ZK Fighter privacy pools.

The bootnode keeps pool event history available even when a public Stellar RPC drops older events from its short retention window. It only exposes the methods needed by the wallet runtime and only for configured ZK Fighter pool contracts.

## Commands

```bash
pnpm bootnode:dev
pnpm bootnode:dev:mainnet
pnpm bootnode:build
pnpm bootnode:start
pnpm bootnode:start:mainnet
```

`dev` runs TypeScript with `tsx`. `build` typechecks and creates `dist/server.js`. `start` runs that production bundle. The default local bootnode file is testnet; the mainnet scripts use `.env.mainnet.local`.

Both `dev` and `start` load `.env.local` automatically when it exists. Set `ZKF_ENV_FILE` to load a different local file. Deployed environments can provide the same variables through the host without committing local files.

## Local URL

Default port: `8788`.

```bash
curl http://127.0.0.1:8788/health
```

Set `PORT` when the host assigns a different port.

## Environment

Copy `.env.example` into your deployment provider and set real values there. For local work, use `.env.local` and `.env.mainnet.local`; both are ignored by git.

Recommended local database URLs:

```text
DATABASE_URL=postgresql://abu@127.0.0.1:5432/zkf_bootnode_testnet
DATABASE_URL=postgresql://abu@127.0.0.1:5432/zkf_bootnode_mainnet
```

`DATABASE_URL` is strongly recommended in production. Without it, the service uses in-memory state, which is useful for local checks but does not solve RPC history retention after a restart.

## RPC

- `POST /rpc`
- Allowed methods: `getEvents`, `getLatestLedger`
- Unknown methods and non-allowlisted contracts are rejected.

Deploy the bootnode while fresh pool deployments are still inside the upstream RPC event window so it can warm and persist the first events.

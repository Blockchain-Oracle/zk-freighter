# ZK Freighter Bootnode

Hosted warmed event indexer and narrow RPC for ZK Freighter privacy pools.

The bootnode keeps pool event history available even when a public Stellar RPC drops older events from its short retention window. It warms a Postgres-backed event table from the configured pool deployment ledger, then serves compatible `getEvents` calls from that table once the indexed range is caught up. It only exposes the methods needed by the wallet runtime and only for configured ZK Freighter pool contracts.

## Role in proving

The shielded-pool prover can't build a spend proof without the pool's history. Two flows depend on `getEvents` reaching all the way back to the pool's deployment ledger:

- **Note Merkle tree** — to spend a shielded note, the WASM engine reconstructs the pool's commitment Merkle tree from the pool's historical commitment events, so it can produce the membership path the circuit proves against. A public RPC that has aged those events out silently breaks spends.
- **Shield access (ASP) indexing** — after inserting a membership leaf, the wallet polls for the `LeafAdded` event to confirm the leaf is indexed before it deposits.

The wallet doesn't route *everything* here — a fetch router in `packages/core` redirects only `getEvents` and `getLatestLedger` to the bootnode and leaves `simulateTransaction` / `sendTransaction` on the normal RPC ([`nethermind-fetch-router.ts`](https://github.com/Blockchain-Oracle/zk-freighter/blob/main/packages/core/src/nethermind-fetch-router.ts)). So the bootnode is a narrow, read-only history shim, not a full node the wallet trusts for submission. See [Shielded pools, end to end](https://github.com/Blockchain-Oracle/zk-freighter/blob/main/apps/docs/content/docs/architecture/shielding-internals.mdx) for where it sits in the full flow.

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

## Warmer

The warmer starts automatically on testnet unless `ZKF_BOOTNODE_INDEXER_ENABLED=false`. On mainnet, the public default RPC cannot read back to the recorded pool deployment ledger anymore, so warming is disabled unless `ZKF_BOOTNODE_UPSTREAM_RPC_URL` points to an archive-capable RPC or `ZKF_BOOTNODE_INDEXER_ENABLED=true` is set deliberately.

Important variables:

```text
ZKF_BOOTNODE_START_LEDGER=3368685
ZKF_BOOTNODE_PAGE_SIZE=200
ZKF_BOOTNODE_MAX_PAGES_PER_ROUND=4
ZKF_BOOTNODE_INDEXER_INTERVAL_MS=2000
```

Defaults are network-specific verified pool deployment ledgers: testnet `3368685`, mainnet `63191069`.

Deploy the bootnode while fresh pool deployments are still inside the upstream RPC event window so it can warm and persist the first events. Without persistent `DATABASE_URL`, the warmed history is lost on restart.

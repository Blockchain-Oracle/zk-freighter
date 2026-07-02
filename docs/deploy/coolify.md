# Deploying ZK Freighter on Coolify

One git repo, one root [`nixpacks.toml`](../../nixpacks.toml), six Coolify
services. Each service is the **same repo + branch**, differentiated by the
`APP_NAME` env var that the shared `nixpacks.toml` reads. Domain: **zkfreighter.app**.

Coolify has an official CLI (`coollabsio/coolify-cli`), a REST API
(`https://<host>/api/v1`, Bearer token from **Keys & Tokens → API tokens**),
and per-app **deploy webhooks**. Create each app once in the UI (fastest for the
create step), then deploys/env/domains script from the CLI — see the bottom.

## Per-service settings

For **every** service: **Build Pack = Nixpacks**, **Base Directory = `/`**,
**Branch = `main`** (or your deploy branch), and set `APP_NAME` in the service's
environment. Ports below go in **Ports Exposes**.

Set each service's **Domain** as `https://<domain>:<port>` — https (Cloudflare
fronts the server) and the port suffix binds the domain to the container port,
e.g. `https://app.zkfreighter.app:4173`. Domain changes take effect on the next
deploy.

### 1. Landing — `zkfreighter.app`
- `APP_NAME` = *(unset, landing is the default)* or `@zk-freighter/landing`
- Port: **4174**
- Build-time env (baked into the static bundle — must be set before build):
  - `VITE_ZKF_APP_URL=https://app.zkfreighter.app`
  - `VITE_ZKF_DOCS_URL=https://docs.zkfreighter.app`
  - `VITE_ZKF_ANDROID_URL=https://github.com/Blockchain-Oracle/zk-freighter/releases/download/v0.1.0-alpha/zk-freighter-android-alpha.apk`
  - `VITE_ZKF_EXTENSION_URL=https://github.com/Blockchain-Oracle/zk-freighter/releases/download/v0.1.0-alpha/zk-freighter-extension-chrome-alpha.zip`

### 2. Web wallet — `app.zkfreighter.app`
- `APP_NAME=@zk-freighter/web`
- Port: **4173**
- Build-time env (baked in — these point the wallet at the deployed services):
  - `VITE_ZKF_TESTNET_FUNDING_API_URL=https://api.zkfreighter.app`
  - `VITE_ZKF_TESTNET_BOOTNODE_URL=https://bootnode.zkfreighter.app/rpc`
  - `VITE_ZKF_MAINNET_BOOTNODE_URL=https://mainnet-bootnode.zkfreighter.app/rpc`

### 3. Docs — `docs.zkfreighter.app`
- `APP_NAME=@zk-freighter/docs`
- Port: **3000**
- No env needed. (Serves the prerendered React-Router build via `react-router-serve`.)

### 4. Funding API — `api.zkfreighter.app`
- `APP_NAME=@zk-freighter/funding-api`
- Port: **8787**
- Runtime env:
  - `ZKF_TESTNET_FUNDER_SECRET=SA…` (the capped testnet hot-wallet secret)
  - `DATABASE_URL=postgres://…` (attach a Coolify Postgres; without it the
    request ledger is in-memory and resets on redeploy)

### 5. Bootnode (testnet) — `bootnode.zkfreighter.app`
- `APP_NAME=@zk-freighter/bootnode`
- Port: **8788**
- Runtime env:
  - `DATABASE_URL=postgres://…` (attach a Coolify Postgres — required to keep the
    warmed event index across restarts)
  - `ZKF_BOOTNODE_UPSTREAM_RPC_URL=https://soroban-testnet.stellar.org` *(optional
    override; defaults to the network's public RPC)*
- Health: `GET /health`.

### 6. Bootnode (mainnet) — `mainnet-bootnode.zkfreighter.app`
- `APP_NAME=@zk-freighter/bootnode`
- Port: **8788**
- Runtime env:
  - `ZKF_BOOTNODE_NETWORK=mainnet`
  - `DATABASE_URL=postgres://…` (separate Postgres from testnet)
  - `ZKF_BOOTNODE_UPSTREAM_RPC_URL=https://…` — mainnet public RPC has a short
    event-retention window, so a full mainnet warm needs an **archive** RPC.
    Leave the indexer disabled (`ZKF_BOOTNODE_INDEXER_ENABLED=false`) until you
    have one, and the node still proxies live reads.

## DNS

Point these A/AAAA records at the Coolify server IP (Coolify's proxy handles TLS
via Let's Encrypt once the FQDN is set on each app):

```
zkfreighter.app                 → <server-ip>
app.zkfreighter.app             → <server-ip>
docs.zkfreighter.app            → <server-ip>
api.zkfreighter.app             → <server-ip>
bootnode.zkfreighter.app        → <server-ip>
mainnet-bootnode.zkfreighter.app→ <server-ip>
```

No Cloudflare proxying required. If the domain's DNS is on Cloudflare, set those
records to **DNS-only (grey cloud)** so Coolify can issue certificates.

## Build order caveat

Client apps (landing, web) bake `VITE_ZKF_*` values at **build** time. If you
change a service URL, you must **redeploy** the client that references it — a
runtime env change alone won't take effect. Set the URLs before the first build.

## Scripted deploys

Once each app exists, `scripts/coolify-deploy.mjs` triggers redeploys via the
API. Set `COOLIFY_URL` and `COOLIFY_TOKEN` (a Deploy-permission token) and the
per-service UUIDs (copy from each app's URL or `coolify app list`):

```bash
export COOLIFY_URL=https://coolify.<your-host>
export COOLIFY_TOKEN=xx|xxxx
export COOLIFY_UUID_LANDING=… COOLIFY_UUID_WEB=… COOLIFY_UUID_DOCS=…
export COOLIFY_UUID_FUNDING=… COOLIFY_UUID_BOOTNODE=… COOLIFY_UUID_BOOTNODE_MAINNET=…

node scripts/coolify-deploy.mjs all        # redeploy every service
node scripts/coolify-deploy.mjs web docs   # redeploy a subset
```

Or use the official CLI directly: `coolify deploy uuid <uuid>` /
`coolify deploy batch <uuid>,<uuid> --force`.

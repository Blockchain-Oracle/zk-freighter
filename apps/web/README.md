# ZK Freighter Web

Primary wallet app for ZK Freighter.

This surface owns the main product flow: create or import a wallet, request testnet funding, shield/deposit XLM or USDC, send shielded transfers, unshield/withdraw, bridge arrivals, discover private receive codes, and review real activity.

## Commands

```bash
pnpm web:dev
pnpm web:build
pnpm web:start
```

`dev` runs Vite from source. `build` creates the production bundle. `start` serves the built bundle on `0.0.0.0:4173`.

## Environment

The web app does not require environment variables for normal local development. When it runs on localhost, it uses local defaults for the funding API and bootnode:

- funding API: `http://127.0.0.1:8787`
- bootnode RPC: `http://127.0.0.1:8788/rpc`
- mainnet bootnode RPC: `http://127.0.0.1:8789/rpc`

For deployed builds, set service URLs at build time only when the deployment target requires non-local endpoints:

```bash
VITE_ZKF_TESTNET_FUNDING_API_URL=https://api.<domain> \
VITE_ZKF_TESTNET_BOOTNODE_URL=https://bootnode.<domain>/rpc \
VITE_ZKF_MAINNET_BOOTNODE_URL=https://mainnet-bootnode.<domain>/rpc \
pnpm web:build
```

Do not use fake balances, transaction hashes, funding state, proof progress, or activity rows in this surface.

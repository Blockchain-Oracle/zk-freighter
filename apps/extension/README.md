# ZK Fighter Extension

WXT browser extension companion for ZK Fighter.

The extension is a portable popup wallet surface with local wallet runtime access. It is not a general public dApp signing wallet; external signing and public-key access fail closed unless that product decision changes later.

## Commands

```bash
pnpm extension:dev
pnpm extension:build
pnpm extension:build:local
pnpm extension:zip
```

`dev` runs WXT for local extension work. `build` creates the production unpacked extension. `build:local` creates the same extension but embeds local funding and bootnode URLs for end-to-end local testing.

## Output Path

Chrome unpacked extension path:

```text
/Users/abu/dev/hackathon/stellar-zk-wallet/apps/extension/.output/chrome-mv3
```

Reload that directory in `chrome://extensions` after each build.

The extension has no `start` process. Browser extensions are built, loaded by the browser, and optionally zipped for distribution.

## Environment

For production builds, provide deployed service URLs before running `pnpm extension:build`.

For local testing, `pnpm extension:build:local` sets:

- `VITE_ZKF_TESTNET_FUNDING_API_URL=http://127.0.0.1:8787`
- `VITE_ZKF_TESTNET_BOOTNODE_URL=http://127.0.0.1:8788/rpc`

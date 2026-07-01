# ZK Fighter Landing

Root product site for ZK Fighter.

This app explains the product, links to the web wallet, extension, docs, and future mobile surface, and uses product-safe copy only. It is not the wallet runtime.

## Commands

```bash
pnpm landing:dev
pnpm landing:build
pnpm landing:start
```

`dev` serves on `127.0.0.1:5174`. `start` serves the production build on `0.0.0.0:4174`.

## Environment

The landing page works without environment variables. Set these only when deployed URLs are known:

- `VITE_ZKF_APP_URL`
- `VITE_ZKF_DOCS_URL`
- `VITE_ZKF_EXTENSION_URL`

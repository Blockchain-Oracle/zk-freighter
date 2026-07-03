import { resolve } from 'node:path'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type ProxyOptions } from 'vite'

const httpsPreview = process.env.ZKF_MOBILE_HTTPS === '1'

// Same-origin paths for phone-browser previews: an HTTPS page (tunnel or LAN TLS)
// cannot call plain-HTTP LAN APIs directly (mixed content), so the dev/preview
// server proxies them under its own origin.
const localServiceProxy: Record<string, ProxyOptions> = {
  '/zkf-funding': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/zkf-funding/u, ''),
  },
  '/zkf-bootnode-testnet': {
    target: 'http://127.0.0.1:8788',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/zkf-bootnode-testnet/u, ''),
  },
  '/zkf-bootnode-mainnet': {
    target: 'http://127.0.0.1:8789',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/zkf-bootnode-mainnet/u, ''),
  },
}

export default defineConfig({
  plugins: [httpsPreview ? basicSsl() : null, react(), tailwindcss()].filter((plugin) => plugin !== null),
  publicDir: resolve(__dirname, '../web/public'),
  build: {
    target: 'es2023',
  },
  server: {
    proxy: localServiceProxy,
    allowedHosts: ['.trycloudflare.com', 'm.zkfreighter.app', 'mobile.zkfreighter.app'],
  },
  preview: {
    proxy: localServiceProxy,
    allowedHosts: ['.trycloudflare.com', 'm.zkfreighter.app', 'mobile.zkfreighter.app'],
  },
})

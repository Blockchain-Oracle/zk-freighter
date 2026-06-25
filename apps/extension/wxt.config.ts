import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: '../web/public',
  manifest: {
    name: 'ZK Fighter',
    description: 'Shielded Stellar payments wallet surface. Extension runtime proof is in progress.',
    action: {
      default_title: 'ZK Fighter',
    },
    permissions: ['storage', 'sidePanel', 'offscreen'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
})

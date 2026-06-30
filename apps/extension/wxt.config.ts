import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: '../web/public',
  // Tailwind v4 must go through WXT's Vite hook (not a standalone config). It emits
  // static CSS, so the `script-src 'self' 'wasm-unsafe-eval'` CSP stays clean.
  vite: () => ({ plugins: [tailwindcss()] }),
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

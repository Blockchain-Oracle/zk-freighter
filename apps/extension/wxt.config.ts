import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: '../web/public',
  // Tailwind v4 must go through WXT's Vite hook (not a standalone config). It emits
  // static CSS, so the `script-src 'self' 'wasm-unsafe-eval'` CSP stays clean.
  vite: () => ({ resolve: { dedupe: ['react', 'react-dom'] }, plugins: [tailwindcss()] }),
  manifest: {
    name: 'ZK Freighter',
    // Chrome Web Store rejects 0.0.0 (WXT's default from package.json). Plain
    // dotted digits only — the store version, no "-alpha" suffix.
    version: '0.1.0',
    description: 'Compact wallet for shielded Stellar payments.',
    icons: {
      16: 'extension-icons/zkf-icon-16.png',
      32: 'extension-icons/zkf-icon-32.png',
      48: 'extension-icons/zkf-icon-48.png',
      128: 'extension-icons/zkf-icon-128.png',
    },
    action: {
      default_title: 'ZK Freighter',
      default_icon: {
        16: 'extension-icons/zkf-icon-16.png',
        32: 'extension-icons/zkf-icon-32.png',
        48: 'extension-icons/zkf-icon-48.png',
        128: 'extension-icons/zkf-icon-128.png',
      },
    },
    permissions: ['storage', 'offscreen'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
})

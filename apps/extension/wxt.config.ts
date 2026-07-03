import { execSync } from 'node:child_process'
import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// Auto-increment the store version: 0.1.<total commit count>. Every commit bumps
// the patch, so each rebuilt zip is strictly newer than the last published one
// and the Chrome Web Store / Edge accept the update (and auto-push it to users)
// without ever hand-editing a version. Chrome needs plain dotted integers, and
// a commit count is far under the 65535 per-part limit. Falls back to 0.1.0 when
// git isn't available (e.g. a source tarball build).
function extensionVersion(): string {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim()
    return /^\d+$/u.test(count) ? `0.1.${count}` : '0.1.0'
  } catch {
    return '0.1.0'
  }
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: '../web/public',
  // Tailwind v4 must go through WXT's Vite hook (not a standalone config). It emits
  // static CSS, so the `script-src 'self' 'wasm-unsafe-eval'` CSP stays clean.
  vite: () => ({ resolve: { dedupe: ['react', 'react-dom'] }, plugins: [tailwindcss()] }),
  manifest: {
    name: 'ZK Freighter',
    // Auto-derived per build (see extensionVersion) so you never hand-bump it.
    version: extensionVersion(),
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [react(), tailwindcss()],
  // `vite preview` serves production on Coolify; allow the public domain.
  preview: { allowedHosts: ['app.zkfreighter.app'] },
})

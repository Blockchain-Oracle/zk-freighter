import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [react(), tailwindcss()],
  // `vite preview` serves production on Coolify; allow the public domains.
  preview: { allowedHosts: ['zkfreighter.app', 'www.zkfreighter.app'] },
})

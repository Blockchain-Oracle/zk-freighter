import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import mdx from 'fumadocs-mdx/vite'

export default defineConfig({
  server: {
    port: 5177,
  },
  plugins: [mdx(await import('./source.config')), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
})

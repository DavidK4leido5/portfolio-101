import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // Relative base emits ./assets/... so one build works at the custom domain
  // root AND at davidk4leido5.github.io/portfolio-101/. An absolute '/' base
  // 404s the JS on the project URL; '/repo-name/' 404s it on the custom domain.
  base: process.env.VITE_BASE_PATH ?? './',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  // The SSR build only feeds scripts/prerender.mjs; it needs no public/ copy
  publicDir: isSsrBuild ? false : 'public',
}))

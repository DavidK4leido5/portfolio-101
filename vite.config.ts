import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: set VITE_BASE_PATH=/repo-name/ in CI deploy job
  base: process.env.VITE_BASE_PATH ?? '/',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})

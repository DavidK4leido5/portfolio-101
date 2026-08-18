import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Custom domain is served at /. Only set VITE_BASE_PATH=/repo-name/ for
  // github.io project URLs without a custom domain.
  base: process.env.VITE_BASE_PATH ?? '/',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})

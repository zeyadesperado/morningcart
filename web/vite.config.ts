import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api to the local API so cookies stay same-origin (no CORS).
// /admin + /static are proxied too, so the back office works on :5173 in dev
// (in prod nginx does the same).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
      '/static': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})

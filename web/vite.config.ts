import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api to the local API so cookies stay same-origin (no CORS).
// /admin + /static are proxied too, so the back office works on :5173 in dev
// (in prod nginx does the same). NOTE: no changeOrigin on /admin — Django's
// CSRF check compares the Origin header (localhost:5173) against the Host
// header; rewriting Host to :4000 makes every admin POST fail with 403.
const target = process.env.VITE_API_TARGET ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/admin': { target },
      '/static': { target },
    },
  },
})

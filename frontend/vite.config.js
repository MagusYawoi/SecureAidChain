import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
    headers: {
      // Dev-only CSP. Allows external map tiles (img), embedded map providers
      // (frame-src), and the Hardhat JSON-RPC endpoint. Tighten for production.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' http://127.0.0.1:8545 https:",
        "frame-src 'self' https://www.openstreetmap.org https://maps.google.com https://www.google.com",
      ].join('; '),
    },
  },
})

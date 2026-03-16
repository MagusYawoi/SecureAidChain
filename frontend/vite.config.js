import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; default-src 'self'; connect-src 'self' http://127.0.0.1:8545; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;",
    },
  },
})

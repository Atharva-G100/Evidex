import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/pinata': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/ledger': 'http://localhost:3001',
      '/reports': 'http://localhost:3001'
    }
  }
})

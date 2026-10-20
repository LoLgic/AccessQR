import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, /api se reenvía al servidor (server/, puerto 3001): así la cookie de sesión es del mismo origen.
const api = { '/api': { target: 'http://localhost:3001' } }

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
})

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: process.env.VITE_BASE ?? '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          // Defaults to the local wrangler dev server (npm run dev runs both).
          // Set API_TARGET in .env to forward /api to your deployed Worker.
          target: env.API_TARGET ?? 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  }
})
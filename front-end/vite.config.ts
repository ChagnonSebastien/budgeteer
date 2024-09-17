import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 8000,
  },
  plugins: [
    react(),
    legacy(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/auth/],
      },
    }),
  ],
  build: {
    sourcemap: mode === 'development',
  },
}))

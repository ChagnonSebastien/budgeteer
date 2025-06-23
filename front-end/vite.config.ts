import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
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
        maximumFileSizeToCacheInBytes: 10_000_000,
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'legacy',
        // Use the modern Sass API
        outputStyle: 'expanded',
      },
    },
  },
  build: {
    sourcemap: true,
  },
})

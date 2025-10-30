import { resolve } from 'path'

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8000,
  },
  plugins: [
    react(),
    legacy(),
    viteStaticCopy({
      targets: [{ src: 'node_modules/monaco-editor/min/vs', dest: '' }],
    }),
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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guest: resolve(__dirname, 'guest.html'),
      },
    },
  },
})

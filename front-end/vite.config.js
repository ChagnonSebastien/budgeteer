var _a;
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
var devBackend = (_a = process.env.DEV_BACKEND_URL) !== null && _a !== void 0 ? _a : 'http://localhost:8080';
// https://vitejs.dev/config/
export default defineConfig({
    server: {
        port: 8000,
        // Keeps the API same-origin in dev: the server has no CORS, and session cookies must stay first-party.
        proxy: {
            '/auth': devBackend,
            '^/[a-z]+\\.[A-Za-z]+Service/': devBackend,
        },
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
                maximumFileSizeToCacheInBytes: 10000000,
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
});

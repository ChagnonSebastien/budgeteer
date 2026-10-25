import { readFileSync } from 'fs';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
const devBackend = process.env.DEV_BACKEND_URL ?? 'http://localhost:8080';
const iconPacks = { Fa: 'fa6', Md: 'md', Tb: 'tb', Gi: 'gi' };
const iconsPerChunk = 50;
const iconChunksId = 'virtual:icon-chunks';
const iconChunkPrefix = 'virtual:icon-chunk/';
const iconNamesId = 'virtual:icon-names';
function iconChunkIndex(iconName, chunkCount) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < iconName.length; i++)
        hash = Math.imul(hash ^ iconName.charCodeAt(i), 0x01000193);
    return (hash >>> 0) % chunkCount;
}
function iconChunks() {
    const packs = Object.entries(iconPacks).map(([prefix, dir]) => {
        const source = readFileSync(resolve(__dirname, 'node_modules/react-icons', dir, 'index.mjs'), 'utf-8');
        const icons = new Map();
        for (const match of source.matchAll(/^export function (\w+) \(props\) \{\r?\n.*\r?\n\};$/gm)) {
            icons.set(match[1], match[0]);
        }
        const chunks = Array.from({ length: Math.ceil(icons.size / iconsPerChunk) }, () => []);
        for (const name of icons.keys())
            chunks[iconChunkIndex(name, chunks.length)].push(name);
        return { prefix, icons, chunks };
    });
    return {
        name: 'icon-chunks',
        resolveId(id) {
            if (id === iconChunksId || id === iconNamesId || id.startsWith(iconChunkPrefix))
                return `\0${id}`;
        },
        load(id) {
            if (!id.startsWith('\0'))
                return;
            id = id.slice(1);
            if (id === iconChunksId) {
                const loaders = packs.map(({ prefix, chunks }) => `${prefix}: [${chunks.map((_, i) => `() => import('${iconChunkPrefix}${prefix}/${i}')`).join(', ')}]`);
                // iconChunkIndex ships via toString(): keep it self-contained.
                return `const chunks = { ${loaders.join(', ')} }
${iconChunkIndex.toString()}
export function loadIcon(iconName) {
  const packChunks = chunks[iconName.slice(0, 2)]
  if (!packChunks) return Promise.resolve(undefined)
  return packChunks[iconChunkIndex(iconName, packChunks.length)]().then((m) => m[iconName])
}
export function loadIconNames() {
  return import('${iconNamesId}').then((m) => m.default)
}`;
            }
            if (id === iconNamesId) {
                const names = packs.flatMap(({ icons }) => [...icons.keys()]).sort((a, b) => a.length - b.length);
                return `export default ${JSON.stringify(names)}`;
            }
            if (id.startsWith(iconChunkPrefix)) {
                const [prefix, index] = id.slice(iconChunkPrefix.length).split('/');
                const pack = packs.find((p) => p.prefix === prefix);
                if (!pack)
                    return;
                const sources = pack.chunks[Number(index)].map((name) => pack.icons.get(name));
                // Re-exporting from the pack instead would pull the whole pack into one shared chunk.
                return `import { GenIcon } from 'react-icons/lib'\n${sources.join('\n')}`;
            }
        },
    };
}
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
        react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
        iconChunks(),
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
});

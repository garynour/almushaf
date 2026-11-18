import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'manifest.json',
          'favicon.svg',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'iqama_makkah.mp3',
          'sw-notifications.js',
        ],
        manifest: false,
        workbox: {
          importScripts: ['/sw-notifications.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3,json}'],
          globIgnores: ['**/quran-app-*', '**/assets/aistudio/**'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          // Static pages that must NOT be answered with the SPA's index.html
          navigateFallbackDenylist: [/^\/privacy-policy\.html$/],
          runtimeCaching: [
            {
              // Fallback only: the Quran text/tafsir ship inside the app (public/data/quran-pages.json)
              urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'quran-api-cache',
                expiration: { maxEntries: 650, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        // The service worker is only for the production web build.
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

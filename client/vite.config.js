import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-*.svg'],
      manifest: {
        name: 'CYBER-FIT AI',
        short_name: 'CyberFit',
        description: 'AI-powered workout protocol generator',
        theme_color: '#0a0a0f',
        background_color: '#050505',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          { src: '/icon-72x72.svg',  sizes: '72x72',   type: 'image/svg+xml' },
          { src: '/icon-96x96.svg',  sizes: '96x96',   type: 'image/svg+xml' },
          { src: '/icon-128x128.svg',sizes: '128x128', type: 'image/svg+xml' },
          { src: '/icon-144x144.svg',sizes: '144x144', type: 'image/svg+xml' },
          { src: '/icon-152x152.svg',sizes: '152x152', type: 'image/svg+xml' },
          { src: '/icon-192x192.svg',sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icon-384x384.svg',sizes: '384x384', type: 'image/svg+xml' },
          { src: '/icon-512x512.svg',sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        categories: ['health', 'fitness', 'lifestyle'],
      },
      workbox: {
        // Cache app shell + static assets aggressively
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Don't cache API calls — always go to network
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Google Fonts — cache with stale-while-revalidate
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

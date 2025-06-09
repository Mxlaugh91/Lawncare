import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 1. Korrekt base-sti for GitHub Pages
  base: '/Lawncare/',

  // 2. Inkluderer både React-pluginen og PWA-pluginen
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // 3. Konfigurasjon for service-workeren (Workbox)
      workbox: {
        // Cacher alle vanlige filer
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // Denne regelen hindrer krasj med Firebase
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst', // Prøver alltid nettverket først
            options: {
              cacheName: 'firestore-cache',
              expiration: {
              maxEntries: 50,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager i sekunder
              },
              cacheableResponse: {
                statuses: [0, 200], // Mellomlagrer vellykkede responser
              },
            },
          },
        ],
      },

      // 4. Manifest-konfigurasjon (erstatter din gamle manifest.json-fil)
      manifest: {
        name: 'PlenPilot',
        short_name: 'PlenPilot',
        description: 'A maintenance management application for lawn care.',
        theme_color: '#22c55e',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/Lawncare/',
        start_url: '/Lawncare/index.html',
        orientation: 'portrait-primary',
        lang: 'no',
        icons: [
          { "src": "icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
          { "src": "icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
          { "src": "icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
          { "src": "icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
          { "src": "icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
          { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
          { "src": "icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
          { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
          { "src": "icons/maskable-icon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
        ]
      }
    })
  ],

  // 5. Dine personlige innstillinger forblir de samme
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5176,
    host: '0.0.0.0',
  },
});
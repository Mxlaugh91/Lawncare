import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Lawncare/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // DENNE LINJEN ER VIKTIG for å inkludere filer fra 'public'-mappen
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'],

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'PlenPilot',
        short_name: 'PlenPilot',
        description: 'A maintenance management application for lawn care.',
        theme_color: '#22c55e',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/Lawncare/',
        start_url: '/Lawncare/', // Endret tilbake til enklere standard
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
        ],
        screenshots: [
          {
            src: "screenshots/desktop-dashboard.png",
            sizes: "320x320",
            type: "image/png",
            form_factor: "wide",
            label: "PlenPilot Admin Dashboard - Oversikt over vedlikeholdsstatus"
          },
          {
            src: "screenshots/desktop-dashboard.png",
            sizes: "320x320",
            type: "image/png",
            form_factor: "wide",
            label: "PlenPilot Drift - Administrer alle vedlikeholdssteder"
          },
          {
            src: "screenshots/mobile-dashboard.png",
            sizes: "396x594",
            type: "image/png",
            form_factor: "narrow",
            label: "PlenPilot Mobil Dashboard - Oversikt for ansatte"
          },
          {
            src: "screenshots/mobile-dashboard.png",
            sizes: "396x594",
            type: "image/png",
            form_factor: "narrow",
            label: "PlenPilot Timeregistrering - Registrer utført arbeid"
          }
        ]
      }
    })
  ],
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
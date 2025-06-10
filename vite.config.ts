// vite.config.ts

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
      
      // Use injectManifest strategy with correct source path
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      
      devOptions: {
        enabled: true,
        type: 'module',
      },
      
      // Make sure to include assets
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'],
      
      manifest: {
        id: '/Lawncare/',
        name: 'PlenPilot',
        short_name: 'PlenPilot',
        description: 'A maintenance management application for lawn care.',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/Lawncare/',
        start_url: '/Lawncare/#/',
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
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "PlenPilot Admin Dashboard - Oversikt over vedlikeholdsstatus"
          },
          {
            src: "screenshots/mobile-dashboard.png",
            sizes: "396x594",
            type: "image/png",
            form_factor: "narrow",
            label: "PlenPilot Mobil Dashboard - Oversikt for ansatte"
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
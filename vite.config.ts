// vite.config.ts
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Importerer fra din nedgraderte, stabile versjon

export default defineConfig({
  base: '/Lawncare/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto', // La PWA-pluginen håndtere grunnleggende registrering; useRegisterSW vil "koble seg på"
      
      strategies: 'injectManifest',
      
      // Bruk srcDir og filename for å spesifisere kilde-SW for 0.x versjoner
      srcDir: 'src',
      filename: 'sw.js', // Peker på src/sw.js

      injectManifest: {
        // Workbox-spesifikke build options for injectManifest
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB, juster ved behov
        // For 0.x versjoner er options som 'minify' og 'enableWorkboxModulesLogs'
        // ofte ikke satt her, men styres av Workbox' defaults eller globale innstillinger.
        // Hvis du trenger spesifikk Workbox build config, sjekk dokumentasjonen for den Workbox-versjonen
        // som følger med din vite-plugin-pwa 0.x versjon.
      },
      
      // Viktig: For 0.x versjoner, het devOptions ofte noe annet eller ble aktivert med env-variabel.
      // Denne blokken kan være unødvendig eller feil for 0.x.
      // Hvis du får feil relatert til devOptions, kommenter den ut.
      // devOptions: {
      //   enabled: true, 
      //   type: 'module',
      // },
      
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'],
      manifest: {
        id: '/Lawncare/',
        name: 'PlenPilot',
        short_name: 'PlenPilot',
        description: 'A maintenance management application for lawn care.',
        theme_color: '#22c55e',
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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5176,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
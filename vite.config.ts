// vite.config.ts - Tilpasset for vite-plugin-pwa v0.21.1 (eller lignende 0.x)

import path from 'path'; // Kan være nyttig for resolve.alias
import { fileURLToPath, URL } from 'node:url'; // For resolve.alias
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Vil importere fra din installerte 0.21.1 versjon

export default defineConfig({
  base: '/Lawncare/',
  plugins: [
    react(),
    VitePWA({
      // --- Generelle PWA-innstillinger ---
      registerType: 'prompt', // Viser "Oppdater nå"-prompt via PwaUpdater.tsx
      
      // For 0.x versjoner er det vanlig å la vite-plugin-pwa håndtere
      // registreringen hvis du ikke har spesifikke behov for å overstyre den helt.
      // 'auto' er en vanlig default. Hvis PwaUpdater.tsx bruker useRegisterSW,
      // vil denne hooken også fungere med den auto-genererte registreringen.
      // Alternativt, sett til null hvis du vil at useRegisterSW skal gjøre alt.
      injectRegister: 'auto', 

      // --- Strategi og Kilde Service Worker ---
      strategies: 'injectManifest', // Vi bruker vår egen custom service worker

      // Anbefalt måte for 0.x å spesifisere kilde-SW for injectManifest:
      srcDir: 'src',       // Mappen der din kilde-SW ('sw.js') ligger
      filename: 'sw.js',   // Navnet på din kilde-SW-fil inne i srcDir.
                           // Ferdig SW i 'dist' vil hete 'dist/sw.js'.

      // --- Workbox-spesifikke options for injectManifest ---
      // For 0.x, ble Workbox-options ofte satt direkte under 'workbox' objektet,
      // selv for 'injectManifest'. 'injectManifest'-objektet var noen ganger bare for
      // de options som var unike for Workbox-build sin injectManifest-funksjon.
      // La oss prøve å legge injectManifest-spesifikke options her hvis de er anerkjent,
      // ellers kan de høre hjemme under et toppnivå 'workbox' objekt.
      // Den viktigste er at 'swSrc' (via srcDir/filename) og 'swDest' (via filename/outDir) blir riktig.
      injectManifest: {
        // For 0.x er det ikke alltid nødvendig å spesifisere globPatterns her hvis
        // de er satt under workbox-objektet, men det skader ikke hvis støttet.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Options som minify, enableWorkboxModulesLogs er vanligvis ikke her i 0.x for injectManifest.
      },

      // --- Workbox-konfigurasjon (kan også gjelde for injectManifest for visse options) ---
      // Mange 0.x versjoner brukte et 'workbox' objekt for generelle Workbox-innstillinger
      // selv om strategien var 'injectManifest'.
      workbox: {
        // cleanupOutdatedCaches, clientsClaim, skipWaiting er ofte konfigurert i selve sw.js for injectManifest.
        // Men, pluginen kan ha defaults for disse.
        // Hvis din src/sw.js håndterer dette (som den gjør), trenger du ikke nødvendigvis disse her.
        // For generateSW er de kritiske her. For injectManifest er din sw.js primærkilden.
        // cleanupOutdatedCaches: true, 
        // clientsClaim: true,
        // skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'], // Redundant hvis også i injectManifest, men skader ikke
      },
      
      // --- Utviklingsmodus (mindre kritisk for produksjonsbygget) ---
      // For 0.x, var 'devOptions' ofte ikke tilgjengelig, eller PWA i dev ble aktivert annerledes.
      // Du kan kommentere ut denne blokken hvis den gir feil med 0.21.1.
      // devOptions: {
      //   enabled: true, 
      //   type: 'module',
      // },
      
      // --- Assets og PWA Manifest ---
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'], // Filer som skal precaches
      manifest: {
        // ... (ditt PWA-manifest er uendret og ser bra ut) ...
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
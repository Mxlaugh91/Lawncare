// vite.config.ts - Forsøk med srcDir og filename for injectManifest

import path from 'path'; // Importer path hvis du bruker __dirname et sted (ikke strengt nødvendig for denne configen lenger)
import { fileURLToPath, URL } from 'node:url'; // For resolve.alias
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// For å bruke __dirname i ES-moduler (hvis du trenger det, f.eks. for path.resolve i andre deler)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export default defineConfig({
  base: '/Lawncare/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto', // Eller null hvis din PwaUpdater.tsx håndterer all registrering
      
      strategies: 'injectManifest', // Vi bruker vår egen service worker

      // Bruk srcDir og filename for å spesifisere kilde-SW, basert på eksempler
      srcDir: 'src',        // Mappen der din kilde-SW ('sw.js') ligger
      filename: 'sw.js',    // Navnet på din kilde-SW-fil inne i srcDir.
                            // Den ferdige filen i 'dist' vil også hete 'sw.js' (dist/sw.js).

      // injectManifest-objektet for Workbox-spesifikke build options
      injectManifest: {
        // swSrc og swDest skal IKKE spesifiseres her hvis srcDir/filename brukes ovenfor,
        // da de hentes fra toppnivå-innstillingene.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'], // Definerer hvilke filer som skal precaches
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Din tidligere grense, juster ved behov
        minify: false, // Kan være nyttig for feilsøking av den genererte SW. Sett til true for prod.
        enableWorkboxModulesLogs: true, // Gir mer detaljert logging fra Workbox i dev/prod.
      },
      
      // Development options (hvis du vil teste PWA-funksjonalitet under 'npm run dev')
      devOptions: {
        enabled: true, // Eller process.env.SW_DEV === 'true' for miljøvariabel-styring
        type: 'module',
        // navigateFallback: 'index.html', // Vurder denne hvis du har en SPA uten HashRouter
      },
      
      // Inkluder spesifikke assets for precaching
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'], // Sørg for at disse er i public-mappen
      
      // PWA Manifest
      manifest: {
        id: '/Lawncare/',
        name: 'PlenPilot',
        short_name: 'PlenPilot',
        description: 'A maintenance management application for lawn care.',
        theme_color: '#22c55e', // Din temafarge
        background_color: '#f8fafc', // Din bakgrunnsfarge
        display: 'standalone',
        scope: '/Lawncare/', // Matcher din 'base'
        start_url: '/Lawncare/#/', // Matcher din HashRouter start-URL
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
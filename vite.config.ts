// vite.config.ts - Fikset for React vendor error
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Lawncare/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      
      injectManifest: {
        globPatterns: [
          'index.html',
          '**/*.{js,css}',
          'favicon.ico',
          'icons/icon-192x192.png',
        ],
        globIgnores: [
          'screenshots/**/*',
          'icons/icon-384x384.png',
          'icons/icon-512x512.png',
          'icons/maskable-icon.png',
          '**/*.map',
          '**/*.woff2',
          '**/*.webp',
          '**/*.svg',
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      
      includeAssets: ['favicon.ico'],
      
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
          { 
            src: "icons/icon-192x192.png", 
            sizes: "192x192", 
            type: "image/png" 
          },
          { 
            src: "icons/icon-512x512.png", 
            sizes: "512x512", 
            type: "image/png",
            purpose: "any maskable"
          }
        ],
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
        // FIKSET: Bruk den originale manualChunks konfigurasjonen
        // som fungerte før, ikke den nye funksjonen
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
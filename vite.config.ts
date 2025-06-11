// vite.config.ts - Optimalisert for rask SW oppdatering
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
        // VIKTIG: Kun cache KRITISKE filer for rask oppdatering
        globPatterns: [
          'index.html',
          '**/*.{js,css}', // Kun JS og CSS
          'favicon.ico',
          'icons/icon-192x192.png', // Kun én liten ikon
        ],
        // Ignorer ALT som ikke er kritisk
        globIgnores: [
          'screenshots/**/*',
          'icons/icon-384x384.png',
          'icons/icon-512x512.png',
          'icons/maskable-icon.png',
          '**/*.map',
          '**/*.woff2', // Fonts lastes on-demand
          '**/*.webp',
          '**/*.svg',
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // Maks 2MB per fil
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
        // Kun essensielle ikoner
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
            purpose: "any maskable" // Kombinert purpose
          }
        ],
        // Fjern screenshots - de trengs ikke for funksjonalitet
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
        // Optimaliser chunks for raskere lasting
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('firebase')) return 'firebase';
            return 'vendor';
          }
        },
        // Kortere filnavn
        chunkFileNames: 'js/[name]-[hash:8].js',
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: '[ext]/[name]-[hash:8].[ext]',
      },
    },
    // Minimer output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Fjern console.log i prod
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
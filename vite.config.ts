// vite.config.ts - Med automatisk versjonering
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

// 🚀 Automatisk versjonering: 1v, 2v, 3v, etc.
function getVersion() {
  try {
    // Få commit count for auto-incrementing nummer
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    
    // Få git hash
    const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
    
    // Lag timestamp
    const timestamp = Date.now();
    
    // Format: 1v_a1b2c3d_1698765432000
    return `${commitCount}v_${gitHash}_${timestamp}`;
  } catch (error) {
    // Fallback hvis git ikke er tilgjengelig
    console.warn('Git ikke tilgjengelig, bruker fallback versjon');
    return `dev_${Date.now()}`;
  }
}

export default defineConfig({
  base: '/Lawncare/',
  
  // ✨ Definer automatisk versjon
  define: {
    __VERSION__: JSON.stringify(getVersion())
  },
  
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
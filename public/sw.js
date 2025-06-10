// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();

// Forhåndscacher alle ressurser (HTML, JS, CSS etc.) definert i manifestet.
// self.__WB_MANIFEST er plassholderen som vite-plugin-pwa fyller ut.
precacheAndRoute(self.__WB_MANIFEST || []);

// Regel for Firestore API-kall: Prøv nettverk først, fall tilbake på cache.
registerRoute(
  ({ url }) => url.protocol === 'https:' && url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager
      }),
      new CacheableResponsePlugin({
        statuses: [200], // Cache kun vellykkede svar.
      }),
    ],
  })
);

// ------------------------------------------------------------------------------------------
// MINIMAL SERVICE WORKER LOGIKK FOR PROMPT-MODUS
// ------------------------------------------------------------------------------------------

// Håndter install event for prompt-modus
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  // I prompt-modus skal vi IKKE kalle skipWaiting() automatisk
});

// Håndter activate event for prompt-modus  
self.addEventListener('activate', (event) => {
  console.log('SW: Service worker aktivert');
  
  // Enkel activate uten kompleks promise-håndtering
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('SW: Service worker aktivert og klar');
    })
  );
});

// Forenklet message handling for prompt-modus
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING melding mottatt - aktiverer ny service worker');
    
    // Kall skipWaiting uten kompleks promise-håndtering
    self.skipWaiting();
  }
});

// Error handling med bedre debugging
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
  console.error('SW: Error details:', event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  console.error('SW: Rejection details:', event);
  // Forhindre at feilen crasher service worker
  event.preventDefault();
});

console.log('PlenPilot Service Worker (Minimal Prompt Mode) er lastet og kjører!');
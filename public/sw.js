// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// Lar den nye service workeren ta kontroll over åpne sider (klienter) umiddelbart.
clientsClaim();
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
// EGENDEFINERT SERVICE WORKER-LOGIKK
// ------------------------------------------------------------------------------------------

// Håndter install event
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  // La vite-plugin-pwa håndtere install-logikken
});

// Håndter activate event
self.addEventListener('activate', (event) => {
  console.log('SW: Service worker aktivert');
  // La vite-plugin-pwa håndtere activate-logikken
});

// Enkel message handling (hovedsakelig for debugging)
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  // La vite-plugin-pwa håndtere meldinger
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING melding mottatt');
    self.skipWaiting();
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
});

console.log('PlenPilot Service Worker er lastet og kjører!');
// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// Aktiverer nye versjoner av service workeren umiddelbart.
self.skipWaiting();

// Lar den nye service workeren ta kontroll over åpne sider (klienter) umiddelbart.
clientsClaim();

// Rydder opp i gamle cacher fra tidligere versjoner.
cleanupOutdatedCaches();

// Forhåndscacher alle ressurser (HTML, JS, CSS etc.) definert i manifestet.
// self.__WB_MANIFEST er plassholderen som vite-plugin-pwa fyller ut.
precacheAndRoute(self.__WB_MANIFEST || []);


// ------------------------------------------------------------------------------------------
// RUNTIME CACHING-REGLER
// Siden vi bruker injectManifest-strategien, må vi definere alle
// runtime-caching-regler manuelt her.
// ------------------------------------------------------------------------------------------

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

// Lytter etter meldinger fra klienten (din PwaUpdater-komponent)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Mottok SKIP_WAITING-melding fra klient');
    // Siden vi allerede har self.skipWaiting() øverst, trenger vi ikke å kalle det igjen her
    // Den nye service worker-en vil automatisk aktiveres
  }
});

// Dine originale, kommenterte eksempler for push-varslinger er bevart her.
/*
self.addEventListener('push', (event) => {
  // ... din push-logikk ...
});

self.addEventListener('notificationclick', (event) => {
  // ... din notification click-logikk ...
});
*/

console.log('PlenPilot Egendefinert Service Worker er lastet og kjører!');
// src/sw.js (Kombinert kode for Steg 0, 1, 2, og 3)

// Importer som trengs for de inkluderte funksjonene
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// For type-hinting i JS-fil for editorer som VS Code
/// <reference lib="webworker" />

// Valgfritt: Aktiver Workbox debug-logging. Kan kommenteres ut hvis du ikke trenger det nå.
// self.__WB_DISABLE_DEV_LOGS = false; 
// console.log('SW: Service Worker starting... Workbox logs (potentially) enabled.');

// --- STEG 0 & 1: Precache og Cleanup ---
console.log('SW: About to call precacheAndRoute with self.__WB_MANIFEST');
try {
  precacheAndRoute(self.__WB_MANIFEST || []); // Eneste bruk av plassholderen
  console.log('SW: precacheAndRoute executed.');
} catch (error) {
  console.error('SW: Error during precacheAndRoute execution:', error);
}

cleanupOutdatedCaches();
console.log('SW: cleanupOutdatedCaches called.');

// --- STEG 2: Runtime caching for Firestore API calls ---
registerRoute(
  ({ url }) => url.protocol === 'https:' && url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
console.log('SW: Firestore runtime caching rule registered.');

// --- STEG 3: Runtime caching for images ---
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
);
console.log('SW: Images runtime caching rule registered.');

// --- STEG 0 (forts.): Service Worker lifecycle events for rask aktivering ---
self.addEventListener('install', (event) => {
  console.log('SW: Event "install" - Calling self.skipWaiting()');
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  console.log('SW: Event "activate" - Calling self.clients.claim()');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: Control claimed by new service worker.');
      // Valgfritt: Send melding til klienter
      // return self.clients.matchAll().then((clients) => {
      //   clients.forEach((client) => {
      //     client.postMessage({ type: 'SW_ACTIVATED', payload: 'New service worker is active' });
      //   });
      // });
    }).catch(error => {
      console.error('SW: Error during clients.claim() in activate event:', error);
    })
  );
});

// --- Senere steg (kan legges til gradvis etter at dette bygger) ---
// // Message handler
// self.addEventListener('message', (event) => { /* ... */ });

// // NavigationRoute
// import { createHandlerBoundToURL } from 'workbox-precaching';
// import { NavigationRoute } from 'workbox-routing';
// const spaFallbackHandler = createHandlerBoundToURL('index.html');
// const navigationRoute = new NavigationRoute(spaFallbackHandler, { /* denylist */ });
// registerRoute(navigationRoute);
// console.log('SW: SPA NavigationRoute registered.');

// // Google Fonts caching
// registerRoute(/* ... */); 
// registerRoute(/* ... */);

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error, event.message);
});
self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  // event.preventDefault(); // Vurder om nødvendig
});

console.log('SW: Service Worker loaded and basic event listeners attached.');
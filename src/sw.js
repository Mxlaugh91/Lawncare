// src/sw.js (Fullversjon, bygger på vellykket Test C)

// Importer
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// For type-hinting i JS-fil for editorer som VS Code
/// <reference lib="webworker" />

// Aktiver Workbox debug-logging
self.__WB_DISABLE_DEV_LOGS = false; 
console.log('SW: PlenPilot Custom Service Worker starting... Workbox logs should be enabled.');

// 1. Precache all static assets
console.log('SW: About to call precacheAndRoute with the manifest');
try {
  precacheAndRoute(self.__WB_MANIFEST || []); // Eneste bruk av plassholderen
  console.log('SW: precacheAndRoute executed.');
} catch (error) {
  console.error('SW: Error during precacheAndRoute execution:', error);
}

// 2. Clean up any outdated caches
cleanupOutdatedCaches();
console.log('SW: cleanupOutdatedCaches called.');

// --- Runtime Caching Regler (Firestore og Bilder fra Test C) ---
// Firestore API calls
registerRoute(
  ({ url }) => url.protocol === 'https:' && url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
console.log('SW: Firestore runtime caching rule registered.');

// Images
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);
console.log('SW: Images runtime caching rule registered.');

// --- NYTT: Google Fonts Caching ---
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })], // 1 year
  })
);
console.log('SW: Google Fonts runtime caching rules registered.');

// --- NYTT: Navigation Route for SPA ---
const spaFallbackHandler = createHandlerBoundToURL('index.html'); 
const navigationRoute = new NavigationRoute(spaFallbackHandler, {
  denylist: [
    new RegExp('/api/'),            
    new RegExp('/[^/?]+\\.[^/?]+$'), 
    new RegExp('/manifest.webmanifest'), 
  ],
});
registerRoute(navigationRoute);
console.log('SW: SPA NavigationRoute registered.');


// --- Service Worker Lifecycle Events (fra Test C) ---
self.addEventListener('install', (event) => {
  console.log('SW: Event "install" - Calling self.skipWaiting()');
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  console.log('SW: Event "activate" - Calling self.clients.claim()');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: Control claimed by new service worker.');
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', payload: 'New service worker is active and has taken control' });
        });
      });
    }).catch(error => {
      console.error('SW: Error during clients.claim() in activate event:', error);
    })
  );
});

// --- NYTT: Handle messages from the main thread ---
self.addEventListener('message', (event) => {
  console.log('SW: Event "message" - Received data:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING message received, calling self.skipWaiting() again.');
    self.skipWaiting(); 
  }
});

// --- Error handling ---
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error, event.message);
});
self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Vurder om denne er nødvendig basert på feilene du ser
});

console.log('SW: PlenPilot Custom Service Worker loaded and all event listeners attached.');
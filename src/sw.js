// src/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL } from 'workbox-precaching'; // For NavigationRoute
import { NavigationRoute } from 'workbox-routing';       // For NavigationRoute

// For type-hinting i JS-fil for editorer som VS Code
/// <reference lib="webworker" />

// Aktiver Workbox debug-logging (kan fjernes i endelig produksjon hvis ønskelig)
// For Workbox v6+, sett denne til false for å se alle logger.
self.__WB_DISABLE_DEV_LOGS = false; 
console.log('SW: PlenPilot Custom Service Worker starting... Workbox logs should be enabled.');

// 1. Precache all static assets (this will be populated by vite-plugin-pwa)
console.log('SW: About to call precacheAndRoute with self.__WB_MANIFEST');
try {
  precacheAndRoute(self.__WB_MANIFEST || []); // Sørg for at fallback er et tomt array
  console.log('SW: precacheAndRoute executed.');
} catch (error) {
  console.error('SW: Error during precacheAndRoute execution:', error);
}

// 2. Clean up any outdated caches from previous versions
cleanupOutdatedCaches();
console.log('SW: cleanupOutdatedCaches called.');

// 3. Navigation Route for SPA (Single Page Application)
// Dette sikrer at alle navigasjonsforespørsler serverer index.html,
// og lar klient-side routeren (React Router) håndtere resten.
const spaFallbackHandler = createHandlerBoundToURL('index.html'); // Forutsetter index.html i roten av 'dist'
const navigationRoute = new NavigationRoute(spaFallbackHandler, {
  denylist: [
    new RegExp('/api/'),             // Eksempel: Ikke la SW håndtere API-kall
    new RegExp('/[^/?]+\\.[^/?]+$'), // Ikke la SW håndtere forespørsler som ser ut som direkte fil-kall (med filtype)
    new RegExp('/manifest.webmanifest'), // La nettleseren håndtere manifestet direkte for PWA-installasjon
  ],
});
registerRoute(navigationRoute);
console.log('SW: SPA NavigationRoute registered.');

// 4. Runtime caching for Firestore API calls
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

// 5. Runtime caching for images
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
);

// 6. Runtime caching for Google Fonts
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

// 7. Service Worker lifecycle events for rask aktivering
self.addEventListener('install', (event) => {
  console.log('SW: Event "install" - Calling self.skipWaiting()');
  self.skipWaiting(); // Fortell nettleseren at denne SW skal aktiveres så snart installasjonen er ferdig
});

self.addEventListener('activate', (event) => {
  console.log('SW: Event "activate" - Calling self.clients.claim()');
  // event.waitUntil() sikrer at activate-eventet ikke terminerer før claim() er fullført
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: Control claimed by new service worker.');
      // Send melding til alle klienter om at ny SW er aktiv (valgfritt, men kan være nyttig)
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

// 8. Handle messages from the main thread (klienten)
self.addEventListener('message', (event) => {
  console.log('SW: Event "message" - Received data:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING message received, calling self.skipWaiting() again.');
    self.skipWaiting(); // Kan kalles flere ganger, skader ikke
  }
});

// Error handling (beholdt fra din tidligere versjon)
self.addEventListener('error', (event) => { /* ... */ });
self.addEventListener('unhandledrejection', (event) => { /* ... */ });

console.log('SW: PlenPilot Custom Service Worker loaded and event listeners attached.');
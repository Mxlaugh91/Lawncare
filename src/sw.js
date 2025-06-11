// src/sw.js - Optimalisert for rask oppdatering

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Version - ØK DENNE ved hver endring!
const VERSION = '1.0.2';
console.log(`SW v${VERSION}: Starting...`);

// 1. Precache - kun kritiske filer
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// 2. Rask Firestore caching med timeout
registerRoute(
  ({ url }) => url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    networkTimeoutSeconds: 2, // Maks 2 sek venting
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// 3. Bilder - cache etter første gang
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// 4. Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 20 })],
  })
);

// 5. SPA navigasjon
const handler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/api\//, /\.[^/?]+$/],
});
registerRoute(navigationRoute);

// 6. RASK OPPDATERING - dette er nøkkelen!
self.addEventListener('install', (event) => {
  console.log(`SW v${VERSION}: Installing...`);
  // Skip waiting UMIDDELBART
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`SW v${VERSION}: Activating...`);
  event.waitUntil(
    (async () => {
      // Ta kontroll over alle klienter med en gang
      await self.clients.claim();
      
      // Slett gamle cacher
      const cacheWhitelist = ['firestore-cache', 'images', 'google-fonts', 'google-fonts-webfonts'];
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          // Slett alle workbox-precache fra tidligere versjoner
          if (cacheName.includes('workbox-precache') && !cacheName.includes(VERSION)) {
            console.log(`SW v${VERSION}: Deleting old cache ${cacheName}`);
            return caches.delete(cacheName);
          }
          // Slett andre ukjente cacher
          if (!cacheWhitelist.includes(cacheName) && !cacheName.includes('workbox-precache')) {
            console.log(`SW v${VERSION}: Deleting unknown cache ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Gi beskjed til alle klienter
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({ 
          type: 'SW_ACTIVATED', 
          version: VERSION 
        });
      });
    })()
  );
});

// 7. Håndter skip waiting melding og FORCE RELOAD
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log(`SW v${VERSION}: SKIP_WAITING received, reloading all clients...`);
    self.skipWaiting();
    
    // Force reload alle vinduer etter kort delay
    setTimeout(async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        // navigate() er mer pålitelig enn postMessage for reload
        client.navigate(client.url);
      });
    }, 100);
  }
});
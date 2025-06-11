// src/sw.js (Test 2)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';         // NY IMPORT
import { NetworkFirst } from 'workbox-strategies';       // NY IMPORT
import { ExpirationPlugin } from 'workbox-expiration';    // NY IMPORT
import { CacheableResponsePlugin } from 'workbox-cacheable-response'; // NY IMPORT
/// <reference lib="webworker" />

precacheAndRoute(self.__WB_MANIFEST || []); 

// Kun Firestore-regelen
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
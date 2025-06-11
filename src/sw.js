// src/sw.js (Test B)
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies'; // Endret fra NetworkFirst
import { ExpirationPlugin } from 'workbox-expiration';
// CacheableResponsePlugin er ikke nødvendig for denne spesifikke bilde-regelen
/// <reference lib="webworker" />

precacheAndRoute(self.__WB_MANIFEST || []); 
cleanupOutdatedCaches();

// Bilde-regelen
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
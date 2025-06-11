// src/sw.js (Test 3)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';         // NY IMPORT
import { StaleWhileRevalidate } from 'workbox-strategies';// NY IMPORT (NetworkFirst fjernet hvis ikke brukt)
import { ExpirationPlugin } from 'workbox-expiration';    // NY IMPORT
/// <reference lib="webworker" />

precacheAndRoute(self.__WB_MANIFEST || []); 

// Kun Bilde-regelen
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
// src/sw.js
// Fixed Service Worker for vite-plugin-pwa injectManifest strategy

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

console.log('SW: Service Worker is loading. Timestamp:', Date.now());

// Clean up old caches
cleanupOutdatedCaches();

// Precache all assets defined in the manifest
// This is the REQUIRED line for injectManifest - it must appear exactly once
precacheAndRoute(self.__WB_MANIFEST);

// Register Firestore cache strategy
registerRoute(
  ({ url }) => url.protocol === 'https:' && url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// Install event
self.addEventListener('install', (event) => {
  console.log('SW: Install event started. Timestamp:', Date.now());
  self.skipWaiting();
  console.log('SW: Install event completed.');
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('SW: Activate event started. Timestamp:', Date.now());
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: Clients claimed successfully.');
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          console.log('SW: Sending SW_ACTIVATED message to client:', client.id);
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: 'New service worker is active and has taken control'
          });
        });
      });
    }).catch(err => {
      console.error('SW: Error during activation:', err);
    })
  );
  console.log('SW: Activate event setup completed.');
});

// Message event handler
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', JSON.stringify(event.data));
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    const messageId = event.data.id || 'NO_ID';
    console.log(`SW: SKIP_WAITING message received (ID: ${messageId}) - calling self.skipWaiting()`);
    self.skipWaiting();
  }
});

// Error event handlers
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error, 'Line:', event.lineno, 'File:', event.filename);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('SW: PlenPilot Service Worker evaluation completed. Timestamp:', Date.now());
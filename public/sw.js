// public/sw.js

// Import necessary Workbox modules.
// vite-plugin-pwa will ensure these modules are available.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'; // Import strategies you might use
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// ------------------------------------------------------------------------------------------
// VITE-PLUGIN-PWA & WORKBOX CONFIGURATIONS
//
// Based on your `vite.config.js`, vite-plugin-pwa will:
// 1. Inject the Precache Manifest:
//    Replaces `self.__WB_MANIFEST` with an array of URLs to precache.
//    These are generated from `injectManifest.globPatterns`.
//
// 2. Inject Workbox Options:
//    - `skipWaiting: true`: The plugin injects `self.skipWaiting();`
//    - `clientsClaim: true`: The plugin injects `clientsClaim();`
//    - `cleanupOutdatedCaches: true`: The plugin injects `cleanupOutdatedCaches();`
//    - `runtimeCaching` rules: The plugin injects `registerRoute(...)` calls for these.
//
// The explicit calls below for skipWaiting, clientsClaim, and cleanupOutdatedCaches
// are good practice with injectManifest to ensure these behaviors are active,
// even though vite-plugin-pwa (v0.17+) typically injects them.
// ------------------------------------------------------------------------------------------

// (1) Tell the service worker to activate new versions immediately.
// Corresponds to `skipWaiting: true` in your Vite PWA config.
self.skipWaiting();

// (2) Allow the new service worker to take control of open pages (clients) immediately.
// Corresponds to `clientsClaim: true` in your Vite PWA config.
clientsClaim();

// (3) Clean up old caches from previous service worker versions.
// Corresponds to `cleanupOutdatedCaches: true` in your Vite PWA config.
cleanupOutdatedCaches();

// (4) Precache all assets specified in the manifest.
// `self.__WB_MANIFEST` is the placeholder that vite-plugin-pwa will fill.
// The `|| []` provides a fallback if the manifest isn't injected (shouldn't happen).
precacheAndRoute(self.__WB_MANIFEST || []);

// ------------------------------------------------------------------------------------------
// RUNTIME CACHING RULES
//
// The `runtimeCaching` rules from your `vite.config.js` (like your Firestore rule)
// should be automatically injected here by `vite-plugin-pwa`.
//
// If you needed to add a rule manually (that's NOT in vite.config.js),
// you would do it like this:
/*
registerRoute(
  ({url}) => url.origin === 'https://api.example.com' && url.pathname.startsWith('/data/'),
  new NetworkFirst({
    cacheName: 'api-data-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);
*/
// ------------------------------------------------------------------------------------------


// ------------------------------------------------------------------------------------------
// CUSTOM SERVICE WORKER LOGIC (OPTIONAL)
// You can add more advanced service worker features here.
// ------------------------------------------------------------------------------------------

// Listener for messages from client.
// Your `PwaUpdater.tsx` uses `updateServiceWorker(true)` which calls `messageSW({ type: 'SKIP_WAITING' })`
// from `virtual:pwa-register`, so this listener handles that message.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW Received SKIP_WAITING message from client, calling self.skipWaiting().');
    self.skipWaiting(); // Ensures the new SW activates
  }
});

// Example: Basic Push Notification Listener
/*
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  const pushData = event.data ? event.data.json() : { title: 'PlenPilot', body: 'New notification!' };

  const title = pushData.title || 'PlenPilot';
  const options = {
    body: pushData.body || 'You have a new message.',
    icon: '/Lawncare/icons/icon-192x192.png', // Adjust path if your icons are elsewhere or base path differs
    badge: '/Lawncare/icons/icon-72x72.png',  // Adjust path
    data: {
      url: pushData.url || '/Lawncare/' // URL to open on click, make sure it includes your base path
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
*/

// Example: Notification Click Handler
/*
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/Lawncare/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Check if the client URL matches the base path or a specific internal page
        if (client.url.endsWith(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
*/

console.log('Lawncare Custom Service Worker (public/sw.js) has been loaded and is running!');
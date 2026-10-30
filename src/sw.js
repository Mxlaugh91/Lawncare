// src/sw.js - Renset service worker uten manuell SKIP_WAITING håndtering

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// 🚀 AUTOMATISK VERSJON - endres ved hver build!
const VERSION = __VERSION__; // Definert i vite.config.js
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

// 6. FCM Background Message Handler
self.addEventListener('push', (event) => {
  console.log(`SW v${VERSION}: Push event received`, event);

  // FCM can deliver: (a) JSON with a `notification` payload, (b) JSON with
  // only a `data` payload, or (c) a non-JSON blob. Never let parsing throw.
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      console.warn(`SW v${VERSION}: Push payload was not JSON, falling back to text`);
      let text;
      try {
        text = event.data.text ? event.data.text() : undefined;
      } catch {
        text = undefined;
      }
      payload = { data: { body: text } };
    }
  }

  const notification = payload.notification || {};
  const customData = payload.data || {};

  const title = notification.title || customData.title || 'PlenPilot';
  const body = notification.body || customData.body || customData.message || 'Du har mottatt et nytt varsel';

  const notificationOptions = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: customData,
    tag: customData.type || 'general',
    actions: []
  };

  // Add action buttons based on notification type
  if (customData.type === 'job_tagged') {
    notificationOptions.actions = [
      {
        action: 'open_time_entry',
        title: 'Registrer timer'
      },
      {
        action: 'dismiss',
        title: 'Lukk'
      }
    ];
  } else if (customData.type === 'time_entry_reminder') {
    notificationOptions.actions = [
      {
        action: 'open_pending',
        title: 'Se ufullførte'
      },
      {
        action: 'dismiss',
        title: 'Lukk'
      }
    ];
  }

  // Only sticky notifications (job tagging, or when explicitly requested) stay
  // on screen until the user interacts with them.
  if (
    customData.requireInteraction === true ||
    customData.requireInteraction === 'true' ||
    customData.type === 'job_tagged'
  ) {
    notificationOptions.requireInteraction = true;
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// 7. Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log(`SW v${VERSION}: Notification click`, event);
  
  event.notification.close();
  
  const { action, data } = event;
  let urlToOpen = '/Lawncare/#/employee';
  
  // Determine URL based on action and notification type
  if (action === 'open_time_entry' || data?.type === 'job_tagged') {
    urlToOpen = '/Lawncare/#/employee/timeregistrering';
  } else if (action === 'open_pending' || data?.type === 'time_entry_reminder') {
    urlToOpen = '/Lawncare/#/employee/historikk';
  } else if (data?.type === 'manual_job_reminder') {
    urlToOpen = '/Lawncare/#/employee';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes('/Lawncare/') && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 8. PWA UPDATE STRATEGY (single, documented strategy)
// The updater uses ONE strategy: the new service worker takes over immediately
// (self.skipWaiting() on install + clients.claim() on activate). The page side
// (src/components/PwaUpdater.tsx) reloads exactly once on "controllerchange".
// There is deliberately no waiting-worker / "new version available" prompt.
self.addEventListener('install', () => {
  console.log(`SW v${VERSION}: Installing...`);
  // Konsistent med registerType: 'autoUpdate' i vite.config.ts
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`SW v${VERSION}: Activating...`);
  event.waitUntil(
    (async () => {
      // Ta kontroll over alle klienter med en gang
      await self.clients.claim();
      
      // Let Workbox handle all cache cleanup automatically
      // No manual cache deletion needed - cleanupOutdatedCaches() handles this
      
      // Gi beskjed til alle klienter om ny versjon
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

// Fjernet: self.addEventListener('message', ...) for SKIP_WAITING
// Dette er ikke lenger nødvendig med automatisk oppdatering
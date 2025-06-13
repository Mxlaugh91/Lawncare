// src/sw.js - Optimalisert for rask oppdatering med FCM support

import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Version - ØK DENNE ved hver endring!
const VERSION = '1.0.3';
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
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const { notification, data: customData } = data;
    
    if (notification) {
      const notificationOptions = {
        body: notification.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: customData,
        tag: customData?.type || 'general',
        requireInteraction: true,
        actions: []
      };

      // Add action buttons based on notification type
      if (customData?.type === 'job_tagged') {
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
      } else if (customData?.type === 'time_entry_reminder') {
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

      event.waitUntil(
        self.registration.showNotification(notification.title, notificationOptions)
      );
    }
  }
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

// 8. RASK OPPDATERING - dette er nøkkelen!
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

// 9. Håndter skip waiting melding og FORCE RELOAD
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
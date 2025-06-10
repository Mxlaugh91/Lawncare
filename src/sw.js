// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();

// Forhåndscacher alle ressurser (HTML, JS, CSS etc.) definert i manifestet.
precacheAndRoute(self.__WB_MANIFEST || []);

// Regel for Firestore API-kall
registerRoute(
  ({ url }) => url.protocol === 'https:' && url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager
      }),
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// ------------------------------------------------------------------------------------------
// SERVICE WORKER LIFECYCLE FOR UMIDDELBAR AKTIVERING
// ------------------------------------------------------------------------------------------

// Install: Ikke vent på den gamle service workeren
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  // KRITISK: Aktiver umiddelbart uten å vente
  self.skipWaiting();
});

// Activate: Ta kontroll over alle klienter umiddelbart
self.addEventListener('activate', (event) => {
  console.log('SW: Service worker aktivert');
  
  event.waitUntil(
    // Ta kontroll over alle åpne tabs/vinduer umiddelbart
    self.clients.claim().then(() => {
      console.log('SW: Ny service worker har tatt kontroll over alle klienter');
      
      // Send melding til alle klienter om at ny SW er aktiv
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: 'Ny service worker er aktiv og har tatt kontroll'
          });
        });
      });
    })
  );
});

// Message handling for eksplisitt SKIP_WAITING
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING melding mottatt - tvinger aktivering');
    
    // Force skipWaiting og ta kontroll
    self.skipWaiting();
    
    // Ta kontroll over alle klienter umiddelbart
    self.clients.claim().then(() => {
      console.log('SW: Tvunget aktivering fullført');
    });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('PlenPilot Service Worker (Force Activate Mode) er lastet og kjører!');
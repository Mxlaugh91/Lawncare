// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// KRITISK for prompt-modus: Ikke kall clientsClaim() automatisk
// clientsClaim(); // KOMMENTERT UT

cleanupOutdatedCaches();

// Forhåndscacher alle ressurser (HTML, JS, CSS etc.) definert i manifestet.
// self.__WB_MANIFEST er plassholderen som vite-plugin-pwa fyller ut.
precacheAndRoute(self.__WB_MANIFEST || []);

// Regel for Firestore API-kall: Prøv nettverk først, fall tilbake på cache.
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
        statuses: [200], // Cache kun vellykkede svar.
      }),
    ],
  })
);

// ------------------------------------------------------------------------------------------
// PROMPT-MODUS SERVICE WORKER LOGIKK
// ------------------------------------------------------------------------------------------

// Håndter install event for prompt-modus
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  // I prompt-modus skal vi IKKE kalle skipWaiting() automatisk
  // Dette lar den gamle service worker fortsette til brukeren godkjenner oppdateringen
});

// Håndter activate event for prompt-modus  
self.addEventListener('activate', (event) => {
  console.log('SW: Service worker aktivert');
  
  // Kun ta kontroll når vi eksplisitt blir bedt om det
  event.waitUntil(
    clientsClaim().then(() => {
      console.log('SW: Service worker har tatt kontroll over alle klienter');
    })
  );
});

// Message handling for prompt-modus
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING melding mottatt - aktiverer ny service worker');
    
    // Nå kan vi trygt kalle skipWaiting siden brukeren har godkjent
    self.skipWaiting();
    
    // Ta kontroll over alle klienter
    self.clients.claim().then(() => {
      console.log('SW: Ny service worker har tatt kontroll');
      
      // Send melding tilbake om vellykket oppdatering
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: 'Service worker oppdatert og aktivert'
          });
        });
      });
    });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
});

console.log('PlenPilot Service Worker (Prompt Mode) er lastet og kjører!');
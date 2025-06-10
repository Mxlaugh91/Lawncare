// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// Lar den nye service workeren ta kontroll over åpne sider (klienter) umiddelbart.
clientsClaim();

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
// EGENDEFINERT SERVICE WORKER-LOGIKK
// ------------------------------------------------------------------------------------------

// Lytter etter meldinger fra klienten (din PwaUpdater-komponent)
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Mottok SKIP_WAITING-melding fra klient - aktiverer ny service worker');
    
    // Aktiver den nye service worker umiddelbart
    self.skipWaiting();
    
    // Sørg for at den nye service worker tar kontroll over alle klienter
    self.clients.claim().then(() => {
      console.log('SW: Ny service worker har tatt kontroll over alle klienter');
    });
  }
});

// Håndter activate event
self.addEventListener('activate', (event) => {
  console.log('SW: Service worker aktivert');
  
  // Ta kontroll over alle klienter umiddelbart
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: Service worker har tatt kontroll over alle klienter');
      
      // Send melding til alle klienter om at oppdateringen er ferdig
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            payload: 'Service worker oppdatert og aktivert'
          });
        });
      });
    })
  );
});

// Håndter install event
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  
  // Ikke vent på at den gamle service worker skal avsluttes
  self.skipWaiting();
});

console.log('PlenPilot Egendefinert Service Worker er lastet og kjører!');
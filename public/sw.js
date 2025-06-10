// public/sw.js

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST || []);

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

// SERVICE WORKER LIFECYCLE FOR UMIDDELBAR AKTIVERING

self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert (install event).');
  // KRITISK: Aktiver umiddelbart uten å vente
  // Dette vil trigge 'activate'-eventet så snart installasjonen er fullført.
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event STARTET.'); // MER DETALJERT LOGGING
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: clients.claim() SUKSESS. Ny service worker har tatt kontroll over alle klienter.'); // MER DETALJERT LOGGING
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          console.log('SW: Sender SW_ACTIVATED til client ID:', client.id); // MER DETALJERT LOGGING
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: 'Ny service worker er aktiv og har tatt kontroll'
          });
        });
      });
    }).catch(err => {
      console.error('SW: FEIL i clients.claim() eller under sending av SW_ACTIVATED:', err); // MER DETALJERT LOGGING
    })
  );
  console.log('SW: Activate event waitUntil satt opp, fullfører activate event.'); // MER DETALJERT LOGGING
});

self.addEventListener('message', (event) => {
  // Logg hele meldingen for å se strukturen og om 'id' er tilstede
  console.log('SW: Mottok melding (full data):', JSON.stringify(event.data));
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    const messageId = event.data.id || 'INGEN_ID'; // Håndter hvis ID mangler
    console.log(`SW: SKIP_WAITING melding mottatt (ID: ${messageId}) - kaller self.skipWaiting()`);
    // Kall self.skipWaiting() her. Selv om den også kalles i 'install',
    // sikrer dette at SW reagerer hvis den av en eller annen grunn fortsatt er i 'waiting'.
    self.skipWaiting();
  }
});

self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error, 'Linje:', event.lineno, 'Fil:', event.filename);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
  // event.preventDefault(); // Vurder om dette er nødvendig
});

console.log('PlenPilot Service Worker (Force Activate Mode med detaljert logging) er lastet og kjører!');
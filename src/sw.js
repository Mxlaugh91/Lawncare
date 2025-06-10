// src/sw.js
// Dette er kilde-Service Worker filen som vite-plugin-pwa vil prosessere.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

console.log('SW (src/sw.js) - Toppnivå: Kilde Service Worker er lastet og starter evaluering. Timestamp:', Date.now());

try {
  console.log('SW: Før cleanupOutdatedCaches(). Timestamp:', Date.now());
  cleanupOutdatedCaches();
  console.log('SW: Etter cleanupOutdatedCaches(). Timestamp:', Date.now());
} catch (error) {
  console.error('SW: Feil under cleanupOutdatedCaches():', error);
}

// Firestore cache-strategi
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

// SERVICE WORKER LIFECYCLE EVENTS
// Disse må være registrert på toppnivå for å unngå "Event handler of '...' event must be added on the initial evaluation" advarsler.

self.addEventListener('install', (event) => {
  console.log('SW: install event - START. Timestamp:', Date.now());
  
  try {
    // Workbox vil håndtere `event.waitUntil` for precaching internt.
    // self.__WB_MANIFEST vil bli erstattet av vite-plugin-pwa med det faktiske manifestet.
    console.log('SW: install event - Kaller precacheAndRoute med self.__WB_MANIFEST.');
    precacheAndRoute(self.__WB_MANIFEST || []); 
    console.log('SW: install event - precacheAndRoute kall fullført (Workbox opererer asynkront).');
  } catch (error) {
    // Dette vil fange synkrone feil ved selve kallet til precacheAndRoute, noe som er uvanlig.
    // Asynkrone feil under selve precaching-prosessen håndteres vanligvis internt av Workbox.
    console.error('SW: install event - SYNKRON FEIL ved kall til precacheAndRoute:', error);
  }

  console.log('SW: install event - Kaller self.skipWaiting().');
  self.skipWaiting();
  console.log('SW: install event - self.skipWaiting() kalt.');
  console.log('SW: install event - END.');
});

self.addEventListener('activate', (event) => {
  console.log('SW: ACTIVATE event har startet. Timestamp:', Date.now()); 
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('SW: ACTIVATE - clients.claim() SUKSESS.');
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          console.log('SW: ACTIVATE - Sender SW_ACTIVATED til client ID:', client.id);
          client.postMessage({
            type: 'SW_ACTIVATED',
            payload: 'Ny service worker er aktiv og har tatt kontroll'
          });
        });
      });
    }).catch(err => {
      console.error('SW: ACTIVATE - FEIL i clients.claim() eller under sending av SW_ACTIVATED:', err);
    })
  );
  console.log('SW: ACTIVATE event - waitUntil satt opp, fullfører activate event logisk.');
});

self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding (full data):', JSON.stringify(event.data));
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    const messageId = event.data.id || 'INGEN_ID'; 
    console.log(`SW: SKIP_WAITING melding mottatt (ID: ${messageId}) - kaller self.skipWaiting()`);
    self.skipWaiting(); // Viktig for å la den ventende SW ta over raskere ved melding fra klienten
  }
});

self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error, 'Linje:', event.lineno, 'Fil:', event.filename);
});

self.addEventListener('unhandledrejection', (event) => {
  // Forhindrer at ubehandlede promise rejections i SW krasjer den (i noen nettlesere)
  console.error('SW: Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Vurder om dette er nødvendig for din bruk
});

console.log('SW (src/sw.js) - PlenPilot Kilde Service Worker er ferdig evaluert. Timestamp:', Date.now());
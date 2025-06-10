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

// Håndter install event
self.addEventListener('install', (event) => {
  console.log('SW: Service worker installert');
  
  // Ikke vent på at den gamle service worker skal avsluttes
  self.skipWaiting();
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

// Lytter etter meldinger fra klienten (din PwaUpdater-komponent)
self.addEventListener('message', (event) => {
  console.log('SW: Mottok melding:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Mottok SKIP_WAITING-melding fra klient - aktiverer ny service worker');
    
    // Aktiver den nye service worker umiddelbart
    self.skipWaiting();
    
    // Sjekk om det er iOS basert på user agent
    const checkPlatform = async () => {
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        // For iOS - send umiddelbar melding om å reloade
        client.postMessage({
          type: 'FORCE_RELOAD',
          payload: 'iOS krever umiddelbar reload'
        });
      });
    };
    
    checkPlatform();
    
    // Sørg for at den nye service worker tar kontroll over alle klienter
    self.clients.claim().then(() => {
      console.log('SW: Ny service worker har tatt kontroll over alle klienter');
    });
  }
});

// Håndter fetch events for bedre caching på iOS
self.addEventListener('fetch', (event) => {
  // La workbox håndtere de fleste requests
  // Dette er hovedsakelig for debugging og spesialhåndtering
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For iOS: Sørg for at oppdaterte ressurser faktisk lastes
  if (event.request.destination === 'document') {
    console.log('SW: Håndterer document request:', event.request.url);
  }
});

// Periodisk sync for å sjekke oppdateringer (iOS-spesifikk)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-updates') {
    console.log('SW: Sjekker for oppdateringer via sync');
    event.waitUntil(
      self.registration.update().then(() => {
        console.log('SW: Oppdateringssjekk fullført');
      })
    );
  }
});

// Håndter push events (fremtidig funksjonalitet)
self.addEventListener('push', (event) => {
  console.log('SW: Push event mottatt:', event);
  // Her kan du legge til push notification-håndtering senere
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('SW: Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason);
});

console.log('PlenPilot Egendefinert Service Worker er lastet og kjører!');

// Ekstra debugging for iOS
if (typeof navigator !== 'undefined') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    console.log('SW: iOS detektert - bruker spesiell håndtering');
  }
}
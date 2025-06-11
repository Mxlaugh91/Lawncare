// src/sw.js (ULTRA-MINIMAL FOR TEST)
import { precacheAndRoute } from 'workbox-precaching';
/// <reference lib="webworker" />

// self.__WB_DISABLE_DEV_LOGS = false; 
// console.log('SW: Minimal test SW starting.');

precacheAndRoute(self.__WB_MANIFEST || []); // ENESTE BRUK AV PLASS HOLDEREN

// self.addEventListener('install', () => self.skipWaiting());
// self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// console.log('SW: Minimal test SW loaded.');
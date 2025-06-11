// src/sw.js (Test 1)
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'; // ENDRET IMPORT
/// <reference lib="webworker" />

precacheAndRoute(self.__WB_MANIFEST || []); 
cleanupOutdatedCaches(); // NY LINJE

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
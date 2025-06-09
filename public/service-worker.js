// public/service-worker.js - KORRIGERT versjon
const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE_NAME = `plenpilot-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `plenpilot-dynamic-${CACHE_VERSION}`;
const OFFLINE_CACHE_NAME = `plenpilot-offline-${CACHE_VERSION}`;

// ✅ FIKSET: Riktige paths med /Lawncare/ base
const STATIC_ASSETS = [
  '/Lawncare/',
  '/Lawncare/index.html',
  '/Lawncare/manifest.json',
  '/Lawncare/vite.svg',
  // Icons - disse må du lage
  '/Lawncare/icons/icon-192x192.png',
  '/Lawncare/icons/icon-512x512.png'
];

// Critical app shell files som ALLTID skal caches
const CRITICAL_ASSETS = [
  '/Lawncare/',
  '/Lawncare/index.html'
];

// URLs som aldri skal caches
const NEVER_CACHE = [
  '/Lawncare/service-worker.js',
  'chrome-extension://',
  'analytics.google.com',
  'googletagmanager.com'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log(`Service Worker ${CACHE_VERSION} installing...`);
  
  event.waitUntil(
    Promise.all([
      // Cache critical assets first
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Caching critical assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // Then cache other static assets (don't fail if some fail)
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`Failed to cache ${url}:`, err)
            )
          )
        );
      })
    ]).then(() => {
      console.log('Static assets cached successfully');
      return self.skipWaiting(); // Force activation
    }).catch(err => {
      console.error('Failed to cache static assets:', err);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Service Worker ${CACHE_VERSION} activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('plenpilot') && 
                !cacheName.includes(CACHE_VERSION)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated and ready');
    })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip requests we should never cache
  if (NEVER_CACHE.some(pattern => request.url.includes(pattern))) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isFirebaseRequest(request)) {
    event.respondWith(handleFirebaseRequest(request));
  } else if (isAppRequest(request)) {
    event.respondWith(handleAppRequest(request));
  } else {
    event.respondWith(handleExternalRequest(request));
  }
});

// ✅ FORBEDRET: Static asset handling (Cache First)
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    // Return cached version or offline page
    return caches.match('/Lawncare/index.html');
  }
}

// ✅ FORBEDRET: Firebase request handling
async function handleFirebaseRequest(request) {
  try {
    // Always try network first for Firebase
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests (not mutations)
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      // Cache with 5 minute TTL
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Firebase request failed, trying cache:', request.url);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is still fresh (5 minutes)
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < 5 * 60 * 1000) { // 5 minutes
          return cachedResponse;
        }
      }
    }
    
    // Return offline fallback for important endpoints
    if (request.url.includes('locations') || request.url.includes('timeEntries')) {
      return new Response(
        JSON.stringify({ error: 'Offline', cached: false }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// ✅ FORBEDRET: App request handling (SPA routing)
async function handleAppRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached version and update in background
      updateCache(request);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // For SPA routes, return the app shell
    console.log('App request failed, returning app shell');
    return caches.match('/Lawncare/index.html');
  }
}

// External request handling (Network First)
async function handleExternalRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(request) {
  return request.url.includes('/assets/') || 
         request.url.includes('.js') || 
         request.url.includes('.css') ||
         request.url.includes('.png') ||
         request.url.includes('.svg') ||
         request.url.includes('.ico');
}

function isFirebaseRequest(request) {
  return request.url.includes('firebaseapp.com') || 
         request.url.includes('googleapis.com') ||
         request.url.includes('firebase.com');
}

function isAppRequest(request) {
  return request.url.includes('/Lawncare/') && 
         !isStaticAsset(request) && 
         !isFirebaseRequest(request);
}

// Background cache update
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// ✅ FORBEDRET: Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'timeentry-sync') {
    event.waitUntil(syncTimeEntries());
  } else if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Sync pending time entries when back online
async function syncTimeEntries() {
  try {
    console.log('Syncing pending time entries...');
    
    // Get pending data from IndexedDB or localStorage
    const pendingEntries = await getPendingTimeEntries();
    
    for (const entry of pendingEntries) {
      try {
        // Attempt to sync each entry
        const response = await fetch('/api/timeentries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.data)
        });
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingTimeEntry(entry.id);
          console.log('Synced time entry:', entry.id);
        }
      } catch (error) {
        console.error('Failed to sync time entry:', entry.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function handleBackgroundSync() {
  console.log('Handling general background sync...');
  
  // Clear old cache entries
  await cleanupOldCaches();
  
  // Prefetch critical data
  await prefetchCriticalData();
}

async function cleanupOldCaches() {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const timestamp = response.headers.get('sw-cache-timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        // Remove entries older than 1 hour
        if (age > 60 * 60 * 1000) {
          await cache.delete(request);
        }
      }
    }
  }
}

async function prefetchCriticalData() {
  // Prefetch locations and equipment data for offline use
  const criticalUrls = [
    '/api/locations',
    '/api/equipment'
  ];
  
  for (const url of criticalUrls) {
    try {
      await fetch(url);
    } catch (error) {
      console.log('Prefetch failed for:', url);
    }
  }
}

// ✅ FORBEDRET: Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let options = {
    body: 'Du har fått en ny oppgave',
    icon: '/Lawncare/icons/icon-192x192.png',
    badge: '/Lawncare/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Åpne app',
        icon: '/Lawncare/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Lukk'
      }
    ],
    requireInteraction: true
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('PlenPilot', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/Lawncare/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/Lawncare/');
        }
      })
    );
  }
});

// Message handling from main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SYNC_DATA') {
    // Trigger background sync
    handleBackgroundSync();
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Placeholder functions for offline storage (you'd implement these with IndexedDB)
async function getPendingTimeEntries() {
  // Implement with IndexedDB
  return [];
}

async function removePendingTimeEntry(id) {
  // Implement with IndexedDB
  console.log('Remove pending entry:', id);
}
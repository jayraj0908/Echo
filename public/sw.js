/**
 * Service Worker for ECHO - Performance & Caching
 * Optimizes loading speed and provides offline functionality
 */

const CACHE_NAME = 'echo-v1.2.0';
const STATIC_CACHE = 'echo-static-v1.2.0';
const DYNAMIC_CACHE = 'echo-dynamic-v1.2.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/login.html',
  '/styles.css',
  '/landing.css',
  '/auth.css',
  '/app.js',
  '/landing.js',
  '/auth.js',
  '/shared.js',
  // Firebase SDK (cached from CDN)
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName.startsWith('echo-');
            })
            .map((cacheName) => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls (let them go to network)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip external APIs that should always be fresh
  if (url.hostname === 'api.anthropic.com') {
    return;
  }
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        // For HTML files, check network in background and update cache
        if (request.destination === 'document') {
          event.waitUntil(
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
            }).catch(() => {
              // Network failed, but we have cache
            })
          );
        }
        
        return cachedResponse;
      }
      
      // Not in cache, fetch from network
      return fetch(request).then((networkResponse) => {
        // Only cache successful responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Clone the response
        const responseToCache = networkResponse.clone();
        
        // Determine which cache to use
        const cacheToUse = STATIC_ASSETS.includes(url.pathname) || 
                          url.hostname !== location.hostname ? 
                          STATIC_CACHE : DYNAMIC_CACHE;
        
        // Cache the response
        caches.open(cacheToUse).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Network failed and no cache available
        // Return offline page for HTML requests
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // Return empty response for other resources
        return new Response('', {
          status: 204,
          statusText: 'No Content'
        });
      });
    })
  );
});

// Background sync for better offline experience
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Service Worker: Background sync triggered')
    );
  }
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'echo-notification',
        requireInteraction: false,
        data: data.data || {}
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/app.html')
  );
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      // Sync content in background
      console.log('Service Worker: Periodic sync triggered')
    );
  }
});
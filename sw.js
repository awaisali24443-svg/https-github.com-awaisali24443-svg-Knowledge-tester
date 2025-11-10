// sw.js

const CACHE_NAME = 'knowledge-tester-v2.2'; // Version bump to clear old caches
const urlsToCache = [
  '/',
  '/index.html',
  // Globals
  '/global/global.css',
  '/global/global.js',
  '/global/accessibility.css',
  '/global/splash.css',
  '/global/header.html',
  // Themes
  '/themes/theme-dark-cyber.css',
  // Third-party libraries (from CDN, will be cached on first fetch)
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.164.1/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
  // All Modules & Services are cached via network-first strategy now
  // Assets
  '/icon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&family=Orbitron:wght@800&display=swap',
  'https://fonts.gstatic.com/s/exo2/v21/7cH1v4okm5zmbvwk_QED-Vk-PA.woff2'
];

// Install the service worker and cache the app shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
});

// FIX #4, #5: Implement a Network first, then cache strategy.
// This prevents serving stale index.html or API data.
self.addEventListener('fetch', event => {
    // We only want to handle GET requests.
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Specifically ignore API calls from being cached.
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // If the fetch is successful, clone it and cache it.
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            })
            .catch(() => {
                // If the network fails, try to serve from the cache.
                return caches.match(event.request);
            })
    );
});


// Clean up old caches on activation
self.addEventListener('activate', event => {
  // FIX #24: Ensure the new service worker takes control immediately.
  self.clients.claim(); 
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
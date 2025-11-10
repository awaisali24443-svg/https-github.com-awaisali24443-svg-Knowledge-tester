// sw.js

const CACHE_NAME = 'knowledge-tester-v1.2';
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
  // Core JS libs (if self-hosted) - we will intercept CDN calls instead
  // Modules (core ones to start)
  '/modules/home/home.html',
  '/modules/home/home.css',
  '/modules/home/home.js',
  '/modules/welcome/welcome.html',
  '/modules/welcome/welcome.css',
  '/modules/welcome/welcome.js',
  // Constants & Services
  '/constants.js',
  '/services/authService.js',
  '/services/geminiService.js',
  '/services/moduleHelper.js',
  '/services/progressService.js',
  '/services/quizStateService.js',
  '/services/soundService.js',
  '/services/stellarMap.js',
  '/services/threeManager.js',
  '/services/topicService.js',
  '/services/uiService.js',
  // Assets
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&family=Orbitron:wght@800&display=swap',
  'https://fonts.gstatic.com/s/exo2/v21/7cH1v4okm5zmbvwk_QED-Vk-PA.woff2'
];

// Install the service worker and cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network, then cache it
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            // Don't cache non-basic (cross-origin) or error responses
                            // Note: This means CDN scripts won't be cached unless CORS is enabled, which is fine.
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(err => {
                    console.error('Fetch failed; returning offline page instead.', err);
                    // Optional: return a fallback offline page if fetch fails
                });
            })
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

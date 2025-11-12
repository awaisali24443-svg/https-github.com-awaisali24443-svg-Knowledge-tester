// sw.js - Service Worker
// Rewritten for robustness, performance, and offline capability.

const CACHE_NAME = 'knowledge-tester-cache-v1.6'; // Increment this version to trigger an update

// --- App Shell: Core files needed for the app to run offline ---
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/index.js',
    '/constants.js',
    '/manifest.json',
    '/icon.svg',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/og-image.png',
    
    // Global CSS & JS
    '/global/global.css',
    '/global/global.js',
    '/global/sidebar.html',
    '/global/splash.css',
    '/global/accessibility.css',
    
    // Themes
    '/themes/theme-dark-cyber.css',

    // Services
    '/services/configService.js',
    '/services/featureService.js',
    '/services/geminiService.js',
    '/services/learningPathService.js',
    '/services/libraryService.js',
    '/services/modalService.js',
    '/services/quizStateService.js',
    '/services/searchService.js',
    '/services/seoService.js',
    '/services/soundService.js',
    '/services/toastService.js',
    '/services/topicService.js',

    // Fonts (precaching the main font assets)
    'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700;900&family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;700&display=swap',
    'https://fonts.gstatic.com/s/exo2/v21/7cH1v4okm5zmbt52_B8.woff2', // Common weights
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',

    // Sounds
    '/assets/sounds/click.wav',
    '/assets/sounds/correct.wav',
    '/assets/sounds/incorrect.wav',
];

// --- Install Event ---
self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching App Shell');
                // Use addAll for atomic operation: if one fails, none are added.
                return cache.addAll(APP_SHELL_URLS);
            })
            .catch(error => {
                console.error('[SW] Failed to cache App Shell:', error);
            })
    );
});

// --- Activate Event ---
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete any old caches that aren't the current one
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Force the new service worker to take control immediately
    return self.clients.claim();
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Don't cache API requests for quiz generation (they are always unique)
    if (url.pathname.startsWith('/api/generate') || url.pathname.startsWith('/api/generate-path')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // API Caching: Stale-While-Revalidate for topics data
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    const fetchPromise = fetch(request).then(networkResponse => {
                        // Update the cache with the new version
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Return cached version immediately, while fetching update in background
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Static Asset Caching: Cache First, then Network
    // This is ideal for app shell files that don't change often.
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            // If we have a cached response, return it.
            if (cachedResponse) {
                return cachedResponse;
            }
            // Otherwise, fetch from the network.
            return fetch(request).then(networkResponse => {
                // OPTIONAL: You could add non-critical assets to the cache here as the user browses
                // but for this app, pre-caching the shell is sufficient.
                return networkResponse;
            });
        }).catch(error => {
            console.error('[SW] Fetch error:', error);
            // You could return a fallback offline page here if needed.
        })
    );
});

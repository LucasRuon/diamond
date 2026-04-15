const CACHE_NAME = 'diamondx-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/reset.css',
    '/css/variables.css',
    '/css/components.css',
    '/css/pages.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/supabase.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Strategy: Cache First, falling back to Network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    // Don't cache supabase calls or other dynamic data
                    if (!event.request.url.includes('supabase.co')) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
    );
});
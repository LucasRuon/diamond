const CACHE_NAME = 'diamondx-v2';
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
    '/js/ui.js',
    '/js/qrcode.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install: Cache critical assets
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

// Activate: Cleanup old caches
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

// Fetch Strategy: Stale-While-Revalidate
// Serve from cache immediately, but update in background
self.addEventListener('fetch', event => {
    // Skip non-GET requests and external API calls
    if (event.request.method !== 'GET' || 
        event.request.url.includes('supabase.co') || 
        event.request.url.includes('chrome-extension')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchedResponse = fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback to offline page if needed
                    return cachedResponse;
                });

                return cachedResponse || fetchedResponse;
            });
        })
    );
});
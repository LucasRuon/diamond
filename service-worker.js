const CACHE_NAME = 'diamondx-v32';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json?v=3',
    '/css/reset.css?v=13',
    '/css/variables.css',
    '/css/components.css?v=20',
    '/css/pages.css?v=5',
    '/js/app.js?v=18',
    '/js/auth.js',
    '/js/supabase.js',
    '/js/supabase.js?v=16',
    '/js/ui.js',
    '/js/qrcode.js',
    '/js/clubs.js?v=14',
    '/js/pages/admin/users.js',
    '/js/pages/admin/users.js?v=16',
    '/js/pages/admin/clubs.js?v=14',
    '/js/pages/student/preTrainingQuestionnaire.js',
    '/js/pages/student/preTrainingQuestionnaireView.js',
    '/js/studentDocuments.js?v=15',
    '/js/pages/admin/preTrainingQuestionnaires.js?v=15',
    '/assets/pre-training/body-front.svg',
    '/assets/pre-training/body-back.svg',
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
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
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

    const requestUrl = new URL(event.request.url);
    const shouldUseNetworkFirst = requestUrl.origin === self.location.origin
        && (
            requestUrl.pathname === '/'
            || requestUrl.pathname === '/index.html'
            || requestUrl.pathname.endsWith('.js')
            || requestUrl.pathname.endsWith('.css')
        );

    if (shouldUseNetworkFirst) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cache.match(event.request));
            })
        );
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

// ============ Push notifications (waitlist offers) ============
self.addEventListener('push', event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
    const title = data.title || 'Diamond X';
    const body = data.body || 'Você tem uma nova notificação.';
    const url = data.url || '/#trainings';
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-192.png',
            data: { url },
            tag: data.tag || 'diamondx-notification'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = event.notification.data?.url || '/#trainings';
    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of all) {
            if ('focus' in client) {
                client.focus();
                if ('navigate' in client) {
                    try { await client.navigate(target); } catch (_) {}
                }
                return;
            }
        }
        if (self.clients.openWindow) await self.clients.openWindow(target);
    })());
});

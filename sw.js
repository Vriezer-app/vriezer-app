// Service Worker voor Voorraad.
// Zorgt voor offline-toegang (cachet de app-shell) en verwerkt kliks op meldingen.
// Verhoog CACHE_NAME bij elke nieuwe release om oude caches automatisch te vervangen.
const CACHE_NAME = 'voorraad-shell-v2';

const APP_SHELL = [
    './',
    './index.html',
    './app.js',
    './site.webmanifest.json',
    './favicon.ico',
    './icon_180x180.png',
    './icon_192x192.png',
    './icon_512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch(() => { /* ontbrekend bestand mag installatie niet blokkeren */ })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Stale-while-revalidate: toon direct de gecachete versie (werkt offline),
// en ververs de cache op de achtergrond zodra er weer internet is.
// Externe requests (CDN-scripts, Firebase/Firestore) worden NIET onderschept,
// die lopen gewoon via het netwerk zodat authenticatie/sync altijd correct werkt.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});

// Klik op een melding (bv. "product X is bijna over datum") opent/focust de app.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});

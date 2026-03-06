const CACHE_VERSION = '0.1';
const CACHE_NAME = `mbl-v${CACHE_VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './db.js',
    './main.js',
    './404.html',
    './version.json',
    './user/options.html',
    './user/options.js',
    './collection/home.html',
    './collection/home.js',
    './collection/annotation.html',
    './collection/annotation.js',
    './book/add.html',
    './book/add.js',
    './book/view.html',
    './book/view.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) return;

    if (url.pathname.endsWith('version.json')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(cached =>
                cached || fetch(event.request).catch(() => caches.match('./index.html'))
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached =>
            cached || fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
        )
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.action === 'CLEAR_CACHE') {
        caches.keys()
            .then(keys => Promise.all(keys.map(key => caches.delete(key))))
            .then(() => event.ports[0]?.postMessage({ success: true }));
    }

    if (event.data?.action === 'CHECK_VERSION') {
        fetch('./version.json?t=' + Date.now())
            .then(r => r.json())
            .then(data => {
                const isOutdated = data.version !== CACHE_VERSION;
                event.ports[0]?.postMessage({ version: data.version, isOutdated });
            })
            .catch(() => {
                event.ports[0]?.postMessage({ version: null, isOutdated: false });
            });
    }
});
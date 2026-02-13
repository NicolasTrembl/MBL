const CACHE_NAME = 'mbl-v0-wip';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './db.js',
    './main.js',
    './404.html',
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
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/MBL/index.html');
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
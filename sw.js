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

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const cleanRes = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, cleanRes));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
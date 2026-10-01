const CACHE_NAME = 'mishkat-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/pwa.css',
  '/pwa.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.url.indexOf('/api/') !== -1) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function (res) {
      return res || fetch(e.request).then(function (r) {
        if (r.status === 200) {
          var clone = r.clone();
          caches.open(CACHE_NAME).then(function (c) {
            c.put(e.request, clone);
          });
        }
        return r;
      }).catch(function () {
        return caches.match('/');
      });
    })
  );
});

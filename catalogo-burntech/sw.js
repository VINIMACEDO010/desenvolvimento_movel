const CACHE = 'burntech-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/caldeira1.jpg',
  'images/caldeira2.jpg',
  'images/caldeira3.jpg',
  'images/caldeira4.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});

// Simple, resilient offline caching for GitHub Pages
const VERSION = 'v1.0.0';
const NAME = `debt-recycle-${VERSION}`;

// Add any extra assets you want guaranteed offline here:
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(NAME).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategy:
// - HTML (navigation requests): network-first, fallback to cache
// - Everything else: cache-first, then network
self.addEventListener('fetch', event => {
  const req = event.request;

  // Treat navigations as HTML
  const isNav = req.mode === 'navigate' ||
                (req.method === 'GET' &&
                 req.headers.get('accept') &&
                 req.headers.get('accept').includes('text/html'));

  if (isNav) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Non-HTML: cache-first
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(NAME).then(c => c.put(req, copy));
        return res;
      });
    })
  );
});

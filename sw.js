// Bump this number whenever you upload a new version of the app.
const CACHE = 'life-plan-v5';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Open from cache instantly, refresh in the background (works offline, picks up updates next open).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      }).catch(() => hit || cache.match('./index.html'));
      return hit || net;
    })
  );
});

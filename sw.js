// Bump this number whenever you upload a new version of the app.
const CACHE = 'life-plan-v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's own HTTP cache, so we always store the newest files
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    // If this replaced an older version, reload open pages once so the new app shows immediately
    if (old.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach(w => { if ('navigate' in w) w.navigate(w.url); });
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // The app page itself: network first (always the latest), cached copy only when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (icons, fonts): cached copy first, refreshed in the background
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

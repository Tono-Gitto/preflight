const CACHE_NAME = 'timeline-v12';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept on localhost — let the dev server serve directly
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Navigation requests (HTML): network-first with cache:'no-store' to bypass HTTP cache.
  // Fall back to cached index.html only if offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put('./index.html', clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});

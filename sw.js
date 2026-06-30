/* 149FM service worker — minimal & safe.
   Bump CACHE when you change index.html so users get the new version. */
const CACHE = '149fm-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only handle same-origin GET navigations. Never touch the audio stream or the metadata API.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // ZenoFM stream, AzuraCast subdomain, fonts → untouched
  if (url.pathname.indexOf('/radio/') === 0) return;        // AzuraCast API via reverse proxy → always live
  if (req.mode === 'navigate') {
    // network-first so updates show immediately; cache only as offline fallback
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // static assets: cache-first
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

// Service worker — offline-first for Treningsapp v2.
// App-skallet og statiske data caches ved installasjon. Strategi:
//   - navigasjon/HTML: network-first med cache-fallback (fersk UI når nett finnes)
//   - data/JS/CSS/ikoner: cache-first (raskt, fungerer offline)
// Bump CACHE_VERSION for å rulle ut ny cache.
const CACHE_VERSION = 'trening-m1-0.1.0';
const SKALL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/library.js',
  './js/store.js',
  './js/ui.js',
  './js/config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './data/exercises.json',
  './data/chains.json',
  './data/formats.json',
  './data/templates.json',
  './data/equipment.json',
  './data/bundles.json',
  './data/gateways.json',
  './data/sequences.json',
  './data/warmups.json',
  './data/protocols.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SKALL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((navn) =>
      Promise.all(navn.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // ikke rør Supabase/CDN

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((res) => {
        const kopi = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, kopi));
        return res;
      }).catch(() => caches.match(request).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((truff) =>
      truff || fetch(request).then((res) => {
        if (res.ok && (url.pathname.includes('/data/') || url.pathname.includes('/js/') || url.pathname.includes('/css/') || url.pathname.includes('/icons/'))) {
          const kopi = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, kopi));
        }
        return res;
      }),
    ),
  );
});

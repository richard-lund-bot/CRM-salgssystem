// Service worker — offline-first for Treningsapp v2.
// App-skallet og statiske data caches ved installasjon. Strategi:
//   - navigasjon/HTML: network-first med cache-fallback (fersk UI når nett finnes)
//   - data/JS/CSS/ikoner: cache-first (raskt, fungerer offline)
// Bump CACHE_VERSION for å rulle ut ny cache.
const CACHE_VERSION = 'mova-m13-2.2.0';
const SKALL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/library.js',
  './js/bibliotek-okter.js',
  './js/store.js',
  './js/ui.js',
  './js/config.js',
  './js/rng.js',
  './js/onboarding.js',
  './js/kjor.js',
  './js/niva.js',
  './js/historikk.js',
  './js/kalender.js',
  './js/sync.js',
  './js/belonninger.js',
  './js/bevegelse.js',
  './js/beveg.js',
  './js/reise.js',
  './js/figur.js',
  './js/animasjon.js',
  './manifest.webmanifest',
  './fonts/fredoka-var.woff2',
  './fonts/inter-var.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/brand/hero-min-dag.png',
  './icons/brand/hero-morgen.webp',
  './icons/brand/hero-formiddag.webp',
  './icons/brand/hero-dag.webp',
  './icons/brand/hero-kveld.webp',
  './icons/brand/hero-natt.webp',
  './icons/brand/shoe-badge.png',
  './icons/brand/splash.webp',
  './data/okter.json',
  './data/exercises.json',
  './data/equipment.json',
];

self.addEventListener('install', (e) => {
  // cache: 'no-cache' revaliderer mot serveren (ETag) i stedet for å ta
  // filene fra HTTP-cachen — GitHub Pages cacher i 10 min, og uten dette
  // kan en ny cache-versjon fylles med gamle filer rett etter en deploy.
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((c) => c.addAll(SKALL.map((u) => new Request(u, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
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
        if (res.ok && (url.pathname.includes('/data/') || url.pathname.includes('/js/') || url.pathname.includes('/css/') || url.pathname.includes('/icons/') || url.pathname.includes('/fonts/'))) {
          const kopi = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, kopi));
        }
        return res;
      }),
    ),
  );
});

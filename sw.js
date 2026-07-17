// Service worker — offline-first for Treningsapp v2.
// App-skallet og statiske data caches ved installasjon. Strategi:
//   - navigasjon/HTML: network-first med cache-fallback (fersk UI når nett finnes)
//   - data/JS/CSS/ikoner: cache-first (raskt, fungerer offline)
// Bump CACHE_VERSION for å rulle ut ny cache.
const CACHE_VERSION = 'takt-m57-5.11.0';
const SKALL = [
  './',
  './index.html',
  './personvern.html',
  './vilkar.html',
  './sletting.html',
  './css/app.css',
  './css/sider.css',
  './js/app.js',
  './js/library.js',
  './js/bibliotek-okter.js',
  './js/opplasing.js',
  './js/store.js',
  './js/ui.js',
  './js/config.js',
  './js/onboarding.js',
  './js/kjor.js',
  './js/gnist.js',
  './js/historikk.js',
  './js/kalender.js',
  './js/sync.js',
  './js/strava.js',
  './js/bevegelse.js',
  './js/beveg.js',
  './js/banner.js',
  './js/merker.js',
  './js/vaakenlaas.js',
  './js/ovelse.js',
  './js/styrke.js',
  './js/laer.js',
  './js/feed.js',
  './js/feed-rang.js',
  './js/kosthold.js',
  './js/ro.js',
  './js/sosialt.js',
  './js/fellesskap.js',
  './js/mening.js',
  './js/i18n.js',
  './js/sti.js',
  './js/haptikk.js',
  './js/medlem.js',
  './js/animasjon.js',
  './js/lyd.js',
  './js/feiring.js',
  './js/toast.js',
  './js/kroppskart.js',
  './js/kroppskart-svg.js',
  './js/preferanser.js',
  './js/varsler.js',
  './manifest.webmanifest',
  './fonts/fredoka-var.woff2',
  './fonts/inter-var.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/takt-ikon.svg',
  './icons/takt-ikon-maskable.svg',
  './icons/brand/hero-min-dag.png',
  './icons/brand/hero-morgen.webp',
  './icons/brand/hero-formiddag.webp',
  './icons/brand/hero-dag.webp',
  './icons/brand/hero-kveld.webp',
  './icons/brand/hero-natt.webp',
  './icons/brand/shoe-badge.png',
  './icons/brand/splash.webp',
  './icons/brand/auth-logg-inn.webp',
  './icons/brand/auth-bli-medlem.webp',
  './icons/brand/panda/panda-idle.webp',
  './icons/brand/panda/panda-wave.webp',
  './icons/brand/panda/panda-flex.webp',
  './icons/brand/panda/panda-cheer.webp',
  './icons/brand/panda/panda-pushup-up.webp',
  './icons/brand/panda/panda-pushup-down.webp',
  './data/okter.json',
  './data/ovelsesinfo.json',
  './data/artikler.json',
  './data/arrangement.json',
  './data/feed.json',
  './data/exercises.json',
  './data/equipment.json',
  './data/chains.json',
  './data/stier.json',
  './data/disipliner.json',
  './data/seksjoner.json',
];

// Engelske datavarianter (data/*.en.json) — precaches best-effort (se install).
const EN_DATA = [
  './data/feed.en.json', './data/arrangement.en.json',
  './data/okter.en.json', './data/exercises.en.json', './data/equipment.en.json',
  './data/ovelsesinfo.en.json', './data/artikler.en.json', './data/stier.en.json',
  './data/disipliner.en.json', './data/seksjoner.en.json',
];

self.addEventListener('install', (e) => {
  // cache: 'no-cache' revaliderer mot serveren (ETag) i stedet for å ta
  // filene fra HTTP-cachen — GitHub Pages cacher i 10 min, og uten dette
  // kan en ny cache-versjon fylles med gamle filer rett etter en deploy.
  e.waitUntil(
    caches.open(CACHE_VERSION)
      // Skallet må caches (addAll feiler samlet hvis noe mangler). De engelske
      // datafilene (data/*.en.json) precaches best-effort hver for seg, så en
      // ennå-ikke-oversatt fil aldri bryter installasjonen — den hentes uansett
      // ved runtime med norsk fallback.
      .then(async (c) => {
        await c.addAll(SKALL.map((u) => new Request(u, { cache: 'no-cache' })));
        await Promise.all(EN_DATA.map((u) =>
          c.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
      })
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
        if (res.ok && (url.pathname.includes('/data/') || url.pathname.includes('/bilder/') || url.pathname.includes('/js/') || url.pathname.includes('/css/') || url.pathname.includes('/icons/') || url.pathname.includes('/fonts/'))) {
          const kopi = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, kopi));
        }
        return res;
      }),
    ),
  );
});

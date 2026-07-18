// Touch-test for sveip mellom hovedsidene: Instagram-stil dra Hjem→feed, samt
// strip-sveip (feed ← Hjem ← Mat ← Bevegelse ← Ro ← Fellesskap) og at et
// horisontalt filter-felt scroller i stedet for å navigere. Egen fil fordi den
// trenger en touch-kontekst (hasTouch) som hoved-røyktesten ikke bruker.
// Kjøres med `npm run e2e:feed` (samme E2E_CHROMIUM-mekanikk som smoke.cjs).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.E2E_PORT || 8261);
const BASE = `http://127.0.0.1:${PORT}`;
const TYPER = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

function lagServer() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const filsti = path.join(ROT, p);
    if (!filsti.startsWith(ROT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filsti, (err, buf) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': TYPER[path.extname(filsti)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });
}

const feil = [];
function sjekk(navn, ok, ekstra = '') {
  console.log(`${ok ? '✓' : '✗'} ${navn}${ekstra ? ` — ${ekstra}` : ''}`);
  if (!ok) feil.push(navn);
}

// Dispatch en horisontal dra på .hjemdash-scroll (touchstart → N×touchmove → touchend).
async function dra(page, xs, x2, y = 400) {
  await page.waitForFunction(() => !!document.querySelector('.hjemdash-scroll'));
  await page.evaluate(({ xs, x2, y }) => {
    const elm = document.querySelector('.hjemdash-scroll');
    if (!elm) throw new Error('mangler .hjemdash-scroll');
    const mk = (x, yy) => new Touch({ identifier: 1, target: elm, clientX: x, clientY: yy });
    const ev = (type, x, yy) => {
      const t = mk(x, yy);
      elm.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
    };
    ev('touchstart', xs, y);
    for (let i = 1; i <= 8; i++) ev('touchmove', xs + (x2 - xs) * i / 8, y);
    ev('touchend', x2, y);
  }, { xs, x2, y });
}

(async () => {
  const server = lagServer();
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.log('SIDEFEIL:', e.message); feil.push('pageerror: ' + e.message); });
  await page.addInitScript(() => {
    localStorage.setItem('trening.sesjon', JSON.stringify({ refresh_token: 'fake', access_token: 'fake', epost: 't@t.no' }));
    localStorage.setItem('trening.profil', JSON.stringify({ navn: 'Test', ukemaal: 3, varighetsklasse: 'standard', globalXp: 100, innstillinger: { lyd: false, haptikk: false, feedInteresser: [] } }));
    localStorage.setItem('trening.logg', '[]');
  });
  const hash = () => page.evaluate(() => location.hash);
  // Fersk innlasting av Hjem per scenario (isolerer dra-tilstand mellom testene;
  // en ren hash-navigasjon laster ikke dokumentet på nytt).
  const friskHjem = async () => {
    await page.goto(`${BASE}/#/hjem`);
    await page.reload();
    await page.waitForSelector('.hjemdash-scroll', { timeout: 20000 });
    await page.waitForTimeout(700); // la eventuell sync-re-render sette seg
  };

  // 1) Full dra (forbi terskel) → feeden åpnes, peek ryddes, kort tegnes.
  // .fkort finnes også i peeken under dra-en, så vi venter på at COMMIT-en
  // (hash → #/feed) er ferdig før vi sjekker — ikke bare på at et kort finnes.
  await friskHjem();
  await dra(page, 40, 360); // dx=320 > 30 % av 390
  await page.waitForFunction(() => location.hash === '#/feed', null, { timeout: 8000 }).catch(() => {});
  sjekk('Full dra mot høyre åpner feeden', (await hash()) === '#/feed');
  await page.waitForSelector('.fkort', { timeout: 20000 });
  sjekk('Feeden er tegnet', (await page.locator('.fkort').count()) > 0);
  sjekk('Dra-peeken er ryddet', (await page.locator('.feedpeek').count()) === 0);

  // 2) Kort dra (under terskel) → spretter tilbake til Hjem.
  await friskHjem();
  await dra(page, 40, 110); // dx=70 < terskel
  await page.waitForTimeout(700);
  sjekk('Kort dra spretter tilbake (blir på Hjem)', (await hash()) === '#/hjem', await hash());
  sjekk('#app-transform nullstilt etter avbrutt dra', (await page.evaluate(() => document.getElementById('app').style.transform)) === '');

  // 3) Vertikal dra åpner IKKE feeden (scroll skal ikke kapres).
  await friskHjem();
  await page.evaluate(() => {
    const elm = document.querySelector('.hjemdash-scroll');
    const mk = (x, y) => new Touch({ identifier: 1, target: elm, clientX: x, clientY: y });
    const ev = (type, x, y) => { const t = mk(x, y); elm.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] })); };
    ev('touchstart', 200, 600); for (let i = 1; i <= 6; i++) ev('touchmove', 205, 600 - i * 40); ev('touchend', 205, 360);
  });
  await page.waitForTimeout(500);
  sjekk('Vertikal dra åpner IKKE feeden', (await hash()) === '#/hjem', await hash());

  // 4) Strip-sveip mellom bunnbar-sidene (feed ← Hjem ← Mat ← Bevegelse ← Ro ←
  //    Fellesskap). Sveip på et ikke-scrollende område (y=200).
  const sveip = async (rute, xs, x2) => {
    await page.goto(`${BASE}/#/${rute}`);
    await page.reload();
    await page.waitForSelector('.hjemtopp, .feedtopp', { timeout: 20000 });
    await page.waitForTimeout(700);
    await page.evaluate(({ xs, x2 }) => {
      const y = 200;
      const el = document.elementFromPoint(195, y) || document.getElementById('app');
      const mk = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      const ev = (type, x) => { const t = mk(x); el.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] })); };
      ev('touchstart', xs); for (let i = 1; i <= 8; i++) ev('touchmove', xs + (x2 - xs) * i / 8); ev('touchend', x2);
    }, { xs, x2 });
    await page.waitForTimeout(700);
  };
  await sveip('hjem', 350, 40); sjekk('Hjem → sveip venstre → Mat', (await hash()) === '#/kosthold', await hash());
  await sveip('trening', 350, 40); sjekk('Bevegelse → sveip venstre → Ro', (await hash()) === '#/ro', await hash());
  await sveip('trening', 40, 350); sjekk('Bevegelse → sveip høyre → Mat', (await hash()) === '#/kosthold', await hash());
  await sveip('sosialt', 40, 350); sjekk('Fellesskap → sveip høyre → Ro', (await hash()) === '#/ro', await hash());
  await sveip('feed', 350, 40); sjekk('Feed → sveip venstre → Hjem', (await hash()) === '#/hjem', await hash());

  // 5) Sveip på det horisontale filter-brikke-feltet skal SCROLLE brikkene, ikke
  //    navigere (ellers kapres karusellene). y≈430 treffer .bevfilter.
  await page.goto(`${BASE}/#/trening`);
  await page.reload();
  await page.waitForSelector('.bevfilter', { timeout: 20000 });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const y = 430; const el = document.elementFromPoint(195, y);
    const mk = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const ev = (type, x) => { const t = mk(x); el.dispatchEvent(new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] })); };
    ev('touchstart', 350); for (let i = 1; i <= 8; i++) ev('touchmove', 350 - 310 * i / 8); ev('touchend', 40);
  });
  await page.waitForTimeout(500);
  sjekk('Sveip på filter-brikkene navigerer IKKE (scroller karusellen)', (await hash()) === '#/trening', await hash());

  await ctx.close();
  await browser.close();
  server.close();
  if (feil.length) { console.log(`\n${feil.length} FEIL: ${feil.join(', ')}`); process.exit(1); }
  console.log('\nAlle feed-dra-sjekker passerte');
})().catch((e) => { console.log('KRÆSJ:', e); process.exit(1); });

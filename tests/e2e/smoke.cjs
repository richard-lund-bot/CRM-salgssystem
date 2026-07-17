// Lett E2E-røyksele (Fase 0). Fem reiser som må holde gjennom rebrand og
// taksonomi-endringer, så assertene keyer på data-*/roller/klasser — IKKE
// merkevaretekst (unntatt selve språk-testen, som må sjekke at tekst byttet).
//
// Kjøres med `npm run e2e`. Lokalt trengs Playwright på modul-stien:
//   NODE_PATH=/opt/node22/lib/node_modules npm run e2e
// I CI installeres `playwright` som devDependency (require finner den i
// node_modules). En liten innebygd statisk server gjør at vi slipper http-server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.E2E_PORT || 8199);
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
      res.writeHead(200, {
        'Content-Type': TYPER[path.extname(filsti)] || 'application/octet-stream',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache',
      });
      res.end(buf);
    });
  });
}

const feil = [];
function sjekk(navn, ok, ekstra = '') {
  console.log(`${ok ? '✓' : '✗'} ${navn}${ekstra ? ` — ${ekstra}` : ''}`);
  if (!ok) feil.push(navn);
}

const FANER = ['hjem', 'kosthold', 'trening', 'ro', 'sosialt'];

(async () => {
  const server = lagServer();
  await new Promise((r) => server.listen(PORT, r));
  // E2E_CHROMIUM lar miljøer med ferdiginstallert nettleser peke på binæren
  // (f.eks. /opt/pw-browsers/chromium) i stedet for å laste ned på nytt.
  const browser = await chromium.launch(
    process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  );
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => { console.log('SIDEFEIL:', e.message); feil.push('pageerror: ' + e.message); });

  // Seed en innlogget økt + ferdig profil (feedInteresser:[] så interesse-arket
  // ikke blokkerer), ellers sender medlemsgaten oss til innlogging.
  await page.addInitScript(() => {
    localStorage.setItem('trening.sesjon', JSON.stringify({ refresh_token: 'fake', access_token: 'fake', epost: 't@t.no' }));
    localStorage.setItem('trening.profil', JSON.stringify({ navn: 'Test', ukemaal: 3, varighetsklasse: 'standard', globalXp: 100, innstillinger: { lyd: false, haptikk: false, feedInteresser: [] } }));
    localStorage.setItem('trening.logg', '[]');
  });

  const hash = () => page.evaluate(() => location.hash);

  // --- 1) Boot: Hjem-dashbordet tegner (M53 — hjem er ikke lenger feeden) -----
  await page.goto(`${BASE}/#/hjem`);
  await page.waitForSelector('.hjemdash', { timeout: 20000 });
  sjekk('Appen booter og tegner #app', (await page.locator('#app > *').count()) > 0);
  sjekk('Hjem viser de fire pilar-nodene', (await page.locator('.pilarsti .pilarnode').count()) === 4);
  sjekk('Hjem viser i-takt-oppsummeringen', (await page.locator('.itakt').count()) > 0);
  sjekk('Hjem feller inn Utforsk (les etter pilar)', (await page.locator('.utforsk-pilarer').count()) > 0);
  sjekk('Hjem har feed-ikon oppe til venstre', (await page.locator('.hjemtopp__feed').count()) === 1);

  // --- 2) Feeden bor på #/feed og rendrer flere kort -------------------------
  await page.click('.hjemtopp__feed');
  await page.waitForSelector('.fkort', { timeout: 20000 });
  sjekk('Feed-ikonet åpner #/feed', (await hash()).startsWith('#/feed'));
  const antKort = await page.locator('.fkort').count();
  sjekk('Feeden rendrer flere kort', antKort >= 3, `${antKort} kort`);

  // --- 3) Service worker registrerer + precachen fylles ----------------------
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { klar: false, antall: 0, harApp: false };
    await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    const treff = await caches.match(location.origin + '/js/app.js');
    return { klar: true, antall: keys.length, harApp: !!treff };
  });
  sjekk('Service worker aktiv', sw.klar);
  sjekk('Minst én cache finnes', sw.antall >= 1, `${sw.antall} cache(r)`);
  sjekk('Skallet er precachet (js/app.js)', sw.harApp);

  // --- 4) Tab-navigasjon over alle FANER (data-rute, ikke etikett) ------------
  // Naviger i en rekkefølge der hvert trykk er en ANNEN fane (unngår re-tap-
  // reload), og bekreft rute + aktiv-markering.
  for (const rute of ['kosthold', 'trening', 'ro', 'sosialt', 'hjem']) {
    await page.click(`.tabbar__knapp[data-rute="${rute}"]`);
    await page.waitForTimeout(250);
    const h = await hash();
    const aktiv = await page.locator(`.tabbar__knapp[data-rute="${rute}"]`).evaluate((n) => n.classList.contains('tabbar__knapp--aktiv'));
    sjekk(`Fane «${rute}» navigerer + markeres aktiv`, h.startsWith(`#/${rute}`) && aktiv, h);
  }
  sjekk('Alle fanene finnes i baren', (await page.locator('.tabbar__knapp').count()) === FANER.length, `${FANER.length} faner`);

  // --- 4b) Fellesskap-pilaren: hjem-flate + krets-underside ------------------
  await page.click('.tabbar__knapp[data-rute="sosialt"]');
  await page.waitForSelector('.kontaktgrid', { timeout: 20000 });
  sjekk('Fellesskap viser logg-brikkene', (await page.locator('.kontaktchip').count()) === 4);
  sjekk('Fellesskap viser streak-stripa', (await page.locator('.ukestreak').count()) > 0);
  await page.goto(BASE + '/#/krets');
  await page.waitForSelector('.side, .kort, .tomkrets', { timeout: 20000 });
  sjekk('Din krets-siden åpner', (await hash()).startsWith('#/krets'));

  // --- 4c) Ro-pilaren: daglige ro-vaner + mikroøkter ------------------------
  await page.goto(BASE + '/#/ro');
  await page.waitForSelector('.rovanegrid', { timeout: 20000 });
  sjekk('Ro viser de fem ro-vanene', (await page.locator('.rovane').count()) === 5);
  sjekk('Ro viser mikroøktene', (await page.locator('.mikrokort').count()) === 3);

  // --- 4d) Mat-pilaren: hjem + oppskrifter + ukesplan + handleliste ----------
  await page.goto(BASE + '/#/kosthold');
  await page.waitForSelector('.matvaner', { timeout: 20000 });
  sjekk('Mat-hjem viser de fem matvanene', (await page.locator('.matvane').count()) === 5);
  sjekk('Mat-hjem viser hero-stripa (streak + matvalg)', (await page.locator('.mathero').count()) === 1);
  sjekk('Mat-hjem viser plan- og handlekort', (await page.locator('.matmini').count()) === 2);
  await page.goto(BASE + '/#/oppskrifter');
  await page.waitForSelector('.oppkort', { timeout: 20000 });
  sjekk('Oppskrifter viser kort og filtre', (await page.locator('.oppkort').count()) > 0 && (await page.locator('.oppfilter').count()) === 6);
  await page.goto(BASE + '/#/oppskrift?id=linsesalat-ovnsbakte');
  await page.waitForSelector('.oppdetalj', { timeout: 20000 });
  sjekk('Oppskrift-detalj viser steg og handlinger', (await page.locator('.oppsteg__rad').count()) === 4 && (await page.locator('.oppdetalj__handling').count()) === 2);
  await page.goto(BASE + '/#/ukesplan');
  await page.waitForSelector('.planrader', { timeout: 20000 });
  sjekk('Ukesplan viser tre måltidsrader', (await page.locator('.planrad').count()) === 3);
  await page.goto(BASE + '/#/handleliste');
  await page.waitForSelector('.handletopp', { timeout: 20000 });
  sjekk('Handleliste viser personvelger', (await page.locator('.handletopp__stepper').count()) === 1);

  // Tilbake til Hjem så språktesten under finner .hjemdash etter reload.
  await page.goto(BASE + '/#/hjem');
  await page.waitForSelector('.hjemdash', { timeout: 20000 });

  // --- 5) Språkbytte nb↔en (den ene testen som SKAL sjekke tekst) -------------
  // Sett den persistente trening.sprak-nøkkelen (samme som settSprak bruker) —
  // init-scriptet re-seeder profilen ved reload, men rører ikke denne nøkkelen.
  await page.evaluate(() => localStorage.setItem('trening.sprak', 'en'));
  await page.reload({ waitUntil: 'load' }); // ekte re-boot så språket leses på nytt
  await page.waitForSelector('.hjemdash', { timeout: 20000 });
  const langAttr = await page.evaluate(() => document.documentElement.lang);
  const bevegLabel = await page.getAttribute('.tabbar__knapp[data-rute="trening"]', 'aria-label');
  sjekk('Språkbytte setter <html lang="en">', langAttr === 'en', langAttr);
  sjekk('UI oversettes til engelsk (Bevegelse→Movement)', bevegLabel === 'Movement', String(bevegLabel));

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(feil.length ? `\n${feil.length} FEIL: ${feil.join(', ')}` : '\nAlle E2E-røyksjekker passerte');
  process.exit(feil.length ? 1 : 0);
})().catch((e) => { console.error('KRÆSJ:', e); process.exit(2); });

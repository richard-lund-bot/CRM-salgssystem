// E2E-røyktest: starter en statisk server, åpner alle moduler for alle
// ansatte og feiler ved konsollfeil. Valgfritt: SKJERMBILDER=<mappe>.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROT = path.resolve(__dirname, '..');
const TYPER = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const fil = path.join(ROT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!fil.startsWith(ROT) || !fs.existsSync(fil)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPER[path.extname(fil)] ?? 'application/octet-stream' });
  fs.createReadStream(fil).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const nettleser = await chromium.launch();
  const feil = [];
  const bildeMappe = process.env.SKJERMBILDER;
  for (const bredde of [1366, 390]) {
    const side = await nettleser.newPage({ viewport: { width: bredde, height: 900 } });
    side.on('pageerror', (e) => feil.push(`${bredde}px: ${e.message}`));
    side.on('console', (m) => m.type() === 'error' && feil.push(`${bredde}px: ${m.text()}`));
    await side.goto(base);
    const ansatte = await side.$$eval('#persona option', (o) => o.map((x) => x.value));
    for (const id of ansatte) {
      await side.selectOption('#persona', id);
      const moduler = await side.$$eval('.meny__lenke[href^="#"]', (a) => a.map((x) => x.getAttribute('href')));
      for (const m of moduler) {
        await side.goto(base + m);
        await side.waitForSelector('.innhold');
        const bredere = await side.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (bredere) feil.push(`${bredde}px ${id} ${m}: horisontal scroll`);
        if (bildeMappe && (id === 'ida' || id === 'tor')) await side.screenshot({ path: path.join(bildeMappe, `${bredde}-${id}-${m.slice(1)}.png`), fullPage: true });
      }
    }
    // Interaksjon: Darios stemme spilles av fra innspilte klipp.
    await side.selectOption('#persona', 'ida');
    await side.goto(base + '#brief');
    const klipp = side.waitForResponse((r) => /assets\/stemme\/[0-9a-f]+\.mp3$/.test(r.url()) && r.ok(), { timeout: 10000 });
    await side.click('#spill');
    await klipp;
    await side.waitForFunction(() => document.getElementById('teksting').textContent.startsWith('Hei, Ida!'));
    await side.click('#spill');
    // Interaksjon: tilbud fra prioritet, og tilgangstabell som leder.
    await side.goto(base + '#tilbud?signal=e1');
    await side.click('#tilbudsskjema button');
    await side.waitForSelector('#tilbudsutkast table');
    await side.selectOption('#persona', 'tor');
    await side.goto(base + '#tilgang');
    await side.click('.niva[data-p="ida"][data-m="team"]');
    const etter = await side.textContent('.niva[data-p="ida"][data-m="team"]');
    if (!etter.startsWith('se')) feil.push(`tilgangscelle ble «${etter}», ventet «se»`);
    await side.goto(base + 'drofting.html');
    await side.goto(base + '#drofting');
    await side.waitForSelector('.innhold .dok');
    if (bildeMappe) await side.screenshot({ path: path.join(bildeMappe, `${bredde}-drofting.png`), fullPage: true });
    await side.close();
  }
  await nettleser.close();
  server.close();
  if (feil.length) { console.error(feil.join('\n')); process.exit(1); }
  console.log('E2E OK');
})();

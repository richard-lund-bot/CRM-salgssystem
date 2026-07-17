// Genererer app-ikonene (PNG) fra Takt-kjernetegnet.
//   icon-192/512.png : terrakotta-blyant-kjernetegnet på skogsgrønn (avrundet).
//   icon-maskable.png: samme, men full flate + innhold nedskalert til safe-zone.
// Kilden er design/ikoner/takt_kjernetegn_blyant_transparent.svg (håndtegnet).
// SVG-faviconet (icons/takt-ikon.svg) er en egen, ren cream-variant for skarphet
// på små størrelser — den lages ikke her.
// Kjør: NODE_PATH=/opt/node22/lib/node_modules node scripts/bygg-ikoner.cjs
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const ROT = path.resolve(__dirname, '..');
const GRONN = '#2C4133';
const MERKE = fs.readFileSync(path.join(ROT, 'design/ikoner/takt_kjernetegn_blyant_transparent.svg'), 'utf8');

async function render(size, out, { rx = 0, skala = 1 } = {}) {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const runding = rx ? `border-radius:${rx}px;` : '';
  await pg.setContent(`<!doctype html><meta charset=utf-8><style>
    *{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}
    #w{width:${size}px;height:${size}px;background:${GRONN};${runding}display:grid;place-items:center;overflow:hidden}
    svg{width:${Math.round(size * skala)}px;height:${Math.round(size * skala)}px;display:block}
  </style><div id=w>${MERKE}</div>`);
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: path.join(ROT, out), clip: { x: 0, y: 0, width: size, height: size } });
  await br.close();
  console.log('skrev', out, `${size}px`);
}

(async () => {
  await render(192, 'icons/icon-192.png', { rx: 44 });
  await render(512, 'icons/icon-512.png', { rx: 116 });
  // Maskable: full flate (OS runder selv), merket nedskalert til safe-zone.
  await render(512, 'icons/icon-maskable.png', { rx: 0, skala: 0.84 });
})();

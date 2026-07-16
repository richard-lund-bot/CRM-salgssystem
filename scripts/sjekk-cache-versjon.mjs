// Påminnelse: statiske filer (CSS/JS/data/ikoner/index.html/manifest) caches
// cache-first av service workeren. Endrer du dem uten å bumpe CACHE_VERSION i
// sw.js, får eksisterende installasjoner fortsatt den gamle versjonen.
//
// Dette skriptet sammenligner det som er staget mot HEAD og feiler dersom
// skallfiler er endret uten at CACHE_VERSION også er bumpet. Kjøres av
// pre-commit-hooken (installeres via `npm run installer-hooks` / `npm install`),
// eller manuelt med `npm run sjekk-versjon`.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const KJØR = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Invariant: CACHE_VERSION i sw.js skal være APP_NAME (små bokstaver) + '-' +
// APP_VERSION fra js/config.js. Dette binder de to versjonsstrengene sammen og
// fanger nettopp feilen der CACHE_VERSION fryser mens APP_VERSION drar videre
// (eller motsatt). Kjøres alltid, uavhengig av hva som er staget.
function sjekkVersjonsKobling() {
  const config = readFileSync(join(ROT, 'js/config.js'), 'utf8');
  const sw = readFileSync(join(ROT, 'sw.js'), 'utf8');
  const appNavn = config.match(/APP_NAME\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const appVer = config.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const cacheVer = sw.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!appNavn || !appVer || !cacheVer) return; // kan ikke sjekke — ikke blokker
  const ventet = `${appNavn.toLowerCase()}-${appVer}`;
  if (cacheVer !== ventet) {
    console.error('\n\x1b[31m✗ CACHE_VERSION og APP_VERSION er ute av takt.\x1b[0m');
    console.error(`  sw.js CACHE_VERSION = "\x1b[33m${cacheVer}\x1b[0m"`);
    console.error(`  forventet           = "\x1b[36m${ventet}\x1b[0m"  (APP_NAME.toLowerCase() + '-' + APP_VERSION)`);
    console.error('  Sett begge til samme versjon i sw.js og js/config.js.\n');
    process.exit(1);
  }
}

sjekkVersjonsKobling();

// Filer som sendes til brukeren og caches av service workeren.
const ERSKALL = (fil) =>
  /^(css|js|data|icons)\//.test(fil) ||
  fil === 'index.html' ||
  fil === 'manifest.webmanifest' ||
  fil === 'sw.js';

function hentCacheVersjon(innhold) {
  const m = innhold.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

// Ingen HEAD (aller første commit)? Ingenting å sammenligne mot.
try {
  KJØR('git rev-parse --verify HEAD');
} catch {
  process.exit(0);
}

const stagede = KJØR('git diff --cached --name-only').split('\n').filter(Boolean);
const skallEndret = stagede.filter(ERSKALL);

if (skallEndret.length === 0) process.exit(0); // ingen skallfiler rørt

// CACHE_VERSION før (HEAD) vs. nå (staget).
let førInnhold;
try {
  førInnhold = KJØR('git show HEAD:sw.js');
} catch {
  process.exit(0); // sw.js fantes ikke i HEAD
}
const nåInnhold = KJØR('git show :sw.js'); // staget versjon (faller tilbake til HEAD hvis urørt)

const før = hentCacheVersjon(førInnhold);
const nå = hentCacheVersjon(nåInnhold);

if (før && nå && før === nå) {
  console.error('\n\x1b[31m✗ CACHE_VERSION er ikke bumpet.\x1b[0m');
  console.error('  Du har endret skallfiler som caches av service workeren:');
  for (const f of skallEndret) console.error(`    • ${f}`);
  console.error(`\n  CACHE_VERSION står fortsatt på "\x1b[33m${nå}\x1b[0m" i sw.js.`);
  console.error('  Uten et bump får eksisterende brukere den gamle versjonen.');
  console.error('\n  Bump \x1b[36mCACHE_VERSION\x1b[0m i sw.js (og gjerne APP_VERSION i js/config.js),');
  console.error('  eller hopp over sjekken med \x1b[36mgit commit --no-verify\x1b[0m om du er sikker.\n');
  process.exit(1);
}

process.exit(0);

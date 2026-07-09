// Påminnelse: statiske filer (CSS/JS/data/ikoner/index.html/manifest) caches
// cache-first av service workeren. Endrer du dem uten å bumpe CACHE_VERSION i
// sw.js, får eksisterende installasjoner fortsatt den gamle versjonen.
//
// Dette skriptet sammenligner det som er staget mot HEAD og feiler dersom
// skallfiler er endret uten at CACHE_VERSION også er bumpet. Kjøres av
// pre-commit-hooken (installeres via `npm run installer-hooks` / `npm install`),
// eller manuelt med `npm run sjekk-versjon`.
import { execSync } from 'node:child_process';

const KJØR = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

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

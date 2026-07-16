// Verifiserer at service-worker-precachen (SKALL + EN_DATA i sw.js) er komplett.
//
// Den største offline-fellen er å legge til en ny JS-modul (eller CSS/HTML/ikon/
// engelsk datafil) og glemme å føre den opp i sw.js — da faller fila stille ut
// av offline-cachen. Dette skriptet globber disken og feiler hvis:
//   (a) en fil som MÅ precaches mangler i SKALL/EN_DATA, eller
//   (b) en oppført cache-entry ikke finnes på disk (brutt addAll → hele
//       installasjonen feiler).
//
// MÅ precaches: js/*.js, css/*.css, alle *.html på toppnivå, manifest,
// icons/** og data/*.en.json. Bevisst IKKE påkrevd (runtime-caches ved behov):
// bilder/ (øvelsesbilder), data/parts/ (kildefragmenter) og øvrige data/*.json
// som ikke er lastet inn i skallet. Kjør: `npm run sjekk-skall`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Hent et string-array (SKALL/EN_DATA) fra sw.js som en liste med stier.
function hentListe(kilde, navn) {
  const m = kilde.match(new RegExp(`const ${navn}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

// Rekursiv filliste (relativt til ROT) for en underkatalog.
function* filer(underkatalog) {
  for (const e of readdirSync(join(ROT, underkatalog), { withFileTypes: true })) {
    const rel = `${underkatalog}/${e.name}`;
    if (e.isDirectory()) yield* filer(rel);
    else yield rel;
  }
}

const sw = readFileSync(join(ROT, 'sw.js'), 'utf8');
const oppført = [...hentListe(sw, 'SKALL'), ...hentListe(sw, 'EN_DATA')];
// Normaliser bort './'-prefikset; './' (virtuell navigasjons-entry) → ''.
const cachet = new Set(oppført.map((p) => p.replace(/^\.\//, '')));

// Filer som MÅ ligge i precachen.
const måCaches = [];
for (const f of filer('js')) if (f.endsWith('.js')) måCaches.push(f);
for (const f of filer('css')) if (f.endsWith('.css')) måCaches.push(f);
for (const f of filer('icons')) måCaches.push(f);
for (const f of filer('data')) if (f.endsWith('.en.json')) måCaches.push(f);
for (const e of readdirSync(ROT, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.html')) måCaches.push(e.name);
}
måCaches.push('manifest.webmanifest');

const mangler = måCaches.filter((f) => !cachet.has(f)).sort();
// Oppførte entries som ikke finnes på disk (utenom den virtuelle './').
const døde = [...cachet].filter((p) => p !== '' && !existsSync(join(ROT, p))).sort();

if (mangler.length === 0 && døde.length === 0) {
  console.log(`✓ SKALL komplett — ${cachet.size} precache-entries, alle finnes på disk.`);
  process.exit(0);
}

if (mangler.length) {
  console.error('\n\x1b[31m✗ Filer på disk mangler i sw.js-precachen (SKALL/EN_DATA):\x1b[0m');
  for (const f of mangler) console.error(`    • ${f}`);
  console.error('  Legg dem til i SKALL (eller EN_DATA for .en.json) og bump CACHE_VERSION.');
}
if (døde.length) {
  console.error('\n\x1b[31m✗ Oppførte cache-entries finnes ikke på disk (bryter addAll):\x1b[0m');
  for (const f of døde) console.error(`    • ${f}`);
  console.error('  Fjern dem fra sw.js (eller gjenopprett fila).');
}
console.error('');
process.exit(1);

// Røyktest for øvelsessidene (M16): hver øvelse og sekvensposisjon i
// øktbiblioteket (data/okter.json) skal treffe en oppføring i
// data/ovelsesinfo.json, og oppføringene skal være komplette.
// Normaliseringen speiler js/ovelse.js (grovNokkel/finNokkel) — endres den
// der, må den endres her.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const les = (p) => JSON.parse(readFileSync(join(rot, 'data', p), 'utf8'));

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const grov = (n) => String(n).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const fin = (n) => {
  let s = grov(n).replace(/\(.*?\)/g, '');
  s = s.split(',')[0].split(':')[0].split('·')[0];
  s = s.replace(/[^a-z0-9æøå\- ]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
};

const info = les('ovelsesinfo.json');
const okter = les('okter.json');

// --- Oppføringene er komplette og navnene unike ---
const navnsett = new Set();
let dubletter = 0;
for (const e of info) {
  for (const n of [e.navn, ...(e.alias || [])]) {
    if (navnsett.has(n)) dubletter++;
    navnsett.add(n);
  }
}
sjekk(dubletter === 0, 'ingen dupliserte navn/alias');
sjekk(info.every((e) => e.navn && e.kort && e.steg?.length >= 2), 'alle oppføringer har navn, kort og minst 2 steg');
sjekk(info.every((e) => (e.kort || '').length <= 140), 'kort-tekstene er korte nok for én-to linjer');

// --- Oppslaget: bygg samme indeks som js/ovelse.js ---
const opp = new Map();
for (const e of info) {
  for (const n of [e.navn, ...(e.alias || [])]) {
    opp.set(grov(n), e);
    opp.set(fin(n), e);
  }
}
const finnes = (navn) => opp.has(grov(navn)) || opp.has(fin(navn));

// --- Full dekning: hver øvelse i hver økt resolverer ---
const mangler = new Set();
let antall = 0;
for (const o of okter) {
  for (const b of o.blokker) {
    for (const ov of b.ovelser || []) {
      const navnene = b.kind === 'sekvens' ? (ov.posisjoner || []) : [ov.navn];
      for (const navn of navnene) {
        antall++;
        if (!finnes(navn)) mangler.add(navn);
      }
    }
  }
}
sjekk(mangler.size === 0, `alle ${antall} øvelsesreferanser i øktene har innhold${mangler.size ? ` — mangler: ${[...mangler].join(' | ')}` : ''}`);

// --- Varianter med suffiks treffer riktig oppføring ---
sjekk(opp.get(fin('Katt-ku, myk og langsom'))?.navn === 'Katt–ku', 'komma-suffiks normaliseres');
sjekk(opp.get(grov('Lett tilvenningssett: rumensk markløft'))?.navn === 'Rumensk markløft med manualer', 'alias med kolon slår opp riktig');
sjekk(opp.get(fin('Knebøy · sett 2/3'))?.navn === 'Knebøy', 'timerfase-suffiks normaliseres');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log(`\n✓ Øvelsesinfoen er grønn (${info.length} oppføringer, full dekning).`);

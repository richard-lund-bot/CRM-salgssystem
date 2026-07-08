// Headless test av belønningsmotoren (js/belonninger.js).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  nivaKostnad, nivaFraTotalXp, belonningFor, belonningerTil, belonningsOvelser,
  lasteTemaer, lasteAvatarer, tittelFor, nesteBelonning,
} from '../js/belonninger.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bib = { exercises: JSON.parse(readFileSync(join(rot, 'data', 'exercises.json'), 'utf8')) };

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

// --- Kurve: hyppig og uendelig ---
sjekk(nivaFraTotalXp(0).niva === 1, 'nivå 1 ved 0 XP');
sjekk(nivaFraTotalXp(30).niva === 1 && nivaFraTotalXp(30).pct === 50, 'progresjon innen nivå 1 (30/60 = 50%)');
sjekk(nivaFraTotalXp(nivaKostnad(1)).niva === 2, `ett nivå opp etter ${nivaKostnad(1)} XP`);
// Tidlig hyppighet: en typisk økt (~120 XP) skal gi minst ett nivå.
sjekk(nivaFraTotalXp(120).niva >= 2, `~1 økt (120 XP) → nivå ${nivaFraTotalXp(120).niva}`);
// Uendelig / monotont voksende
sjekk(nivaFraTotalXp(1e6).niva > nivaFraTotalXp(1e5).niva, `uten tak: 1e6 XP → nivå ${nivaFraTotalXp(1e6).niva}`);
// Ingen hopp: hvert nivå koster mer enn forrige, men aldri eksplosivt
sjekk(nivaKostnad(2) > nivaKostnad(1) && nivaKostnad(100) < 5000, `kostnad vokser lineært (n100=${nivaKostnad(100)})`);

// --- Hver level gir en belønning ---
let mangler = 0;
for (let n = 2; n <= 120; n++) { const b = belonningFor(n, bib); if (!b || !b.type || b.type === 'start') mangler++; }
sjekk(mangler === 0, `hver level 2–120 gir en belønning (mangler ${mangler})`);

// Milepæler treffer riktig
sjekk(belonningFor(3, bib).type === 'tema' && belonningFor(3, bib).id === 'midnatt', 'nivå 3 = tema Midnatt');
sjekk(belonningFor(5, bib).type === 'avatar', 'nivå 5 = avatar');
sjekk(belonningFor(4, bib).type === 'tittel', 'nivå 4 = tittel');

// Øvelses-reveals dominerer og er ekte øvelser
const til50 = belonningerTil(50, bib);
const ovelser = til50.filter((b) => b.type === 'ovelse');
const ids = new Set(bib.exercises.map((e) => e.id));
sjekk(ovelser.length > 20, `mange øvelses-reveals til nivå 50 (${ovelser.length})`);
sjekk(ovelser.every((b) => ids.has(b.id)), 'alle øvelses-reveals er ekte øvelser');
sjekk(belonningsOvelser(50, bib).size === new Set(ovelser.map((o) => o.id)).size, 'opplåsingssett matcher reveals');

// Reveals er lette først (deterministisk nivå-sortering)
const førsteReveal = til50.find((b) => b.type === 'ovelse');
sjekk(bib.exercises.find((e) => e.id === førsteReveal.id).niva <= 2, 'første øvelses-reveal er lavt nivå');

// --- Kataloger ---
sjekk(lasteTemaer(1, bib).has('standard') && !lasteTemaer(1, bib).has('midnatt'), 'nivå 1: bare standard-tema');
sjekk(lasteTemaer(3, bib).has('midnatt'), 'nivå 3: Midnatt låst opp');
sjekk(lasteAvatarer(1, bib).size === 2, 'nivå 1: 2 gratis avatarer');
sjekk(lasteAvatarer(5, bib).size > 2, 'nivå 5: flere avatarer');
sjekk(tittelFor(1) === 'Nybegynner' && tittelFor(9) === 'Sterk' && tittelFor(999) === 'Udødelig', 'titler etter nivåtrinn');
sjekk(!!nesteBelonning(2, bib).type, 'neste belønning finnes');

console.log(feil ? `\n${feil} FEIL` : '\n✓ Belønningsmotoren er grønn.');
process.exit(feil ? 1 : 0);

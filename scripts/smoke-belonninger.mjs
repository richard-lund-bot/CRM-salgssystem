// Headless test av belønningsmotoren (js/belonninger.js) — M11: Mova-stigen
// med gjenstander (klær/tilbehør/miljøer), temaer, varme titler og
// øvelses-reveals. Ingen tiers, ingen aggressive titler.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  nivaKostnad, nivaFraTotalXp, belonningFor, belonningerTil, belonningsOvelser,
  lasteTemaer, tittelFor, nesteBelonning, GJENSTANDER, GJENSTAND_MAP,
  erUlastGjenstand, ulasteGjenstander, nyeGjenstander, laasTekst,
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

// Milepæler treffer riktig (Mova-stigen, jf. spec §10)
sjekk(belonningFor(2, bib).type === 'gjenstand' && belonningFor(2, bib).id === 'sko-trail', 'nivå 2 = Trail-joggesko');
sjekk(belonningFor(3, bib).type === 'gjenstand' && belonningFor(3, bib).id === 'jakke-skog', 'nivå 3 = Skogsjakke');
sjekk(belonningFor(4, bib).type === 'tittel', 'nivå 4 = tittel');
sjekk(belonningFor(5, bib).type === 'gjenstand' && belonningFor(5, bib).kategori === 'miljo', 'nivå 5 = miljø (Parken)');

// Øvelses-reveals fyller resten og er ekte øvelser
const til50 = belonningerTil(50, bib);
const ovelser = til50.filter((b) => b.type === 'ovelse');
const ids = new Set(bib.exercises.map((e) => e.id));
sjekk(ovelser.length > 15, `mange øvelses-reveals til nivå 50 (${ovelser.length})`);
sjekk(ovelser.every((b) => ids.has(b.id)), 'alle øvelses-reveals er ekte øvelser');
sjekk(belonningsOvelser(50, bib).size === new Set(ovelser.map((o) => o.id)).size, 'opplåsingssett matcher reveals');

// Reveals er lette først (deterministisk nivå-sortering)
const førsteReveal = til50.find((b) => b.type === 'ovelse');
sjekk(bib.exercises.find((e) => e.id === førsteReveal.id).niva <= 2, 'første øvelses-reveal er lavt nivå');

// --- Gjenstander: opplåsing per nivå, mønster og comeback ---
const pNy = { globalXp: 0, bevegelsesTeller: {} };
sjekk(erUlastGjenstand(GJENSTAND_MAP.get('t-teal'), pNy), 'startplagg er alltid åpne');
sjekk(!erUlastGjenstand(GJENSTAND_MAP.get('sko-trail'), pNy), 'nivågjenstand låst fra start');
const pNiva10 = { globalXp: 3000, bevegelsesTeller: {} };
sjekk(erUlastGjenstand(GJENSTAND_MAP.get('miljo-fjell'), pNiva10) === (nivaFraTotalXp(3000).niva >= 10), 'miljø følger nivå');
const pTurgåer = { globalXp: 0, bevegelsesTeller: { walk: 5 } };
sjekk(erUlastGjenstand(GJENSTAND_MAP.get('sokker-tur'), pTurgåer), '5 gåturer → Tursokker');
sjekk(erUlastGjenstand(GJENSTAND_MAP.get('caps-comeback'), { harComeback: true }), 'comeback → caps');
sjekk(nyeGjenstander(pNy, pTurgåer).some((g) => g.id === 'sokker-tur'), 'nyeGjenstander fanger diffen');
sjekk(ulasteGjenstander(pNy).size >= 6, 'et helt startantrekk er gratis');
sjekk(GJENSTANDER.every((g) => laasTekst(g.laas).length > 0), 'alle opplåsinger har lesbar tekst');

// --- Kataloger ---
sjekk(lasteTemaer(1, bib).has('standard') && !lasteTemaer(1, bib).has('nordlys'), 'nivå 1: bare gratis-temaer');
sjekk(lasteTemaer(15, bib).has('nordlys'), 'nivå 15: Nordlys låst opp');
// Varme titler — aldri aggressive (spec §10: unngå Beast/Elite/…)
sjekk(tittelFor(1) === 'Nybegynner' && tittelFor(12) === 'Hverdagsmover' && tittelFor(999) === 'Move for Life', 'titler etter nivåtrinn');
for (let n = 1; n <= 200; n++) {
  const t = tittelFor(n);
  if (/elite|beast|udødelig|destroyer|warrior/i.test(t)) { sjekk(false, `aggressiv tittel «${t}» på nivå ${n}`); break; }
}
sjekk(!!nesteBelonning(2, bib).type, 'neste belønning finnes');

console.log(feil ? `\n${feil} FEIL` : '\n✓ Belønningsmotoren er grønn.');
process.exit(feil ? 1 : 0);

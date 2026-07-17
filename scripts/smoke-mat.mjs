// Headless røyktest av Mat-modellen (js/mat.js): oppskrifter, ukesplan og den
// avledede handlelista. Bekrefter at planen og handlelista henger sammen —
// måltider i planen mater handlelista, som skaleres til antall personer og
// grupperes per varekategori.
import { readFileSync } from 'node:fs';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
// hentSprakJson('oppskrifter') → data/oppskrifter.json fra disk (norsk basefil).
globalThis.fetch = async (url) => {
  const rel = String(url).replace(/^.*?(data\/[^?]*)$/, '$1');
  const buf = readFileSync(new URL(`../${rel}`, import.meta.url));
  return { ok: true, status: 200, json: async () => JSON.parse(buf.toString()) };
};

const m = await import('../js/mat.js');

let feil = 0;
const sjekk = (ok, t) => { if (!ok) { console.error('✗', t); feil++; } else console.log('✓', t); };

// --- Oppskrifter lastes ---
const alle = await m.lastOppskrifter();
sjekk(alle.length === 9, 'ni oppskrifter lastes');
sjekk(m.alleOppskrifter().length === 9, 'alleOppskrifter caches etter last');
const lin = m.oppskriftMedId('linsesalat-ovnsbakte');
sjekk(!!lin && lin.dressing?.length === 3, 'oppskriftMedId finner rett rett (med dressing)');
sjekk(m.oppskriftIngredienser(lin).length === lin.ingredienser.length + lin.dressing.length, 'ingredienser = hoved + dressing');

// --- Tags, filtre, dagsanbefaling ---
sjekk(m.oppskriftTags(m.oppskriftMedId('ovnsbakt-laks-byggryn')).some((t) => t.navn === 'Omega-3'), 'tags mapper til visningsnavn');
sjekk(m.filtrerOppskrifter('', ['rask']).every((o) => o.tidMin <= 20), 'filter «20 min» gir bare raske retter');
sjekk(m.filtrerOppskrifter('laks', []).length === 1, 'fritekstsøk «laks» treffer én');
sjekk(!!m.dagensOppskrift(), 'dagens oppskrift finnes');

// --- Ukesplan ---
const ts = Date.parse('2026-07-15T12:00:00'); // en onsdag
const uke = m.ukeDatoer(ts);
sjekk(uke.length === 7 && uke[0] < uke[6], 'ukeDatoer gir man–søn');
const ons = uke[2];
m.settMaaltid(ons, 'middag', 'bonnegryte-tomat');
m.settMaaltid(ons, 'lunsj', 'kikertsalat-sitron-feta');
sjekk(m.maaltidFor(ons).middag === 'bonnegryte-tomat', 'settMaaltid lagrer middag');
let ps = m.planStatus(ts);
sjekk(ps.antall === 2 && ps.perType.middag === 1 && ps.dager === 1, 'planStatus teller måltider + dager');
m.settMaaltid(ons, 'middag', null);
sjekk(m.maaltidFor(ons).middag === undefined, 'settMaaltid(null) fjerner måltidet');

// --- Handleliste bygges av planen + skaleres ---
m.settMaaltid(ons, 'middag', 'bonnegryte-tomat'); // 4 porsjoner
m.settPersoner(2);
const kilder = m.handlelisteKilder(ts);
sjekk(kilder.includes('bonnegryte-tomat') && kilder.includes('kikertsalat-sitron-feta'), 'handlelisteKilder = planens måltider');
let b = m.byggHandleliste(ts);
sjekk(b.grupper.length > 0 && b.totalVarer > 0, 'handleliste har grupper og varer');
sjekk(b.grupper.every((g) => m.VARE_KATEGORIER.some((k) => k.id === g.id)), 'gruppene følger varekategoriene');
// Bønnegryta (4 porsjoner) har 2 boks tomat → for 2 personer skaleres til 1 boks.
const tomat = b.grupper.flatMap((g) => g.varer).find((v) => v.navn.startsWith('Hermetiske tomater'));
sjekk(tomat && tomat.mengde === 1, 'mengde skaleres til antall personer (2 boks→1 for 2 pers.)');
m.settPersoner(4);
const tomat4 = m.byggHandleliste(ts).grupper.flatMap((g) => g.varer).find((v) => v.navn.startsWith('Hermetiske tomater'));
sjekk(tomat4 && tomat4.mengde === 2, 'mengde dobles for 4 personer (tilbake til 2 boks)');

// --- Ekstra oppskrift + egne varer + avkryssing ---
m.leggOppskriftIHandle('havregrot-baer');
sjekk(m.handlelisteKilder(ts).includes('havregrot-baer'), 'ekstra oppskrift legges til kildene');
m.leggEgenVare({ navn: 'Kaffe', kategori: 'annet' });
b = m.byggHandleliste(ts);
const kaffe = b.grupper.flatMap((g) => g.varer).find((v) => v.navn === 'Kaffe');
sjekk(!!kaffe, 'egen vare dukker opp i lista');
m.veksleAvkrysset(kaffe.key);
sjekk(m.byggHandleliste(ts).grupper.flatMap((g) => g.varer).find((v) => v.key === kaffe.key).avkrysset, 'veksleAvkrysset huker av varen');
m.fjernOppskriftFraHandle('havregrot-baer');
sjekk(!m.handlelisteKilder(ts).includes('havregrot-baer'), 'fjernOppskriftFraHandle fjerner ekstra');

// --- Autofyll fyller hele uka ---
m.autofyllUke(ts);
const full = m.planStatus(ts);
sjekk(full.antall === 21 && full.dager === 7, 'autofyllUke fyller alle 21 måltider (7 dager × 3)');

// --- Deletekst ---
sjekk(m.handlelisteTekst(ts).startsWith('Handleliste'), 'handlelisteTekst er delbar tekst');

// --- Favoritter ---
sjekk(!m.erFavoritt('bonnegryte-tomat'), 'ingen favoritt ved start');
sjekk(m.veksleFavoritt('bonnegryte-tomat') && m.erFavoritt('bonnegryte-tomat'), 'veksleFavoritt lagrer bokmerke');
sjekk(!m.veksleFavoritt('bonnegryte-tomat'), 'ny veksling fjerner bokmerket');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Alt grønt — Mat-modellen (oppskrifter → ukesplan → handleliste henger sammen).');

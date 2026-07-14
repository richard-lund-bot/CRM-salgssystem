// Headless røyktest av feiringslagets DATA-grunnlag (js/feiring.js er DOM-only
// og testes ikke her): streak-økning via beregnStreak (js/bevegelse.js) og
// opplåsnings-diffen (js/opplasing.js). Deterministisk med fast ankerdato —
// ingen Date.now()/Math.random() i selve logikken.

// Stub localStorage før import (opplasing → store leser trening.logg herfra).
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

const { beregnStreak } = await import('../js/bevegelse.js');
const { settBib, settOkterKilde, laasteOktIder, nyeOpplaste, oktLast } = await import('../js/opplasing.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const DAG = 86400000;
const anker = new Date(2026, 5, 25, 12, 0, 0).getTime(); // fast torsdag kl. 12 lokal
const dagISO = (n) => new Date(anker - n * DAG).toISOString();
const okt = (n) => ({ dato: dagISO(n), varighetMin: 20, xp: 20 });

// --- beregnStreak: grunntilfeller ---
sjekk(beregnStreak([], anker) === 0, 'tom logg → streak 0');
sjekk(beregnStreak([okt(0)], anker) === 1, 'økt i dag → streak 1');
sjekk(beregnStreak([okt(0), okt(1), okt(2)], anker) === 3, 'tre dager på rad → 3');
sjekk(beregnStreak([okt(1), okt(2), okt(3)], anker) === 3, 'i går + 2 (ingen i dag ennå) → 3 (nådefrist)');
sjekk(beregnStreak([okt(2), okt(3)], anker) === 0, 'hull (ingen i går/i dag) → 0');
sjekk(beregnStreak([okt(0), okt(2), okt(3)], anker) === 1, 'i dag + eldre hull → 1');

// --- Streak-økning: dagens FØRSTE økt løfter tallet; senere økter samme dag gjør ikke ---
const før = [okt(1), okt(2)];            // streak 2 (forankret i går)
const etter = [okt(0), okt(1), okt(2)];  // streak 3 (i dag lagt til)
sjekk(beregnStreak(før, anker) === 2 && beregnStreak(etter, anker) === 3, 'dagens første økt: streak 2 → 3');
sjekk(beregnStreak(etter, anker) === beregnStreak([...etter, okt(0)], anker), 'andre økt samme dag øker ikke streaken');

// --- Opplåsnings-diff (opplasing.js) ---
const testOkt = { id: 'test-okt', navn: 'Testøkt', krever: ['Rolig gåing'], blokker: [] };
settOkterKilde(() => [testOkt]);
settBib({ ovelse: (node) => ({ navn: node === 'rolig-gaaing' ? 'Rolig gåing' : node }) });

_store.set('trening.logg', JSON.stringify([])); // ingenting lært ennå
const førSett = laasteOktIder();
sjekk(førSett.has('test-okt'), 'økt med ulært krav er låst');
sjekk(oktLast(testOkt).laast === true, 'oktLast: laast=true før læring');

// Lær teknikken (én laer-logg med node som kanoniseres likt kravet)
_store.set('trening.logg', JSON.stringify([{ kilde: 'laer', node: 'rolig-gaaing', dato: dagISO(0) }]));
sjekk(oktLast(testOkt).laast === false, 'oktLast: laast=false etter læring');

const nye = nyeOpplaste(førSett);
sjekk(nye.length === 1 && nye[0].id === 'test-okt', 'nyeOpplaste fanger den nettopp opplåste økta');
sjekk(nye[0].navn === 'Testøkt', 'nyeOpplaste tar med visningsnavnet');
sjekk(nyeOpplaste(new Set()).length === 0, 'tomt før-sett → ingen opplåsninger');
sjekk(laasteOktIder().size === 0, 'ingen låste økter igjen etter læring');

if (feil) { console.error(`\n${feil} feil i feiring-røyktesten`); process.exit(1); }
console.log('\nAlle feiring-røyktester passerte.');

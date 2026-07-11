// Røyktest for styrkelogg-algoritmene (M17): e1RM, volum, historikk,
// anbefaling og prognose. Shimmer localStorage så modulen kan kjøre i Node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const S = await import('../js/styrke.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };
const nær = (a, b, d = 0.5) => Math.abs(a - b) <= d;

// --- e1RM (Epley) ---
sjekk(nær(S.e1rm(100, 5), 116.7), 'e1RM: 100×5 ≈ 117');
sjekk(nær(S.e1rm(100, 10), 133.3), 'e1RM: 100×10 ≈ 133');
sjekk(S.e1rm(0, 10) === 0 && S.e1rm(50, 0) === 0, 'e1RM: null uten vekt/reps');

// --- volum (per side dobbelt) ---
sjekk(S.oktVolum([{ sett: [{ vekt: 20, reps: 10 }, { vekt: 20, reps: 8 }] }]) === 360, 'volum: 20×10 + 20×8 = 360');
sjekk(S.oktVolum([{ perSide: true, sett: [{ vekt: 10, reps: 10 }] }]) === 200, 'volum: per side teller dobbelt');

// --- loggføring + historikk ---
S.loggførStyrkeokt('Økt A', [
  { ovNavn: 'Knebøy', settNr: 1, vekt: 40, reps: 8 },
  { ovNavn: 'Knebøy', settNr: 2, vekt: 40, reps: 8 },
  { ovNavn: 'Benk', settNr: 1, vekt: 30, reps: 5 },
], '2026-06-01');
S.loggførStyrkeokt('Økt A', [
  { ovNavn: 'Knebøy', settNr: 1, vekt: 45, reps: 8 },
  { ovNavn: 'Knebøy', settNr: 2, vekt: 45, reps: 8 },
], '2026-06-08');
const h = S.ovelseØkter('Knebøy');
sjekk(h.length === 2, `historikk: 2 økter for Knebøy (${h.length})`);
sjekk(h[0].dato < h[1].dato, 'historikk: kronologisk sortert');
sjekk(h[1].toppVekt === 45, 'historikk: topp-vekt = 45 siste økt');
sjekk(S.harStyrkedata('Knebøy') && !S.harStyrkedata('Aldri'), 'harStyrkedata skiller på øvelse');

// --- anbefaling: traff alle reps → øk ---
const a1 = S.anbefaling('Knebøy', { reps: 8, sett: 3 });
sjekk(a1.vekt > 45, `anbefaling: øker etter fullt sett (${a1.vekt} > 45)`);
// bommet reps → deload
S.loggførStyrkeokt('Økt A', [{ ovNavn: 'Markløft', settNr: 1, vekt: 60, reps: 3 }], '2026-06-08');
const a2 = S.anbefaling('Markløft', { reps: 8 });
sjekk(a2.vekt < 60, `anbefaling: deload etter bom (${a2.vekt} < 60)`);
// ny øvelse → ingen tallverdi, men veiledning
const a3 = S.anbefaling('Splitt', { reps: 10 });
sjekk(a3.vekt === null && /første gang/i.test(a3.tekst), 'anbefaling: veiledning uten historikk');

// --- oppsummering + PR (mot eksisterende logg) ---
const opp = S.oppsummerOkt([
  { ovNavn: 'Knebøy', settNr: 1, vekt: 50, reps: 8 }, // e1RM ~63 > forrige ~57 → PR
  { ovNavn: 'Benk', settNr: 1, vekt: 30, reps: 5 },
]);
sjekk(opp.volum === 50 * 8 + 30 * 5, `oppsummering: volum ${opp.volum}`);
sjekk(opp.prs.some((p) => p.navn === 'Knebøy'), 'oppsummering: ny PR på Knebøy oppdaget');

// --- prognose: trenger ≥3 punkter, positiv trend ---
sjekk(S.prognose('Benk') === null, 'prognose: null under 3 økter');
S.loggførStyrkeokt('P', [{ ovNavn: 'Press', vekt: 20, reps: 8 }], '2026-05-01');
S.loggførStyrkeokt('P', [{ ovNavn: 'Press', vekt: 25, reps: 8 }], '2026-05-15');
S.loggførStyrkeokt('P', [{ ovNavn: 'Press', vekt: 30, reps: 8 }], '2026-05-29');
const pg = S.prognose('Press');
sjekk(pg && pg.perUke > 0 && pg.om4Uker > pg.naa, `prognose: stigende trend (+${pg?.perUke}/uke → ${pg?.om4Uker})`);

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Styrkelogg-algoritmene er grønne.');

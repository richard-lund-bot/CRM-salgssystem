// Headless røyktest av Ro-laget: ro-vaner (js/ro.js) + at ro-gnisten tennes
// av EN avkrysset ro-vane ELLER en fullført restitusjonsøkt (js/gnist.js).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { RO_VANER, veksleVane, sikreVane, roStatus, roStreak, lesRolog, isoDag } = await import('../js/ro.js');
const { dagsGnister, pilarDager, gnistStatus } = await import('../js/gnist.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };
const DAG = 86400000;

// --- Ro-vaner ---
sjekk(RO_VANER.length === 5, 'fem ro-vaner');
sjekk(roStreak() === 0, 'ingen ro-streak ved start');
const r = veksleVane('pust');
sjekk(r.aktiv && r.streak === 1 && roStreak() === 1, 'avkryssing tenner ro-streak');
sjekk(roStatus().iDagAntall === 1, 'roStatus teller dagens valg');
sjekk(veksleVane('pust').aktiv === false, 'ny veksling skrur av igjen');
sikreVane('pause');
sjekk(lesRolog().some((o) => o.vaner && o.vaner.pause), 'sikreVane setter vane på (idempotent)');

// --- Gnist: ro tent av vane ELLER recovery-økt ---
const dato = isoDag();
// (a) via ro-vane
const kA = { rolog: [{ dato, vaner: { pust: true } }] };
sjekk(dagsGnister(kA, dato).ro.naadd, 'ro-gnist tent av ro-vane');
// (b) via restitusjonsøkt (recovery), uten ro-vaner
const kB = { logg: [{ dato: new Date().toISOString(), bevegelse: 'recovery', varighetMin: 10 }] };
sjekk(dagsGnister(kB, dato).ro.naadd, 'ro-gnist tent av fullført restitusjonsøkt');
// (c) begge teller i verdi
const kC = { rolog: [{ dato, vaner: { pust: true, pause: true } }], logg: [{ dato: new Date().toISOString(), bevegelse: 'recovery', varighetMin: 8 }] };
sjekk(dagsGnister(kC, dato).ro.verdi === 3, 'ro-verdi summerer vaner + restitusjonsøkter (2+1)');
// (d) hverken → ikke tent
sjekk(!dagsGnister({}, dato).ro.naadd, 'ingen ro-signal → ikke tent');

// --- pilarDager ro: dager med enten vane eller recovery ---
const nå = Date.now();
const d1 = isoDag(nå - DAG);
const kilder = {
  rolog: [{ dato: isoDag(nå), vaner: { pust: true } }],
  logg: [{ dato: new Date(nå - DAG).toISOString(), bevegelse: 'recovery', varighetMin: 12 }],
};
const roDager = pilarDager(kilder, 'ro');
sjekk(roDager.has(isoDag(nå)) && roDager.has(d1), 'pilarDager ro fanger både vane-dag og økt-dag');
sjekk(gnistStatus(kilder, nå).pilarer.ro.streak === 2, 'ro-streak = 2 (vane i dag + økt i går)');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Alt grønt — Ro-laget (vaner + gnist via vane eller restitusjonsøkt).');

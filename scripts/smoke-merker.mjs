// Headless røyktest av merkemotoren (js/merker.js) — rene funksjoner,
// ingen nettleser. Sjekker: milepæler, dagstreak, ukerytme, «prøv noe nytt»,
// tid, blå flamme, døgnet-rundt, comeback, PR, kilder og nyeMerker-diffen.
// localStorage stubbes så matlogg/sosiallogg kan mates for blå dager.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const lager = new Map();
globalThis.localStorage = {
  getItem: (k) => (lager.has(k) ? lager.get(k) : null),
  setItem: (k, v) => lager.set(k, String(v)),
  removeItem: (k) => lager.delete(k),
};

const { beregnMerker, nyeMerker, MERKER, MERKE_KATEGORIER } = await import('../js/merker.js');

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const DAG = 86400000;
// Fast ankerdato (en torsdag, midt på dagen lokal tid) så testen er deterministisk.
const anker = new Date(2026, 5, 25, 12, 0, 0); // 25. juni 2026
const dag = (n, time = 12) => new Date(anker.getTime() - n * DAG + (time - 12) * 3600000).toISOString();
const okt = (n, ekstra = {}) => ({ dato: dag(n), varighetMin: 20, intensitet: 3, bevegelse: 'walk', ...ekstra });

const finn = (merker, id) => merker.find((m) => m.id === id);

// --- Definisjonene er komplette og ikonene finnes ---
const ikonKilde = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'ui.js'), 'utf8');
const ikonNavn = new Set([...ikonKilde.matchAll(/^ {2}(\w+): '</gm)].map((m) => m[1]));
const alleDef = MERKE_KATEGORIER.flatMap((k) => MERKER[k.id]);
const ider = new Set(alleDef.map((d) => d.id));
sjekk(ider.size === alleDef.length, `alle ${alleDef.length} merke-IDer er unike`);
sjekk(alleDef.every((d) => d.navn && d.tekst && d.farge), 'alle merker har navn, tekst og farge');
sjekk(alleDef.every((d) => ikonNavn.has(d.ikon)), 'alle merkeikoner finnes i ui.js');

// --- Tom logg: ingenting oppnådd, alt har fremdriftsdata ---
const tomt = beregnMerker({}, [], []);
sjekk(tomt.length === alleDef.length, 'beregnMerker dekker alle definisjoner');
sjekk(tomt.every((m) => !m.oppnadd), 'tom logg → ingen merker');
sjekk(tomt.every((m) => Number.isFinite(m.verdi) && m.maal >= 1), 'verdi/mål er tall');

// --- Første bevegelse ---
const en = beregnMerker({}, [okt(0)], []);
sjekk(finn(en, 'bev-1').oppnadd && finn(en, 'bev-1').dato === dag(0), 'første steg med dato');
sjekk(!finn(en, 'bev-10').oppnadd && finn(en, 'bev-10').verdi === 1, '10 bevegelser viser fremdrift 1/10');

// --- Dagstreak: 7 dager på rad ---
const uke = Array.from({ length: 7 }, (_, i) => okt(i));
const mStreak = beregnMerker({}, uke, []);
sjekk(finn(mStreak, 'streak-3').oppnadd && finn(mStreak, 'streak-7').oppnadd, '7 dager på rad gir 3- og 7-merket');
const hull = [okt(0), okt(1), okt(3), okt(4)]; // brudd på dag 2
sjekk(!finn(beregnMerker({}, hull, []), 'streak-3').oppnadd, 'hull i rekka teller ikke');

// --- Prøv noe nytt: distinkte bevegelsestyper ---
const typer = ['walk', 'run', 'yoga', 'strength'].map((b, i) => okt(i, { bevegelse: b }));
const mTyper = beregnMerker({}, typer, []);
sjekk(finn(mTyper, 'nytt-2').oppnadd && finn(mTyper, 'nytt-4').oppnadd, '4 typer gir Nysgjerrig + Utforsker');
sjekk(finn(mTyper, 'nytt-4').dato === dag(0), 'dato = da fjerde type ble prøvd');
sjekk(!finn(mTyper, 'nytt-7').oppnadd && finn(mTyper, 'nytt-7').verdi === 4, 'fremdrift mot 7 typer');
// Gamle generator-økter uten bevegelse-felt mappes via modalitet
const gammel = [okt(0, { bevegelse: undefined, modalitet: 'STY' }), okt(1)];
sjekk(finn(beregnMerker({}, gammel, []), 'nytt-2').oppnadd, 'gamle modalitets-økter teller som egne typer');

// --- Tid i bevegelse (kumulative minutter) ---
const tid = [okt(2, { varighetMin: 30 }), okt(1, { varighetMin: 40 })];
const mTid = beregnMerker({}, tid, []);
sjekk(finn(mTid, 'tid-1t').oppnadd && finn(mTid, 'tid-1t').dato === dag(1), 'første time med dato for kryssing');
sjekk(finn(mTid, 'tid-10t').verdi === 70, 'kumulative minutter i fremdrift');

// --- Blå flamme: dager der alle fire gnistene er tent ---
// To blå dager på rad: bevegelse (20 min) + ro (recovery) i loggen, mat (3
// valg) og sosialt (1 valg) i egne logger; dag 2 mangler ro → ikke blå.
const isoDagLokal = (n) => {
  const d = new Date(anker.getTime() - n * DAG);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const vaneDag = (n, antall) => ({
  dato: isoDagLokal(n),
  vaner: Object.fromEntries(Array.from({ length: antall }, (_, i) => [`v${i}`, true])),
});
lager.set('trening.matlogg', JSON.stringify([vaneDag(0, 3), vaneDag(1, 4), vaneDag(2, 5)]));
lager.set('trening.sosiallogg', JSON.stringify([vaneDag(0, 1), vaneDag(1, 1), vaneDag(2, 2)]));
const blaaLogg = [
  okt(0), okt(0, { bevegelse: 'recovery', varighetMin: 8 }),
  okt(1), okt(1, { bevegelse: 'recovery', varighetMin: 8 }),
  okt(2), // dag 2: ingen rolig økt → ikke blå
];
const mBlaa = beregnMerker({}, blaaLogg, []);
sjekk(finn(mBlaa, 'blaa-1').oppnadd, 'første blå dag (alle gnistene tent) gir merke');
sjekk(finn(mBlaa, 'blaa-3').verdi === 2, 'blå streak teller 2 på rad (dag 2 mangler ro)');
sjekk(!finn(mBlaa, 'blaa-3').oppnadd, 'to blå dager gir ikke tre-på-rad-merket');
lager.delete('trening.matlogg');
lager.delete('trening.sosiallogg');

// --- Store øyeblikk: lang økt, maks intensitet, PR ---
const store = [
  okt(3, { varighetMin: 95 }),
  okt(2, { intensitet: 5 }),
  okt(1, { resultater: [{ id: 'push-up', reps: 20 }] }),
];
const mStore = beregnMerker({}, store, []);
sjekk(finn(mStore, 'okt-45').oppnadd && finn(mStore, 'okt-90').oppnadd, '95 min gir begge langøkt-merkene');
sjekk(finn(mStore, 'maks').oppnadd, 'maks intensitet registreres');
sjekk(finn(mStore, 'pr-1').oppnadd && finn(mStore, 'pr-1').dato === dag(1), 'første resultat gir rekordmerke');
sjekk(finn(mStore, 'pr-5').verdi === 1, 'fremdrift mot 5 øvelser med resultat');

// --- Døgnet rundt ---
const dognet = [okt(3, {}, ), okt(2, { dato: dag(2, 6) }), okt(1, { dato: dag(1, 22) })];
const mDognet = beregnMerker({}, dognet, []);
sjekk(finn(mDognet, 'morgen').oppnadd, 'økt før 07 gir Morgenfugl');
sjekk(finn(mDognet, 'kveld').oppnadd, 'økt etter 21 gir Nattugle');
// Helg: lørdag 20. + søndag 21. juni 2026 (anker er torsdag 25.)
const helg = [okt(5), okt(4)];
sjekk(finn(beregnMerker({}, helg, []), 'helg').oppnadd, 'lørdag + søndag samme helg gir Helgekriger');
sjekk(!finn(mDognet, 'helg').oppnadd, 'hverdager gir ikke helgemerket');

// --- Ukerytme: to uker på rad med ukemål ---
const rytme = [];
for (const ukeStart of [3, 10]) { // to hele uker bakover fra anker-uka? nei: dagene 3-6 og 10-13
  for (let i = 0; i < 4; i++) rytme.push(okt(ukeStart + i));
}
// dag(3..6) = man–søn-vindu i anker-uka + forrige; juster: 4 aktive dager per ISO-uke
const mRytme = beregnMerker({ ukemaal: 4 }, rytme, []);
sjekk(finn(mRytme, 'uker-2').verdi >= 1, 'ukerytme telles');

// --- Comeback: 5+ dagers pause og så tilbake ---
const comeback = [okt(10), okt(1)];
sjekk(finn(beregnMerker({}, comeback, []), 'comeback').oppnadd, 'retur etter pause gir Comeback');
sjekk(!finn(beregnMerker({}, [okt(2), okt(0)], []), 'comeback').oppnadd, 'kort pause er ikke comeback');
sjekk(finn(beregnMerker({ harComeback: true }, [okt(0)], []), 'comeback').oppnadd, 'gammelt harComeback-flagg respekteres');

// --- Kilder og planer ---
const kilder = [okt(2, { kilde: 'strava' }), okt(1, { kilde: 'bibliotek' }), okt(0, { test: true })];
const planer = [{ status: 'gjort' }, { status: 'planlagt' }];
const mKilder = beregnMerker({}, kilder, planer);
sjekk(finn(mKilder, 'strava-1').oppnadd, 'Strava-import gir merke');
sjekk(finn(mKilder, 'bib-10').verdi === 1, 'bibliotekøkter telles');
sjekk(finn(mKilder, 'test-1').oppnadd, '«Test deg selv» gir merke');
sjekk(finn(mKilder, 'plan-1').oppnadd && !finn(mKilder, 'plan-10').oppnadd, 'gjennomført plan gir merke');

// --- nyeMerker: diffen mellom to tilstander ---
const før = beregnMerker({}, [], []);
const etter = beregnMerker({}, [okt(0)], []);
const nye = nyeMerker(før, etter);
sjekk(nye.some((m) => m.id === 'bev-1') && nye.every((m) => m.oppnadd), 'nyeMerker fanger ferske merker');
sjekk(nyeMerker(etter, etter).length === 0, 'ingen diff → ingen nye merker');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log(`\n✓ Alt grønt — merkemotoren (${alleDef.length} merker i ${MERKE_KATEGORIER.length} kategorier).`);

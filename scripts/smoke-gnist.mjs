// Headless røyktest av gnist-motoren (js/gnist.js) — rene funksjoner, ingen
// nettleser. Sjekker: dagstersklene per pilar, røde gnist-streaks med
// nådefrist, blå dager (alle gnistene tent) og den blå flammen (blue
// zone-streaken), pluss gnistStatus-sammenstillingen skjermene bruker.
import {
  TERSKLER, GNIST_PILARER, dagsGnister, pilarDager, blaaDager,
  streakFraDager, gnistStreak, blaaStreak, gnistStatus, isoDag,
} from '../js/gnist.js';

let feil = 0;
const sjekk = (ok, m) => { if (!ok) { console.error('✗', m); feil++; } else console.log('✓', m); };

const DAG = 86400000;
// Fast ankerdato (en torsdag, midt på dagen lokal tid) så testen er deterministisk.
const anker = new Date(2026, 5, 25, 12, 0, 0).getTime(); // 25. juni 2026
const dagIso = (n) => isoDag(anker - n * DAG);
const tsIso = (n) => new Date(anker - n * DAG).toISOString();

// Loggbyggere: bevegelses-rad, mat-/sosialdag med n vaner.
const okt = (n, ekstra = {}) => ({ dato: tsIso(n), varighetMin: 20, bevegelse: 'walk', ...ekstra });
const roOkt = (n) => okt(n, { bevegelse: 'recovery', varighetMin: 8 });
const vaneDag = (n, antall) => ({
  dato: dagIso(n),
  vaner: Object.fromEntries(Array.from({ length: antall }, (_, i) => [`v${i}`, true])),
});

// --- Definisjonene ---
sjekk(GNIST_PILARER.length === 4, 'fire pilarer bærer en rød gnist');
sjekk(GNIST_PILARER.every((p) => p.id in TERSKLER), 'alle pilarene har en terskel');

// --- Dagsterskler (dagsGnister) ---
const kilder1 = {
  logg: [okt(0, { varighetMin: 6 }), okt(0, { varighetMin: 5 })], // 11 min totalt
  matlogg: [vaneDag(0, 2)],
  sosiallogg: [],
};
const d1 = dagsGnister(kilder1, dagIso(0));
sjekk(d1.bevegelse.naadd && d1.bevegelse.verdi === 11, 'bevegelse: minutter summeres over dagen (11 ≥ 10)');
sjekk(!d1.mat.naadd && d1.mat.verdi === 2 && d1.mat.maal === 3, 'mat: 2 av 3 gode valg er ikke tent ennå');
sjekk(!d1.ro.naadd, 'ro: ingen rolig økt → ikke tent');
sjekk(!d1.sosialt.naadd, 'sosialt: ingenting → ikke tent');
sjekk(!d1.alle, 'ikke alle → ingen blå dag');

const kilder2 = {
  logg: [okt(0, { varighetMin: 15 }), roOkt(0)],
  matlogg: [vaneDag(0, 3)],
  sosiallogg: [vaneDag(0, 1)],
};
const d2 = dagsGnister(kilder2, dagIso(0));
sjekk(d2.bevegelse.naadd && d2.mat.naadd && d2.ro.naadd && d2.sosialt.naadd, 'alle tersklene kan tennes samme dag');
sjekk(d2.alle, 'alle gnistene tent → blå dag');
sjekk(dagsGnister({ logg: [okt(0, { varighetMin: 15, slettet: true })] }, dagIso(0)).bevegelse.verdi === 0,
  'soft-slettede rader teller ikke');

// --- Gamle REST-modalitetsøkter teller som ro ---
const gammelRo = { logg: [{ dato: tsIso(0), varighetMin: 10, modalitet: 'REST' }] };
sjekk(dagsGnister(gammelRo, dagIso(0)).ro.naadd, 'gammel REST-økt (modalitet) tenner ro-gnisten');

// --- pilarDager / blaaDager ---
const kilder3 = {
  logg: [okt(0, { varighetMin: 30 }), roOkt(0), okt(1, { varighetMin: 30 }), roOkt(1), okt(2, { varighetMin: 5 })],
  matlogg: [vaneDag(0, 4), vaneDag(1, 3), vaneDag(2, 5)],
  sosiallogg: [vaneDag(0, 1), vaneDag(1, 2)],
};
sjekk(pilarDager(kilder3, 'bevegelse').has(dagIso(0)) && !pilarDager(kilder3, 'bevegelse').has(dagIso(2)),
  'pilarDager: 5 min når ikke bevegelses-terskelen');
sjekk(pilarDager(kilder3, 'mat').size === 3, 'pilarDager: tre matdager over terskelen');
const blaa3 = blaaDager(kilder3);
sjekk(blaa3.has(dagIso(0)) && blaa3.has(dagIso(1)) && !blaa3.has(dagIso(2)),
  'blaaDager: kun dager der ALLE pilarene er tent');

// --- Streak med nådefrist ---
const tent = new Set([dagIso(1), dagIso(2), dagIso(3)]);
sjekk(streakFraDager(tent, anker) === 3, 'nådefrist: i går + 2 (ingen i dag ennå) → 3');
sjekk(streakFraDager(new Set([dagIso(0), dagIso(1)]), anker) === 2, 'tent i dag teller med');
sjekk(streakFraDager(new Set([dagIso(2), dagIso(3)]), anker) === 0, 'hull i går → streaken er 0');
sjekk(streakFraDager(new Set(), anker) === 0, 'tomt sett → 0');

// --- gnistStreak / blaaStreak over kildene ---
sjekk(gnistStreak(kilder3, 'mat', anker) === 3, 'mat-gnisten streaker 3 dager');
sjekk(gnistStreak(kilder3, 'sosialt', anker) === 2, 'sosial-gnisten streaker 2 dager');
sjekk(blaaStreak(kilder3, anker) === 2, 'blå flamme: 2 blå dager på rad');

// --- gnistStatus (sammenstillingen skjermene bruker) ---
const st = gnistStatus(kilder3, anker);
sjekk(st.blaa.streak === 2 && st.blaa.iDagAlle && st.blaa.tentIDag === 4, 'gnistStatus: blå status stemmer');
sjekk(st.pilarer.bevegelse.iDag.naadd && st.pilarer.bevegelse.streak === 2, 'gnistStatus: bevegelse-pilaren stemmer');
sjekk(st.blaa.totaltBlaa === 2, 'gnistStatus: totalt antall blå dager');

// Tomme kilder gir en rolig nullstatus (ny bruker).
const tomSt = gnistStatus({ logg: [], matlogg: [], sosiallogg: [] }, anker);
sjekk(tomSt.blaa.streak === 0 && tomSt.blaa.tentIDag === 0 && !tomSt.blaa.iDagAlle, 'tomme kilder → nullstatus');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('\n✓ Alt grønt — gnist-motoren (terskler, røde gnister, blå flamme).');

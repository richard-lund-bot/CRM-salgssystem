// Headless røyktest av bevegelseslaget — ingen nettleser.
// Sjekker: bevegelsestypene og modalitetsmappingen, Momentum-tilstander og
// Dagens gnist-determinisme. (Streak-motoren testes i smoke-feiring/smoke-gnist.)
import { bevegelsesMomentum, dagensGnist, dagerMedAktivitet, MODALITET_TIL_BEVEGELSE, BEVEGELSER } from '../js/bevegelse.js';

let feil = 0;
const sjekk = (ok, melding) => { if (!ok) { console.error('✗', melding); feil++; } };

// --- Alle bevegelsestyper og modalitetsmappingen henger sammen ---
for (const [id, b] of Object.entries(BEVEGELSER)) sjekk(b.navn && b.slag, `bevegelse ${id} har navn og slag`);
for (const [m, b] of Object.entries(MODALITET_TIL_BEVEGELSE)) sjekk(BEVEGELSER[b], `mapping ${m} → ${b}`);

// --- Momentum: aldri straff, alltid en varm tilstand ---
const nå = Date.now();
const DAG = 86400000;
const loggAktiv = [0, 1, 2, 4].map((d) => ({ dato: new Date(nå - d * DAG).toISOString(), varighetMin: 20 }));
sjekk(bevegelsesMomentum(loggAktiv, nå).tilstand === 'sterk', 'fire aktive dager = sterk rytme');
const loggPause = [{ dato: new Date(nå - 9 * DAG).toISOString(), varighetMin: 20 }];
const momPause = bevegelsesMomentum(loggPause, nå);
sjekk(momPause.tilstand === 'klar', 'pause = «klar», aldri «mistet»');
sjekk(!/mistet|røk|failed|streak/i.test(momPause.tekst + momPause.undertekst), 'ingen skamspråk i momentum-tekster');
sjekk(bevegelsesMomentum([], nå).tilstand === 'ny', 'tom logg = ny');
sjekk(dagerMedAktivitet(loggAktiv, nå, 7).length === 7, '7 dagers rytme');

// --- Dagens gnist (forslaget): deterministisk og alltid med handling ---
const profilFav = { bevegelsesFavoritter: ['strength', 'yoga'] };
const g1 = dagensGnist(profilFav, loggAktiv, nå);
const g2 = dagensGnist(profilFav, loggAktiv, nå + 60000);
sjekk(g1.tittel === g2.tittel, 'gnisten er stabil gjennom dagen');
sjekk(!!g1.href && g1.minutter >= 5, 'gnisten har lenke og et minuttmål');
sjekk(dagensGnist(profilFav, loggPause, nå).bevegelse === 'walk', 'comeback-gnist er en snill tur');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('✓ Alt grønt — bevegelseslag, momentum og dagens gnist.');

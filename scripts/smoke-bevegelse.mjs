// Headless røyktest av bevegelseslaget (M15) — ingen nettleser.
// Sjekker: XP-formelen fra spesifikasjonen (min. 5 XP, smalt intensitetsspenn),
// registrering av fri bevegelse (XP, nivå, comeback), Momentum-tilstander,
// Dagens gnist-determinisme og nivåkurven.
import { beregnXp, bevegelsesMomentum, dagensGnist, dagerMedAktivitet, MODALITET_TIL_BEVEGELSE, BEVEGELSER } from '../js/bevegelse.js';
import { registrerBevegelse, nivaFraTotalXp, globaltNiva, nivaKostnad } from '../js/niva.js';

let feil = 0;
const sjekk = (ok, melding) => { if (!ok) { console.error('✗', melding); feil++; } };

// --- XP-formelen (spec §8) ---
sjekk(beregnXp(20, 'walk', 3) === 20, 'gåtur 20 min moderat = 20 XP');
sjekk(beregnXp(30, 'strength', 4) === Math.round(30 * 1.3 * 1.15), 'styrke 30 min hard');
sjekk(beregnXp(2, 'recovery', 1) === 5, 'minste XP er 5 — mikrobevegelse teller');
sjekk(beregnXp(60, 'sport', 3) === 84, 'fotball 60 min moderat = 84 XP');
// Rolig bevegelse skal aldri føles verdiløs: spennet er smalt.
sjekk(beregnXp(30, 'walk', 5) / beregnXp(30, 'walk', 1) < 1.6, 'intensitetsspennet er smalt');

// --- Alle bevegelsestyper og modalitetsmappingen henger sammen ---
for (const b of Object.keys(BEVEGELSER)) sjekk(beregnXp(10, b, 3) >= 5, `XP for ${b}`);
for (const [m, b] of Object.entries(MODALITET_TIL_BEVEGELSE)) sjekk(BEVEGELSER[b], `mapping ${m} → ${b}`);

// --- Registrering av fri bevegelse ---
let p = { globalXp: 0 };
for (let i = 0; i < 5; i++) {
  const r = registrerBevegelse(p, { bevegelse: 'walk', varighetMin: 20, intensitet: 2 });
  p = r.profil;
}
sjekk(p.globalXp === 5 * beregnXp(20, 'walk', 2), 'XP akkumuleres');
sjekk(globaltNiva(p.globalXp) === nivaFraTotalXp(p.globalXp).niva, 'globaltNiva er snarvei for kurven');

// Nivåopprykk rapporteres i resultatet
const nesten = { globalXp: nivaKostnad(1) - 1 };
const ro = registrerBevegelse(nesten, { bevegelse: 'walk', varighetMin: 10, intensitet: 3 });
sjekk(ro.resultat.globalOpp === 2, 'nivåopprykk rapporteres (globalOpp)');

// Comeback: dobbel XP + comeback-flagget
const rc = registrerBevegelse(p, { bevegelse: 'walk', varighetMin: 10, intensitet: 2, comeback: true });
sjekk(rc.resultat.xp === 2 * beregnXp(10, 'walk', 2), 'comeback gir dobbel XP');
sjekk(rc.profil.harComeback === true, 'comeback-merket settes');

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

// --- Dagens gnist: deterministisk og alltid med handling ---
const profilFav = { bevegelsesFavoritter: ['strength', 'yoga'], globalXp: 500 };
const g1 = dagensGnist(profilFav, loggAktiv, nå);
const g2 = dagensGnist(profilFav, loggAktiv, nå + 60000);
sjekk(g1.tittel === g2.tittel, 'gnisten er stabil gjennom dagen');
sjekk(g1.href && g1.xp >= 5, 'gnisten har lenke og XP-estimat');
sjekk(dagensGnist(profilFav, loggPause, nå).bevegelse === 'walk', 'comeback-gnist er en snill tur');

// --- Nivåkurven: rask start, ingen tak ---
sjekk(nivaFraTotalXp(0).niva === 1, 'nivå 1 fra 0 XP');
sjekk(nivaFraTotalXp(200).niva >= 2, 'tidlige nivåer kommer raskt');
sjekk(nivaFraTotalXp(100000).niva > 30, 'kurven fortsetter uten tak');
sjekk(nivaFraTotalXp(150).igjen + nivaFraTotalXp(150).inne === nivaFraTotalXp(150).tilNeste, 'inne + igjen = tilNeste');

if (feil) { console.error(`\n${feil} feil.`); process.exit(1); }
console.log('✓ Alt grønt — bevegelseslag, XP, momentum, gnist og nivåkurve.');
